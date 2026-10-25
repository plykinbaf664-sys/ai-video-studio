import type { Caption } from "@remotion/captions";
import type { EditPlan, Transcript, TimelineClip } from "../director/timeline";
import { baselineStyle } from "../styles/baseline.ts";

// Technical baseline only. No approved brandbook or implemented style catalogue.
export const BASELINE = {
  id: baselineStyle.id,
  approvedBrandbook: false,
  fontFamily: baselineStyle.design.font.family,
  fontSrc: baselineStyle.design.font.runtimeFile,
  font: baselineStyle.design.font,
  slot: baselineStyle.design.slot,
  safe: baselineStyle.design.safe,
  paddingX: baselineStyle.design.card.paddingX,
  paddingY: baselineStyle.design.card.paddingY,
  card: baselineStyle.design.card,
  subtitle: baselineStyle.design.subtitle,
  heading: baselineStyle.design.heading,
  maxLines: baselineStyle.rules.subtitles.maximumLines,
} as const;

export type CaptionCue = {
  startMs: number;
  endMs: number;
  text: string;
  words: Caption[];
};
export type MeasureText = (text: string, fontSize: number) => number;

export const buildCaptionCues = (
  words: Caption[],
  clipEndMs = Infinity,
): CaptionCue[] => {
  const groups: Caption[][] = [];
  let current: Caption[] = [];
  const flush = () => {
    if (current.length) groups.push(current);
    current = [];
  };
  for (const word of words) {
    const previous = current[current.length - 1];
    const candidate = [...current, word]
      .map((item) => item.text.trim())
      .join(" ");
    if (
      previous &&
      (word.startMs - previous.endMs > baselineStyle.rules.subtitles.splitGapMs ||
        current.length >= baselineStyle.rules.subtitles.maximumWordsPerGroup ||
        candidate.length > baselineStyle.rules.subtitles.maximumCharactersPerGroup)
    )
      flush();
    current.push(word);
    if (word.pageBreakAfter || /[.!?]$/.test(word.text.trim())) flush();
  }
  flush();
  return groups.map((group, index) => ({
    startMs: group[0].startMs,
    endMs: Math.min(
      group[group.length - 1].endMs + baselineStyle.rules.subtitles.tailMs,
      groups[index + 1]?.[0].startMs ?? Infinity,
      clipEndMs,
    ),
    text: group.map((word) => word.text.trim()).join(" "),
    words: group,
  }));
};

export const fitTwoLines = (
  text: string,
  measure: MeasureText,
  kind: "subtitle" | "heading" = "subtitle",
) => {
  const settings = BASELINE[kind];
  const maxWidth = BASELINE.slot.width - 2 * BASELINE.paddingX;
  const words = text.trim().split(/\s+/);
  if (!text.trim()) throw new Error("Empty caption.");
  for (
    let size: number = settings.preferredSize;
    size >= settings.minSize;
    size--
  ) {
    if (measure(text, size) <= maxWidth)
      return { lines: [text], fontSize: size, lineHeight: settings.lineHeight };
    const candidates = [];
    for (let split = 1; split < words.length; split++) {
      const left = words.slice(0, split).join(" ");
      const right = words.slice(split).join(" ");
      const leftWidth = measure(left, size);
      const rightWidth = measure(right, size);
      if (leftWidth > maxWidth || rightWidth > maxWidth) continue;
      const dangling =
        /^(и|в|во|к|ко|с|со|на|не|о|об|по|у|за|из|для|что)$/i.test(
          words[split - 1],
        );
      const score =
        Math.abs(leftWidth - rightWidth) + (dangling ? maxWidth : 0);
      candidates.push({ lines: [left, right], score });
    }
    candidates.sort((a, b) => a.score - b.score);
    if (candidates.length)
      return {
        lines: candidates[0].lines,
        fontSize: size,
        lineHeight: settings.lineHeight,
      };
  }
  throw new Error(
    `Caption cannot fit two readable lines; split the phrase: ${text}`,
  );
};

export const cueAtTime = (cues: CaptionCue[], timeMs: number) =>
  cues.find((cue) => timeMs >= cue.startMs && timeMs < cue.endMs) ?? null;

export const assertExclusiveTextIntervals = (
  intervals: { startMs: number; endMs: number; label: string }[],
) => {
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMs < sorted[i - 1].endMs - 0.001)
      throw new Error(
        `Text collision: ${sorted[i - 1].label} / ${sorted[i].label}`,
      );
  }
};

export const buildTextSchedule = (
  plan: EditPlan,
  transcript: Transcript,
  clips: TimelineClip[],
) => {
  const fps = plan.output.fps;
  const intervals = clips.flatMap((clip) => {
    const startMs = (clip.sourceStartFrame * 1000) / fps;
    const endMs = (clip.sourceEndFrame * 1000) / fps;
    const words = transcript.captions.filter(
      (word) => word.startMs >= startMs && word.endMs <= endMs,
    );
    const offsetMs =
      ((clip.outputStartFrame - clip.sourceStartFrame) * 1000) / fps;
    return buildCaptionCues(words, endMs).map((cue) => ({
      startMs: cue.startMs + offsetMs,
      endMs: cue.endMs + offsetMs,
      label: `${clip.id}: ${cue.text}`,
      text: cue.text,
      kind: "subtitle" as const,
    }));
  });
  const overlays = plan.overlays.map((overlay) => ({
    startMs: (Math.round(overlay.startSeconds * fps) * 1000) / fps,
    endMs: (Math.round(overlay.endSeconds * fps) * 1000) / fps,
    label: overlay.id,
    text: overlay.text ?? "",
    kind: "heading" as const,
  }));
  const schedule = [...intervals, ...overlays].sort(
    (a, b) => a.startMs - b.startMs,
  );
  assertExclusiveTextIntervals(schedule);
  return schedule;
};
