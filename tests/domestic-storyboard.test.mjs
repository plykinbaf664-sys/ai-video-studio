import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadJob} from '../scripts/lib/editorial-job.mjs';
import {visualLibrary,visualSnapshot,retrieveVisuals} from '../scripts/lib/visual-library.mjs';
import {planDomesticStory} from '../src/director/domestic-storyboard.ts';
import {compileEditorialJob,jobViewport} from '../src/director/editorial-job.ts';
import {photoProtectedRects} from '../src/director/visual-plan.ts';
import {buildDirectorRequest,validateDirection} from '../scripts/lib/director-workflow.mjs';
import {authorBaselineExample} from '../scripts/lib/director-baseline-example.mjs';
import {directionEvidence} from '../scripts/lib/direction-evidence.mjs';
const read=async f=>JSON.parse(await readFile(f,'utf8')),base=await loadJob('visual-001-b'),ctx=await loadJob('context-domestic-002'),entries=await visualLibrary(),assets=entries.map(visualSnapshot),brief=await read('edits/briefs/domestic-counterpoint.json'),policy=await read('style-presets/policies/domestic-counterpoint.json');
const units=base.compiled.timeline.clips.map(c=>({id:c.id,from:c.outputStartFrame,until:c.outputStartFrame+c.durationInFrames,words:base.compiled.provenance.filter(w=>w.clipId===c.id)}));
const plan=(patch={})=>planDomesticStory({units,assets,style:base.preset.id,brief,policy,duration:548,...patch});
test('four contextual photographs retain exact speech/audio clocks and one actual cutaway interval',()=>{
 assert.deepEqual(ctx.compiled.outputCaptions,base.compiled.outputCaptions);assert.deepEqual(ctx.job.cuts,base.job.cuts);assert.deepEqual(ctx.job.music,base.job.music);assert.deepEqual(ctx.job.color,base.job.color);
 assert.equal(ctx.compiled.provenance.length,40);assert.equal(ctx.compiled.timeline.durationInFrames,548);
 assert.equal(Array.from({length:548},(_,f)=>jobViewport(ctx.job,f)).filter(v=>!v.visible).length,58);
 assert.equal(jobViewport(ctx.job,163).visible,false);assert.equal(jobViewport(ctx.job,221).visible,true);assert.equal(jobViewport(ctx.job,434).visible,true);
 const p=plan();assert.deepEqual(p.beats.map(b=>b.subject),['dishwashing','cooking','bathroom-repair','laundry-hanging']);assert.ok(p.coverage<.45);
 assert.equal(p.decisions.at(-1).decision,'speaker');assert.ok(p.beats.every(b=>b.until<=434));
});
test('neutral household footage, tutorials and AI explainers cannot trigger the domestic-irony rule',()=>{
 for(const patch of [{genre:'neutral'},{genre:'instruction'},{domain:'ai'},{relationship:'literal'},{contextReason:''},{illustrateExamples:false}])assert.equal(plan({brief:{...brief,...patch}}).beats.length,0);
});
test('action matching does not substitute dishes for dinner and never falls back to the illustrated asset',()=>{
 const selected=retrieveVisuals(entries,{domain:'domestic',intent:'contrast',style:'signal-dynamic',subject:'cooking',aesthetic:'photographic'});
 assert.deepEqual(selected.map(r=>r.asset.id),['domestic-photo-dinner-v1']);
 const missing=plan({assets:assets.filter(a=>!a.subjects?.includes('cooking'))});assert.ok(!missing.beats.some(b=>b.subject==='cooking'));assert.ok(missing.decisions.find(d=>d.unitId==='dinner').reason.includes('Нет готового'));
});
test('rule generalizes to new ids/wording while requiring a real supported claim and action',()=>{
 const synthetic=text=>[{id:'different-recording',from:50,until:120,words:[{text,sourceStartMs:5000,sourceEndMs:6500}]}];
 const changed=plan({units:synthetic('Я сама решила приготовить обед.'),duration:300});assert.equal(changed.beats[0].subject,'cooking');assert.equal(changed.beats[0].from,50);
 for(const text of ['Вчера мы купили посуду.','Я сам решил не мыть посуду.','Я сам починил автомобиль.','Давайте поговорим про ужин.'])assert.equal(plan({units:synthetic(text),duration:300}).beats.length,0);
});
test('adjacent photos require the declared policy, action evidence, distinct assets and a consistent cast',()=>{
 for(const mutate of [j=>delete j.visualPlan.policy,j=>j.visualPlan.beats[1].subject='dishwashing',j=>j.visualPlan.beats[1].assetId=j.visualPlan.beats[0].assetId,j=>j.visualPlan.assets.find(a=>a.subjects?.includes('cooking')).castId='other-family',j=>j.visualPlan.beats[0].from=0]){
  const j=structuredClone(ctx.job);mutate(j);assert.throws(()=>compileEditorialJob(j,ctx.preset,ctx.prior),/Visual plan/);
 }
});
test('generated photo face/hand protection leaves the live caption and fiction label outside subject regions',()=>{
 const beat=ctx.job.visualPlan.beats.find(b=>b.layout==='cutaway'),asset=ctx.job.visualPlan.assets.find(a=>a.id===beat.assetId),boxes=photoProtectedRects(asset,beat,ctx.preset.safe);
 assert.ok(boxes.length&&boxes.every(b=>b.y>175&&b.bottom<1400));
 assert.ok(ctx.job.visualPlan.assets.every(a=>a.aesthetic==='photographic'&&a.castId==='family-candid-a'&&a.photoSafety.protectedRegions.length));
});
test('provider contract accepts only catalogue-backed photo series and retains local storyboard provenance',async()=>{
 const request=await buildDirectorRequest({runId:'photo-series-contract-test',jobId:'dry-irony-tight',brief:{objective:'Бытовая ирония с фотографическими контрапунктами',audience:'Общий',preserveAllSpeech:true}}),response=authorBaselineExample(request),story=plan();
 response.treatments[0].visuals={domain:'domestic',policy:story.policy,restraint:story.restraint,beats:story.beats.map(b=>{const unit=request.packet.context.units.find(u=>u.id===b.id.replace('photo-',''));return {id:b.id,unitId:unit.id,assetId:b.assetId,intent:b.intent,layout:b.layout,presentation:b.presentation,subject:b.subject,...(b.seriesId?{seriesId:b.seriesId}:{}),evidence:{firstWordId:unit.wordIds[0],lastWordId:unit.wordIds.at(-1)},why:b.why};})};
 const compiled=validateDirection(request,response);assert.equal(compiled.candidates[0].job.visualPlan.beats.length,4);assert.equal(compiled.candidates[0].retainedWordCount,40);
 assert.equal((await directionEvidence(ctx.id,ctx.jobSha256)).mode,'editor-brief-local-domestic-storyboard');
 response.treatments[0].visuals.beats[1].subject='dishwashing';assert.throws(()=>validateDirection(request,response),/Visual plan/);
});
