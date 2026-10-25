# Reusable Dry Irony and 30-second story

## Goal / authorization
User accepted the next stage: separate Dry Irony from a particular transcript, add a small meaningful scene library, render and check a real 30–40 second story. No Auto Director, extra styles, private uploads, or deletion. Preserve existing outputs and the continuous constant-gain music preference.

## Evidence / decisions
- Working legacy V3 is 414 frames / 22 retained words, with source-specific layout and preprocessing.
- Existing source has six statements / 40 words. Existing 30-second temporal selection retains them all. Reuse the checked temporal engine, with a separate visual preset and explicit job.
- Four scene primitives: speaker, spoken quote, split enumeration (not an invented causal process), retrospective comparison. Graphic labels require retained source word ranges and must not reveal unheard text. Manual subject protection belongs to the job, not to the style.
- Existing registered Onest, paper/ink/orange palette and Relax Beat only. Local speech checks. No claim of human audition or final artistic approval.

## Steps / progress
- [x] Inspect actual scripts, timeline, source transcript and current V3.
- [x] Add independent preset, typed job contract, timing/evidence validation and source-dependent job (31s / 930 frames / all 40 words).
- [x] Implement reusable four-scene composition and Studio registration. Actual Studio DOM/canvas loaded, geometry passed.
- [x] Prepare real source/voice/music; inspect all 14 storyboard stills before render. Source-independent preset also tested against real 3.7s / 4-word selection.
- [x] Render corrected MP4; verify full decode, source/output mapping, all930 visible frames, all40 word waveforms, all124 continuous250ms blocks, music gain, sample/true peaks and independent ASR.
- [x] Extract and visually inspect16 actual final frames (including794/798 around corrected payoff onset); register delivery/audit, update current docs/commands and record limits.

## Acceptance
One new checked MP4 in out/, preview frames/gallery in artifacts/, no duplicate subtitle layer, readable two-line captions, no premature quote labels or face overlap. New generic composition accepts two different job durations without a hardcoded word count. Existing V3 remains available. Tests target provenance/timing/layout risks, plus lint/context/design checks.

## Risks / manual review
ASR may confuse «починить» (historical final recognition: «обчинить»); use source recognition and original waveform evidence, report uncertainty rather than rewriting speech. Word timings remain ASR candidates. Face region and color mask are manually specified for this source. Typography and humor still require user review.

## Discoveries / corrections during implementation
- Existing runtime preset schema intentionally rejects the new scene grammar shape. Kept original runtime contracts intact; added explicit validated style-presets/grammars/ namespace, with parent/style/brand/asset/reference dependency validation.
- Legacy ASR initial word starts cover long silence: source «Я» 7.96→8.64, «Сам» 13.56→13.98 and 20.82→21.30, «Потому» 27.04→28.12; «И» retains previous 38.52 candidate. Inspected original stereo 48k RMS in 20ms windows. Evidence in job refinements; canonical transcript and original voice untouched. Final ASR may still include quiet preroll; do not label that proof of a lost word.
- First preview failed ENOSPC (C: free=0) while bundler copied public. No deletion authorized/performed. Reversibly moved .cache/whisper to D:/AI-Video-Studio-Cache/ai-video-studio/whisper, SHA checked, old path restored as junction. Tried NTFS compression of cache/dependencies (no content changes). New runtime bypasses duplicate public copies with a local junction; low-disk scratch/Chrome/FFmpeg use D:. Existing partial build preserved. Actual preview then passed.
- Executed so far: prepare:story (cached subsequent runs), preview:story, direct node render-editorial-job.mjs (in progress), npm test (33/33), targeted new tests after timing refinement (4/4), lint, design:check, context:check (31 paths). Preserve final status distinction until output checks complete.
- First actual pending file passed 930 frame checks / 40 waveform checks / 124 continuous blocks / zero word lag / no clipping, but unfiltered ASR hallucinated four words at 30–30.98s and misheard «починить». Kept it out of out/. Neural Silero VAD attempt failed on this machine (onnxruntime DLL unavailable); removed the unusable flag and implemented explicit transcript-free energy-window ASR instead. Secondary actual-AAC recognition confirms «починить», hallucinatory tail is near -61dBFS after bed subtraction; secondary itself confuses «развешивать», retained as a manual review item.
- Acoustic-window pass exposed an early «тоже» source39.58→40.32, plus first «Ни» 0→.44 and «посуду» end10.54→10.12. Added source-only measured evidence, reran preparation/storyboard/tests, started corrected render. No voice or cuts changed. First corrected render hit Chrome memory/disk failure at screenshot0; preserved/moved old build and all 17 webpack cache files to D: with hashes and junctions. Retry is rendering. Cached original/source-PTS proof is now reused only when source/base hashes and every frame of expected source map match; caption changes do not rerun immutable footage checks.

## Final verified result
- out/dry-irony-story.mp4, 22403727 bytes, SHA256 178233035e85879417b1c4d35fd0e0b25aa9d853bcfb07bc9128d3759c0c1d23; 1080×1920/30/930 frames,31s,H264 full-range8bit420/AAC48k; full decode passed. Audio31.019s within AAC framing tolerance, relative source offset preserved.
- All40 retained words match original waveform at0ms estimated lag, min correlation0.9998785; all930 final visible frames match source-bound base, min0.9959115. Original/cache930 frame proof min0.997877 reused after explicit hashes/map verification. All124 contiguous audio blocks passed (quiet codec floor calibrated independently).
- One music gain, measured variation0.0001862dB; min voice lead~14dB. True peak−0.53dBTP, integrated−11.4LUFS, no full-scale sample clipping. Analysis discarded normalized output; no mastering claim.
- Primary actual-final ASR44 words/5lexical differences:1 repair-word substitution and4 silence hallucinations. Secondary actual-AAC energy windows:40 words/1 lexical disagreement («разрешивать» vs «развешивать»); correctly recognizes «починить», excludes invented editor credit. Both outputs retained; source recognition + zero-lag waveform + quiet residual~−61dBFS support evidence classification. ASR status intentionally review-required, not human-approved. Timing uncertainty from ASR preroll remains recorded.
- Visually viewed16 final stills and individual frames794/798: no early «тоже» at26.467s, appears at26.600s after acoustic onset26.52. No overlapping text or cropped face in inspected frames; geometric guards checked every render frame.
- Final commands: prepare:story, preview:story (twice after real changes), direct render-editorial-job.mjs (failed drafts preserved by reports; final attempt passed), npm test33/33, lint, design:check, context:check31paths, audit:out9finished videos +3archived hashes/source unchanged. Actual delivery/ASR/QC scripts invoked by renderer are recorded above and in artifacts/jobs/dry-irony-story/.
- Remaining: continuous human audition, exact phonetic boundaries and artistic approval. New source formats still need own ingestion/face/grade/transcript; no autonomous AI Director or3D implemented. Next minimal step: user reviews31s story, then semantic scene-selection contract over these real primitives.
