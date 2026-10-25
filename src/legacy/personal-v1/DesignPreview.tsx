import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import type { DesignPreviewProps } from "./types";
import { tokens, variants } from "./theme";
import { CueRenderer } from "./components/CueRenderer";

/**
 * Standalone graphic preview, not a full editor. videoFile requires owned media in public/.
 * For real footage, demoMode=false and pass real time-aligned cues; do NOT apply demo text.
 */
export const DesignPreview: React.FC<DesignPreviewProps> = ({
  variant,
  videoFile,
  demoMode,
  cues,
}) => {
  const frame = useCurrentFrame();
  const opt = variants[variant];
  const zoom = interpolate(frame, [0, 359], [1, opt.maxZoom], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const renderedCues = videoFile && !demoMode ? cues : demoMode ? cues : [];
  return (
    <AbsoluteFill style={{ background: tokens.ink, overflow: "hidden" }}>
      {videoFile ? (
        <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
          <OffthreadVideo
            src={staticFile(videoFile)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background:
              variant === "irony"
                ? "linear-gradient(155deg,#29221F,#131519 62%)"
                : variant === "dynamic"
                  ? "linear-gradient(160deg,#17201F,#0F1116 67%)"
                  : "linear-gradient(155deg,#272A2D,#0F1116 70%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 600,
              left: 0,
              width: "100%",
              height: 800,
              background:
                "radial-gradient(circle at 50% 48%,rgba(232,121,66,.15),transparent 60%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 790,
              left: 145,
              right: 145,
              height: 560,
              border: "1px solid rgba(246,243,236,.13)",
              borderRadius: 25,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 1065,
              left: 170,
              right: 170,
              textAlign: "center",
              fontFamily: tokens.uiFont,
              fontSize: 30,
              letterSpacing: 5,
              color: "rgba(246,243,236,.32)",
            }}
          >
            ПРЕВЬЮ СТИЛЯ · ВИДЕО НЕ ПОДКЛЮЧЕНО
          </div>
        </AbsoluteFill>
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom,rgba(0,0,0,.36),transparent 32%,transparent 60%,rgba(0,0,0,.33))",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 114,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 30,
            background: tokens.copper,
            display: "inline-block",
          }}
        />
        <span
          style={{
            fontFamily: tokens.uiFont,
            fontSize: 22,
            letterSpacing: 3,
            color: tokens.warm,
            opacity: 0.8,
          }}
        >
          AI VIDEO STUDIO · {variant.toUpperCase()}
        </span>
      </div>
      {variant === "dynamic" && (
        <div
          style={{
            position: "absolute",
            top: 212,
            left: 80,
            right: 80,
            height: 5,
            background: "rgba(246,243,236,.2)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(interpolate(frame, [0, 359], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))}%`,
              background: tokens.copper,
            }}
          />
        </div>
      )}
      <CueRenderer cues={renderedCues} variant={variant} />
      <div
        style={{
          position: "absolute",
          bottom: 118,
          left: 80,
          fontFamily: tokens.uiFont,
          color: "rgba(246,243,236,.45)",
          fontSize: 20,
          letterSpacing: 2,
        }}
      >
        {demoMode
          ? "ДЕМОНСТРАЦИЯ ТИПОГРАФИКИ · НЕ СИНХРОНИЗИРОВАНО С РЕЧЬЮ"
          : "СИНХРОНИЗАЦИЯ ИЗ МОНТАЖНОГО ПЛАНА"}
      </div>
    </AbsoluteFill>
  );
};
