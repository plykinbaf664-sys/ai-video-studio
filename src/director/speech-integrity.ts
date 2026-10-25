import type { Caption } from "@remotion/captions";
import { captionsForClip, compileTimeline, sourceWordToOutput } from "./timeline.ts";
import type { EditPlan, Transcript } from "./timeline";
import { baselineStyle } from "../styles/baseline.ts";

export const normalizeSpeech = (text: string) =>
  text.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export const auditCaptionTimeline = (
  plan: EditPlan,
  transcript: Transcript,
  actualOutputCaptions: Caption[],
) => {
  const { clips, fps } = compileTimeline(plan);
  const provenance = clips.flatMap((clip) =>
    captionsForClip(transcript.captions, clip, fps).map((word) => ({
      clipId: clip.id,
      sourceWordIndex: transcript.captions.indexOf(word),
      sourceStartMs: word.startMs,
      sourceEndMs: word.endMs,
      ...sourceWordToOutput(word, clip, fps),
    })),
  );
  if (provenance.length !== actualOutputCaptions.length)
    throw new Error("Speech QC: orphan, missing or duplicated output caption.");
  provenance.forEach((expected, index) => {
    const actual = actualOutputCaptions[index];
    if (
      expected.text !== actual.text ||
      Math.abs(expected.startMs - actual.startMs) > 0.001 ||
      Math.abs(expected.endMs - actual.endMs) > 0.001 ||
      expected.timestampMs !== actual.timestampMs
    )
      throw new Error(`Speech QC: source/output mismatch at word ${index}: ${expected.text}`);
  });
  const retained = new Set(provenance.map((word) => word.sourceWordIndex));
  const omittedWords = transcript.captions.flatMap((word, index) =>
    retained.has(index) ? [] : [{ sourceWordIndex: index, ...word }],
  );
  const boundaries = clips.map((clip) => {
    const words = provenance.filter((word) => word.clipId === clip.id);
    const first = words[0];
    const last = words[words.length - 1];
    const startMs = clip.sourceStartFrame * 1000 / fps;
    const endMs = clip.sourceEndFrame * 1000 / fps;
    const leadMs = first.sourceStartMs - startMs;
    const tailMs = endMs - last.sourceEndMs;
    return {
      clipId: clip.id, sourceStartMs: startMs, sourceEndMs: endMs,
      outputStartMs: clip.outputStartFrame * 1000 / fps,
      leadMs, tailMs,
      status: leadMs < 0 || tailMs < 0 ? "failed" :
        (startMs > 0 && leadMs < baselineStyle.rules.rhythm.minimumLeadMs) || tailMs < baselineStyle.rules.rhythm.minimumTailMs ? "review-required" : "passed",
      startsAtSourceOrigin: startMs === 0,
    };
  });
  if (boundaries.some((boundary) => boundary.status === "failed"))
    throw new Error("Speech QC: cut crosses a retained word.");
  return { status: "passed", provenance, omittedWords, boundaries };
};

export type RecognizedWord = {
  text: string;
  startMs: number;
  endMs: number;
  confidence?: number | null;
};

// Baseline has no approved editorial-writing mode. Any on-screen quote must
// originate in retained speech; a purpose/evidence string alone is not proof.
export const auditOverlayQuotes = (
  plan: EditPlan,
  provenance: ReturnType<typeof auditCaptionTimeline>["provenance"],
) => plan.overlays.map((overlay) => {
  const wanted = normalizeSpeech(overlay.text ?? "");
  let matched: typeof provenance = [];
  for (let start = 0; start < provenance.length && !matched.length; start++) {
    for (let end = start + 1; end <= provenance.length; end++) {
      const words = provenance.slice(start, end);
      if (words.some((word) => word.clipId !== words[0].clipId)) break;
      const candidate = normalizeSpeech(words.map((word) => word.text).join(" "));
      if (candidate === wanted) { matched = words; break; }
      if (candidate.length > wanted.length) break;
    }
  }
  if (!matched.length)
    throw new Error(`Speech QC: overlay ${overlay.id} has no verbatim retained speech: ${overlay.text}`);
  return {
    id: overlay.id, text: overlay.text, clipId: matched[0].clipId,
    sourceWordIndices: matched.map(word => word.sourceWordIndex),
    spokenOutputStartMs: matched[0].startMs,
    spokenOutputEndMs: matched[matched.length - 1].endMs,
    displayStartMs: overlay.startSeconds * 1000,
    displayEndMs: overlay.endSeconds * 1000,
    role: overlay.startSeconds * 1000 > matched[matched.length - 1].endMs ? "quote-reprise" : "speech-quote",
  };
});

// Sequence alignment preserves repeated words. Disagreements are review items,
// never automatically treated as proof of a bad edit or used to rewrite speech.
export const compareRecognizedSpeech = (
  expected: RecognizedWord[],
  recognized: RecognizedWord[],
  timingToleranceMs = 350,
) => {
  const rows = expected.length + 1;
  const cols = recognized.length + 1;
  const distance = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) distance[i][0] = i;
  for (let j = 0; j < cols; j++) distance[0][j] = j;
  const same = (i: number, j: number) => normalizeSpeech(expected[i].text) === normalizeSpeech(recognized[j].text);
  for (let i = 1; i < rows; i++)
    for (let j = 1; j < cols; j++)
      distance[i][j] = Math.min(
        distance[i - 1][j] + 1,
        distance[i][j - 1] + 1,
        distance[i - 1][j - 1] + (same(i - 1, j - 1) ? 0 : 1),
      );
  const aligned = [];
  let i = expected.length;
  let j = recognized.length;
  while (i || j) {
    if (i && j && distance[i][j] === distance[i - 1][j - 1] + (same(i - 1, j - 1) ? 0 : 1)) {
      const wanted = expected[--i];
      const heard = recognized[--j];
      const textMatches = normalizeSpeech(wanted.text) === normalizeSpeech(heard.text);
      const startDeltaMs = heard.startMs - wanted.startMs;
      const endDeltaMs = heard.endMs - wanted.endMs;
      aligned.push({
        kind: textMatches ? "match" : "substitution", expectedIndex: i, recognizedIndex: j,
        expected: wanted, recognized: heard, startDeltaMs, endDeltaMs,
        status: textMatches && Math.max(Math.abs(startDeltaMs), Math.abs(endDeltaMs)) <= timingToleranceMs ? "passed" : "review-required",
      });
    } else if (i && distance[i][j] === distance[i - 1][j] + 1) {
      aligned.push({ kind: "not-recognized", expectedIndex: --i, expected: expected[i], status: "review-required" });
    } else {
      aligned.push({ kind: "unexpected-recognition", recognizedIndex: --j, recognized: recognized[j], status: "review-required" });
    }
  }
  aligned.reverse();
  const reviewItems = aligned.filter((item) => item.status !== "passed");
  return {
    status: reviewItems.length ? "review-required" : "passed",
    expectedWords: expected.length, recognizedWords: recognized.length,
    wordErrors: distance[expected.length][recognized.length], timingToleranceMs,
    aligned, reviewItems,
    limitation: "ASR lexical errors and timestamp uncertainty require review; they do not prove missing audio.",
  };
};
