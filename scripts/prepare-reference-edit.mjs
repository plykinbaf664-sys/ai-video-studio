import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root,sourcePath,fingerprint,runRemotion} from './lib/media.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
import {compileTimeline,validateTranscriptCuts,captionsForClip,sourceWordToOutput} from '../src/director/timeline.ts';
import {auditCaptionTimeline} from '../src/director/speech-integrity.ts';
await validateDesignLibrary();
let edit;
try{edit=JSON.parse(await readFile('public/generated/reference-edit/edit.json','utf8'));}
catch(e){if(e.code!=='ENOENT')throw e;edit=JSON.parse(await readFile('public/generated/personal/edit.json','utf8'));}
if(await fingerprint(sourcePath)!==edit.plan.source.sha256)throw new Error('Real source changed');
validateTranscriptCuts(edit.transcript,edit.plan);const timeline=compileTimeline(edit.plan);
const outputCaptions=timeline.clips.flatMap(c=>captionsForClip(edit.transcript.captions,c,30).map(w=>sourceWordToOutput(w,c,30)));
const audit=auditCaptionTimeline(edit.plan,edit.transcript,outputCaptions);
for(const p of ['public/generated/reference-edit','.cache/reference-edit','artifacts/reference-edit'])await mkdir(p,{recursive:true});
await writeFile('public/generated/reference-edit/edit.json',JSON.stringify({...edit,outputCaptions,timeline},null,2)+'\n');
await writeFile('artifacts/reference-edit/selection.json',JSON.stringify({timeline,provenance:audit.provenance,outputCaptions,sourceSha256:edit.plan.source.sha256},null,2)+'\n');
const catalog=JSON.parse(await readFile('assets/catalog.json','utf8'));
for(const a of catalog.items.filter(x=>x.kind==='font'&&x.runtimeFile)){await mkdir(path.dirname(path.join(root,'public',a.runtimeFile)),{recursive:true});await copyFile(path.join(root,a.path),path.join(root,'public',a.runtimeFile));}
const filter=timeline.clips.map((c,i)=>`[0:a]atrim=start=${c.sourceStartFrame/30}:end=${c.sourceEndFrame/30},asetpts=PTS-STARTPTS[a${i}]`).join(';')+';'+timeline.clips.map((_,i)=>`[a${i}]`).join('')+`concat=n=3:v=0:a=1,aresample=48000,volume=0.84[voice]`;
runRemotion(['ffmpeg','-v','error','-y','-i',sourcePath,'-filter_complex',filter,'-map','[voice]','-ac','2','-ar','48000','-c:a','pcm_s24le',path.join(root,'.cache/reference-edit/voice.wav')]);
const python=path.join(root,'.venv-transcribe/Scripts/python.exe');
const baseResult=spawnSync(python,['scripts/prepare-reference-base.py'],{cwd:root,stdio:'inherit'});if(baseResult.error)throw baseResult.error;if(baseResult.status!==0)throw new Error('Source cache preparation failed');
const result=spawnSync(python,['scripts/prepare-reference-audio.py'],{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)throw new Error('Audio preparation failed');
console.log('Prepared real speech, source/output map, licensed fonts and three actual ducked music mixes');
