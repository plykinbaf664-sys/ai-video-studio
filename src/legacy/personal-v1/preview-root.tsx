import React from "react";
import { Composition } from "remotion";
import { DesignPreview } from "./DesignPreview";
import type { TimedCue, Variant } from "./types";
import demo from "./demo-cues.json";

const sharedCues = demo.events as TimedCue[];
const createProps = (variant: Variant) => ({
  variant,
  demoMode: true,
  videoFile: undefined,
  cues: sharedCues,
});
export const DesignPreviewRoot: React.FC = () => (
  <>
    <Composition
      id="AIVS-Editorial"
      component={DesignPreview}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={360}
      defaultProps={createProps("editorial")}
    />
    <Composition
      id="AIVS-Dynamic"
      component={DesignPreview}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={360}
      defaultProps={createProps("dynamic")}
    />
    <Composition
      id="AIVS-Irony"
      component={DesignPreview}
      width={1080}
      height={1920}
      fps={30}
      durationInFrames={360}
      defaultProps={createProps("irony")}
    />
  </>
);
