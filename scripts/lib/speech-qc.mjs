import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, sourcePath, fingerprint, runRemotion } from "./media.mjs";
import { auditCaptionTimeline, auditOverlayQuotes, compareRecognizedSpeech, normalizeSpeech } from "../../src/director/speech-integrity.ts";

export const verifySpeechIntegrity = async (file, source, edit) => {
  const directory = path.join(root, "artifacts/speech-qc");
  const work = path.join(root, ".cache/speech-qc");
  await mkdir(directory, { recursive: true });
  await mkdir(work, { recursive: true });
  const movieHash = await fingerprint(file);
  const jobs = [];
  for (const [name, media, timeline] of [["source", sourcePath, "source"], ["final", file, "output"]]) {
    const audio = path.join(work, `${name}.wav`);
    runRemotion(["ffmpeg", "-v", "error", "-y", "-i", media, "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio]);
    jobs.push({ media, audio, timeline, reuseExisting: name === "source", output: path.join(directory, `${name}.asr.json`) });
  }
  const manifest = path.join(work, "verify-jobs.json");
  await writeFile(manifest, JSON.stringify(jobs, null, 2));
  const python = path.join(root, process.platform === "win32" ? ".venv-transcribe/Scripts/python.exe" : ".venv-transcribe/bin/python");
  const result = spawnSync(python, [path.join(root, "scripts/transcribe-audit.py"), "--manifest", manifest, "--cache", path.join(root, ".cache/whisper")], { cwd: root, stdio: "inherit", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Final speech ASR failed (${result.status}); result is not verified.`);
  const [recognizedSource, recognizedOutput] = await Promise.all(jobs.map(async (job) => JSON.parse(await readFile(job.output, "utf8"))));
  if (recognizedSource.timeline !== "source" || recognizedOutput.timeline !== "output" || recognizedSource.mediaSha256 !== source.sha256 || recognizedOutput.mediaSha256 !== movieHash)
    throw new Error("Speech QC: stale ASR or mixed source/output timeline.");
  const captionTimeline = auditCaptionTimeline(edit.plan, edit.transcript, edit.outputCaptions);
  const overlayQuotes = auditOverlayQuotes(edit.plan, captionTimeline.provenance);
  const sourceRecognition = compareRecognizedSpeech(edit.transcript.captions, recognizedSource.words);
  if (recognizedOutput.complete !== true) throw new Error("Final ASR did not finish; refusing a partial result.");
  const contentEndMs = edit.timeline.durationInFrames * 1000 / edit.timeline.fps;
  // AAC packet padding and analysis-only silence are not part of the edit.
  // Keep ASR hallucinations there as evidence, never as words to add to captions.
  const outsideContentRecognitions = recognizedOutput.words.filter(word => word.startMs >= contentEndMs);
  const contentWords = recognizedOutput.words.filter(word => word.startMs < contentEndMs);
  const finalRecognition = compareRecognizedSpeech(edit.outputCaptions, contentWords);
  const textFound = (words, text) => (` ${normalizeSpeech(words.map(word => word.text).join(" "))} `).includes(` ${normalizeSpeech(text)} `);
  const overlays = edit.plan.overlays.map(overlay => ({
    id: overlay.id, text: overlay.text, outputStartMs: overlay.startSeconds * 1000,
    outputEndMs: overlay.endSeconds * 1000,
    declaredPurpose: overlay.purpose,
    exactTextRecognizedInSource: textFound(recognizedSource.words, overlay.text),
    exactTextRecognizedInOutput: textFound(contentWords, overlay.text),
    note: "Editorial overlay is audited separately; its presence never proves that text was spoken at its display time.",
  }));
  const cutRisks = [];
  for (const clip of edit.timeline.clips) {
    for (const boundary of [clip.sourceStartFrame * 1000 / edit.timeline.fps, clip.sourceEndFrame * 1000 / edit.timeline.fps]) {
      for (const word of recognizedSource.words)
        if (word.startMs + 1 < boundary && boundary < word.endMs - 1)
          cutRisks.push({ clipId: clip.id, boundarySourceMs: boundary, word, status: "review-required", note: "ASR estimate crosses cut; inspect audio before changing the plan." });
    }
  }
  let status = finalRecognition.status === "passed" && sourceRecognition.status === "passed" && !cutRisks.length && captionTimeline.boundaries.every(item => item.status === "passed") && overlays.every(overlay => overlay.exactTextRecognizedInOutput) ? "passed" : "review-required";
  const mapFile = path.join(work, "caption-map.json");
  const mediaReport = path.join(directory, "media-integrity.json");
  await writeFile(mapFile, JSON.stringify({ timeline: edit.timeline, provenance: captionTimeline.provenance }, null, 2));
  const mediaResult = spawnSync(python, [path.join(root, "scripts/verify-media-integrity.py"), "--source", sourcePath, "--output", file, "--map", mapFile, "--ffmpeg", path.join(root, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe"), "--report", mediaReport], { cwd: root, stdio: "inherit" });
  if (mediaResult.error) throw mediaResult.error;
  if (mediaResult.status !== 0) throw new Error(`Actual audio/video differs from plan. See ${mediaReport}`);
  const actualMedia = JSON.parse(await readFile(mediaReport, "utf8"));
  if (actualMedia.summary.quietWordsForReview) status = "review-required";
  if (await fingerprint(sourcePath) !== source.sha256 || await fingerprint(file) !== movieHash)
    throw new Error("Speech QC: media changed during verification.");
  const report = {
    checkedAt: new Date().toISOString(), mediaSha256: movieHash, sourceSha256: source.sha256,
    planSha256: await fingerprint(path.join(root, "public/generated/edit-plan.json")),
    transcriptSha256: await fingerprint(path.join(root, "public/generated/transcript.json")),
    status, captionTimeline, sourceRecognition, finalRecognition, overlays, overlayQuotes, cutRisks,
    asrAnalysis: { contentEndMs, actualAudioDurationMs: recognizedOutput.actualAudioDurationMs, analysisOnlyPaddingMs: recognizedOutput.analysisOnlyPaddingMs, outsideContentRecognitions, paddingRecognitions: recognizedOutput.paddingRecognitions, note: "Recognitions starting beyond the planned video duration are excluded from caption matching and preserved here for audit." },
    actualMedia: { report: mediaReport, status: actualMedia.status, ...actualMedia.summary },
    limitations: ["ASR recheck uses the same small model family; agreement is not independent human listening.", "ASR discrepancies flag review and never justify inventing speech.", "Word-boundary confidence does not guarantee phonetic completeness at the source recording boundary."],
  };
  const reportFile = path.join(directory, "speech-integrity.json");
  await writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");
  console.log(`Speech QC: ${status}; ${finalRecognition.wordErrors} lexical ASR differences; ${finalRecognition.reviewItems.length} final-audio review items. ${reportFile}`);
  return { status, report: reportFile, mediaSha256: movieHash, finalAsrWords: recognizedOutput.words.length, finalAsrWordErrors: finalRecognition.wordErrors, reviewItems: finalRecognition.reviewItems.length };
};
