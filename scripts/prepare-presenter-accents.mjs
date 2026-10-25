import {readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {loadJob} from './lib/editorial-job.mjs';
import {fingerprint} from './lib/media.mjs';
import {compileEditorialJob,jobImage} from '../src/director/editorial-job.ts';

// Source-specific editorial decisions, never an automatic intonation detector.
const ctx=await loadJob('context-domestic-003'),job=structuredClone(ctx.job);
const accents=[{text:'никогда',zoom:1.32,reason:'Усилить категоричное отрицание; держать план до завершения заявления.'},{text:'взрослый',zoom:1.38,reason:'Укрупнить лицо на самоописании «взрослый независимый мужчина».'},{text:'инициатива.',zoom:1.44,reason:'Последнее акцентное слово и реакция завершают шутку на крупном лице.'}];
job.scenes=job.scenes.filter(s=>!s.presenterFraming);
const decisions=[];
for(const accent of accents){
 const word=ctx.compiled.provenance.find(w=>w.text.trim()===accent.text);
 if(!word)throw Error(`Missing retained accent ${accent.text}`);
 const from=Math.ceil(word.startMs*30/1000),parent=[...job.scenes].reverse().find(s=>s.from<=from);
 if(parent.kind!=='full')throw Error('Accent is not on a visible full presenter');
 const zoom=accent.zoom;
 // Preserve the top edge of the original while cropping the sides/lower body.
 const viewport={x:0,y:0,width:1080,height:1920,sourceY:(1-zoom)*1920*.36/(1.5*zoom),zoom};
 const presenterFraming={role:'accent-close',authority:'user-request-2026-10-25',crop:'lower-body-and-tablet',sourceStartMs:word.sourceStartMs,sourceEndMs:word.sourceEndMs,reason:accent.reason};
 job.scenes.push({...structuredClone(parent),from,viewport,presenterFraming,purpose:accent.reason,reference:'img-3320:0–18s'});
 job.scenes.sort((a,b)=>a.from-b.from);
 decisions.push({from,seconds:from/30,word:word.text.trim(),sourceStartMs:word.sourceStartMs,sourceEndMs:word.sourceEndMs,zoom,reason:accent.reason});
}
job.visualPlan.shots=job.scenes.map(s=>({from:s.from,reason:s.purpose}));
const compiled=compileEditorialJob(job,ctx.preset,ctx.prior);
for(const key of ['cuts','music','color','visualUnderstanding'])if(JSON.stringify(job[key])!==JSON.stringify(ctx.job[key]))throw Error(`Accent changed ${key}`);
if(JSON.stringify(compiled.outputCaptions)!==JSON.stringify(ctx.compiled.outputCaptions))throw Error('Accent changed words');
await writeFile(ctx.jobFile,JSON.stringify(job,null,2)+'\n');
const evidenceFile=`${ctx.report}/presenter-direction.json`;
await writeFile(evidenceFile,JSON.stringify({authorship:'manual-editorial',authority:'User requested closer face on accent words, 2026-10-25',jobId:ctx.id,jobSha256:await fingerprint(ctx.jobFile),decisions,geometry:decisions.map(d=>({from:d.from,image:jobImage(job,d.from)})),protected:'Face, microphone and upper hand remain protected; lower body/tablet are deliberately cropped only in declared close-ups. Historical vision observations are retained byte-for-byte.',limitations:'Word timing anchors; no automatic prosody analysis or new external inference.'},null,2)+'\n');
const directionFile=`${ctx.report}/visual-direction.json`,direction=JSON.parse(await readFile(directionFile,'utf8'));
direction.jobSha256=await fingerprint(ctx.jobFile);
direction.presenterDirection={file:evidenceFile,sha256:await fingerprint(evidenceFile)};
direction.limitation='No new API call. Local domestic storyboard plus explicit user-requested word-anchored presenter close-ups. Historical observed boxes are retained; declared close-ups intentionally crop lower body/tablet while protecting face/microphone.';
await writeFile(directionFile,JSON.stringify(direction,null,2)+'\n');
console.log(JSON.stringify({job:ctx.id,decisions,scenes:compiled.scenes.map(s=>({from:s.from,until:s.until,close:Boolean(s.presenterFraming)}))},null,2));
if(process.argv.includes('--prepare')){
 const result=spawnSync(process.execPath,['scripts/prepare-editorial-job.mjs','--job',ctx.id],{stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)throw Error('Presenter job preparation failed');
}
