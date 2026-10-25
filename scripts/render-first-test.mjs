import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import {
  inspectSource,
  outputPath,
  root,
  runRemotion,
  verifyVideo,
  writeReport,
} from "./lib/media.mjs";

try {
  // Do this before starting Chromium or writing any movie.
  const source = await inspectSource();
  await writeReport("source-metadata.json", source);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.join(root,'.cache/first-test'),{recursive:true});
  const pending = path.join(root, ".cache/first-test/render.pending.mp4");
  runRemotion(["render", "src/index.ts", "FirstTest", pending]);
  const report = await verifyVideo(pending, source);
  await rename(pending, outputPath);
  await writeReport("first-test.verification.json", {
    ...report,
    file: outputPath,
  });
  console.log(`MP4 создан и прошёл техническую проверку: ${outputPath}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
