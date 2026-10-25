import { lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  inspectSource,
  fingerprint,
  root,
  runRemotion,
  verifyVideo,
  writeReport,
} from "./lib/media.mjs";
import { loadEdit } from "./lib/edit-plan.mjs";
import { verifyEditedAudio } from "./lib/audio-sync.mjs";
import { verifySpeechIntegrity } from "./lib/speech-qc.mjs";
import { getSemanticOutputPath } from "./lib/semantic-output.mjs";
import {
  prepareDesignAssets,
  isolateLegacySidecars,
} from "./lib/design-assets.mjs";

try {
  const designAsset = await prepareDesignAssets();
  const relocatedSidecars = await isolateLegacySidecars();
  const source = await inspectSource();
  const edit = await loadEdit(source);
  const { plan, timeline, transcript, textSchedule } = edit;
  await mkdir(path.join(root, "out"), { recursive: true });
  await mkdir(path.join(root, ".cache/speech-qc"), { recursive: true });
  const pending = path.join(root, ".cache/speech-qc/render.pending.mp4");
  let output = await getSemanticOutputPath();
  const stateFile = path.join(root, ".cache/speech-qc/render-state.json");
  const inputs = {
    sourceSha256: source.sha256,
    planSha256: await fingerprint(path.join(root, "public/generated/edit-plan.json")),
    transcriptSha256: await fingerprint(path.join(root, "public/generated/transcript.json")),
    designAssetSha256: designAsset.sha256,
    styleDefinitionSha256: await fingerprint(path.join(root, "style-presets/runtime/baseline-unbranded.json")),
    renderCodeSha256: await Promise.all([
      "src/SemanticCut.tsx", "src/Root.tsx", "src/director/load-edit.ts", "src/director/timeline.ts",
      "src/design/EditorialText.tsx", "src/design/caption-layout.ts", "src/design/fonts.ts",
      "src/styles/baseline.ts", "src/styles/contract.ts",
      "remotion.config.ts", "package-lock.json",
    ].map(async file => ({ file, sha256: await fingerprint(path.join(root, file)) }))),
  };
  if (process.argv.includes("--resume")) {
    const state = JSON.parse(await readFile(stateFile, "utf8"));
    if (JSON.stringify(state.inputs) !== JSON.stringify(inputs) || await fingerprint(pending) !== state.pendingSha256)
      throw new Error("Pending render or its inputs changed; cannot resume verification.");
    console.log("Resuming verification of the hash-bound completed pending render.");
  } else {
    runRemotion(["render", "src/index.ts", "SemanticCut", pending]);
    await writeFile(stateFile, JSON.stringify({ inputs, pendingSha256: await fingerprint(pending) }, null, 2));
  }
  const report = await verifyVideo(pending, source, {
    durationInFrames: timeline.durationInFrames,
  });
  const audioSync = await verifyEditedAudio(pending, timeline);
  const speechIntegrity = await verifySpeechIntegrity(pending, source, edit);
  if (await fingerprint(path.join(root, "style-presets/runtime/baseline-unbranded.json")) !== inputs.styleDefinitionSha256)
    throw new Error("Style definition changed during rendering; refusing to publish mixed inputs.");
  try {
    await rename(pending, output);
  } catch (error) {
    if (!["EPERM", "EBUSY", "EACCES"].includes(error.code)) throw error;
    for (let index = 1; ; index++) {
      const candidate = path.join(root, `out/semantic-cut-synced${index === 1 ? "" : `-${index}`}.mp4`);
      try { await lstat(candidate); continue; }
      catch (checkError) { if (checkError.code !== "ENOENT") throw checkError; }
      await rename(pending, candidate);
      output = candidate;
      console.log(`Previous MP4 is locked; preserved it and saved a separate verified version: ${output}`);
      break;
    }
  }
  await writeReport("semantic-cut.verification.json", {
    ...report,
    file: output,
    plan,
    audioSync,
    speechIntegrity,
    styleContract: { file: "style-presets/runtime/baseline-unbranded.json", sha256: inputs.styleDefinitionSha256 },
    transcriptReviewStatus: transcript.reviewStatus,
    visualLayout: {
      designId: "baseline-unbranded",
      approvedBrandbook: false,
      designAsset,
      runtimeGeometryGuard: "passed during all rendered text frames",
      maximumSubtitleLines: 2,
      exclusiveTextIntervals: textSchedule.length,
      relocatedSidecars,
      subtitleDelivery:
        "single burned-in Remotion layer; optional SRT exported outside the video folder",
    },
    manualReview:
      "Проверить слова ASR, смысл, естественность склеек и совпадение речи с движениями губ.",
  });
  console.log(`Создан и технически проверен ${output}; speech QC: ${speechIntegrity.status}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
