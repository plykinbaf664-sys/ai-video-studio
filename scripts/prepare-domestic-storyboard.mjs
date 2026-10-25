import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {loadJob} from './lib/editorial-job.mjs';
import {visualLibrary,visualSnapshot} from './lib/visual-library.mjs';
import {fingerprint} from './lib/media.mjs';
import {planDomesticStory} from '../src/director/domestic-storyboard.ts';
import {compileEditorialJob,protectedSourceRects} from '../src/director/editorial-job.ts';
const args=process.argv.slice(2),flag=(name,fallback)=>{const i=args.indexOf(`--${name}`);return i<0?fallback:args[i+1];};
const id=flag('id','context-domestic-002');if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))throw Error('Use a registered job id');
const base=await loadJob(flag('base','visual-001-b')),briefFile=flag('brief','edits/briefs/domestic-counterpoint.json');
if(!briefFile.startsWith('edits/briefs/')||briefFile.includes('..')||briefFile.includes('\\'))throw Error('Use a local edits/briefs JSON');
const brief=JSON.parse(await readFile(briefFile,'utf8')),policyFile='style-presets/policies/domestic-counterpoint.json',policy=JSON.parse(await readFile(policyFile,'utf8'));
const units=base.compiled.timeline.clips.map(c=>({id:c.id,from:c.outputStartFrame,until:c.outputStartFrame+c.durationInFrames,words:base.compiled.provenance.filter(w=>w.clipId===c.id)})),assets=(await visualLibrary()).map(visualSnapshot);
const story=planDomesticStory({units,assets,style:base.preset.id,brief,policy,duration:base.compiled.timeline.durationInFrames});
if(!story.eligible||story.beats.length===0){
 console.log(JSON.stringify({status:'kept-existing-edit',baseJobId:base.id,staged:false,...story},null,2));
}else{
const job=structuredClone(base.job);job.id=id;job.baseReuseJobId=base.id;job.compositionId='ContextDomesticPhoto';
const rects=units.flatMap(u=>protectedSourceRects(job,u.from)),sourceY=Math.max(0,Math.min(...rects.map(r=>r.y))-32),bottom=Math.max(...rects.map(r=>r.y+r.height)),scale=Math.min(base.preset.safe.width/job.source.width,810/(bottom-sourceY)),width=job.source.width*scale;
if(story.beats.some(b=>b.layout==='upper-panel')&&job.source.face.width*scale<150)throw Error('Photo-panel would make the presenter unreadable; retain current edit and design a different layout');
const lower={x:(1080-width)/2,y:900,width,height:810,sourceY,zoom:1},full=job.viewports.full;
const boundaries=[...new Set([0,...story.beats.flatMap(b=>[b.from,b.until])])].filter(f=>f<base.compiled.timeline.durationInFrames).sort((a,b)=>a-b);
job.scenes=boundaries.map(from=>{const beat=story.beats.find(b=>from>=b.from&&from<b.until),unit=units.find(u=>from>=u.from&&from<u.until);return {from,kind:beat?.layout==='upper-panel'?'speaker':'full',purpose:beat?.why??`Сохранить живую подачу ${unit?.id??'речи'}: ${story.decisions.find(d=>d.unitId===unit?.id)?.reason??story.restraint}`,viewport:beat?.layout==='upper-panel'?lower:full,reference:base.job.scenes[0].reference,quotes:[]};});
job.visualPlan={version:1,domain:brief.domain,authorship:'local-rules',policy:story.policy,assets:assets.filter(a=>story.beats.some(b=>b.assetId===a.id)),beats:story.beats,restraint:story.restraint,shots:job.scenes.map(s=>({from:s.from,reason:s.purpose}))};
compileEditorialJob(job,base.preset,base.prior);
await mkdir(`artifacts/jobs/${id}`,{recursive:true});await writeFile(`edits/${id}.json`,JSON.stringify(job,null,2)+'\n');
await writeFile(`artifacts/jobs/${id}/storyboard-plan.json`,JSON.stringify({...story,briefFile,briefSha256:await fingerprint(briefFile),policyFile,policySha256:await fingerprint(policyFile),plannerSha256:await fingerprint('src/director/domestic-storyboard.ts'),baseJobId:base.id,baseJobSha256:base.jobSha256},null,2)+'\n');
await writeFile(`artifacts/jobs/${id}/visual-direction.json`,JSON.stringify({jobId:id,jobSha256:await fingerprint(`edits/${id}.json`),mode:'editor-brief-local-domestic-storyboard',visualInference:false,parentJobId:base.id,parentJobSha256:base.jobSha256,storyboardFile:`artifacts/jobs/${id}/storyboard-plan.json`,storyboardSha256:await fingerprint(`artifacts/jobs/${id}/storyboard-plan.json`),limitation:'No new Qwen or video inference. An explicit editor brief gates local action-specific photo-series rules. Historical protected source regions are retained. Generated family scenes are fictional; origin stays in library metadata, without an on-screen service label.'},null,2)+'\n');
console.log(JSON.stringify({id,photos:story.beats.length,coverage:story.coverage,shots:job.scenes.map(s=>s.from),decisions:story.decisions},null,2));
if(args.includes('--prepare')){const result=spawnSync(process.execPath,['scripts/prepare-editorial-job.mjs','--job',id],{stdio:'inherit',env:process.env});if(result.error)throw result.error;if(result.status!==0)throw Error('Domestic story preparation failed');}
}
