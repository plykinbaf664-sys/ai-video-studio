import { Composition, staticFile } from "remotion";
import { PersonalCut } from "./PersonalCut";
import type { PersonalProps } from "./PersonalCut";
import type { Variant } from "./types";
export const PersonalRoot = () => (
  <>
    {(["editorial", "dynamic", "irony"] as Variant[]).map((variant) => (
      <Composition
        key={variant}
        id={`Personal-${variant}`}
        component={PersonalCut}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={450}
        defaultProps={{ variant, edit: null, grade: true } as PersonalProps}
        calculateMetadata={async ({ props }) => {
          const response = await fetch(
            staticFile("generated/personal/edit.json"),
          );
          if (!response.ok) throw new Error("Run npm run prepare:personal");
          const edit = await response.json();
          return { props: { ...props, edit } };
        }}
      />
    ))}
  </>
);
