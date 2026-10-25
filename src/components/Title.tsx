import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const Title: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const end = Math.min(durationInFrames, Math.round(4 * fps));
  const ramp = Math.max(
    1,
    Math.min(Math.round(0.4 * fps), Math.floor(end / 3)),
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 1620,
        left: 88,
        right: 88,
        color: "#f5f5f0",
        fontFamily: "Arial, sans-serif",
        fontSize: 84,
        lineHeight: 1.12,
        fontWeight: 700,
        overflowWrap: "anywhere",
        opacity: interpolate(
          frame,
          [0, ramp, Math.max(ramp + 1, end - ramp), Math.max(ramp + 2, end)],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        ),
        translate: interpolate(frame, [0, ramp], ["0px 24px", "0px 0px"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      <span style={{ position: "relative", display: "inline-block" }}>
        {title}
        {/* One accent emphasizes the opening title without altering footage. */}
        <span
          style={{
            display: "block",
            marginTop: 24,
            height: 8,
            backgroundColor: "#b8e578",
            width:
              interpolate(frame, [ramp, ramp + 0.45 * fps], [0, 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) + "%",
          }}
        />
      </span>
    </div>
  );
};
