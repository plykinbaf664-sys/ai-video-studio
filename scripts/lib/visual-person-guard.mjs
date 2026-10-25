import {compileEditorialJob} from '../../src/director/editorial-job.ts';
import {sourceRect,fitProtectedViewport} from './visual-job-compiler.mjs';

/** Additional local postcondition after reviewing the first real response:
 * approximate held-object boxes must not authorize cropping the observed person.
 * Uses the model's existing person extent, never invented tracking coordinates.
 * Does not mutate the retained provider analysis or its original compiler. */
export const guardObservedPerson=(result,baseline,preset,prior,analysis)=>{
 const job=structuredClone(result.job),before=compileEditorialJob(baseline,preset,prior);
 for(const segment of job.visualUnderstanding.segments){
  const obs=analysis.observations.find(o=>o.unitId===segment.unitId);
  if(obs.confidence>=.65&&obs.person&&obs.importantObjects.some(o=>o.confidence>=.65))segment.protectedRects.push(sourceRect(obs.person,job.source));
 }
 const changes=[];
 job.scenes=job.scenes.map((scene,i)=>{
  const until=job.scenes[i+1]?.from??before.timeline.durationInFrames;
  const segments=job.visualUnderstanding.segments.filter(s=>s.from<until&&s.until>scene.from);
  const fitted=fitProtectedViewport(scene.viewport??job.viewports[scene.kind],[job.source.face,...segments.flatMap(s=>s.protectedRects)],job.source);
  const original=baseline.scenes[i],originalViewport=original.viewport??baseline.viewports[original.kind];
  if(scene.kind!==original.kind||JSON.stringify(fitted)!==JSON.stringify(originalViewport))changes.push({sceneFrom:scene.from,sceneUntil:until,unitIds:segments.map(s=>s.unitId),before:{kind:original.kind,viewport:originalViewport},after:{kind:scene.kind,viewport:fitted},evidenceFrameIds:[...new Set(segments.flatMap(s=>s.frameIds))],reasons:segments.map(s=>{const o=analysis.observations.find(o=>o.unitId===s.unitId);return {unitId:o.unitId,whatHappens:o.whatHappens,thoughtWordIds:o.decision.thoughtWordIds,decision:o.decision.presentation,why:o.decision.reason,whyNoMore:o.decision.whyNoMore,confidence:o.confidence};}),constraint:'Protect manual face, sufficiently confident image observations and the model-observed person extent when a held object is present; approximate object boxes alone are insufficient. No zoom.'});
  return {...scene,viewport:fitted};
 });
 const compiled=compileEditorialJob(job,preset,prior);
 if(JSON.stringify(compiled.outputCaptions)!==JSON.stringify(before.outputCaptions)||JSON.stringify(compiled.plan.clips)!==JSON.stringify(before.plan.clips))throw Error('Person guard changed protected speech');
 return {job,compiled,changes,originalCompilerChanges:result.changes,postcondition:'observed-person-with-held-object'};
};
