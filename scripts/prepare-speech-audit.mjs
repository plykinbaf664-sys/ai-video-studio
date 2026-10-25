import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, runRemotion } from "./lib/media.mjs";

const names = process.argv.slice(2);
const jobs = [];
for (const name of names.length ? names : ["source", "before"]) {
  if (!["source", "before", "final"].includes(name)) throw new Error("Unknown audit input");
  const media = path.join(root, name === "source" ? "public/source.mp4" : "out/semantic-cut.mp4");
  const audio = path.join(root, `.cache/speech-qc/${name}.wav`);
  await mkdir(path.dirname(audio), { recursive: true });
  runRemotion(["ffmpeg", "-v", "error", "-y", "-i", media, "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio]);
  jobs.push({ timeline: name === "source" ? "source" : "output", media, audio, output: path.join(root, `artifacts/speech-qc/${name}.asr.json`) });
}
await writeFile(path.join(root, ".cache/speech-qc/jobs.json"), JSON.stringify(jobs, null, 2));
console.log("Prepared .cache/speech-qc/jobs.json; no previous out/ files removed.");
