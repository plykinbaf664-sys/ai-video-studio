import { colorCorrection } from "@remotion/effects/color-correction";
// Source-specific SDR correction, not a universal LUT or Log/HDR conversion.
export const sourceGrade = {
  sourceSha256:
    "7db3f25c076c82732d8481c37233ac0d017c0ab70923ae233e1f198cecac471c",
  adjustments: {
    exposure: 0.08,
    shadows: 0.1,
    highlights: -0.14,
    whites: -0.035,
    blacks: -0.015,
    contrast: 1.045,
    pivot: 0.42,
    saturation: 0.96,
    temperature: 0.015,
    tint: 0,
    vibrance: 0.025,
  },
};
export const footageEffects = [colorCorrection(sourceGrade.adjustments)];
