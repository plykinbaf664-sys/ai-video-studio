import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { Title } from "./components/Title";
import { SourceNotice } from "./components/SourceNotice";
import type { FirstTestProps } from "./core/types";

export const FirstTest: React.FC<FirstTestProps> = ({
  title,
  source,
  sourceError,
}) => {
  const { fps, durationInFrames } = useVideoConfig();

  if (!source) return <SourceNotice message={sourceError} />;

  return (
    <AbsoluteFill style={{ backgroundColor: "#111318" }}>
      {/* One media node owns picture and original sound, from frame zero. */}
      <Video
        name="Исходное видео + оригинальный звук"
        src={staticFile("source.mp4")}
        volume={1}
        playbackRate={1}
        objectFit="contain"
        style={{ position: "absolute", inset: 0, width: "100%", height: 1580 }}
      />
      {/* A separate band preserves the entire source image, including faces. */}
      <Sequence
        name="Титр и акцент на названии"
        durationInFrames={Math.min(durationInFrames, Math.round(4 * fps))}
        layout="none"
      >
        <Title title={title} />
      </Sequence>
    </AbsoluteFill>
  );
};
