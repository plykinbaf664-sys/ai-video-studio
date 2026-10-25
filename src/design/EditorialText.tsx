import type { Caption } from "@remotion/captions";
import { useLayoutEffect, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BASELINE,
  buildCaptionCues,
  cueAtTime,
  fitTwoLines,
} from "./caption-layout";
import { measureBaselineText, useBaselineFont } from "./fonts";
import { baselineStyle } from "../styles/baseline.ts";

const TextCard: React.FC<{ text: string; kind: "subtitle" | "heading" }> = ({
  text,
  kind,
}) => {
  const layout = useMemo(
    () => fitTwoLines(text, measureBaselineText, kind),
    [text, kind],
  );
  const ref = useRef<HTMLDivElement>(null);
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const card = ref.current;
    const root = card?.closest("[data-studio-design-frame]");
    if (!card || !root) throw new Error("Missing visual QC root.");
    const parent = root.getBoundingClientRect();
    const scale = parent.width / 1080;
    if (scale <= 0) return;
    const active = root.querySelectorAll("[data-studio-text-card]");
    if (active.length > 1)
      throw new Error("Visual QC: multiple text cards at the same time.");
    const box = card.getBoundingClientRect();
    const x = (box.left - parent.left) / scale;
    const y = (box.top - parent.top) / scale;
    const right = (box.right - parent.left) / scale;
    const bottom = (box.bottom - parent.top) / scale;
    if (
      x < BASELINE.safe.left - 1 ||
      y < BASELINE.safe.top - 1 ||
      right > 1080 - BASELINE.safe.right + 1 ||
      bottom > BASELINE.slot.y + BASELINE.slot.maxHeight + 1
    )
      throw new Error(`Visual QC: text outside its safe slot: ${text}`);
    const lines = card.querySelectorAll<HTMLElement>("[data-studio-text-line]");
    if (lines.length > 2)
      throw new Error("Visual QC: more than two subtitle lines.");
    for (const line of lines) {
      const bounds = line.getBoundingClientRect();
      if (
        bounds.right > box.right + 1 ||
        line.scrollWidth > line.clientWidth + 1
      )
        throw new Error(`Visual QC: clipped text: ${text}`);
    }
    card.dataset.visualQc = "passed";
    card.dataset.frame = String(frame);
  }, [frame, text]);
  return (
    <div
      ref={ref}
      data-studio-text-card={kind}
      data-line-count={layout.lines.length}
      data-font-size={layout.fontSize}
      style={{
        display: "inline-block",
        boxSizing: "border-box",
        maxWidth: BASELINE.slot.width,
        padding: `${BASELINE.paddingY}px ${BASELINE.paddingX}px`,
        borderRadius: BASELINE.card.radius,
        backgroundColor: BASELINE.card.background,
        boxShadow: `0 0 0 1px ${BASELINE.card.border}`,
        color: BASELINE.card.text,
        fontFamily: BASELINE.fontFamily,
        fontSize: layout.fontSize,
        fontWeight: kind === "heading" ? BASELINE.font.headingWeight : BASELINE.font.subtitleWeight,
        lineHeight: layout.lineHeight,
        letterSpacing: 0,
        textAlign: "left",
      }}
    >
      {layout.lines.map((line, index) => (
        <div data-studio-text-line key={index} style={{ whiteSpace: "nowrap" }}>
          {line.split(" ").map((word, i) => (
            <span
              key={i}
              style={{
                fontWeight: /^(сам|независимый|инициатива)[.,!?]?$/i.test(word)
                  ? BASELINE.font.headingWeight
                  : undefined,
              }}
            >
              {i ? " " : ""}
              {word}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

const slotStyle: React.CSSProperties = {
  position: "absolute",
  left: BASELINE.slot.x,
  top: BASELINE.slot.y,
  width: BASELINE.slot.width,
};

export const EditorialCaptions: React.FC<{
  captions: Caption[];
  clipEndMs: number;
}> = ({ captions, clipEndMs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ready = useBaselineFont();
  const cues = useMemo(
    () => buildCaptionCues(captions, clipEndMs),
    [captions, clipEndMs],
  );
  const cue = cueAtTime(cues, (frame * 1000) / fps);
  if (!ready || !cue) return null;
  return (
    <div data-studio-text-role="subtitle" style={slotStyle}>
      <TextCard text={cue.text} kind="subtitle" />
    </div>
  );
};

export const EditorialOverlay: React.FC<{
  text: string;
  durationInFrames: number;
}> = ({ text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const ready = useBaselineFont();
  if (!ready) return null;
  const ramp = Math.min(baselineStyle.rules.motion.quoteFadeFrames, Math.floor(durationInFrames / 3));
  return (
    <div
      data-studio-text-role="heading"
      style={{
        ...slotStyle,
        opacity: interpolate(
          frame,
          [0, ramp, durationInFrames - ramp, durationInFrames],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
      }}
    >
      <TextCard text={text} kind="heading" />
    </div>
  );
};
