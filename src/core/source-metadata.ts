import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import { staticFile, type CalculateMetadataFunction } from "remotion";
import { framesForDuration, orientationFor } from "./media-contract";
import type { FirstTestProps } from "./types";

export const calculateSourceMetadata: CalculateMetadataFunction<
  FirstTestProps
> = async ({ props, abortSignal, isRendering }) => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(staticFile("source.mp4")),
  });
  const dispose = () => input.dispose();
  abortSignal.addEventListener("abort", dispose, { once: true });

  try {
    const response = await fetch(staticFile("source.mp4"), {
      method: "HEAD",
      signal: abortSignal,
    });
    if (!response.ok) {
      throw new Error(
        "Поместите исходник в public/source.mp4 и обновите Studio.",
      );
    }
    const video = await input.getPrimaryVideoTrack();
    if (!video) throw new Error("В source.mp4 не найдена видеодорожка.");
    const audio = await input.getPrimaryAudioTrack();
    if (!audio) throw new Error("В source.mp4 нет исходной звуковой дорожки.");

    const [width, height, rotation, durationInSeconds, metrics] =
      await Promise.all([
        video.getDisplayWidth(),
        video.getDisplayHeight(),
        video.getRotation(),
        input.computeDuration(),
        video.computeFrameRateMetrics({ targetPacketCount: 100 }),
      ]);

    return {
      durationInFrames: framesForDuration(durationInSeconds),
      defaultOutName: "first-test",
      defaultCodec: "h264",
      props: {
        ...props,
        sourceError: null,
        source: {
          width,
          height,
          rotation,
          durationInSeconds,
          sourceFps:
            metrics.probedPacketCount < 2 ? null : metrics.bestGuessFrameRate,
          hasAudio: true,
          orientation: orientationFor(width, height),
        },
      },
    };
  } catch (error) {
    if (abortSignal.aborted || isRendering) throw error;
    return {
      durationInFrames: 90,
      props: {
        ...props,
        source: null,
        sourceError: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    abortSignal.removeEventListener("abort", dispose);
    input.dispose();
  }
};
