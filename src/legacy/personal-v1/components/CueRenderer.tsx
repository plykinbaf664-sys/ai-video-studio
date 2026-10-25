import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { TimedCue, Variant } from "../types";
import { tokens, variants } from "../theme";
import { SemanticBrackets } from "./SemanticBrackets";

const Anim: React.FC<{
  startFrame: number;
  speed: number;
  children: React.ReactNode;
  vertical?: number;
}> = ({ startFrame, speed, vertical = 14, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f - startFrame, [0, speed], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{ opacity: p, transform: `translateY(${(1 - p) * vertical}px)` }}
    >
      {children}
    </div>
  );
};

const Hero: React.FC<{ cue: TimedCue; variant: Variant }> = ({
  cue,
  variant,
}) => {
  const opt = variants[variant];
  const f = useCurrentFrame();
  const progress = interpolate(
    f - cue.startFrame,
    [0, opt.animationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const mark =
    cue.highlightText && cue.text.includes(cue.highlightText)
      ? cue.text.split(cue.highlightText)
      : null;
  const label = (
    <span
      style={{
        fontFamily: tokens.uiFont,
        fontWeight: 750,
        fontSize: 24,
        letterSpacing: 2,
        color: variant === "dynamic" ? tokens.copper : tokens.warm,
      }}
    >
      {opt.eyebrow}
    </span>
  );
  return (
    <div
      style={{
        position: "absolute",
        top: opt.topY,
        left: 80,
        right: 85,
        color: opt.proseColor,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      <Anim startFrame={cue.startFrame} speed={opt.animationFrames}>
        <div
          style={{
            marginBottom: 24,
            display: "flex",
            gap: 14,
            alignItems: "center",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 28,
              height: 3,
              background: tokens.copper,
            }}
          />
          {label}
        </div>
        <div
          style={{
            fontFamily: tokens.primaryFont,
            fontSize: opt.headlineSize,
            fontWeight: opt.headlineWeight,
            lineHeight: 1.06,
            letterSpacing: -1.3,
            textWrap: "balance",
            maxWidth: 900,
            textShadow: "0px 3px 20px rgba(0,0,0,0.14)",
          }}
        >
          {variant === "dynamic" && mark ? (
            <>
              {mark[0]}
              <SemanticBrackets startFrame={cue.startFrame + 1} mode="firm">
                {cue.highlightText}
              </SemanticBrackets>
              {mark.slice(1).join(cue.highlightText)}
            </>
          ) : (
            cue.text
          )}
        </div>
        {variant === "editorial" && (
          <div
            style={{
              height: 3,
              width: Math.round(progress * 175),
              background: tokens.copper,
              marginTop: 28,
            }}
          />
        )}
        {variant === "irony" && cue.punchLabel && (
          <div
            style={{
              display: "inline-block",
              marginTop: 22,
              padding: "12px 19px",
              background: tokens.warm,
              color: tokens.ink,
              fontSize: 27,
              fontWeight: 750,
              transform: "rotate(-1.4deg)",
            }}
          >
            {cue.punchLabel}
          </div>
        )}
      </Anim>
    </div>
  );
};

const Subtitle: React.FC<{ cue: TimedCue; variant: Variant }> = ({
  cue,
  variant,
}) => {
  const opt = variants[variant];
  return (
    <div
      style={{
        position: "absolute",
        top: 1410,
        left: 95,
        right: 112,
        zIndex: 11,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <Anim
        startFrame={cue.startFrame}
        speed={opt.animationFrames}
        vertical={variant === "dynamic" ? 15 : 5}
      >
        <div
          style={{
            maxWidth: 830,
            fontFamily: tokens.primaryFont,
            fontSize: opt.subtitleSize,
            fontWeight: 600,
            lineHeight: 1.19,
            letterSpacing: -0.6,
            padding: "14px 23px",
            borderRadius: variant === "dynamic" ? 9 : 5,
            textAlign: "center",
            color: tokens.warm,
            background: tokens.subBg,
            boxShadow: "0 7px 28px rgba(0,0,0,.13)",
            overflowWrap: "break-word",
          }}
        >
          {cue.text}
        </div>
      </Anim>
    </div>
  );
};

/** Cue renderer is responsible for the single compositor subtitle layer. */
export const CueRenderer: React.FC<{ cues: TimedCue[]; variant: Variant }> = ({
  cues,
  variant,
}) => {
  const f = useCurrentFrame();
  const now = cues.filter((c) => c.startFrame <= f && c.endFrame > f);
  const hero = now.find((c) => c.type === "hero");
  const caption = hero ? undefined : now.find((c) => c.type === "caption");
  const label =
    !hero && !caption ? now.find((c) => c.type === "label") : undefined;
  return (
    <>
      {hero && <Hero cue={hero} variant={variant} />}{" "}
      {caption && <Subtitle cue={caption} variant={variant} />}
      {label && (
        <div
          style={{
            position: "absolute",
            top: 1050,
            right: 90,
            padding: "18px 22px",
            fontSize: 32,
            color: tokens.warm,
            background: tokens.ink,
          }}
        >
          <Anim startFrame={label.startFrame} speed={9}>
            {label.text}
          </Anim>
        </div>
      )}
    </>
  );
};
