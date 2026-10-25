import { loadFont } from "@remotion/fonts";
import { useEffect, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import { BASELINE } from "./caption-layout";

let fontPromise: Promise<unknown> | null = null;
const ensureFont = () => {
  if (!fontPromise)
    fontPromise = Promise.all(
      [...new Set([BASELINE.font.subtitleWeight, BASELINE.font.headingWeight])].map((weight) =>
        loadFont({
          family: BASELINE.fontFamily,
          url: staticFile(BASELINE.fontSrc),
          weight: String(weight),
        }),
      ),
    );
  return fontPromise;
};

export const useBaselineFont = () => {
  const [handle] = useState(() =>
    delayRender("Load licensed baseline font before text layout"),
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    ensureFont()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(cancelRender);
  }, [handle]);
  return ready;
};

export const measureBaselineText = (text: string, fontSize: number) => {
  if (!document.fonts.check(`${BASELINE.font.headingWeight} ${fontSize}px "${BASELINE.fontFamily}"`))
    throw new Error("Baseline font is not loaded; refusing fallback metrics.");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Text measurement unavailable.");
  context.font = `${BASELINE.font.headingWeight} ${fontSize}px "${BASELINE.fontFamily}"`;
  return context.measureText(text).width;
};
