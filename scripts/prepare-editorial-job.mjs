import {writeFile,mkdir,copyFile,access} from 'node:fs/promises';
import path from 'node:path';
import {root,sourcePath,fingerprint} from './lib/media.mjs';
import {spawnSync} from 'node:child_process';
import {loadJob,python} from './lib/editorial-job.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
import {auditSpeechPacing} from '../src/director/pacing.ts';
import {bindVisualAssets,writeUsage} from './lib/visual-library.mjs';
const ctx=await loadJob(),{job,preset,compiled,folder,report,work}=ctx;
const library=await validateDesignLibrary();
for(const id of preset.assetIds)if(!library.assets.some(a=>a.id===id))throw new Error(`Missing actual asset ${id}`);
for(const id of preset.referenceIds)if(!library.references.some(a=>a.id===id))throw new Error(`Missing reference ${id}`);
if(!preset.assetIds.includes(job.music.assetId)||await fingerprint(sourcePath)!==job.sourceSha256)throw new Error('Unregistered music or changed source');
for(const dir of [folder,report,work])await mkdir(dir,{recursive:true});
const visualBindings=await bindVisualAssets(job,{stage:true});
if(job.visualPlan){await writeUsage(job,visualBindings);await writeFile(`${report}/visual-library.json`,JSON.stringify({authorship:job.visualPlan.authorship,bindings:visualBindings,plan:job.visualPlan},null,2)+'\n');}
if(job.pacing){const pacing=auditSpeechPacing(compiled.outputCaptions,job.pacing.maximumGapMs);await writeFile(`${report}/pacing.json`,JSON.stringify(pacing,null,2)+'\n');if(pacing.status!=='passed')throw new Error('Unmotivated speech pause exceeds the job policy');}
const metadata={...compiled,input:ctx.prior,jobSha256:ctx.jobSha256,presetSha256:ctx.presetSha256};
await writeFile(`${folder}/edit.json`,JSON.stringify(metadata,null,2)+'\n');
await writeFile(`${report}/selection.json`,JSON.stringify({...metadata,sourceSha256:job.sourceSha256},null,2)+'\n');
// Existing preparation utilities accept a resolved per-job profile. Timing and
// color are supplied by the job; typography/direction remain in the preset.
await writeFile(`${folder}/profile.json`,JSON.stringify({durationInFrames:compiled.timeline.durationInFrames,fps:30,color:job.color,music:{...job.music,...preset.music,pauseDbFS:job.music.targetDbFS,stopSeconds:compiled.timeline.durationInFrames/30}},null,2)+'\n');
for(const a of library.assets.filter(a=>a.kind==='font'&&a.runtimeFile)){const target=path.join(root,'public',a.runtimeFile);await mkdir(path.dirname(target),{recursive:true});await copyFile(a.path,target);}
const clips=compiled.timeline.clips,filters=clips.map((c,i)=>`[0:a]atrim=start=${c.sourceStartFrame/30}:end=${c.sourceEndFrame/30},asetpts=PTS-STARTPTS[a${i}]`).join(';')+';'+clips.map((_,i)=>`[a${i}]`).join('')+`concat=n=${clips.length}:v=0:a=1,aresample=48000,volume=0.84[voice]`;
// Run the already-installed binary directly: avoid a second CLI/Node heap and
// unbounded filter workers on the local 8GB workstation. Same sample clock/mix.
const ffmpeg=path.join(root,'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const audioResult=spawnSync(ffmpeg,['-v','error','-y','-threads','1','-filter_threads','1','-filter_complex_threads','1','-i',sourcePath,'-filter_complex',filters,'-map','[voice]','-ac','2','-ar','48000','-c:a','pcm_s24le',path.join(root,work,'voice.wav')],{cwd:root,stdio:'inherit',shell:false});
if(audioResult.error)throw audioResult.error;
if(audioResult.status!==0)throw new Error(`Original audio preparation failed (${audioResult.status})`);
python(['scripts/prepare-editorial-audio.py','--folder',folder,'--work',work,'--report',report,'--profile',`${folder}/profile.json`]);
const reuse=[];
if(job.baseReuseJobId){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.baseReuseJobId))throw new Error('Unsafe base reuse job');
 const candidate=`public/generated/jobs/${job.baseReuseJobId}`;
 try{for(const file of [`${candidate}/footage.mp4`,`${candidate}/base.manifest.json`,`artifacts/jobs/${job.baseReuseJobId}/base.validation.json`])await access(file);reuse.push('--reuse-cache',candidate);}
 catch(error){if(error.code!=='ENOENT')throw error;console.log('Optional graded cache is unavailable; prepare directly from original source');}
}
python(['scripts/prepare-reference-base.py','--folder',folder,'--profile',`${folder}/profile.json`,...reuse]);
console.log(`${job.id}: ${compiled.timeline.durationInFrames} frames, ${compiled.outputCaptions.length} real words; preset=${preset.id}`);
