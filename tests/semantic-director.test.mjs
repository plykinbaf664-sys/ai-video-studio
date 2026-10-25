import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDirectorRequest,validateDirection,digest,validId,readLocalResponse} from '../scripts/lib/director-workflow.mjs';
import {authorBaselineExample} from '../scripts/lib/director-baseline-example.mjs';
import {requireDirectingProvider} from '../src/director/provider.ts';

const request=await buildDirectorRequest({runId:'director-test',jobId:'dry-irony-tight',brief:{objective:'Проверить перенос реального монтажа',audience:'Не задана',preserveAllSpeech:true}});
const original=authorBaselineExample(request);
const bad=mutate=>{const value=structuredClone(original);mutate(value);return value;};
const review=value=>validateDirection(request,value);

test('offline request binds actual corrected source words, catalog beats and missing observations',()=>{
  assert.equal(request.contextSha256,digest(request.packet));
  assert.equal(request.packet.sourceSha256,request.ctx.job.sourceSha256);
  assert.equal(request.packet.context.words.length,40);
  assert.equal(request.packet.context.units.length,7);
  assert.equal(request.packet.context.words.find(w=>w.text==='тоже').sourceStartMs,40320);
  assert.ok(request.packet.context.observations.missing.includes('source-frame-sequence-analysis'));
  assert.equal(request.packet.capabilities.networkEnabled,false);
  assert.equal(request.packet.coverage.unavailableWordIds.length,0);
});

test('two real treatments compile to current engine with identical intact speech and different direction',()=>{
  const result=review(original),[a,b]=result.candidates;
  assert.equal(result.status,'plan-validated-media-unreviewed');
  assert.equal(a.durationInFrames,548);assert.equal(b.durationInFrames,548);
  assert.equal(a.retainedWordCount,40);assert.equal(b.retainedWordCount,40);
  assert.deepEqual(a.job.cuts.map(c=>[c.start,c.end]),request.ctx.job.cuts.map(c=>[c.start,c.end]));
  assert.deepEqual(a.job.scenes.map(s=>s.from),request.ctx.job.scenes.map(s=>s.from));
  assert.deepEqual(a.wordMap,b.wordMap);
  assert.deepEqual(a.job.color,request.ctx.job.color);assert.deepEqual(a.job.music,request.ctx.job.music);
  assert.equal(a.scenes.length,7);assert.equal(b.scenes.length,2);
  assert.equal(a.omittedWords.length,0);assert.equal(b.omittedWords.length,0);
  assert.ok(b.reviewItems.some(s=>s.includes('Watch/listen')));
});

test('request/hash/source binding rejects old or unrelated responses',()=>{
  assert.throws(()=>review(bad(r=>r.contextSha256='0'.repeat(64))),/stale request/);
  assert.throws(()=>review(bad(r=>r.requestId='another-source')),/stale request/);
  assert.throws(()=>review(bad(r=>r.treatments[0].beats[0].unitIds=['invented-source'])),/unknown/);
});

test('director cannot create captions, alter production settings or provide executable markup fields',()=>{
  for(const key of ['captions','music','color','script','assetUrl'])assert.throws(()=>review(bad(r=>r.treatments[0][key]='invented')),/response schema/);
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[0].kind='3d')),/response schema/);
});

test('schema rejects observed live-model quote-layer and single-item split mistakes',()=>{
  assert.throws(()=>review(bad(r=>{r.treatments[0].scenes[0].kind='quote';r.treatments[0].scenes[0].quotes=[r.treatments[0].scenes[0].evidence];})),/response schema/);
  assert.throws(()=>review(bad(r=>{r.treatments[0].scenes[3].quotes=r.treatments[0].scenes[3].quotes.slice(0,1);})),/response schema/);
});

test('missing, duplicated and unaccounted speech is blocked with strict preservation',()=>{
  assert.throws(()=>review(bad(r=>r.treatments[0].beats.splice(1,1))),/unaccounted/);
  assert.throws(()=>review(bad(r=>r.treatments[0].beats[1].unitIds.push('hook'))),/duplicate retained/);
  assert.throws(()=>review(bad(r=>{r.treatments[0].beats.splice(1,1);r.treatments[0].omissions.push({unitId:'dishes',reason:'Укоротить'});})),/forbids omitting/);
});

