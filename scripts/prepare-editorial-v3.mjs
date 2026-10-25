import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root,sourcePath,fingerprint,runRemotion} from './lib/media.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
import {compileTimeline,validateTranscriptCuts,captionsForClip,sourceWordToOutput} from '../src/director/timeline.ts';
import {auditCaptionTimeline} from '../src/director/speech-integrity.ts';
import {validateEditorialDirection} from '../src/director/editorial-v3.ts';
const library=await validateDesignLibrary(),profileFile='style-presets/directions/dry-irony-v3.json';
const direction=JSON.parse(await readFile(profileFile,'utf8'));validateEditorialDirection(direction);
for(const id of direction.assetIds)if(!library.assets.some(a=>a.id===id))throw new Error(`Missing actual v3 asset ${id}`);
for(const id of direction.referenceIds)if(!library.references.some(a=>a.id===id))throw new Error(`Missing actual reference ${id}`);
const prior=JSON.parse(await readFile('public/generated/reference-edit/edit.json','utf8'));
if(await fingerprint(sourcePath)!==prior.plan.source.sha256)throw new Error('Original source changed');
let from=0;const clips=direction.sourceClips.map(c=>{const item={id:c.id,sourceStartSeconds:c.start,sourceEndSeconds:c.end,outputStartSeconds:from,playbackRate:1,reason:c.purpose};from+=c.end-c.start;return item;});
const plan={...prior.plan,clips,overlays:[]},transcript=structuredClone(prior.transcript);
for(const refinement of direction.captionRefinements??[]){
 const word=transcript.captions.find(w=>w.text.trim()===refinement.text&&w.startMs===refinement.sourceStartMs);
 if(!word||refinement.correctedStartMs>=word.endMs||!refinement.evidence)throw new Error('Unresolved source caption refinement');
 word.startMs=refinement.correctedStartMs;
}
transcript.reviewStatus='ASR plus source-acoustic timing refinement candidate; human phonetic review remains';
validateTranscriptCuts(transcript,plan);const timeline=compileTimeline(plan);
if(timeline.durationInFrames!==direction.durationInFrames)throw new Error('V3 duration disagrees with source cuts');
const outputCaptions=timeline.clips.flatMap(c=>captionsForClip(transcript.captions,c,30).map(w=>sourceWordToOutput(w,c,30)));
if(outputCaptions.length!==22)throw new Error('Missing real spoken words');
const audit=auditCaptionTimeline(plan,transcript,outputCaptions);if(audit.boundaries.some(x=>x.status!=='passed'))throw new Error('Unsafe speech cut');
for(const folder of ['public/generated/dry-irony-v3','artifacts/dry-irony-v3','.cache/dry-irony-v3'])await mkdir(folder,{recursive:true});
await writeFile('public/generated/dry-irony-v3/edit.json',JSON.stringify({plan,transcript,timeline,outputCaptions,directionSha256:await fingerprint(profileFile)},null,2)+'\n');
await writeFile('artifacts/dry-irony-v3/selection.json',JSON.stringify({timeline,outputCaptions,provenance:audit.provenance,boundaries:audit.boundaries,sourceSha256:plan.source.sha256},null,2)+'\n');
for(const a of library.assets.filter(a=>a.kind==='font'&&a.runtimeFile)){const target=path.join(root,'public',a.runtimeFile);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,a.path),target);}
const filters=timeline.clips.map((c,i)=>`[0:a]atrim=start=${c.sourceStartFrame/30}:end=${c.sourceEndFrame/30},asetpts=PTS-STARTPTS[a${i}]`).join(';')+';'+timeline.clips.map((_,i)=>`[a${i}]`).join('')+`concat=n=${clips.length}:v=0:a=1,aresample=48000,volume=0.84[voice]`;
runRemotion(['ffmpeg','-v','error','-y','-i',sourcePath,'-filter_complex',filters,'-map','[voice]','-ac','2','-ar','48000','-c:a','pcm_s24le',path.join(root,'.cache/dry-irony-v3/voice.wav')]);
const python=path.join(root,'.venv-transcribe/Scripts/python.exe');
for(const args of [['scripts/prepare-reference-base.py','--folder','public/generated/dry-irony-v3','--profile',profileFile],['scripts/prepare-editorial-audio.py']]){
 const r=spawnSync(python,args,{cwd:root,stdio:'inherit',env:{...process.env,PYTHONIOENCODING:'utf-8'}});if(r.error)throw r.error;if(r.status!==0)throw new Error(`V3 preparation failed: ${args[0]}`);
}
console.log('V3: all 22 source words retained, output clock 414 frames, one constant-gain music bed. Legacy WAV names are compatibility aliases.');
