import {readFile, writeFile, mkdir, stat, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import {root, fingerprint} from './media.mjs';
import {loadJob} from './editorial-job.mjs';
import {validateDesignLibrary} from './design-library.mjs';
import {compileDirectorResponse} from '../../src/director/semantic-director.ts';
import {visualLibrary,visualSnapshot} from './visual-library.mjs';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const validId = id => {
  if (typeof id !== 'string' || id.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Director: use a local registered id, not a path');
  return id;
};
export const runFolder = id => path.join(root, 'artifacts/director', validId(id));
const json = async file => JSON.parse(await readFile(file, 'utf8'));
export const writeJson = async (file, value, exclusive = false) => {
  await mkdir(path.dirname(file), {recursive:true});
  await writeFile(file, JSON.stringify(value, null, 2) + '\n', exclusive ? {flag:'wx'} : undefined);
};

export const buildDirectorRequest = async ({runId, jobId = 'dry-irony-tight', brief}) => {
  validId(runId);
  const ctx = await loadJob(jobId), library = await validateDesignLibrary();
  if (await fingerprint(path.join(root, 'public/source.mp4')) !== ctx.job.sourceSha256) throw new Error('Director: current source differs from job');
  const words = ctx.compiled.transcript.captions.map((w, i) => ({id:`w${String(i).padStart(5, '0')}`, text:w.text.trim(), sourceStartMs:w.startMs, sourceEndMs:w.endMs}));
  const units = ctx.compiled.timeline.clips.map(c => ({id:c.id, sourceStartFrame:c.sourceStartFrame, sourceEndFrame:c.sourceEndFrame,
    wordIds:ctx.compiled.provenance.filter(w => w.clipId === c.id).map(w => words[w.sourceWordIndex].id)}));
  const references = library.references.filter(r => ctx.preset.referenceIds.includes(r.id)).flatMap(r => r.beats.map(b => ({referenceId:r.id, startMs:b.startMs, endMs:b.endMs, technique:b.technique})));
  const context = {version:1, requestId:runId, brief, words, units, references,
    observations:{available:['transcript','reviewed-source-cut-map','reference-beat-notes','manual-source-face-bounds'], missing:['source-intonation-analysis','source-gesture-analysis','source-frame-sequence-analysis','human-final-audition']},
    policy:{maximumGapMs:Math.min(ctx.job.pacing?.maximumGapMs ?? 600, 600), minimumQuoteHoldFrames:24},visualAssets:(await visualLibrary()).filter(a=>a.visual.styles.includes(ctx.preset.id)).map(visualSnapshot)};
  const sourceFiles = [ctx.jobFile,ctx.presetFile,ctx.job.transcriptFile,'assets/catalog.json','brandbooks/catalog.json','reference-library/catalog.json',
    'instructions/editing/director.md','instructions/editing/director-system.md','instructions/editing/sound-editor.md','instructions/editing/visual-designer.md','instructions/editing/qc-reviewer.md',
    'docs/PACING_POLICY.md','contracts/director-response.schema.json','src/director/semantic-director.ts','src/director/editorial-job.ts','src/director/timeline.ts',
    'scripts/lib/director-workflow.mjs','scripts/prepare-director-evidence.py','scripts/lib/editorial-job.mjs','src/director/provider.ts'];
  sourceFiles.push('scripts/lib/qwen-config.mjs','scripts/lib/qwen-provider.mjs','scripts/lib/qwen-workflow.mjs');
  sourceFiles.push('src/director/visual-plan.ts','src/design/scenes/VisualComponents.tsx','scripts/lib/visual-library.mjs');
  sourceFiles.push('src/director/domestic-storyboard.ts','style-presets/policies/domestic-counterpoint.json');
  for(const asset of context.visualAssets){const entry=library.assets.find(a=>a.id===asset.id);sourceFiles.push(entry.path,asset.provenanceFile);}
  const bindings = [];
  for (const file of sourceFiles) bindings.push({file,sha256:await fingerprint(path.join(root,file))});
  let localEvidence=null;
  const evidenceFile=path.join(runFolder(runId),'evidence/manifest.json');
  try {localEvidence=await json(evidenceFile);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(localEvidence){
    if(localEvidence.sourceSha256!==ctx.job.sourceSha256||localEvidence.status!=='extracted-not-analyzed'||localEvidence.timeline!=='source')throw new Error('Director: invalid source evidence');
    for(const frame of localEvidence.frames){
      if(!frame.file.startsWith(`artifacts/director/${runId}/evidence/`)||frame.file.includes('..')||frame.file.includes('\\')||await fingerprint(path.join(root,frame.file))!==frame.sha256)throw new Error('Director: changed/unsafe source frame evidence');
    }
    bindings.push({file:path.relative(root,evidenceFile).replaceAll('\\','/'),sha256:await fingerprint(evidenceFile)});
  }
  const packet = {context, sourceSha256:ctx.job.sourceSha256, baseJobId:ctx.id, bindings,
    localEvidence,
    coverage:{scope:'reviewed-source-units',unavailableWordIds:words.filter(w => !units.some(u => u.wordIds.includes(w.id))).map(w => w.id)},
    lockedProduction:{source:ctx.job.source,color:ctx.job.color,viewports:ctx.job.viewports,music:ctx.job.music,preset:ctx.preset},
    library:{brandbook:library.brandbooks.find(b => b.id === ctx.preset.brandbookId),assets:library.assets.filter(a => ctx.preset.assetIds.includes(a.id)||context.visualAssets.some(v=>v.id===a.id))},
    capabilities:{implemented:[...ctx.preset.scenes,'registered-illustration','diagram-process','diagram-comparison','diagram-system'],unimplemented:['3d','unregistered-broll','automatic-color','face-tracking','data-charts'],provider:'not-connected',networkEnabled:false},
    systemPrompt:await readFile(path.join(root,'instructions/editing/director-system.md'),'utf8'),
    responseSchema:await json(path.join(root,'contracts/director-response.schema.json'))};
  return {packet,contextSha256:digest(packet),ctx};
};

export const loadFreshRequest = async runId => {
  const saved = await json(path.join(runFolder(runId),'request.json'));
  if (digest(saved.packet) !== saved.contextSha256) throw new Error('Director: request content/hash mismatch');
  const current = await buildDirectorRequest({runId,jobId:saved.packet.baseJobId,brief:saved.packet.context.brief});
  if (current.contextSha256 !== saved.contextSha256) throw new Error('Director: stale request; source, job, instructions, compiler or library changed. Prepare a new run.');
  return current;
};

export const validateDirection = (request, response) => {
  const validate = new Ajv2020({allErrors:true,strict:true}).compile(request.packet.responseSchema);
  if (!validate(response)) throw new Error(`Director response schema: ${JSON.stringify(validate.errors)}`);
  return compileDirectorResponse(request.packet.context, request.contextSha256, response, request.ctx.job, request.ctx.preset, request.ctx.prior);
};

/** Offline import only: never executes response content, opens URLs or uses a network. */
export const readLocalResponse = async file => {
  const absolute = await realpath(path.resolve(root,file));
  const relative=path.relative(await realpath(root),absolute);
  if (!relative || relative==='..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative) || path.extname(absolute).toLowerCase() !== '.json') throw new Error('Director: response must be a JSON file inside this workspace');
  const info = await stat(absolute);
  if (!info.isFile() || info.size > 4 * 1024 * 1024) throw new Error('Director: response exceeds the 4MiB limit');
  return json(absolute);
};

export const reviewResponse = async (runId, responseFile) => {
  const request = await loadFreshRequest(runId), response = await readLocalResponse(responseFile), responseSha256 = digest(response);
  const result = validateDirection(request,response);
  const folder = path.join(runFolder(runId),'revisions',responseSha256);
  let transport='offline-file';
  try{const receipt=await json(path.join(runFolder(runId),'qwen.receipt.json'));if(receipt.status==='validated-director-plan'&&receipt.responseSha256===responseSha256&&receipt.contextSha256===request.contextSha256)transport='qwen-api';}catch(caught){if(caught.code!=='ENOENT')throw caught;}
  await writeJson(path.join(folder,'response.json'),response);
  await writeJson(path.join(folder,'review.json'),{contextSha256:request.contextSha256,responseSha256,transport,authorship:response.authorship,...result});
  return {request,response,responseSha256,result,folder,transport};
};

export const selectTreatment = async ({runId,responseFile,treatmentId}) => {
  validId(treatmentId);
  const reviewed = await reviewResponse(runId,responseFile), candidate = reviewed.result.candidates.find(c => c.treatment.id === treatmentId);
  if (!candidate) throw new Error('Director: unknown selected treatment');
  validId(candidate.job.id);
  const selectedFile = path.join(runFolder(runId),'selected.json');
  // Reserve the selection before creating a job; never silently replace another decision.
  try {await stat(selectedFile);throw new Error('Director: run already selected; create a new run for a different decision');} catch (error) {if (error.code !== 'ENOENT') throw error;}
  await writeJson(path.join(root,'edits',`${candidate.job.id}.json`),candidate.job,true);
  await writeJson(selectedFile,{at:new Date().toISOString(),jobId:candidate.job.id,treatmentId,contextSha256:reviewed.request.contextSha256,responseSha256:reviewed.responseSha256,
    jobSha256:await fingerprint(path.join(root,'edits',`${candidate.job.id}.json`)),authorship:reviewed.response.authorship,status:'selected-plan-media-unreviewed'},true);
  return candidate;
};
