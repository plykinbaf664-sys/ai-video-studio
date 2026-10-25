import {compileEditorialJob} from '../../src/director/editorial-job.ts';
import {readFileSync} from 'node:fs';
const policies=JSON.parse(readFileSync(new URL('../../style-presets/policies/visual-understanding.json',import.meta.url),'utf8'));
const threshold=policies.shared.minimumConfidenceForGeometry;

export const sourceRect=(box,source)=>({x:box.x*source.width,y:box.y*source.height,width:box.width*source.width,height:box.height*source.height});
export const unionRects=boxes=>{
 const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
 return {x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
};
/** Fit source region by reducing footprint, never by a zoom/pan animation. */
export const fitProtectedViewport=(original,boxes,source)=>{
 const initialScale=original.width/source.width*original.zoom;
 const imageY=original.y-original.sourceY*initialScale+(1-original.zoom)*original.height*.36;
 if(original.zoom===1&&boxes.every(b=>imageY+b.y*initialScale>=original.y-.01&&imageY+(b.y+b.height)*initialScale<=original.y+original.height+.01))return {...original};
 const region=unionRects(boxes),top=Math.max(0,region.y-32),bottom=Math.min(source.height,region.y+region.height+32);
 const scale=Math.min(original.width/source.width,original.height/(bottom-top));
 const width=scale*source.width;
 return {...original,x:original.x+(original.width-width)/2,width,sourceY:Math.max(0,Math.min(top,source.height-original.height/scale)),zoom:1};
};
export const authorVisualBaseline=(base,run,style='signal-dynamic')=>{
 if(!policies.styles[style])throw Error('Unsupported visual style');
 const job=structuredClone(base);job.id=`${run}-a`;job.presetId=style;job.compositionId='VisualA';job.baseReuseJobId=base.id;
 delete job.visualUnderstanding;
 if(style==='dry-irony'){
  for(const v of Object.values(job.viewports))v.zoom=1;
  return job;
 }
 if(style==='editorial-focus'){
  job.scenes=job.scenes.map(s=>({...s,kind:'full',quotes:[],reference:'img-3320:0–18',purpose:`Editorial Focus: keep the speaker and one readable current-speech layer. ${s.purpose}`}));
  for(const v of Object.values(job.viewports))v.zoom=1;
  return job;
 }
 job.viewports={
  speaker:{x:64,y:620,width:952,height:1090,sourceY:140,zoom:1},
  quote:{x:64,y:620,width:952,height:1090,sourceY:140,zoom:1},
  split:{x:64,y:750,width:952,height:960,sourceY:190,zoom:1},
  comparison:{x:96,y:840,width:804,height:870,sourceY:230,zoom:1},
  full:{x:0,y:0,width:1080,height:1920,sourceY:0,zoom:1}
 };
 job.scenes=job.scenes.map(s=>({...s,reference:s.kind==='split'?'img-3322:14.3–19.3':s.kind==='full'?'img-3322:39–43.2':'img-3322:8–10.5',purpose:`Signal Dynamic, text/rules baseline. ${s.purpose}`}));
 return job;
};

export const compileVisualVariant=(baseline,preset,prior,analysis,{runId,analysisSha256})=>{
 const job=structuredClone(baseline);job.id=`run-${runId}-b`;job.compositionId='VisualB';job.baseReuseJobId=baseline.baseReuseJobId;
 const base=compileEditorialJob(baseline,preset,prior),changes=[];
 const segments=base.timeline.clips.map(c=>{
  const obs=analysis.observations.find(o=>o.unitId===c.id);if(!obs)throw Error('No actual visual observation for '+c.id);
  const confident=obs.confidence>=threshold;
  if(!policies.styles[preset.id]?.allowedPresentations.includes(obs.decision.presentation))throw Error('Visual decision outside selected style policy');
  const rects=confident?[...(obs.face?[sourceRect(obs.face,job.source)]:[]),...obs.importantObjects.filter(o=>o.confidence>=threshold).map(o=>sourceRect(o.box,job.source))]:[];
  return {from:c.outputStartFrame,until:c.outputStartFrame+c.durationInFrames,unitId:c.id,frameIds:obs.frameIds,confidence:obs.confidence,protectedRects:rects};
 });
 job.visualUnderstanding={runId,sourceSha256:analysis.sourceSha256,analysisSha256,segments};
 job.scenes=job.scenes.map((scene,i)=>{
  const until=job.scenes[i+1]?.from??base.timeline.durationInFrames;
  const covered=segments.filter(s=>s.from<until&&s.until>scene.from),observed=covered.map(s=>analysis.observations.find(o=>o.unitId===s.unitId));
  const confident=observed.filter(o=>o.confidence>=threshold);
  const avoid=confident.some(o=>o.decision.presentation==='avoid-graphics');
  let next={...scene};
  if(avoid&&scene.kind!=='full')next={...next,kind:'full',quotes:[],purpose:'Image analysis requests unobstructed source: '+confident.filter(o=>o.decision.presentation==='avoid-graphics').map(o=>o.decision.reason).join(' ')};
  const original=job.viewports[next.kind],boxes=[job.source.face,...covered.flatMap(s=>s.protectedRects)];
  const fitted=covered.some(s=>s.protectedRects.length)?fitProtectedViewport(original,boxes,job.source):{...original};
  next.viewport=fitted;
  if(JSON.stringify(fitted)!==JSON.stringify(job.viewports[scene.kind])||next.kind!==scene.kind){
   changes.push({sceneFrom:scene.from,sceneUntil:until,unitIds:covered.map(s=>s.unitId),before:{kind:scene.kind,viewport:job.viewports[scene.kind]},after:{kind:next.kind,viewport:fitted},evidenceFrameIds:[...new Set(covered.flatMap(s=>s.frameIds))],reasons:observed.map(o=>({unitId:o.unitId,whatHappens:o.whatHappens,thoughtWordIds:o.decision.thoughtWordIds,decision:o.decision.presentation,why:o.decision.reason,whyNoMore:o.decision.whyNoMore,confidence:o.confidence})),constraint:'Crop fits the union of trusted manual face and sufficiently confident observed face/hand/held-object rectangles; zoom stays1.'});
  }
  return next;
 });
 const result=compileEditorialJob(job,preset,prior);
 if(JSON.stringify(result.outputCaptions)!==JSON.stringify(base.outputCaptions)||JSON.stringify(result.plan.clips)!==JSON.stringify(base.plan.clips)||JSON.stringify(job.music)!==JSON.stringify(baseline.music)||JSON.stringify(job.color)!==JSON.stringify(baseline.color))throw Error('A/B visual compiler changed protected speech/cuts/audio/grade');
 return {job,changes,compiled:result};
};
