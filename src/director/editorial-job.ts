import type {Caption} from '@remotion/captions';
import type {EditPlan,Transcript} from './timeline.ts';
import {compileTimeline,validateTranscriptCuts,captionsForClip,sourceWordToOutput} from './timeline.ts';
import {auditCaptionTimeline} from './speech-integrity.ts';
import {auditSpeechPacing} from './pacing.ts';
import {activeVisual,validateVisualPlan} from './visual-plan.ts';
import type {VisualPlan} from './visual-plan.ts';

export type SceneKind='speaker'|'quote'|'split'|'comparison'|'full';
export type Rect={x:number;y:number;width:number;height:number};
export type EditorialPreset={
 version:number;id:string;parentStyleId:string;approvalStatus:string;brandbookId:string;
 assetIds:string[];referenceIds:string[];palette:{paper:string;ink:string;accent:string};
 typography:{family:string;body:number;quote:number;hero:number;minimum:number;weight:number};
 captions:{maximumWords:number;maximumCharacters:number;splitGapMs:number;tailMs:number;maximumLines:number};
 motion:{entryFrames:number;translatePixels:number};
 safe:Rect;scenes:SceneKind[];minimumSceneFrames:number;
 music:{mode:'steady';minimumVoiceLeadDb:number;duckDb:number};
};
export type EditorialJob={
 version:number;id:string;presetId:string;sourceSha256:string;transcriptFile:string;
 compositionId?:string;baseReuseJobId?:string;pacing?:{maximumGapMs:number;policy:string};
 source:{width:number;height:number;face:Rect;verificationRoi:Rect};
 cuts:{id:string;start:number;end:number;purpose:string}[];
 scenes:{from:number;kind:SceneKind;purpose:string;reference:string;quotes?:{startMs:number;endMs:number}[];viewport?:Rect&{sourceY:number;zoom:number};presenterFraming?:{role:'accent-close';authority:'user-request-2026-10-25';crop:'lower-body-and-tablet';sourceStartMs:number;sourceEndMs:number;reason:string}}[];
 viewports:Record<SceneKind,Rect&{sourceY:number;zoom:number}>;
 refinements:{text:string;sourceStartMs:number;correctedStartMs?:number;correctedEndMs?:number;evidence:string}[];
 music:{assetId:string;sourceStartSeconds:number;targetDbFS:number;fadeInSeconds:number;fadeOutSeconds:number};
 color:Record<string,unknown>;
 visualPlan?:VisualPlan;
 visualUnderstanding?:{runId:string;analysisSha256:string;sourceSha256:string;segments:{from:number;until:number;unitId:string;frameIds:string[];confidence:number;protectedRects:Rect[]}[]};
};
const check=(ok:unknown,message:string)=>{if(!ok)throw new Error(`Editorial job: ${message}`);};
export const validatePreset=(p:EditorialPreset)=>{
 const parents:Record<string,string>={'dry-irony':'personal-dry-irony','signal-dynamic':'personal-signal-dynamic','editorial-focus':'personal-editorial-focus'};
 check(p.version===1&&parents[p.id]&&p.parentStyleId===parents[p.id]&&p.approvalStatus==='candidate','unsupported preset');
 check(p.typography.minimum>=64&&p.typography.family==='PersonalOnest'&&p.captions.maximumLines===2,'unreadable typography policy');
 check(p.captions.maximumWords>=1&&p.captions.maximumWords<=6&&p.captions.maximumCharacters<=42&&p.captions.tailMs<=300,'unbounded captions');
 check(p.music.mode==='steady'&&p.music.duckDb===0&&p.music.minimumVoiceLeadDb>=12,'continuous background required');
 check(p.minimumSceneFrames>=15&&p.motion.entryFrames>0&&p.motion.entryFrames<=12,'excessive scene/motion policy');
 check(Object.values(p.palette).every(c=>/^#[0-9a-f]{6}$/i.test(c))&&[p.typography.body,p.typography.quote,p.typography.hero].every(s=>Number.isFinite(s)&&s>=p.typography.minimum&&s<=120)&&p.typography.weight>=400&&p.typography.weight<=800,'invalid design tokens');
 check([p.safe.x,p.safe.y,p.safe.width,p.safe.height].every(Number.isFinite)&&p.safe.x>=72&&p.safe.y>=120&&p.safe.width>0&&p.safe.height>0&&p.safe.x+p.safe.width<=972&&p.safe.y+p.safe.height<=1710,'invalid safe area');
};
export const jobViewport=(job:EditorialJob,frame:number)=>{
 const scene=[...job.scenes].reverse().find(s=>s.from<=frame);check(scene,'no scene at frame');
 return {...(scene!.viewport??job.viewports[scene!.kind]),visible:activeVisual(job.visualPlan,frame)?.layout!=='cutaway'};
};
export const protectedSourceRects=(job:EditorialJob,frame:number):Rect[]=>{
 const scene=[...job.scenes].reverse().find(s=>s.from<=frame);
 const observed=job.visualUnderstanding?.segments.find(s=>frame>=s.from&&frame<s.until)?.protectedRects??[];
 // Explicit editorial close-ups retain the face, microphone and upper hand.
 // Sparse vision observations remain unchanged; only the declared lower-body crop differs.
 return [job.source.face,...(scene?.presenterFraming?observed.filter(r=>r.y+r.height<=job.source.face.y+job.source.face.height+128):observed)];
};
export const jobImage=(job:EditorialJob,frame:number)=>{
 const v=jobViewport(job,frame),scale=v.width/job.source.width*v.zoom;
 return {scale,x:v.x+(v.width-job.source.width*scale)/2,y:v.y-v.sourceY*scale+(1-v.zoom)*v.height*.36};
};
export const compileEditorialJob=(job:EditorialJob,preset:EditorialPreset,prior:{plan:EditPlan;transcript:Transcript})=>{
 validatePreset(preset);
 check(job.version===1&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(job.id)&&job.presetId===preset.id,'invalid job identity');
 check(job.sourceSha256===prior.plan.source.sha256&&prior.transcript.sourceSha256===job.sourceSha256,'source/transcript hash mismatch');
 check(job.source.width>0&&job.source.height>0&&job.music.fadeInSeconds>0&&job.music.fadeOutSeconds>0,'invalid media metadata');
 check(job.transcriptFile.startsWith('public/generated/')&&!job.transcriptFile.includes('..'),'unsafe transcript path');
 const transcript=structuredClone(prior.transcript);
 for(const r of job.refinements){
  const word=transcript.captions.find(w=>w.text.trim()===r.text&&w.startMs===r.sourceStartMs);
  check(word&&r.evidence,'unresolved timing refinement');
  const start=r.correctedStartMs??word!.startMs,end=r.correctedEndMs??word!.endMs;
  check(Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start,'invalid acoustic refinement');word!.startMs=start;word!.endMs=end;
 }
 let cursor=0;
 // The existing baseline API also validates its legacy appearance. This adapter
 // uses it ONLY for the temporal plan. The separate preset owns all rendering.
 const plan:EditPlan={...prior.plan,overlays:[],clips:job.cuts.map(c=>{const item={id:c.id,sourceStartSeconds:c.start,sourceEndSeconds:c.end,outputStartSeconds:cursor,playbackRate:1,reason:c.purpose};cursor+=c.end-c.start;return item;})};
 validateTranscriptCuts(transcript,plan);const timeline=compileTimeline(plan);
 const outputCaptions=timeline.clips.flatMap(c=>captionsForClip(transcript.captions,c,30).map(w=>sourceWordToOutput(w,c,30)));
 const audit=auditCaptionTimeline(plan,transcript,outputCaptions);
 if(job.pacing)check(auditSpeechPacing(outputCaptions,job.pacing.maximumGapMs).status==='passed','speech pause exceeds the job pacing policy');
 check(audit.boundaries.every(b=>b.status==='passed'),'cut risks truncating speech');
 if(job.visualUnderstanding){
  const visual=job.visualUnderstanding;
  check(visual.sourceSha256===job.sourceSha256&&/^[a-f0-9]{64}$/.test(visual.analysisSha256)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(visual.runId),'invalid visual evidence identity');
  check(visual.segments.length===timeline.clips.length&&visual.segments.every((s,i)=>{const c=timeline.clips[i];return s.unitId===c.id&&s.from===c.outputStartFrame&&s.until===c.outputStartFrame+c.durationInFrames&&s.frameIds.length>=2&&s.confidence>=0&&s.confidence<=1&&s.protectedRects.every(r=>Object.values(r).every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=job.source.width+.01&&r.y+r.height<=job.source.height+.01); }),'visual evidence does not map to retained source/output units');
 }
 const scenes=job.scenes.map((s,i)=>{
  const until=job.scenes[i+1]?.from??timeline.durationInFrames;
  check(Number.isInteger(s.from)&&s.from>=0&&(i===0?s.from===0:s.from>job.scenes[i-1].from)&&until-s.from>=preset.minimumSceneFrames,'overlapping/short scene');
  check(preset.scenes.includes(s.kind)&&s.purpose&&s.reference&&preset.referenceIds.some(id=>s.reference.startsWith(id+':')),'scene lacks rule/reference');
  if(s.presenterFraming){
   const a=s.presenterFraming,v=s.viewport??job.viewports[s.kind];
   check(a.role==='accent-close'&&a.authority==='user-request-2026-10-25'&&a.crop==='lower-body-and-tablet'&&Boolean(a.reason?.trim())&&s.kind==='full','invalid presenter close-up authority');
   const anchor=audit.provenance.find(w=>w.sourceStartMs===a.sourceStartMs&&w.sourceEndMs===a.sourceEndMs);
   check(anchor&&s.from===Math.ceil(anchor.startMs*30/1000),'presenter accent must start on a retained word');
   check(v.x===0&&v.y===0&&v.width===1080&&v.height===1920&&v.zoom>1&&v.zoom<=1.45,'unbounded presenter close-up');
   check(!job.visualPlan?.beats.some(b=>b.from<until&&b.until>s.from),'presenter close-up cannot hide behind a graphic');
  }
  const quotes=(s.quotes??[]).map(q=>{
   const words=audit.provenance.filter(w=>w.sourceStartMs>=q.startMs&&w.sourceEndMs<=q.endMs);
   check(words.length&&words[0].sourceStartMs===q.startMs&&words[words.length-1].sourceEndMs===q.endMs&&words.every(w=>w.clipId===words[0].clipId),'quote refers to removed/partial speech');
   const revealFrame=Math.max(s.from,Math.ceil((words[words.length-1].endMs+preset.captions.tailMs)*30/1000));
   check(revealFrame+preset.minimumSceneFrames<=until,'quote has not been spoken or lacks reading time before scene ends');
   return {text:words.map(w=>w.text.trim()).join(' '),sourceStartMs:q.startMs,sourceEndMs:q.endMs,spokenOutputEndMs:words[words.length-1].endMs,revealFrame,role:'quote-reprise' as const};
  });
  check(s.kind!=='comparison'||quotes.length===2&&quotes.every(q=>q.revealFrame===s.from),'comparison must follow both spoken statements');
  check(s.kind!=='split'||quotes.length>=2&&quotes.length<=3,'split requires 2–3 evidenced list items');
  check(['split','comparison'].includes(s.kind)||quotes.length===0,'ordinary speech cannot have a duplicate quote layer');
  return {...s,until,quotes};
 });
 if(job.visualPlan)validateVisualPlan(job.visualPlan,timeline.durationInFrames,preset.id,audit.provenance,job.scenes.map(s=>s.from),scenes.filter(s=>s.presenterFraming).map(s=>s.from));
 for(let f=0;f<timeline.durationInFrames;f++){
  const v=jobViewport(job,f),image=jobImage(job,f);
  check([v.x,v.y,v.width,v.height,v.sourceY,v.zoom].every(Number.isFinite)&&v.width>0&&v.height>0&&v.zoom>=1,'invalid viewport');
  const framing=scenes.find(s=>f>=s.from&&f<s.until)?.presenterFraming;
  if(job.visualUnderstanding)check(v.zoom===1||framing,'visual analysis cannot add an unapproved zoom');
  for(const face of protectedSourceRects(job,f))check(image.x+face.x*image.scale>=v.x-.01&&image.x+(face.x+face.width)*image.scale<=v.x+v.width+.01&&image.y+face.y*image.scale>=v.y-.01&&image.y+(face.y+face.height)*image.scale<=v.y+v.height+.01,'viewport crops protected face/gesture/object');
 }
 return {job,preset,plan,transcript,timeline,outputCaptions,scenes,...audit};
};
export type CompiledEditorialJob=ReturnType<typeof compileEditorialJob>;
export const editorialCues=(captions:Caption[],preset:EditorialPreset,durationMs:number)=>{
 const groups:Caption[][]=[];let current:Caption[]=[];
 const flush=()=>{if(current.length)groups.push(current);current=[];};
 for(const word of captions){const previous=current[current.length-1];if(previous&&(word.startMs-previous.endMs>preset.captions.splitGapMs||current.length>=preset.captions.maximumWords||[...current,word].map(w=>w.text.trim()).join(' ').length>preset.captions.maximumCharacters))flush();current.push(word);if(/[.!?]$/.test(word.text.trim())||word.pageBreakAfter)flush();}flush();
 return groups.map((words,i)=>({text:words.map(w=>w.text.trim()).join(' '),words,startMs:words[0].startMs,endMs:Math.min(words[words.length-1].endMs+preset.captions.tailMs,groups[i+1]?.[0].startMs??durationMs,durationMs)}));
};
