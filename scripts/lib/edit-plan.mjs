import Ajv2020 from "ajv/dist/2020.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./media.mjs";
import { buildTextSchedule } from "../../src/design/caption-layout.ts";
import { auditCaptionTimeline, auditOverlayQuotes } from "../../src/director/speech-integrity.ts";
import {
  captionsForClip,
  compileTimeline,
  sourceWordToOutput,
  validateTranscriptCuts,
} from "../../src/director/timeline.ts";

export const loadEdit = async (source) => {
  const schema = JSON.parse(
    await readFile(path.join(root, "contracts/edit-plan.schema.json"), "utf8"),
  );
  const plan = JSON.parse(
    await readFile(path.join(root, "public/generated/edit-plan.json"), "utf8"),
  );
  const transcript = JSON.parse(
    await readFile(path.join(root, "public/generated/transcript.json"), "utf8"),
  );
  const validate = new Ajv2020({ allErrors: true }).compile(schema);
  if (!validate(plan))
    throw new Error(`Edit plan schema: ${JSON.stringify(validate.errors)}`);
  if (source.sha256 !== plan.source.sha256)
    throw new Error("Edit plan относится к другому source.mp4.");
  if (Math.abs(source.durationInSeconds - plan.source.durationSeconds) > 0.001)
    throw new Error("Длительность исходника изменилась.");
  validateTranscriptCuts(transcript, plan);
  const timeline = compileTimeline(plan);
  const textSchedule = buildTextSchedule(plan, transcript, timeline.clips);
  const outputCaptions = timeline.clips.flatMap((clip) =>
    captionsForClip(transcript.captions, clip, timeline.fps).map((word) =>
      sourceWordToOutput(word, clip, timeline.fps),
    ),
  );
  const captionAudit = auditCaptionTimeline(plan, transcript, outputCaptions);
  const overlayQuotes = auditOverlayQuotes(plan, captionAudit.provenance);
  return { plan, transcript, timeline, outputCaptions, textSchedule, captionAudit, overlayQuotes };
};
