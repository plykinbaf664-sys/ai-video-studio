import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { tokens } from "../theme";

/** Reusable semantic signature; place around ONE important word/number. */
export const SemanticBrackets: React.FC<{
  startFrame: number;
  mode?: "soft" | "firm";
  children: React.ReactNode;
}> = ({ startFrame, mode = "soft", children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(
    frame - startFrame,
    [0, mode === "firm" ? 6 : 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const corner: React.CSSProperties = {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: tokens.copper,
    borderStyle: "solid",
    borderWidth: 0,
    opacity: p,
  };
  return (
    <span
      style={{
        display: "inline-block",
        position: "relative",
        padding: "4px 17px",
        whiteSpace: "normal",
      }}
    >
      <span
        style={{
          ...corner,
          top: -6,
          left: -2,
          borderTopWidth: 3,
          borderLeftWidth: 3,
          transform: `translate(${-7 * (1 - p)}px,${-5 * (1 - p)}px)`,
        }}
      />
      <span
        style={{
          ...corner,
          top: -6,
          right: -2,
          borderTopWidth: 3,
          borderRightWidth: 3,
          transform: `translate(${7 * (1 - p)}px,${-5 * (1 - p)}px)`,
        }}
      />
      {children}
      <span
        style={{
          ...corner,
          bottom: -6,
          left: -2,
          borderBottomWidth: 3,
          borderLeftWidth: 3,
          transform: `translate(${-7 * (1 - p)}px,${5 * (1 - p)}px)`,
        }}
      />
      <span
        style={{
          ...corner,
          bottom: -6,
          right: -2,
          borderBottomWidth: 3,
          borderRightWidth: 3,
          transform: `translate(${7 * (1 - p)}px,${5 * (1 - p)}px)`,
        }}
      />
    </span>
  );
};
