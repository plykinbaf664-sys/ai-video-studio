import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import { EditorialCaptions, EditorialOverlay } from "./design/EditorialText";
import { captionsForClip, compileTimeline } from "./director/timeline";
import type { SemanticProps } from "./director/load-edit";
import { baselineStyle } from "./styles/baseline";

export const SemanticCut: React.FC<SemanticProps> = ({ edit, error }) => {
  const { fps } = useVideoConfig();
  if (!edit)
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#111318",
          color: "white",
          padding: 88,
          justifyContent: "center",
          fontFamily: "Arial",
          fontSize: 54,
          gap: 36,
        }}
      >
        <strong>Ожидается монтажный план</strong>
        <div>
          {error ?? "Подготовьте расшифровку и монтажный план из исходника."}
        </div>
      </AbsoluteFill>
    );
  const { plan, transcript } = edit;
  const { clips } = compileTimeline(plan);
  return (
    <AbsoluteFill
      data-studio-design-frame
      style={{ backgroundColor: "#111318" }}
    >
      {clips.map((clip) => (
        <Sequence
          key={clip.id}
          name={clip.id}
          from={clip.outputStartFrame}
          trimBefore={clip.sourceStartFrame}
          durationInFrames={clip.durationInFrames}
        >
          {/* This shared source clock trims picture, original sound and captions together. */}
          <Video
            name="Исходник со звуком"
            src={staticFile("source.mp4")}
            objectFit={baselineStyle.rules.framing.objectFit}
            volume={1}
            style={{ width: "100%", height: "100%" }}
          />
          <EditorialCaptions
            clipEndMs={(clip.sourceEndFrame * 1000) / fps}
            captions={captionsForClip(transcript.captions, clip, fps)}
          />
        </Sequence>
      ))}
      {plan.overlays.map((overlay) => (
        <Sequence
          key={overlay.id}
          name={overlay.purpose}
          from={Math.round(overlay.startSeconds * fps)}
          durationInFrames={
            Math.round(overlay.endSeconds * fps) -
            Math.round(overlay.startSeconds * fps)
          }
        >
          <EditorialOverlay
            durationInFrames={
              Math.round(overlay.endSeconds * fps) -
              Math.round(overlay.startSeconds * fps)
            }
            text={overlay.text ?? ""}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
