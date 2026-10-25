import assert from "node:assert/strict";
import { test } from "node:test";
import {
  captionsForClip,
  compileTimeline,
  sourceWordToOutput,
  validateTranscriptCuts,
} from "../src/director/timeline.ts";

const makePlan = () => ({
  version: "0.1.0",
  source: { path: "source.mp4", durationSeconds: 10, sha256: "a".repeat(64) },
  output: { width: 1080, height: 1920, fps: 30 },
  style: {
    presetId: "baseline-unbranded",
    intensity: 20,
    variant: "restrained",
    subtitleMode: "minimal",
    visualInsertPolicy: "semantic_only",
  },
  clips: [
    {
      id: "a",
      sourceStartSeconds: 1,
      sourceEndSeconds: 3,
      outputStartSeconds: 0,
      playbackRate: 1,
    },
    {
      id: "b",
      sourceStartSeconds: 6,
      sourceEndSeconds: 8,
      outputStartSeconds: 2,
      playbackRate: 1,
    },
  ],
  overlays: [],
});
const word = {
  text: " слово",
  startMs: 6500,
  endMs: 6800,
  timestampMs: 6600,
  confidence: 0.9,
};

test("a cut preserves source captions and maps the retained word to output time", () => {
  const timeline = compileTimeline(makePlan());
  assert.equal(timeline.durationInFrames, 120);
  assert.equal(captionsForClip([word], timeline.clips[0], 30).length, 0);
  const mapped = sourceWordToOutput(word, timeline.clips[1], 30);
  assert.deepEqual(
    [mapped.startMs, mapped.endMs, mapped.timestampMs],
    [2500, 2800, 2600],
  );
  assert.equal(word.startMs, 6500);
});

test("source overflow, output gaps and unimplemented speed changes fail before rendering", () => {
  const badEnd = makePlan();
  badEnd.clips[1].sourceEndSeconds = 12;
  assert.throws(() => compileTimeline(badEnd), /границы исходника/);
  const gap = makePlan();
  gap.clips[1].outputStartSeconds = 3;
  assert.throws(() => compileTimeline(gap), /разрыв или наложение/);
  const speed = makePlan();
  speed.clips[1].playbackRate = 2;
  assert.throws(() => compileTimeline(speed), /скорости/);
});

test("cuts through spoken words and mismatched source fingerprints fail", () => {
  const plan = makePlan();
  const transcript = {
    timeline: "source",
    sourceSha256: plan.source.sha256,
    captions: [{ ...word, startMs: 950, endMs: 1100 }, word],
  };
  assert.throws(
    () => validateTranscriptCuts(transcript, plan),
    /обрезает слово/,
  );
  transcript.sourceSha256 = "b".repeat(64);
  assert.throws(
    () => validateTranscriptCuts(transcript, plan),
    /другому исходнику/,
  );
});

test("unsupported styles and hidden subframe rounding are rejected", () => {
  const style = makePlan();
  style.style.presetId = "not-implemented";
  assert.throws(() => compileTimeline(style), /другие стили не реализованы/);
  const subframe = makePlan();
  subframe.clips[0].sourceStartSeconds = 1.005;
  assert.throws(() => compileTimeline(subframe), /source time/);
});
