export type SourceMetadata = {
  width: number;
  height: number;
  rotation: number;
  durationInSeconds: number;
  sourceFps: number | null;
  hasAudio: boolean;
  orientation: "portrait" | "landscape" | "square";
};

export type FirstTestProps = {
  title: string;
  source: SourceMetadata | null;
  sourceError: string | null;
};
