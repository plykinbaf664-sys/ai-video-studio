export const OUTPUT = { width: 1080, height: 1920, fps: 30 } as const;

export const framesForDuration = (
  seconds: number,
  fps = OUTPUT.fps,
): number => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Source duration must be a finite positive number.");
  }
  // Keep the whole source; the last frame can add less than 1/fps seconds.
  return Math.max(1, Math.ceil(seconds * fps));
};

export const orientationFor = (width: number, height: number) => {
  if (!(width > 0 && height > 0)) {
    throw new Error("Source dimensions must be positive.");
  }
  return width === height
    ? "square"
    : width > height
      ? "landscape"
      : "portrait";
};
