import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadJob} from '../scripts/lib/editorial-job.mjs';
import {compileEditorialJob,jobImage,protectedSourceRects} from '../src/director/editorial-job.ts';
const base=await loadJob('context-domestic-002'),ctx=await loadJob('context-domestic-003');
test('word-anchored presenter close-ups preserve clocks, speech, audio, photos and original vision evidence',()=>{
 assert.deepEqual(ctx.compiled.outputCaptions,base.compiled.outputCaptions);
 for(const key of ['cuts','music','visualUnderstanding'])assert.deepEqual(ctx.job[key],base.job[key]);
 assert.deepEqual(ctx.job.visualPlan.beats,base.job.visualPlan.beats);
 assert.deepEqual(ctx.job.scenes.filter(s=>s.presenterFraming).map(s=>s.from),[36,322,464]);
 for(const frame of [36,322,464]){
  assert.ok(jobImage(ctx.job,frame).scale>jobImage(base.job,frame).scale*1.3);
  assert.ok(protectedSourceRects(ctx.job,frame).some(r=>r.y===576&&r.height===192),'microphone/upper hand remains protected');
 }
 assert.deepEqual(protectedSourceRects(ctx.job,104),protectedSourceRects(base.job,104));
});
test('close-up exception rejects unauthorised zoom, shifted word, graphic occlusion and excessive framing',()=>{
 for(const mutate of [j=>delete j.scenes[1].presenterFraming,j=>j.scenes[1].presenterFraming.authority='model',j=>j.scenes[1].presenterFraming.sourceStartMs++,j=>j.scenes[1].viewport.zoom=1.8,j=>j.scenes[1].viewport.sourceY=500,j=>j.scenes[2].presenterFraming=structuredClone(j.scenes[1].presenterFraming)]){
  const j=structuredClone(ctx.job);mutate(j);assert.throws(()=>compileEditorialJob(j,ctx.preset,ctx.prior));
 }
});
test('historical full-person protection still rejects arbitrary crop without an editorial close-up',()=>{
 const j=structuredClone(base.job);j.scenes[0].viewport.sourceY=300;
 assert.throws(()=>compileEditorialJob(j,base.preset,base.prior),/crops protected/);
});
test('an otherwise valid accent cannot be covered by a photo',()=>{
 const j=structuredClone(ctx.job);j.visualPlan.beats[0].from=36;
 assert.throws(()=>compileEditorialJob(j,ctx.preset,ctx.prior),/close-up cannot hide behind a graphic/);
});
