import React, { useLayoutEffect, useMemo, useRef } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { TimedCue, Variant } from "../types";
import { tokens } from "../theme";
import { personalStyles } from "../runtime";
import { SemanticBrackets } from "./SemanticBrackets";

export const fitPersonalText = (
  text: string,
  width: number,
  preferred: number,
  minimum: number,
  weight: number,
) => {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) throw new Error("Text measurement unavailable");
  const words = text.trim().split(/\s+/);
  for (let size = preferred; size >= minimum; size--) {
    ctx.font = `${weight} ${size}px PersonalOnest`;
    const measure = (s: string) => ctx.measureText(s).width;
    if (measure(text) <= width) return { lines: [text], size };
    const splits = words
      .slice(1)
      .map((_, i) => {
        const a = words.slice(0, i + 1).join(" "),
          b = words.slice(i + 1).join(" ");
        return {
          lines: [a, b],
          score:
            Math.abs(measure(a) - measure(b)) +
            (/^(и|не|что|мне|в)$/i.test(words[i]) ? width : 0),
        };
      })
      .filter((x) => x.lines.every((s) => measure(s) <= width))
      .sort((a, b) => a.score - b.score);
    if (splits.length) return { lines: splits[0].lines, size };
  }
  throw new Error(`Cannot fit two readable lines: ${text}`);
};
export const PersonalCue: React.FC<{
  cues: TimedCue[];
  variant: Variant;
  split?: boolean;
}> = ({ cues, variant, split = false }) => {
  const f = useCurrentFrame(),
    current = cues.filter((c) => c.startFrame <= f && c.endFrame > f);
  if (current.length > 1) throw new Error("Duplicate personal subtitle cues");
  return current[0] ? (
    <SpeechCard cue={current[0]} variant={variant} split={split} />
  ) : null;
};
const SpeechCard: React.FC<{
  cue: TimedCue;
  variant: Variant;
  split: boolean;
}> = ({ cue, variant, split }) => {
  const f = useCurrentFrame(),
    style = personalStyles[variant],
    d = style.design,
    ref = useRef<HTMLDivElement>(null);
  const hero = cue.type === "hero",
    typography = hero ? d.heading : d.subtitle,
    weight = hero ? d.font.headingWeight : d.font.subtitleWeight;
  const layout = useMemo(
    () =>
      fitPersonalText(
        cue.text,
        d.slot.width - d.card.paddingX * 2,
        typography.preferredSize,
        typography.minSize,
        weight,
      ),
    [cue.text, d, typography, weight],
  );
  const p = interpolate(
    f - cue.startFrame,
    [0, style.rules.motion.quoteFadeFrames],
    [0.72, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  useLayoutEffect(() => {
    const card = ref.current,
      root = card?.closest("[data-personal-frame]");
    if (!card || !root) throw new Error("Missing personal QC root");
    const parent = root.getBoundingClientRect(),
      b = card.getBoundingClientRect(),
      scale = parent.width / 1080;
    if (!scale) return;
    if (root.querySelectorAll("[data-current-speech]").length !== 1)
      throw new Error("Duplicate speech layers");
    if (
      (b.left - parent.left) / scale < 95 ||
      (b.right - parent.left) / scale > 901 ||
      (b.top - parent.top) / scale < 139 ||
      (b.bottom - parent.top) / scale > (split ? 500 : 360)
    )
      throw new Error(`Speech outside face-safe slot: ${cue.text}`);
    const lines = card.querySelectorAll<HTMLElement>("[data-personal-line]");
    if (
      lines.length > 2 ||
      [...lines].some((line) => line.scrollWidth > line.clientWidth + 1)
    )
      throw new Error("Clipped personal caption");
    card.dataset.visualQc = "passed";
  }, [f, cue.text, split]);
  return (
    <div
      style={{
        position: "absolute",
        left: d.slot.x,
        top: split ? 300 : d.slot.y,
        width: d.slot.width,
        zIndex: 10,
        opacity: p,
        transform: `translateY(${(1 - p) * (variant === "dynamic" ? 12 : 5)}px)`,
      }}
    >
      <div
        ref={ref}
        data-current-speech
        data-personal-cue={cue.id}
        data-lines={layout.lines.length}
        data-font-size={layout.size}
        style={{
          display: "inline-block",
          boxSizing: "border-box",
          maxWidth: d.slot.width,
          padding: `${d.card.paddingY}px ${d.card.paddingX}px`,
          borderRadius: d.card.radius,
          background: d.card.background,
          color: d.card.text,
          fontFamily: d.font.family,
          fontSize: layout.size,
          fontWeight: weight,
          lineHeight: typography.lineHeight,
          boxShadow: `0 0 0 1px ${d.card.border}`,
        }}
      >
        {layout.lines.map((line, i) => (
          <div key={i} data-personal-line style={{ whiteSpace: "nowrap" }}>
            {line.split(" ").map((word, j) => (
              <React.Fragment key={j}>
                {j ? " " : ""}
                <span
                  style={{
                    fontWeight: /^(сам|инициатива)[.,!?]?$/i.test(word)
                      ? d.font.headingWeight
                      : undefined,
                    color:
                      variant === "dynamic" &&
                      /^(сам|инициатива)[.,!?]?$/i.test(word)
                        ? tokens.copper
                        : undefined,
                  }}
                >
                  {word}
                </span>
              </React.Fragment>
            ))}
          </div>
        ))}
        {hero && variant === "editorial" && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 24,
              width: (125 * (p - 0.72)) / 0.28,
              height: 3,
              background: tokens.copper,
            }}
          />
        )}
        {hero && variant === "irony" && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: tokens.copper,
            }}
          />
        )}
      </div>
      {hero && variant === "dynamic" && (
        <div style={{ position: "absolute", inset: -8, pointerEvents: "none" }}>
          <SemanticBrackets startFrame={cue.startFrame} mode="firm">
            <span
              style={{
                display: "inline-block",
                width: d.slot.width - 34,
                height:
                  layout.lines.length * layout.size * typography.lineHeight +
                  20,
              }}
            />
          </SemanticBrackets>
        </div>
      )}
    </div>
  );
};
