import { serializeSrt } from "@remotion/captions";
import { mkdir, writeFile } from "node:fs/promises";
import { buildCaptionCues } from "../src/design/caption-layout.ts";
import { isolateLegacySidecars } from "./lib/design-assets.mjs";
import path from "node:path";
import { inspectSource, root, writeReport } from "./lib/media.mjs";
import { loadEdit } from "./lib/edit-plan.mjs";

try {
  const source = await inspectSource();
  const { plan, transcript, timeline, outputCaptions, textSchedule } =
    await loadEdit(source);
  await isolateLegacySidecars();
  await writeReport("semantic-output-captions.json", {
    timeline: "output",
    sourceSha256: source.sha256,
    captions: outputCaptions,
  });
  const lines = buildCaptionCues(outputCaptions).map((cue) => cue.words);
  await mkdir(path.join(root, "artifacts/caption-exports"), { recursive: true });
  await writeFile(
    path.join(root, "artifacts/caption-exports/dialogue-output.srt"),
    serializeSrt({ lines }),
  );
  const report = {
    sourceSha256: source.sha256,
    schema: "passed",
    cutWordBoundaries: "passed",
    clips: timeline.clips,
    durationInFrames: timeline.durationInFrames,
    outputDurationSeconds: timeline.durationInFrames / timeline.fps,
    wordCount: outputCaptions.length,
    transcriptReviewStatus: transcript.reviewStatus,
    overlays: plan.overlays,
    textCollisions: "passed",
    textSchedule,
  };
  await writeReport("edit-plan.validation.json", report);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
