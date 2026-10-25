import assert from "node:assert/strict";
import { test } from "node:test";
import { auditCaptionTimeline, auditOverlayQuotes, compareRecognizedSpeech } from "../src/director/speech-integrity.ts";

const plan = {
  version: "0.1.0", source: { path: "source.mp4", durationSeconds: 10 },
  output: { width: 1080, height: 1920, fps: 30 },
  style: { presetId: "baseline-unbranded", intensity: 20, variant: "restrained", subtitleMode: "minimal", visualInsertPolicy: "semantic_only" },
  clips: [{ id: "a", sourceStartSeconds: 5, sourceEndSeconds: 7, outputStartSeconds: 0, playbackRate: 1 }], overlays: [],
};
const word = (text, startMs, endMs) => ({ text, startMs, endMs, timestampMs: null, confidence: 0.9 });

test("caption provenance rejects source timestamps and captions from deleted speech", () => {
  const kept = word(" retained", 5500, 6000);
  const removed = word(" removed", 3000, 3400);
  const transcript = { captions: [removed, kept] };
  const actual = [{ ...kept, startMs: 500, endMs: 1000 }];
  const result = auditCaptionTimeline(plan, transcript, actual);
  assert.equal(result.provenance[0].sourceWordIndex, 1);
  assert.equal(result.omittedWords[0].text, removed.text);
  assert.throws(() => auditCaptionTimeline(plan, transcript, [kept]), /source\/output mismatch/);
  assert.throws(() => auditCaptionTimeline(plan, transcript, [...actual, removed]), /orphan/);
});

test("cut without speech padding is reviewed even when it does not split an ASR word", () => {
  const kept = word(" near-cut", 5010, 6990);
  const result = auditCaptionTimeline(plan, { captions: [kept] }, [{ ...kept, startMs: 10, endMs: 1990 }]);
  assert.equal(result.boundaries[0].status, "review-required");
});

test("ASR mistakes and timestamp drift are review items, including inserted and missing speech", () => {
  const expected = [word("Everything", 0, 300), word("myself", 350, 650)];
  assert.equal(compareRecognizedSpeech(expected, expected).status, "passed");
  const changed = compareRecognizedSpeech(expected, [expected[0], word("else", 350, 650)]);
  assert.equal(changed.status, "review-required");
  assert.equal(changed.wordErrors, 1);
  assert.equal(compareRecognizedSpeech(expected, [expected[0]]).reviewItems[0].kind, "not-recognized");
  assert.equal(compareRecognizedSpeech(expected, [...expected, word("extra", 700, 800)]).reviewItems[0].kind, "unexpected-recognition");
  assert.equal(compareRecognizedSpeech(expected, expected.map(w => ({ ...w, startMs: w.startMs + 900, endMs: w.endMs + 900 }))).wordErrors, 0);
  assert.equal(compareRecognizedSpeech(expected, expected.map(w => ({ ...w, startMs: w.startMs + 900, endMs: w.endMs + 900 }))).status, "review-required");
});

test("editorial first-person text cannot masquerade as a retained quote", () => {
  const kept = word(" retained", 5500, 6000);
  const mapped = auditCaptionTimeline(plan, { captions: [kept] }, [{ ...kept, startMs: 500, endMs: 1000 }]);
  assert.throws(() => auditOverlayQuotes({ ...plan, overlays: [{ id: "invented", text: "I decide everything" }] }, mapped.provenance), /no verbatim retained speech/);
  const quotes = auditOverlayQuotes({ ...plan, overlays: [{ id: "quoted", text: "retained", startSeconds: 1.2, endSeconds: 1.5 }] }, mapped.provenance);
  assert.equal(quotes[0].role, "quote-reprise");
});

test("reordered clips still map each repeated word to its own source interval", () => {
  const a = word(" same", 5500, 6000);
  const b = word(" same", 1500, 1800);
  const reordered = { ...plan, clips: [...plan.clips,
    { id: "b", sourceStartSeconds: 1, sourceEndSeconds: 3, outputStartSeconds: 2, playbackRate: 1 }] };
  const result = auditCaptionTimeline(reordered, { captions: [b, a] }, [
    { ...a, startMs: 500, endMs: 1000 }, { ...b, startMs: 2500, endMs: 2800 },
  ]);
  assert.deepEqual(result.provenance.map(w => [w.clipId, w.sourceWordIndex]), [["a", 1], ["b", 0]]);
});
