import path from "node:path";
import { readFile } from "node:fs/promises";
import { inspectSource, root, verifyVideo, writeReport } from "./lib/media.mjs";
import { loadEdit } from "./lib/edit-plan.mjs";
import { verifyEditedAudio } from "./lib/audio-sync.mjs";
import { verifySpeechIntegrity } from "./lib/speech-qc.mjs";
import { getSemanticOutputPath } from "./lib/semantic-output.mjs";

try {
  const source = await inspectSource();
  const edit = await loadEdit(source);
  const { plan, timeline, transcript } = edit;
  const file = await getSemanticOutputPath();
  const report = await verifyVideo(file, source, {
    durationInFrames: timeline.durationInFrames,
  });
  const audioSync = await verifyEditedAudio(file, timeline);
  const speechIntegrity = await verifySpeechIntegrity(file, source, edit);
  let previous = null;
  try {
    previous = JSON.parse(
      await readFile(
        path.join(root, "artifacts/reports/semantic-cut.verification.json"),
        "utf8",
      ),
    );
  } catch {
    /* no prior visual evidence */
  }
  const visualLayout =
    previous?.sha256 === report.sha256 &&
    JSON.stringify(previous.plan) === JSON.stringify(plan)
      ? previous.visualLayout
      : undefined;
  await writeReport("semantic-cut.verification.json", {
    ...report,
    plan,
    audioSync,
    speechIntegrity,
    transcriptReviewStatus: transcript.reviewStatus,
    ...(visualLayout ? { visualLayout } : {}),
  });
  console.log(
    `SemanticCut: техническая проверка и совпадение исходного звука по клипам пройдены. ${file}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
