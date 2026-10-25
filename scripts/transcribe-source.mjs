import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  inspectSource,
  fingerprint,
  root,
  runRemotion,
  sourcePath,
  requireFile,
} from "./lib/media.mjs";

try {
  const source = await inspectSource();
  const directory = path.join(root, ".cache/transcription");
  const output = path.join(root, "public/generated/transcript.json");
  await mkdir(directory, { recursive: true });
  let cached;
  try {
    cached = JSON.parse(await readFile(output, "utf8"));
  } catch {
    /* no cache */
  }
  if (cached?.sourceSha256 === source.sha256 && cached?.captions?.length) {
    console.log(`Расшифровка этого исходника уже существует: ${output}`);
  } else {
    const python = path.join(
      root,
      process.platform === "win32"
        ? ".venv-transcribe/Scripts/python.exe"
        : ".venv-transcribe/bin/python",
    );
    await requireFile(python);
    const metadata = path.join(directory, "source-metadata.json");
    const audio = path.join(directory, "source-16khz.wav");
    await writeFile(metadata, JSON.stringify(source, null, 2));
    runRemotion([
      "ffmpeg",
      "-v",
      "error",
      "-y",
      "-i",
      sourcePath,
      "-map",
      "0:a:0",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      audio,
    ]);
    const result = spawnSync(
      python,
      [
        path.join(root, "scripts/transcribe-local.py"),
        "--audio",
        audio,
        "--source-metadata",
        metadata,
        "--output",
        output,
        "--cache",
        path.join(root, ".cache/whisper"),
        "--model",
        "small",
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(
        `Локальная транскрибация завершилась с кодом ${result.status}.`,
      );
    if ((await fingerprint(sourcePath)) !== source.sha256) {
      throw new Error(
        "Исходник изменился во время распознавания. Расшифровка требует повторной проверки.",
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
