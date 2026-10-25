import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from './media.mjs';
import {createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const json=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const safeEvidence=file=>typeof file==='string'&&file.startsWith('artifacts/director/')&&!file.includes('..')&&!file.includes('\\');

/** Bind delivery credit to selected job bytes and the retained actual provider draft.
 * A corrected draft is never relabelled as an unmodified model-generated plan. */
export const directionEvidence=async(jobId,jobSha256)=>{
 let visual;
 try{visual=await json(`artifacts/jobs/${jobId}/visual-direction.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(visual){
  if(visual.jobId!==jobId||visual.jobSha256!==jobSha256)throw Error('Visual direction evidence: changed selected job');
  if(visual.presenterDirection){
   const p=visual.presenterDirection;
   if(p.file!==`artifacts/jobs/${jobId}/presenter-direction.json`||await fingerprint(p.file)!==p.sha256||(await json(p.file)).jobSha256!==jobSha256)throw Error('Visual direction evidence: stale presenter decisions');
  }
  if(visual.storyboardFile){
   if(visual.storyboardFile!==`artifacts/jobs/${jobId}/storyboard-plan.json`||await fingerprint(visual.storyboardFile)!==visual.storyboardSha256)throw Error('Visual direction evidence: changed domestic storyboard');
   const story=await json(visual.storyboardFile);
   if(!story.briefFile?.startsWith('edits/briefs/')||story.briefFile.includes('..')||story.briefFile.includes('\\')||story.policyFile!=='style-presets/policies/domestic-counterpoint.json'||await fingerprint(story.briefFile)!==story.briefSha256||await fingerprint(story.policyFile)!==story.policySha256||await fingerprint('src/director/domestic-storyboard.ts')!==story.plannerSha256)throw Error('Visual direction evidence: stale domestic brief/policy/planner');
  }
  if(visual.visualInference){
   if(visual.localPostcondition&&(visual.localPostcondition.compilerFile!=='scripts/lib/visual-person-guard.mjs'||await fingerprint(visual.localPostcondition.compilerFile)!==visual.localPostcondition.compilerSha256))throw Error('Visual direction evidence: person guard changed');
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(visual.runId))throw Error('Invalid visual run');
   const base=`artifacts/visual/${visual.runId}`,receipt=await json(`${base}/receipt.json`);
   const {prepareVisualCall}=await import('./visual-understanding.mjs');
   const fresh=await prepareVisualCall(visual.runId);
   if(fresh.contextSha256!==visual.contextSha256||fresh.payloadSha256!==visual.payloadSha256)throw Error('Visual direction evidence: source/style/compiler bindings changed');
   if(receipt.status!=='validated-image-analysis'||receipt.analysisSha256!==visual.analysisSha256||await fingerprint(path.join(root,`${base}/analysis.json`))!==visual.analysisSha256||receipt.contextSha256!==visual.contextSha256||receipt.payloadSha256!==visual.payloadSha256)throw Error('Visual direction evidence: stale analysis/receipt');
   return {...visual,limitation:visual.limitation+' This is image-informed AI analysis plus a constrained local layout compiler, not unconstrained autonomous editing.'};
  }
  return visual;
 }
 let folders=[];try{folders=await readdir(path.join(root,'artifacts/director'));}catch(e){if(e.code!=='ENOENT')throw e;}
 for(const folder of folders){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(folder))continue;
  const base=`artifacts/director/${folder}`;let selected;
  try{selected=await json(`${base}/selected.json`);}catch(e){if(e.code==='ENOENT'||e.code==='ENOTDIR')continue;throw e;}
  if(selected.jobId!==jobId)continue;
  if(selected.jobSha256!==jobSha256||!/^[a-f0-9]{64}$/.test(selected.responseSha256))throw new Error('Direction evidence: selected job changed');
  const response=await json(`${base}/revisions/${selected.responseSha256}/response.json`);
  if(digest(response)!==selected.responseSha256||response.contextSha256!==selected.contextSha256)throw new Error('Direction evidence: changed selected response');
  let amendment;
  try{amendment=await json(`${base}/editorial-amendments.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
  if(amendment){
   if(amendment.targetResponseSha256!==selected.responseSha256||amendment.targetContextSha256!==selected.contextSha256)throw new Error('Direction evidence: amendment is unrelated to selection');
   for(const evidence of amendment.parentEvidence){
    if(!safeEvidence(evidence.file)||await fingerprint(path.join(root,evidence.file))!==evidence.sha256)throw new Error('Direction evidence: stale/unsafe parent Qwen draft');
   }
   return {mode:'qwen-assisted-editor-reviewed',runId:folder,selectedTreatment:selected.treatmentId,authorship:response.authorship,
    parentRunId:amendment.parentRunId,requestedModel:amendment.requestedModel,parentEvidence:amendment.parentEvidence,changes:amendment.changes,
    limitation:'One genuine Qwen response was rejected by QC; the retained speech/scene plan was revised locally. This is not a fully autonomous or unmodified Qwen edit.'};
  }
  let receipt;
  try{receipt=await json(`${base}/qwen.receipt.json`);}catch(e){if(e.code!=='ENOENT')throw e;}
  const generated=receipt?.status==='validated-director-plan'&&receipt.responseSha256===selected.responseSha256&&receipt.contextSha256===selected.contextSha256;
  return {mode:generated?'qwen-generated-plan':response.authorship.kind,runId:folder,selectedTreatment:selected.treatmentId,authorship:response.authorship,...(generated?{model:receipt.model,usage:receipt.usage}:{})};
 }
 return {mode:'manual-editorial-job'};
};