test('explicit omission recomputes word/scene output clocks rather than reusing original times',()=>{
  const relaxed={...request,packet:structuredClone(request.packet)};
  relaxed.packet.context.brief.preserveAllSpeech=false;relaxed.contextSha256=digest(relaxed.packet);
  const response=structuredClone(original);response.contextSha256=relaxed.contextSha256;
  for(const t of response.treatments){
    t.beats=t.beats.filter(b=>!b.unitIds.includes('dinner'));t.omissions=[{unitId:'dinner',reason:'Явно разрешённое сокращение одного примера для теста временной модели'}];
    const opening=structuredClone(original.treatments[0].scenes[0]),ending=structuredClone(original.treatments[0].scenes.find(s=>s.kind==='full'));
    t.scenes=[opening,ending];
  }
  response.treatments[1].scenes.splice(1,0,structuredClone(original.treatments[0].scenes[1]));
  const result=validateDirection(relaxed,response);
  for(const candidate of result.candidates){
    assert.equal(candidate.durationInFrames,490);assert.equal(candidate.retainedWordCount,36);
    assert.equal(candidate.omittedWords.length,4);
    assert.equal(candidate.scenes.at(-1).from,330);
    assert.ok(Math.abs(candidate.wordMap.find(w=>w.sourceStartMs===40320).startMs-12753.333333333334)<.001);
  }
});

test('reordered units map their own words and require context review without forward-cache reuse',()=>{
  const response=structuredClone(original);
  for(const t of response.treatments){
    [t.beats[1],t.beats[2]]=[t.beats[2],t.beats[1]];
    t.scenes=[structuredClone(original.treatments[0].scenes[0]),structuredClone(original.treatments[0].scenes.find(s=>s.kind==='full'))];
  }
  response.treatments[1].scenes.splice(1,0,structuredClone(original.treatments[0].scenes[1]));
  const result=review(response);
  for(const candidate of result.candidates){
    assert.equal(candidate.retainedWordCount,40);assert.equal(candidate.job.cuts[1].id,'dinner');
    assert.equal(candidate.job.baseReuseJobId,undefined);
    assert.ok(candidate.reviewItems.some(s=>s.includes('Reordered source speech')));
    assert.ok(candidate.wordMap.find(w=>w.clipId==='dinner').startMs<candidate.wordMap.find(w=>w.clipId==='dishes').startMs);
  }
});

test('fabricated, reversed or irrelevant word evidence cannot authorize a scene',()=>{
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[0].evidence.firstWordId='fake-word')),/word evidence/);
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[0].evidence={firstWordId:'w00039',lastWordId:'w00000'})),/reversed/);
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[0].evidence={firstWordId:'w00039',lastWordId:'w00039'})),/unrelated/);
  assert.throws(()=>review(bad(r=>r.treatments[0].beats[0].evidence={firstWordId:'w00039',lastWordId:'w00039'})),/outside its speech/);
});

test('source-time anchors, early quote reveals and unreadable holds are blocked',()=>{
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[1].anchor.timeline='source')),/response schema/);
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes.at(-1).anchor={timeline:'output',kind:'unit-start',unitId:'payoff-end',offsetFrames:0})),/follow both/);
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[4].anchor.offsetFrames=21)),/reading (hold|time)/);
});

test('reference citations must name a registered beat interval, not just an existing filename',()=>{
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[0].reference={referenceId:'img-3321',startMs:0,endMs:1000})),/unregistered reference/);
  assert.throws(()=>review(bad(r=>r.treatments[0].scenes[0].reference.referenceId='invented')),/unregistered reference/);
});

test('cosmetic or tiny timing changes do not count as a second treatment',()=>{
  assert.throws(()=>review(bad(r=>{r.treatments[1]=structuredClone(r.treatments[0]);r.treatments[1].id='renamed';r.treatments[1].title='Другое название';r.treatments[1].scenes[1].anchor.offsetFrames=1;})),/identical editing direction/);
});

test('unsupported production needs require evidence and a real fallback, and remain review items',()=>{
  const withNeed=bad(r=>r.treatments[0].productionNeeds.push({capability:'diagram',reason:'Нужна отдельная реализация схемы',evidence:r.treatments[0].beats[1].evidence,fallbackSceneId:'scene-1'}));
  assert.ok(review(withNeed).candidates[0].reviewItems.some(s=>s.includes('Unimplemented diagram')));
  withNeed.treatments[0].productionNeeds[0].fallbackSceneId='missing';assert.throws(()=>review(withNeed),/fallback/);
});

test('unavailable modalities and absent provider are explicit failures, never synthetic AI generation',()=>{
  assert.throws(()=>review(bad(r=>r.observationsUsed.push('source-frame-sequence-analysis'))),/unavailable/);
  assert.throws(()=>requireDirectingProvider(null),/PROVIDER_NOT_CONFIGURED/);
  assert.equal(original.authorship.kind,'baseline-adaptation');
  assert.throws(()=>authorBaselineExample({...request,ctx:{...request.ctx,id:'another-source'}}),/not an automatic director/);
});

test('run ids and response files cannot escape the private workspace',async()=>{
  for(const id of ['../out','C:\\secret','x/y','x'.repeat(65)])assert.throws(()=>validId(id),/registered id/);
  await assert.rejects(()=>readLocalResponse('package.json/../AGENTS.md'),/JSON file/);
  assert.equal((await readLocalResponse('edits/dry-irony-tight.json')).id,'dry-irony-tight');
});
