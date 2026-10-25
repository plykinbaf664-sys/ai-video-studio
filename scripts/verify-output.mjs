import {
  inspectSource,
  outputPath,
  verifyVideo,
  writeReport,
} from "./lib/media.mjs";

try {
  const source = await inspectSource();
  const report = await verifyVideo(outputPath, source);
  await writeReport("first-test.verification.json", report);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
