# First configured Qwen directing run

User added settings and requested checking and completing the intended workflow. Actual inspection found populated .env.qwen.example but no .env.qwen; initial diagnostics had no key/config. Never print secret values.

- [x] Copy user settings into private .env.qwen without overwriting an existing file; remove the credential from the tracked example. Diagnose actual endpoint/model without sending media.
- [x] Prepare a concrete hash-bound text request, resolve authorization for this external transmission under AGENTS.md/docs/QWEN_SETUP.md, and perform the first live generation only within the authorized scope.
- [x] Validate genuine Qwen proposals against existing schema, evidence, time mapping and pacing. Preserve raw provider results and distinguish compiler defects from bad model decisions; no hidden retries or invented subtitles.
- [x] Choose the strongest executable treatment, inspect storyboard/Studio, render a new final MP4 through existing original-source/audio/frame/ASR QC and inspect actual final frames.
- [x] Record real service outcomes, changes/tests and limitations. Preserve original source, current checked MP4, approved visual grammar and steady background music. Update current project context.

No raw audio/video/image upload is authorized by the configured text adapter. One paid attempt per run, explicit payload hash; no automatic retries, source replacement, or deletion. Heavy operations run sequentially on the 8GB workstation; do not stop user applications.

## Actual findings and decisions

- Populated .env.qwen.example was not the runtime file. Created ignored .env.qwen exclusively; restored the example to a blank-key disabled template. Console display names normalize to API ids without changing the actual account/endpoint/region.
- Exactly one real text-only call: qwen-first-live-001, 24,872 bytes, 7,556 input + 4,287 output tokens. Service returned two genuine plans; semantic QC rejected duplicate quote data, an invalid single-item split and premature/short-lived graphic beats. Original response/attempt are immutable evidence; no second paid request.
- New local run qwen-cut-001 preserves source words/cuts; editorial-response.json explicitly editor-authored with six parent-hash-bound changes. Selected thematic-grouping; 40 words, 548 frames, scene starts0/104/322/388. Existing grade and constant-gain music retained; no invented text or visual observations.
- Schema now constrains quote count by scene kind; instructions distinguish captions/reprises and reading time; request supplies frame anchors. Future transport receipts are stored before semantic validation, so a response rejection cannot be mistaken for no network response.
- Verified identical source-frame selection can reuse compressed cache bytes with no second grade/encoding generation; each export still checks actual original/source PTS frames. Delivery records Qwen + editor provenance and actual scene kinds.
- Storyboard eight stills inspected; live DirectorPreview canvas/job/frame0 geometry checked. All548 original frame checks passed. Actual final MP4 created and fully decoded; all548 rendered source frames,40 word waveforms and74 AAC blocks passed. Ten actual final stills inspected and recorded in visual-review.json; final-report.json now control-stills-inspected.
- npm test:63 passed; npm run lint:passed; npm run context:check:43 paths passed; npm run audit:out:two finished MP4,three historical archive originals verified,source unchanged. Final explicit source/old Tight/new MP4 SHA comparison passed.

## Delivered result and remaining limits

out/qwen-cut-001-thematic-grouping.mp4:12,000,124 bytes; SHA25622be1915adfc94057a88337c236956174ca3c7d2ec36fcb74bd3b61b79c7105f;1080x1920/30,H264/AAC48k,548 frames18.266667s. Minimum word correlation0.9999408,maximum word lag0ms,minimum visible-frame correlation0.9959013. Steady music minimum voice lead14dB,gain variation0.000258dB. Maximum ordinary word-map gap560ms within600ms.

Both actual final-audio ASR passes found40 words. Status remains review-required: женщине/женщины at output0.58–1.04s and onset of тоже at14.24–14.89s. Original waveform/source evidence supports preservation, not human phonetic approval. No continuous human audio audition performed. User artistic approval pending; no automatic new-source shot/skin/gesture analysis, arbitrary new cut boundaries or3D implementation claimed.

Real commands: director:provider-check; director:prepare/preflight; director:generate with exact approved payload hash for qwen-first-live-001 (one live request, semantic rejection); director:review/select/stage for local qwen-cut-001; director:check-studio; node scripts/render-editorial-job.mjs --job qwen-cut-001-thematic-grouping; node scripts/editorial-job-delivery.mjs --job qwen-cut-001-thematic-grouping; npm test; npm run lint; npm run context:check; npm run audit:out. Provider test fixtures were local only; genuine service evidence is separate.

Next minimum step: user listens/views this candidate, then improve first-response plan quality under tightened constraints. Multimodal frame upload or a new paid attempt needs its own concrete agreed payload/scope. Test transfer to a second actual source before claiming an autonomous professional editor.
