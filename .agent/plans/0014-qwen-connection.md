# Qwen Cloud preparation

User selected Alibaba Cloud Model Studio. Scope: a real configurable text-only Qwen transport integrated with the existing validated directing workflow, ready for a later key/region/model. Do not send private materials or make a real paid call now. No local model installation, visual redesign, MP4 replacement, source edits or deletion.

- [x] Verify official Model Studio regional/workspace endpoints and JSON Chat Completions behavior; sources linked in docs/QWEN_SETUP.md.
- [x] Add disabled-by-default environment configuration, endpoint/model/key diagnostics without a network call, bounded single-request transport and safe error handling.
- [x] Build an allowlisted text payload, preflight its exact bytes/hash/limits and require explicit approval bound to that request before external transmission. No raw media, keys, local file metadata or unrelated assets in the payload.
- [x] Wire generate to Qwen → strict response parsing → existing schema/semantic validation → private review artifacts. Never auto-select or auto-render. Preserve rejected model content and truthful provenance; HTTP error bodies/keys never logged.
- [x] Test transport against a local protocol simulator, including malformed/truncated response, failures, timeouts before headers and during body reads, redirects, size caps, consent mismatch and usage limits. Existing checks run sequentially.
- [x] Document setup and next phases: first live directing test and verified render, real visual analysis, second source, then component expansion based on actual needs.

Real Qwen service availability and directing quality remain unverified until the user configures access and authorizes a live call.

## Actual evidence

`npm test`:61/61 passed, including11 Qwen tests. Tests use only127.0.0.1, a fake test key, and an explicitly labelled protocol response adapted from the current real words. They do not test Alibaba authentication, service/model availability or semantic quality of Qwen. `npm run lint` passed; `context:check` passed43 paths; `audit:out` passed: one current MP4, source unchanged, three archived originals verified. No new MP4 requested or rendered.

Actual `director:provider-check`: configuration-required, enabled=false, keyPresent=false, endpoint/model/region unset, networkRequests=0. No .env.qwen or real key created. .env.qwen.example supplied; private .env.* ignored while example remains trackable.

Actual `director:prepare --run director-qwen-ready-001`:21 original-source frames extracted locally,40 words/7 source units, immutable private request. ContextSHA0f61a4e31cd429a1d6ec9279507bd44ece74f44d3d0a09da92c8788a3e9f707f.

Actual preflight on that run used **temporary child-process example settings only**: provider disabled, empty key, Singapore legacy endpoint, qwen-plus. These are not the user's selected region/model or a live connection. Payload21214 bytes,8192 output token cap,120s timeout,1MiB response cap, zero network calls. Files: artifacts/director/director-qwen-ready-001/qwen.payload.json and qwen.preflight.json. PayloadSHA95363fe7f623aab09eb8af2397d98de61a01943b655aade9f5018b868fd53c52. Re-run preflight with actual settings before approval; no approval or API call executed here.

Next minimum step: user fills local key/workspace endpoint/region/model, runs provider-check and preflight, then explicitly approves one text call. Review two genuine model proposals, stage and render chosen plan with existing full QC. Multimodal analysis, another real source and component library expansion follow; no claim that text-only preparation already analyzes gestures or creates an artistically approved edit.
