# Natural pacing after user review

User broadly accepts the visual result but rejects the long pauses. Latest preference overrides the earlier 30–40s target and generic deadpan holds. Scope: shorten silence, preserve all40 words, appearance and one steady music gain; deliver a separate checked MP4. Explain next stage; do not build Auto Director now.

- [x] Create a new source/output job,18.2667s, with measured ordinary word gaps <=560ms. Preserve all40 words, speech padding and a1.5s final reading hold.
- [x] Reuse only hash-verified graded source frames from the31s cache, without applying grade again; verify all548 new cache frames against the original.
- [x] Prepare, preview, render and run actual speech/frame/audio/level QC. Existing jobs and evidence preserved. User independently removed the previous nine MP4 and explicitly confirmed this; do not restore them.
- [x] Inspect16 actual final frames, register default/Studio route, document pacing rule and next semantic-direction stage.

No deletion, upload, arbitrary effects, design replacement or other-user-process shutdown. ASR remains fallible; report real evidence and unresolved phonetic items.

## Result and evidence

`out/dry-irony-tight.mp4`:12128101 bytes, SHA256 `6b55506d23aaf26a9ba351cb4889b0b6936488f521bf0f97a1bfe063ad0f50b4`,1080x1920/30fps/548frames, H264/AAC48k. Full decode passed. All40 original word waveforms matched with0ms measured lag; minimum correlation0.999940787. All548 visible frames matched, minimum correlation0.99593806. All74 audio blocks checked. Constant music gain, measured variation0.00025824dB; true peak−0.33dBTP. No human continuous audio audition performed.

Local whole-file and energy-window ASR each found40 words with one lexical discrepancy: «женщине/женщины». Retained original wording and waveform; broad ASR timing around «тоже» remains a manual listening item. Status remains `review-required`, not a fully human-confirmed transcription. Final-frame439/443 inspection confirms no premature «тоже» caption. Reports/gallery: `artifacts/jobs/dry-irony-tight/REPORT.md`, `index.html`, `final-report.json`, `visual-review.json`.

Actually run: `npm run prepare:tight`, `npm run preview:tight`, `npm run render:tight`; after numerical QC correction, renderer `--job dry-irony-tight --qc-only`; `node scripts/editorial-job-delivery.mjs --job dry-irony-tight`; `npm test` (36 passed), `npm run lint`, `npm run context:check`, `npm run audit:out` (one current MP4, three archived originals verified, source unchanged). Historical inventory retained separately; missing former nine deliveries reported explicitly, never claimed reverified.

## Findings and corrections

- First render hit x264 allocation failure on this8GB machine. Bundle worker now exits before capture; capture and single-thread encoding run sequentially, with shorter lookahead. No user applications stopped. Subsequent real render completed.
- Former QC cut an already-downsampled8k reference at rounded30fps coordinates, causing a fractional-sample mismatch on non-three-frame cut boundaries. Build the source reference on exact48k/1600-samples-per-frame coordinates, concatenate, then resample to8k. Original source remains ground truth; thresholds unchanged. Added an analytical phase regression with a negative control for the former algorithm.
- Added a pacing guard/test rejecting unexplained >600ms output word gaps and a regression preserving all40 words. No change to approved design or continuous background music policy.
- Updated audit after user-confirmed removal of previous exports: absent historical MP4 are optional, present protected files retain hash/evidence checks. No files deleted by this work.

Next step is the scoped implementation in `docs/SEMANTIC_DIRECTION_PLAN.md`, after review of this pacing fix. It is a plan, not an implemented autonomous director.
