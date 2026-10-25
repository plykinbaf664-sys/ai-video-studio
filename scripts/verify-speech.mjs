import { inspectSource } from "./lib/media.mjs";
import { loadEdit } from "./lib/edit-plan.mjs";
import { verifySpeechIntegrity } from "./lib/speech-qc.mjs";
import { getSemanticOutputPath } from "./lib/semantic-output.mjs";

try {
  const source = await inspectSource();
  const edit = await loadEdit(source);
  const report = await verifySpeechIntegrity(await getSemanticOutputPath(), source, edit);
  if (process.argv.includes("--strict") && report.status !== "passed") process.exitCode = 2;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
