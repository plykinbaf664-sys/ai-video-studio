# Photographic domestic counterpoint and reusable storyboarding

Status: completed, 2026-10-25. Technical implementation/delivery complete; artistic acceptance remains with the user.

User feedback accepts the library direction but rejects the illustrated AI look and static/sparse storyboard. Make fictional family-life scenes photographically natural, add context-specific imagery across a suitable series of domestic claims, improve shot alternation, and generalize the rule to similar videos. No new source, private-media upload or new Qwen call is needed or authorized. Preserve0017 and previous exports.

## Deliverables
- [x] Four original photographic domestic assets: dishes, dinner, bathroom repair, laundry; register versioned metadata/prompt/origin/usage.
- [x] Reusable domestic-counterpoint policy/planner, with explicit semantic brief, real word anchors, subject-specific asset retrieval and honest no-insert fallbacks. Not a rule to illustrate every utterance or to use domestic images for AI explanations.
- [x] New storyboard with presenter/photo panel, a short actual cutaway, motivated shot changes, continuous speech/subtitles/music; serial examples can follow each other only under an explicit validated series policy.
- [x] Review storyboard before render, then real MP4/source-frame/audio/ASR checks and final-frame inspection. Preserve existing uncertainties.
- [x] Tests, gallery, current architecture/style/director instructions and development plan updated with actual results.

## Approach / constraints
Generate generic fictional adults in ordinary homes, candid imperfect documentary/lifestyle photography, no private reference and no text/logos. A photo-like depiction is still generated fiction, labelled accordingly and never family evidence. Use the same familiar small cast as references only if generated images are supplied; otherwise do not claim identity consistency. Query/reuse by action and function, not just topic. The opening and payoff generally stay with the speaker; escalation examples can be a deliberately composed series. Existing protected person geometry and source/output/audio pipeline remain in use. Cutaway hides only the source image and must be declared in physical QC.

## Validation
Specificity tests (dinner cannot retrieve the dishes asset), semantic suitability and fallback tests, source/output invariance, serial adjacency restrictions, no overload/spoilers, live model authorship honesty. On8GB, heavy previews/render sequentially with software GL; close only task-started Studio if needed. Actual MP4 and final stills, not build success, establish delivery. No statistical chart or arbitrary B-roll claims.

## Progress / findings

Generated4 photographic scenes through built-in image_gen, no private inputs; dinner/repair/laundry reference only the first generated fictional couple. Inspected all outputs; registered new immutable IDs with actual dimensions/hashes/prompts and manual normalized face/working-hand protection. Catalogue20 files /8 visual elements. Previous illustration and all prior MP4s are retained.

Added explicit domestic brief, pure reusable action/agency planner and versioned series policy; no source clip IDs or output frame constants inside the rule. AI, neutral, instruction and unsupported/missing action contexts retain a speaker fallback. Select photo assets by subject + aesthetic; no dinner→dishes fallback. Provider response schema/compiler and text-only allowlist support the same bounded data, without images or local paths. No new Qwen call.

Prepared context-domestic-002 with4 photos, seven shots0/104/163/221/298/388/434,43.80% visual coverage, planned58-frame full-screen dinner cutaway, return before the final spoken payoff. Exact40-word/source-cut/steady-PCM preservation. The source-specific viewport is calculated from the retained protected regions; no face/gesture crop or zoom.

First preview timed out seeking175 while source media was CSS-hidden. Kept the Video painting underneath an opaque cutaway instead; second preview passed all25 boundary/internal frames and was inspected as a contact sheet plus individual193/251. Started full render only after inspection. Primary source→graded548-frame proof passed, music gain variation0.000258dB/voice lead14dB. Final render and physical cutaway/audio verification in progress.

Initial full tests during the first preview: two test processes exited without assertion diagnostics; isolated rerun passed14 affected tests. No functional test assertion failed. Run final full suite after heavy Chrome work to verify the final code. Lint/TypeScript, design20 assets and context72 paths passed so far; dedicated new tests cover generalization/fallbacks/specificity/series/photos/source clock and the provider contract. Generated storyboard again without re-preparing media after the layout-selection rule was made aspect-based; job bytes still match the prepared selection exactly, planner hash now current.

## Final evidence

out/context-domestic-002.mp4 exists:12,082,640 bytes; SHA256973c73aea88c8d013d0041486bfff701bc478a712146520c0333cbaa28ac4322.1080×1920/30fps, H264/AAC48k,548 frames/18.266667s; full decode passed. Physical QC:40 words/74 audio blocks,490 visible source frames,58 declared graphic frames, maximum word lag0ms; minimum visible correlation0.9962249, minimum word correlation0.9999408. Exact previous prepared PCM hash retained. No sample clipping; −11.36LUFS/−0.33dBTP; music gain variation0.000258dB and14dB voice lead. The source continues correctly after the opaque cutaway.

Actual final AAC was recognized and rechecked in2 acoustic windows; speech remains review-required for the inherited «женщине/женщины» and «тоже» timing questions. Source-preservation evidence is retained; no human continuous audition or phonetic alignment claimed. Inspected27 actual final-MP4 frames as a contact sheet plus individual193/221/418; hash-bound visual-review.json saved and delivery rerun. final-report.visual=control-stills-inspected, origin editor-brief-local-domestic-storyboard. All prior5 MP4s, initial artwork and private source preserved.

Final full suite after heavy preview/render:86/86 passed, including actual photo-series provider-contract compilation and fresh storyboard provenance. Lint/TypeScript passed; design20 assets/context72 paths passed; audit:out verified6 current exports +3 archived historical videos and unchanged source. No new dependencies, private uploads, Qwen calls, deletion or external publication.

Gallery rebuilt for002, with4 photographic assets visible by default,8 total visual entries, style/topic/aesthetic filters and origin/usage. Syntax/metadata/HTTP checks saved in artifacts/visual-library/gallery-check.json: main page/photo resources200, both001/002 MP4 range206, package/.env404. Client interaction/playback via the user's browser not newly verified; prior extension detachment remains documented. Read-only loopback server restarted on3106 (tool session58811), Studio hidden on3001 (task PID5996). Only our old task server/Studio processes were stopped.

Executed: four built-in imagegen generations + versioned registration; prepare-domestic-storyboard --prepare; two storyboard passes (final25 inspected); render:photos through complete QC; final27-frame review and delivery; npm test86; lint; design:check; context:check; audit:out; gallery build and HTTP checks. Profiles/photoSafety/source clocks and future applicability rules are documented in docs/DOMESTIC_PHOTO_STORY.md. This is a reusable bounded local rule driven by an explicit editorial brief, not proof of autonomous model understanding of every future video.
