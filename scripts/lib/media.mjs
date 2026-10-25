import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ALL_FORMATS, FilePathSource, Input } from "mediabunny";
import {
  framesForDuration,
  orientationFor,
  OUTPUT,
} from "../../src/core/media-contract.ts";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const sourcePath = path.join(root, "public/source.mp4");
export const outputPath = path.join(root, "out/first-test.mp4");
const cli = path.join(root, "node_modules/@remotion/cli/remotion-cli.js");

export const runRemotion = (args) => {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`Remotion failed (${result.status}).`);
};

export const requireFile = async (file) => {
  let info;
  try {
    info = await stat(file);
  } catch {
    throw new Error(`Файл отсутствует: ${file}`);
  }
  if (!info.isFile() || info.size === 0) throw new Error(`Файл пуст: ${file}`);
  return info;
};

export const fingerprint = async (file) => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
};

export const probe = (file) =>
  JSON.parse(
    execFileSync(
      process.execPath,
      [
        cli,
        "ffprobe",
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-of",
        "json",
        file,
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    ),
  );

const ratio = (value) => {
  const [a, b] = String(value).split(/[/:]/).map(Number);
  return b ? a / b : null;
};

export const inspectSource = async () => {
  const info = await requireFile(sourcePath);
  const raw = probe(sourcePath);
  const video = raw.streams.find(
    (s) => s.codec_type === "video" && !s.disposition?.attached_pic,
  );
  const audio = raw.streams.find((s) => s.codec_type === "audio");
  if (!video) throw new Error("source.mp4: видеодорожка не найдена.");
  if (!audio)
    throw new Error("source.mp4: исходная звуковая дорожка не найдена.");
  // Use the same parser as calculateMetadata, avoiding rounded container duration.
  const input = new Input({
    formats: ALL_FORMATS,
    source: new FilePathSource(sourcePath),
  });
  let width, height, rotation, durationInSeconds;
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("source.mp4: видеодорожка не читается.");
    [width, height, rotation, durationInSeconds] = await Promise.all([
      track.getDisplayWidth(),
      track.getDisplayHeight(),
      track.getRotation(),
      input.computeDuration(),
    ]);
  } finally {
    input.dispose();
  }
  return {
    file: sourcePath,
    bytes: info.size,
    sha256: await fingerprint(sourcePath),
    width,
    height,
    codedWidth: video.width,
    codedHeight: video.height,
    rotation,
    orientation: orientationFor(width, height),
    sourceFps: ratio(video.avg_frame_rate),
    durationInSeconds,
    expectedFrames: framesForDuration(durationInSeconds),
    videoCodec: video.codec_name,
    audioCodec: audio.codec_name,
    audioSampleRate: Number(audio.sample_rate),
    audioChannels: audio.channels,
    videoStart: Number(video.start_time ?? 0),
    audioStart: Number(audio.start_time ?? 0),
  };
};

export const writeReport = async (name, data) => {
  const directory = path.join(root, "artifacts/reports");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, name),
    JSON.stringify(data, null, 2) + "\n",
  );
};

export const verifyVideo = async (file, source, options = {}) => {
  const info = await requireFile(file);
  const raw = probe(file);
  const videos = raw.streams.filter((s) => s.codec_type === "video");
  const audios = raw.streams.filter((s) => s.codec_type === "audio");
  const video = videos[0];
  const audio = audios[0];
  const subtitleStreams = raw.streams.filter(
    (s) => s.codec_type === "subtitle",
  );
  const check = (ok, message) => {
    if (!ok) throw new Error(`Проверка MP4: ${message}`);
  };
  check(
    subtitleStreams.length === 0,
    "в MP4 обнаружен дополнительный слой subtitle track.",
  );
  check(
    videos.length === 1 && audios.length === 1,
    "ожидается одна видео- и одна аудиодорожка.",
  );
  check(
    video.width === OUTPUT.width && video.height === OUTPUT.height,
    "размер должен быть 1080x1920.",
  );
  check(
    ratio(video.avg_frame_rate) === OUTPUT.fps &&
      ratio(video.r_frame_rate) === OUTPUT.fps,
    "частота должна быть постоянной, 30 fps.",
  );
  check(
    video.codec_name === "h264" &&
      (video.pix_fmt === "yuv420p" ||
        (video.pix_fmt === "yuvj420p" && video.color_range === "pc")),
    "ожидается H.264 с 8-битным YUV 4:2:0 (yuv420p или full-range yuvj420p).",
  );
  check(
    audio.codec_name === "aac" && Number(audio.sample_rate) === 48000,
    "ожидается AAC/48000 Hz.",
  );
  const videoDuration = Number(video.duration);
  const audioDuration = Number(audio.duration);
  const expectedFrames =
    options.durationInFrames ?? framesForDuration(source.durationInSeconds);
  const targetDuration = expectedFrames / OUTPUT.fps;
  check(
    Number(video.nb_frames) === expectedFrames,
    "число кадров не совпадает с ожидаемой монтажной длительностью.",
  );
  check(
    Math.abs(videoDuration - targetDuration) < 1 / OUTPUT.fps,
    "неверная длительность видео.",
  );
  check(
    Math.abs(audioDuration - videoDuration) < 1 / OUTPUT.fps + 1024 / 48000,
    "длительности звука и изображения расходятся.",
  );
  const outputOffset =
    Number(audio.start_time ?? 0) - Number(video.start_time ?? 0);
  check(
    Math.abs(outputOffset - (source.audioStart - source.videoStart)) < 0.08,
    "изменилось относительное начало аудио/видео.",
  );
  // Decode the entire file: a readable MP4 header alone does not prove success.
  runRemotion([
    "ffmpeg",
    "-v",
    "error",
    "-xerror",
    "-i",
    file,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0",
    // Bundled FFmpeg does not include null muxer's default wrapped_avframe encoder.
    "-c:v",
    "rawvideo",
    "-c:a",
    "pcm_s16le",
    "-f",
    "null",
    "-",
  ]);
  check(
    (await fingerprint(sourcePath)) === source.sha256,
    "исходник изменился во время обработки.",
  );
  return {
    checkedAt: new Date().toISOString(),
    file,
    bytes: info.size,
    sha256: await fingerprint(file),
    width: video.width,
    height: video.height,
    fps: OUTPUT.fps,
    frames: Number(video.nb_frames),
    videoDuration,
    audioDuration,
    videoCodec: video.codec_name,
    pixelFormat: video.pix_fmt,
    colorRange: video.color_range ?? "unspecified",
    audioCodec: audio.codec_name,
    audioSampleRate: Number(audio.sample_rate),
    subtitleStreamCount: subtitleStreams.length,
    fullDecode: "passed",
    source,
    manualReview:
      "Просмотреть лицо, содержательный акцент и синхронизацию речи в Studio и MP4. Проверки таймстампов не заменяют визуальную и слуховую проверку.",
  };
};
