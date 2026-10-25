# Contextual visual direction and reusable library

Status: completed, 2026-10-25. User authorizes searching/creating reusable graphics and contextual domestic cutaways; new source is unavailable. This extends the previous restriction against automatic B-roll. It does not authorize new private-media uploads or more Qwen calls.

## Goal and approach
Keep the existing source/output clock, real subtitles, constant music, three styles and QC. Add a versioned semantic library to the canonical assets/catalog.json; native parameterized diagrams and motion for explanation, generated/rights-reviewed illustrations for contextual contrast. Select by explicit intent and word evidence, preserve a fallback with no insert. Reuse before searching or generating. A search result alone is not cleared media.

## Deliverables
- [x] Asset metadata/provenance, library validation, retrieval/search/registration commands and usage records.
- [x] Bounded visual plan with motivated shots, word anchors, style policy, anti-overload checks and renderer integration.
- [x] Reusable process/comparison/system diagrams; clearly labelled AI demonstration without invented speech.
- [x] Existing domestic source demonstration with an original fictional dishwashing illustration; inspect storyboard and final export with actual QC.
- [x] Director contract integration, meaningful tests and architecture/workflow/verification updates.

## Evidence and constraints
Previous VisualB is an 18.2667s/548-frame/40-word candidate with broad, reviewed protected person rectangles. New example is editor-directed/local rules, not a second live Qwen analysis. Do not reinterpret the fictional wife as a factual family observation. Generated asset uses no private reference. Preserve earlier exports. Run heavy preview/render sequentially with AI_VIDEO_SOFTWARE_GL=1 on the 8GB workstation.

## Validation
Library hash/rights checks; reject unknown assets, unbound speech, made-up diagram numbers, crowded/rapid inserts, unsafe paths and inappropriate style/domain. Verify output PCM and word clocks against the existing source mapping; inspect frames from the final MP4, preserve ASR review-required uncertainties. AI diagrams are a graphic test bench, not a real unrecorded source.

## Progress / decisions
2026-10-25: inspected current compiler/renderer/catalog and official Pexels/Openverse/Lucide terms. Prefer owned native diagrams and generated fictional domestic illustration for this sample; Openverse is a keyless discovery option, with origin/license review required before use. Imagegen produced one 1536×1024 fictional kitchen illustration; selected image inspected inline, generic adult characters and no private source input.

Library has4 versioned elements /16 total canonical assets, with actual hashes and provenance. Commons and Openverse each returned8 metadata candidates from explicit generic searches, reports retained; third-party images were not imported. Openverse initially timed out, later succeeded. Added actual local-image format/dimension checks and schema validation before registration writes; import does not overwrite IDs.

Director request/response/compiler updated with optional bounded visual cues, real word IDs and catalogue-only asset IDs. API allowlist regression caught new local provenance paths in the context and was fixed before any external call; no Qwen call was made. Old requests are stale as designed. Original catalog-count test was updated to allow growth without weakening style counts. Full79 tests, lint/TypeScript and context67 paths passed; after the registration-hardening change the6 affected tests also passed.

Prepared domestic job: same40 words,548 frames, source cuts and PCM hash f34e5787d013369a03d3ec6328ad43ee343442709191d042245648f768f14f68. Shots0/104/163/298/388; only insert104–163. Storyboard caught label/caption overlap at147 and medium-shot caption/subject collision at328; fixed layout, reran and inspected all13 storyboard frames. Full render started only after that inspection. Original-to-graded548-frame validation passed; steady gain variation0.000258dB, voice lead14dB. Final export/QC and diagram preview remain in progress.

## Final evidence

out/context-domestic-001.mp4 exists:14,535,529 bytes, SHA256135cdf7b8775d9312ca74ff54adcb5fa2fc1a6d02c1c82426a9296a6d7e7b018. H264/AAC48k,1080×1920/30,548 frames/18.266667s, full decode passed.40 actual words/74 audio blocks, maximum waveform lag0ms, minimum word correlation0.9999408;548 visible source frames, min visible correlation0.9975359. No sample clipping; −11.36LUFS / −0.33dBTP. Continuous PCM hash is unchanged from VisualB. ASR remains review-required: same «женщине/женщины» and «тоже» boundary; additional acoustic-window ASR/evidence retained, no human phonetic or continuous audition claim.

Inspected15 frames extracted from the actual final MP4, plus individual134/328; hash-bound visual-review.json recorded. Reran delivery after inspection: final-report.visual=control-stills-inspected. New provenance is editor-directed-contextual-library; inherited historical Qwen protected regions do not imply a new AI call. Original source and earlier4 exports preserved; audit:out verified5 current exports and3 archived historical files.

Rendered and inspected9 lab frames (three native diagrams × three existing grammars), artifacts/visual-library/diagrams.png + previews.json; this is a clearly labelled graphic bench without invented recorded AI speech. New local gallery includes the real domestic MP4, library filters, tags, origin and usage; artifacts/visual-library/index.html. JS syntax checked, HTTP200 for gallery/image, MP4 Range206, unrelated package/.env404; gallery-check.json saved. User Chrome detached during navigation, so client interaction/playback and Studio canvas were not verified via that connection. No fallback browser manipulation or extension repair. Local read-only gallery serves127.0.0.1:3106, Studio restarted hidden on3001 (task process11156); no user apps stopped.

Executed commands: prepare:context; preview:context (three passes until geometry was safe, final13-frame storyboard inspected); render:context; preview-visual-library; editorial-job-delivery after visual inspection; library list/brief/find/search; full79 tests; lint; design:check16 assets; context:check67 paths; audit:out5 exports. Additional affected registration/retrieval tests passed after local importer hardening. No new dependencies, paid Qwen calls, private uploads, automatic stock insertion, external publishing or deletion.

Remaining product boundaries: automatic generation/search is an explicit production action, not an unattended paid loop. Future real AI-source diagram semantics need its actual speech and editorial review. Data-backed statistical charts, arbitrary3D, automatic face tracking and stock video ingestion remain unsupported and must use an honest speaker fallback. No new artistic style approval is claimed.
