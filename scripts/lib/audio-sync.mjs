import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, runRemotion, sourcePath } from "./media.mjs";

export const verifyEditedAudio = async (file, timeline) => {
  const directory = path.join(root, ".cache/audio-qc");
  await mkdir(directory, { recursive: true });
  const original = path.join(directory, "source.wav");
  const edited = path.join(directory, "edited.wav");
  const timelineFile = path.join(directory, "timeline.json");
  const report = path.join(directory, "sync.json");
  await writeFile(timelineFile, JSON.stringify(timeline));
  for (const [input, output] of [
    [sourcePath, original],
    [file, edited],
  ]) {
    runRemotion([
      "ffmpeg",
      "-v",
      "error",
      "-y",
      "-i",
      input,
      "-map",
      "0:a:0",
      "-vn",
      "-ar",
      "8000",
      "-ac",
      "1",
      "-c:a",
      "pcm_s16le",
      output,
    ]);
  }
  const python = path.join(
    root,
    process.platform === "win32"
      ? ".venv-transcribe/Scripts/python.exe"
      : ".venv-transcribe/bin/python",
  );
  const result = spawnSync(
    python,
    [
      path.join(root, "scripts/verify-audio-sync.py"),
      "--source",
      original,
      "--output",
      edited,
      "--timeline",
      timelineFile,
      "--report",
      report,
    ],
    { cwd: root, stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      "Не совпало аудио на source/output timeline. См. .cache/audio-qc/sync.json.",
    );
  return JSON.parse(await readFile(report, "utf8"));
};
