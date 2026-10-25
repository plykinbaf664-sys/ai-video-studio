export type Variant = "editorial" | "dynamic" | "irony";
export type CueType = "caption" | "hero" | "label";
export type TimedCue = {
  id: string;
  type: CueType;
  startFrame: number;
  endFrame: number;
  text: string;
  meaning?: string;
  highlightText?: string;
  punchLabel?: string;
};
export type DesignPreviewProps = {
  variant: Variant;
  videoFile?: string;
  /** Demo cues are fictional — never render them over unrelated audio. */
  demoMode: boolean;
  cues: TimedCue[];
  /** videoFile is purely a video layer. Sound should be sourced/trimmed by the existing edit pipeline. */
};
