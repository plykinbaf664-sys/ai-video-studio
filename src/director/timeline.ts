import type { Caption } from "@remotion/captions";

export type EditPlan = {
  version: "0.1.0";
  source: {
    assetId: string;
    path: string;
    durationSeconds: number;
    sha256?: string;
  };
  output: { width: number; height: number; fps: number };
  style: {
    presetId: string;
    intensity: number;
    variant: "restrained" | "balanced" | "intense";
    subtitleMode: "minimal" | "emphasis" | "kinetic";
    visualInsertPolicy: "semantic_only" | "rich" | "minimal";
  };
  clips: {
    id: string;
    sourceStartSeconds: number;
    sourceEndSeconds: number;
    outputStartSeconds: number;
    playbackRate: number;
    reason?: string;
  }[];
  overlays: {
    id: string;
    type: "title" | "subtitle" | "graphic" | "broll" | "callout";
    startSeconds: number;
    endSeconds: number;
    timeline: "output";
    purpose: string;
    text?: string;
    assetId?: string;
    evidence?: string;
  }[];
};

export type Transcript = {
  version: string;
  timeline: "source";
  sourceSha256: string;
  sourceDurationSeconds: number;
  engine: string;
  model: string;
  language: string;
  reviewStatus: string;
  captions: Caption[];
};

export type TimelineClip = {
  id: string;
  sourceStartFrame: number;
  sourceEndFrame: number;
  outputStartFrame: number;
  durationInFrames: number;
  reason: string;
};

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(`Edit plan: ${message}`);
};
const finite = (value: number) => Number.isFinite(value);

export const compileTimeline = (plan: EditPlan) => {
  const { fps } = plan.output;
  assert(plan.version === "0.1.0", "неподдерживаемая версия.");
  assert(
    plan.output.width === 1080 && plan.output.height === 1920 && fps === 30,
    "на этом этапе поддерживается 1080×1920, 30 fps.",
  );
  assert(
    plan.source.path === "source.mp4",
    "допустим только локальный source.mp4.",
  );
  assert(
    finite(plan.source.durationSeconds) && plan.source.durationSeconds > 0,
    "неверная длительность исходника.",
  );
  assert(plan.clips.length > 0, "нет клипов.");
  assert(
    plan.style?.presetId === "baseline-unbranded" &&
      plan.style.variant === "restrained" &&
      plan.style.intensity === 20 &&
      plan.style.subtitleMode === "minimal" &&
      plan.style.visualInsertPolicy === "semantic_only",
    "пока поддерживается только фиксированный сдержанный вариант оформления; другие стили не реализованы.",
  );
  let cursor = 0;
  const ids = new Set<string>();
  const clips: TimelineClip[] = plan.clips.map((clip) => {
    assert(!ids.has(clip.id), `повторный id ${clip.id}.`);
    ids.add(clip.id);
    assert(
      [
        clip.sourceStartSeconds,
        clip.sourceEndSeconds,
        clip.outputStartSeconds,
      ].every(finite),
      "время должно быть конечным числом.",
    );
    assert(
      clip.playbackRate === 1,
      "изменение скорости пока не поддерживается.",
    );
    assert(
      clip.sourceStartSeconds >= 0 &&
        clip.sourceEndSeconds > clip.sourceStartSeconds &&
        clip.sourceEndSeconds <= plan.source.durationSeconds + 1e-6,
      `границы исходника у ${clip.id}.`,
    );
    const start = Math.round(clip.sourceStartSeconds * fps);
    const end = Math.round(clip.sourceEndSeconds * fps);
    assert(
      Math.abs(clip.sourceStartSeconds * fps - start) < 1e-5 &&
        Math.abs(clip.sourceEndSeconds * fps - end) < 1e-5,
      "source time должен быть явно выровнен по кадрам, без скрытого округления.",
    );
    const outputStartFrame = Math.round(clip.outputStartSeconds * fps);
    assert(end > start, `клип ${clip.id} короче кадра.`);
    assert(
      Math.abs(clip.outputStartSeconds * fps - outputStartFrame) < 1e-5,
      "output time должен быть выровнен по кадрам.",
    );
    assert(
      outputStartFrame === cursor,
      `разрыв или наложение перед ${clip.id}.`,
    );
    cursor += end - start;
    return {
      id: clip.id,
      sourceStartFrame: start,
      sourceEndFrame: end,
      outputStartFrame,
      durationInFrames: end - start,
      reason: clip.reason ?? "",
    };
  });
  for (const overlay of plan.overlays) {
    assert(!ids.has(overlay.id), `повторный id ${overlay.id}.`);
    ids.add(overlay.id);
    assert(
      overlay.timeline === "output",
      "подписи должны использовать output timeline.",
    );
    assert(
      [overlay.startSeconds, overlay.endSeconds].every(finite) &&
        overlay.startSeconds >= 0 &&
        overlay.endSeconds > overlay.startSeconds &&
        overlay.endSeconds <= cursor / fps + 1e-6,
      `границы подписи ${overlay.id}.`,
    );
    assert(
      ["title", "callout"].includes(overlay.type),
      `тип ${overlay.type} пока не реализован, не будет проигнорирован молча.`,
    );
    assert(
      Boolean(overlay.text?.trim()) &&
        Boolean(overlay.purpose.trim()) &&
        Boolean(overlay.evidence?.trim()),
      `у ${overlay.id} нужны текст, purpose и evidence.`,
    );
    assert(
      (overlay.text?.length ?? 0) <= 85,
      `слишком длинный текст ${overlay.id}.`,
    );
  }
  const sortedOverlays = [...plan.overlays].sort(
    (a, b) => a.startSeconds - b.startSeconds,
  );
  for (let i = 1; i < sortedOverlays.length; i++) {
    assert(
      sortedOverlays[i].startSeconds >= sortedOverlays[i - 1].endSeconds,
      "акценты не должны конкурировать одновременно.",
    );
  }
  return { clips, durationInFrames: cursor, fps };
};

