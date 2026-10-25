import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fingerprint} from './lib/media.mjs';
import {loadJob} from './lib/editorial-job.mjs';
import {authorVisualBaseline,compileVisualVariant} from './lib/visual-job-compiler.mjs';
import {prepareVisualCall,validateVisualAnalysis,visualFolder} from './lib/visual-understanding.mjs';
import {guardObservedPerson} from './lib/visual-person-guard.mjs';
const get=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const run=get('--run'),mode=get('--mode'),folder=visualFolder(run);
const manifest=JSON.parse(await readFile(`${folder}/frames.json`,'utf8')),ctx=await loadJob(manifest.jobId);
const style=manifest.style??'signal-dynamic';
const preset=JSON.parse(await readFile(`style-presets/grammars/${style}.json`,'utf8'));
const baseline=authorVisualBaseline(ctx.job,run,style);
let job,comparison;
if(mode==='a'){
 job=baseline;comparison={mode:'text-and-existing-rules',parentJob:ctx.id,sourceSha256:job.sourceSha256,style,visualInference:false};
}else if(mode==='b'){
 const prepared=await prepareVisualCall(run),receipt=JSON.parse(await readFile(`${folder}/receipt.json`,'utf8'));
 const analysisSha256=await fingerprint(`${folder}/analysis.json`);
 if(receipt.status!=='validated-image-analysis'||receipt.payloadSha256!==prepared.payloadSha256||receipt.analysisSha256!==analysisSha256||receipt.contextSha256!==prepared.contextSha256)throw Error('No fresh actual image-analysis receipt');
 const analysis=JSON.parse(await readFile(`${folder}/analysis.json`,'utf8'));validateVisualAnalysis(prepared,analysis);
 const result=guardObservedPerson(compileVisualVariant(baseline,preset,ctx.prior,analysis,{runId:run,analysisSha256}),baseline,preset,ctx.prior,analysis);job=result.job;job.id=`${run}-b`;
 comparison={mode:'qwen-image-informed-bounded-compiler',sourceSha256:job.sourceSha256,style,model:receipt.model,visualInference:true,analysisSha256,contextSha256:receipt.contextSha256,payloadSha256:receipt.payloadSha256,usage:receipt.usage,changes:result.changes,limitation:'Sparse image observations and conservative union boxes; not continuous tracking or human phonetic review.'};
 comparison.localPostcondition={name:result.postcondition,compilerFile:'scripts/lib/visual-person-guard.mjs',compilerSha256:await fingerprint('scripts/lib/visual-person-guard.mjs'),originalCompilerChanges:result.originalCompilerChanges,reason:'The first real response repeated approximate object boxes. Preserve its existing observed person extent when a held object is present; provider observations are not edited.'};
}else throw Error('Use --mode a|b');
await writeFile(`edits/${job.id}.json`,JSON.stringify(job,null,2)+'\n',{flag:'wx'});
await mkdir(`artifacts/jobs/${job.id}`,{recursive:true});
await writeFile(`artifacts/jobs/${job.id}/visual-direction.json`,JSON.stringify({...comparison,jobId:job.id,jobSha256:await fingerprint(`edits/${job.id}.json`),runId:run},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({jobId:job.id,mode:comparison.mode,changedScenes:comparison.changes?.length??0,cloudRequests:0},null,2));
