import { staticFile, type CalculateMetadataFunction } from "remotion";
import { calculateSourceMetadata } from "../core/source-metadata";
import { buildTextSchedule } from "../design/caption-layout";
import {
  compileTimeline,
  validateTranscriptCuts,
  captionsForClip,
  sourceWordToOutput,
  type EditPlan,
  type Transcript,
} from "./timeline";
import { auditCaptionTimeline, auditOverlayQuotes } from "./speech-integrity";

export type SemanticProps = {
  edit: { plan: EditPlan; transcript: Transcript } | null;
  error: string | null;
};

export const calculateEditMetadata: CalculateMetadataFunction<
  SemanticProps
> = async (args) => {
  const { abortSignal, isRendering } = args;
  try {
    const fetchJson = async (file: string) => {
      const response = await fetch(staticFile(file), {
        signal: abortSignal,
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          `Не найден ${file}. Сначала подготовьте расшифровку и монтажный план.`,
        );
      return response.json();
    };
    const [plan, transcript] = await Promise.all([
      fetchJson("generated/edit-plan.json") as Promise<EditPlan>,
      fetchJson("generated/transcript.json") as Promise<Transcript>,
    ]);
    validateTranscriptCuts(transcript, plan);
    const timeline = compileTimeline(plan);
    const outputCaptions = timeline.clips.flatMap((clip) =>
      captionsForClip(transcript.captions, clip, timeline.fps).map((word) =>
        sourceWordToOutput(word, clip, timeline.fps),
      ),
    );
    auditOverlayQuotes(plan, auditCaptionTimeline(plan, transcript, outputCaptions).provenance);
    buildTextSchedule(plan, transcript, timeline.clips);
    const defaults = { title: "", source: null, sourceError: null };
    const sourceMetadata = await calculateSourceMetadata({
      ...args,
      props: defaults,
      defaultProps: defaults,
      isRendering: true,
    });
    if (
      !sourceMetadata.props?.source ||
      Math.abs(
        sourceMetadata.props.source.durationInSeconds -
          plan.source.durationSeconds,
      ) > 0.001
    ) {
      throw new Error("Исходник не совпадает с монтажным планом.");
    }
    const sourceResponse = await fetch(staticFile("source.mp4"), {
      signal: abortSignal,
    });
    if (!sourceResponse.ok) throw new Error("Исходник не читается.");
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await sourceResponse.arrayBuffer(),
    );
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (hash !== plan.source.sha256)
      throw new Error("Исходник изменился. Нужны новая расшифровка и план.");
    return {
      durationInFrames: timeline.durationInFrames,
      defaultCodec: "h264",
      defaultOutName: "semantic-cut",
      props: { edit: { plan, transcript }, error: null },
    };
  } catch (error) {
    if (abortSignal.aborted || isRendering) throw error;
    return {
      durationInFrames: 90,
      props: {
        edit: null,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
};