export const captionsForClip = (
  captions: Caption[],
  clip: TimelineClip,
  fps: number,
): Caption[] => {
  const startMs = (clip.sourceStartFrame * 1000) / fps;
  const endMs = (clip.sourceEndFrame * 1000) / fps;
  return captions.filter(
    (word) => word.startMs >= startMs && word.endMs <= endMs,
  );
};

export const validateTranscriptCuts = (
  transcript: Transcript,
  plan: EditPlan,
) => {
  assert(
    transcript.timeline === "source",
    "транскрипт должен оставаться в source timeline.",
  );
  assert(
    Boolean(plan.source.sha256) &&
      transcript.sourceSha256 === plan.source.sha256,
    "транскрипт относится к другому исходнику.",
  );
  let previous = -1;
  for (const word of transcript.captions) {
    assert(
      Boolean(word.text.trim()) &&
        [word.startMs, word.endMs].every(finite) &&
        word.startMs >= 0 &&
        word.endMs > word.startMs &&
        word.endMs <= plan.source.durationSeconds * 1000 + 100,
      "неверные таймкоды слова.",
    );
    assert(word.startMs >= previous, "слова идут не по source time.");
    previous = word.startMs;
  }
  assert(transcript.captions.length > 0, "транскрипт пуст.");
  const { clips, fps } = compileTimeline(plan);
  for (const clip of clips) {
    for (const boundary of [
      (clip.sourceStartFrame * 1000) / fps,
      (clip.sourceEndFrame * 1000) / fps,
    ]) {
      const split = transcript.captions.find(
        (word) => word.startMs + 1e-6 < boundary && boundary < word.endMs - 1e-6,
      );
      assert(
        !split,
        `склейка у ${clip.id} обрезает слово «${split?.text.trim()}» на source=${boundary.toFixed(0)}ms.`,
      );
    }
    assert(
      captionsForClip(transcript.captions, clip, fps).length > 0,
      `клип ${clip.id} не содержит целого слова.`,
    );
  }
};

export const sourceWordToOutput = (
  word: Caption,
  clip: TimelineClip,
  fps: number,
): Caption => {
  const offsetMs =
    ((clip.outputStartFrame - clip.sourceStartFrame) * 1000) / fps;
  return {
    ...word,
    startMs: word.startMs + offsetMs,
    endMs: word.endMs + offsetMs,
    timestampMs: word.timestampMs === null ? null : word.timestampMs + offsetMs,
  };
};
