import { Video, Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import {
  captionsForClip,
  compileTimeline,
  validateTranscriptCuts,
} from "../../director/timeline";
import type { EditPlan, Transcript } from "../../director/timeline";
import { buildCaptionCues } from "../../design/caption-layout";
import { PersonalCue } from "./components/PersonalCue";
import { usePersonalFonts } from "./fonts";
import { tokens } from "./theme";
import type { TimedCue, Variant } from "./types";
import { sourceGrade, footageEffects } from "../../color/source-grade";
import audioPolicy from "./audio-policy.json";
import { normalizeSpeech } from "../../director/speech-integrity";
export type PersonalProps = {
  variant: Variant;
  edit: { plan: EditPlan; transcript: Transcript } | null;
  grade?: boolean;
};
export const personalSounds = audioPolicy.sounds;
export const PersonalCut: React.FC<PersonalProps> = ({
  variant,
  edit,
  grade = true,
}) => {
  const ready = usePersonalFonts();
  if (!edit || !ready)
    return <AbsoluteFill style={{ background: tokens.ink }} />;
  const { plan, transcript } = edit;
  if (plan.source.sha256 !== sourceGrade.sourceSha256)
    throw new Error("Grade belongs to another source");
  validateTranscriptCuts(transcript, plan);
  const { clips, durationInFrames } = compileTimeline(plan);
  if (durationInFrames !== 450)
    throw new Error("Personal comparison requires 450 identical frames");
  if (variant === "dynamic") {
    const heard = normalizeSpeech(
      clips
        .slice(0, 2)
        .flatMap((c) => captionsForClip(transcript.captions, c, 30))
        .map((w) => w.text)
        .join(" "),
    );
    for (const quote of ["Не позволял", "Сам решил"])
      if (!heard.includes(normalizeSpeech(quote)))
        throw new Error("Diagram quote absent from earlier retained speech");
  }
  return (
    <AbsoluteFill data-personal-frame style={{ background: tokens.ink }}>
      {clips.map((clip, index) => {
        const split = variant === "dynamic" && index === 2;
        const cues: TimedCue[] = buildCaptionCues(
          captionsForClip(transcript.captions, clip, 30),
          (clip.sourceEndFrame * 1000) / 30,
        ).map((c, i) => ({
          id: `${clip.id}-${i}`,
          startFrame: Math.ceil((c.startMs * 30) / 1000),
          endFrame: Math.ceil((c.endMs * 30) / 1000),
          text: c.text,
          type: index === 2 && i === 1 ? "hero" : "caption",
        }));
        return (
          <Sequence
            key={clip.id}
            from={clip.outputStartFrame}
            trimBefore={clip.sourceStartFrame}
            durationInFrames={clip.durationInFrames}
            name={clip.id}
          >
            <div
              data-footage-roi={
                split ? "163.125,520,753.75,1340" : "0,0,1080,1920"
              }
              style={{
                position: "absolute",
                left: 0,
                top: split ? 520 : 0,
                width: 1080,
                height: split ? 1340 : 1920,
              }}
            >
              <Video
                src={staticFile("source.mp4")}
                objectFit="contain"
                volume={audioPolicy.voiceGain}
                effects={grade ? footageEffects : []}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            {split && <QuoteFlow />}
            {variant === "dynamic" && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 140,
                  left: 104,
                  display: "flex",
                  gap: 8,
                }}
              >
                {clips.map((c, i) => (
                  <div
                    key={c.id}
                    style={{
                      height: 3,
                      width: 48,
                      background: i <= index ? tokens.copper : tokens.edge,
                    }}
                  />
                ))}
              </div>
            )}
            <PersonalCue cues={cues} variant={variant} split={split} />
          </Sequence>
        );
      })}
      {personalSounds[variant].map((s) => (
        <Sequence
          key={s.file}
          from={s.frame}
          durationInFrames={Math.min(12, 450 - s.frame)}
        >
          <Audio
            src={staticFile(`design-kit/sfx/${s.file}`)}
            volume={s.volume}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
/** Already-heard quotations in a dimmed context role; never a second subtitle layer. */
const QuoteFlow = () => (
  <div
    data-historical-quotes
    style={{
      position: "absolute",
      left: 104,
      top: 192,
      width: 772,
      fontFamily: tokens.uiFont,
      fontSize: 27,
      fontWeight: 500,
      color: tokens.warm,
      opacity: 0.52,
      display: "flex",
      alignItems: "center",
      gap: 22,
    }}
  >
    <span
      style={{
        padding: "14px 18px",
        border: `1px solid ${tokens.edge}`,
        borderRadius: 10,
      }}
    >
      Не позволял
    </span>
    <span aria-hidden>→</span>
    <span
      style={{
        padding: "14px 18px",
        border: `1px solid ${tokens.edge}`,
        borderRadius: 10,
      }}
    >
      Сам решил
    </span>
    <span aria-hidden>↓</span>
  </div>
);
