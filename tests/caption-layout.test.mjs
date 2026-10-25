import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BASELINE,
  assertExclusiveTextIntervals,
  buildCaptionCues,
  cueAtTime,
  fitTwoLines,
} from "../src/design/caption-layout.ts";

const words = ["One", "coherent", "phrase", "A", "second", "thought"].map(
  (text, i) => ({
    text: ` ${text}`,
    startMs: i * 300,
    endMs: (i + 1) * 300,
    timestampMs: null,
    confidence: 1,
    pageBreakAfter: i === 2 || i === 5,
  }),
);

test("semantic boundaries retain all words and switch cues without overlap", () => {
  const cues = buildCaptionCues(words);
  assert.deepEqual(
    cues.map((cue) => cue.text),
    ["One coherent phrase", "A second thought"],
  );
  assert.equal(cues.flatMap((cue) => cue.words).length, words.length);
  assert.equal(cueAtTime(cues, 899).text, "One coherent phrase");
  assert.equal(cueAtTime(cues, 900).text, "A second thought");
});

test("readable layout never truncates words or produces more than two lines", () => {
  const measure = (text, size) => text.length * size * 0.62;
  const text = "A deliberately longer readable phrase";
  const result = fitTwoLines(text, measure);
  assert.equal(result.lines.join(" "), text);
  assert.ok(result.lines.length <= 2);
  assert.ok(result.fontSize >= BASELINE.subtitle.minSize);
  for (const line of result.lines)
    assert.ok(
      measure(line, result.fontSize) <=
        BASELINE.slot.width - 2 * BASELINE.paddingX,
    );
  assert.throws(
    () => fitTwoLines("x".repeat(100), measure),
    /split the phrase/,
  );
});

test("headings cannot silently overlap dialogue; touching boundaries are allowed", () => {
  assert.throws(
    () =>
      assertExclusiveTextIntervals([
        { startMs: 0, endMs: 1000, label: "caption" },
        { startMs: 900, endMs: 1200, label: "heading" },
      ]),
    /Text collision/,
  );
  assert.doesNotThrow(() =>
    assertExclusiveTextIntervals([
      { startMs: 0, endMs: 1000, label: "caption" },
      { startMs: 1000, endMs: 1200, label: "heading" },
    ]),
  );
});
