import { inspectSource, writeReport } from "./lib/media.mjs";

try {
  const source = await inspectSource();
  await writeReport("source-metadata.json", source);
  console.log(JSON.stringify(source, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
