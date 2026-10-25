import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,fingerprint} from './media.mjs';
import {compileEditorialJob} from '../../src/director/editorial-job.ts';
import {visualLibrary,visualSnapshot} from './visual-library.mjs';
export const loadJob=async(jobId)=>{
 const flag=process.argv.indexOf('--job');const id=jobId??(flag===-1?'dry-irony-tight':process.argv[flag+1]);
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id??''))throw new Error('Use a registered job id, not a path');
 const jobFile=`edits/${id}.json`,job=JSON.parse(await readFile(jobFile,'utf8'));
 const presetFile=`style-presets/grammars/${job.presetId}.json`;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.presetId))throw new Error('Unsafe preset id');
 const preset=JSON.parse(await readFile(presetFile,'utf8'));
 if(!job.transcriptFile.startsWith('public/generated/')||job.transcriptFile.includes('..'))throw new Error('Unsafe transcript path');
 const prior=JSON.parse(await readFile(job.transcriptFile,'utf8'));
 const compiled=compileEditorialJob(job,preset,prior);
 if(job.visualPlan){const assets=await visualLibrary();for(const snapshot of job.visualPlan.assets){const current=assets.find(a=>a.id===snapshot.id);if(!current||JSON.stringify(visualSnapshot(current))!==JSON.stringify(snapshot))throw Error(`Unknown or changed visual asset ${snapshot.id}`);}}
 if(job.id!==id)throw new Error('Job filename and id disagree');
 const compositionId=job.compositionId??'DryIronyStory';if(!/^[A-Za-z0-9-]+$/.test(compositionId))throw new Error('Invalid composition id');
 return {id,compositionId,job,preset,prior,compiled,jobFile,presetFile,jobSha256:await fingerprint(jobFile),presetSha256:await fingerprint(presetFile),folder:`public/generated/jobs/${id}`,report:`artifacts/jobs/${id}`,work:`.cache/jobs/${id}`};
};
export const python=(args)=>{
 const r=spawnSync(path.join(root,'.venv-transcribe/Scripts/python.exe'),args,{cwd:root,stdio:'inherit',env:{...process.env,PYTHONIOENCODING:'utf-8'}});
 if(r.error)throw r.error;if(r.status!==0)throw new Error(`Python failed: ${args[0]}`);
};
