import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateVisualAnalysis,visualDigest} from '../scripts/lib/visual-understanding.mjs';
import {authorVisualBaseline,compileVisualVariant,sourceRect} from '../scripts/lib/visual-job-compiler.mjs';
import {compileEditorialJob} from '../src/director/editorial-job.ts';
import {readQwenConfig} from '../scripts/lib/qwen-config.mjs';
import {invokeQwen} from '../scripts/lib/qwen-provider.mjs';
import {guardObservedPerson} from '../scripts/lib/visual-person-guard.mjs';
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const schema=await json('contracts/visual-analysis.schema.json');
const base=await json('edits/qwen-cut-001-thematic-grouping.json'),preset=await json('style-presets/grammars/signal-dynamic.json'),prior=await json(base.transcriptFile);
const baseline=authorVisualBaseline(base,'unit-test-visual');
const compiled=compileEditorialJob(baseline,preset,prior);
const unitObservation=(unitId,i)=>({unitId,frameIds:[`f${String(i*2).padStart(4,'0')}`,`f${String(i*2+1).padStart(4,'0')}`],confidence:.9,whatHappens:'Синтетическая геометрия только для регрессионного теста',face:{x:.3,y:.2,width:.4,height:.3},person:null,importantObjects:[{kind:'hand',box:{x:.05,y:.76,width:.18,height:.15},confidence:.9,reason:'Test: lower hand must fit'}],freeAreas:[{x:0,y:0,width:1,height:.1}],motion:{level:'medium',description:'Test-only movement'},expression:{description:'Unknown in test fixture',confidence:0},lighting:{changed:null,description:'No visual inference in fixture'},decision:{thoughtWordIds:[`w${String(i).padStart(5,'0')}`],presentation:'protect-gesture',reason:'Keep the test protected hand visible',whyNoMore:'No arbitrary zoom or extra effect is justified',zoom:'none',styleNotes:{'editorial-focus':'Calm test framing','signal-dynamic':'Protected test speaker','dry-irony':'Preserve test delivery'}}});
const observations=compiled.timeline.clips.map((c,i)=>unitObservation(c.id,i));
const prepared={schema,contextSha256:'a'.repeat(64),context:{sourceSha256:base.sourceSha256,units:observations.map((o,i)=>({id:o.unitId,wordIds:[`w${String(i).padStart(5,'0')}`]}))},selected:observations.flatMap(o=>o.frameIds.map(id=>({id,retainedUnitIds:[o.unitId]})))};
const analysis={version:1,contextSha256:prepared.contextSha256,sourceSha256:base.sourceSha256,observations,limitations:['Synthetic protocol/geometry fixture, never a genuine vision result']};

test('visual evidence rejects borrowed/removed frames, invented words, stale source and incomplete coverage',()=>{
 assert.equal(validateVisualAnalysis(prepared,analysis),analysis);
 for(const mutate of [x=>x.sourceSha256='b'.repeat(64),x=>x.contextSha256='c'.repeat(64),x=>x.observations.pop(),x=>x.observations[0].frameIds[0]='f9999',x=>x.observations[0].frameIds[0]=observations[1].frameIds[0],x=>x.observations[0].decision.thoughtWordIds=['w99999']]){
  const changed=structuredClone(analysis);mutate(changed);assert.throws(()=>validateVisualAnalysis(prepared,changed));
 }
});
test('vision schema rejects out-of-frame boxes, face-overlapping free areas and arbitrary zoom',()=>{
 for(const mutate of [x=>x.observations[0].face.width=.9,x=>x.observations[0].freeAreas=[x.observations[0].face],x=>x.observations[0].freeAreas=[x.observations[0].importantObjects[0].box],x=>x.observations[0].decision.zoom='dramatic']){
  const changed=structuredClone(analysis);mutate(changed);assert.throws(()=>validateVisualAnalysis(prepared,changed));
 }
});

test('all three style policies compile with identical source cuts, words and steady audio',async()=>{
 for(const style of ['signal-dynamic','editorial-focus','dry-irony']){
  const p=await json(`style-presets/grammars/${style}.json`);
  const a=authorVisualBaseline(base,'unit-test-style',style),c=compileEditorialJob(a,p,prior);
  const b=compileVisualVariant(a,p,prior,analysis,{runId:'unit-test-style',analysisSha256:'d'.repeat(64)});
  assert.deepEqual(b.compiled.plan.clips,c.plan.clips);
  assert.deepEqual(b.compiled.outputCaptions,c.outputCaptions);
  assert.deepEqual(b.job.music,base.music);
  if(style==='editorial-focus')assert.ok(b.job.scenes.every(s=>s.kind==='full'&&!s.quotes.length));
 }
 assert.deepEqual(sourceRect({x:.25,y:.5,width:.25,height:.25},{width:1920,height:1080}),{x:480,y:540,width:480,height:270});
});

test('unobstructed delivery removes graphics, cites actual evidence and does not trim speech',()=>{
 const clean=structuredClone(analysis);clean.observations.forEach(o=>{o.decision.presentation='avoid-graphics';});
 const result=compileVisualVariant(baseline,preset,prior,clean,{runId:'unit-test-clean',analysisSha256:'d'.repeat(64)});
 assert.ok(result.job.scenes.every(s=>s.kind==='full'&&s.quotes.length===0));
 assert.deepEqual(result.compiled.outputCaptions,compiled.outputCaptions);
 assert.ok(result.changes.every(c=>c.evidenceFrameIds.length>=2&&c.reasons.every(r=>r.why&&r.whyNoMore)));
});

test('approved multimodal transport transmits the image block once with no key in the body',async()=>{
 const c={...readQwenConfig({QWEN_ENABLED:'true',QWEN_REGION:'ap-southeast-1',QWEN_BASE_URL:'https://test.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',QWEN_MODEL:'qwen3.8-flash',QWEN_API_KEY:'fixture-not-real'}),maxInputBytes:8*1024*1024};
 const body={model:c.model,max_tokens:c.maxOutputTokens,messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/jpeg;base64,dGVzdC1vbmx5'}}]}]};
 const call={url:c.baseUrl+'/chat/completions',region:c.region,model:c.model,body,timeoutMs:c.timeoutMs,maxInputBytes:c.maxInputBytes,maxResponseBytes:c.maxResponseBytes,maxRequestsPerRun:1};
 const p={call,bodyText:JSON.stringify(body),payloadSha256:visualDigest(call)};
 let calls=0;
 const result=await invokeQwen(p,c,{approvedPayloadSha256:p.payloadSha256,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,call.url);assert.equal(options.redirect,'manual');
  assert.equal(options.headers.Authorization,'Bearer '+c.apiKey);
  assert.ok(!options.body.includes(c.apiKey));assert.deepEqual(JSON.parse(options.body),body);
  return new Response(JSON.stringify({model:c.model,choices:[{finish_reason:'stop',message:{role:'assistant',content:'{"fixture":true}'}}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}}));
 }});
 assert.equal(calls,1);assert.equal(result.content,'{"fixture":true}');
});
test('image-informed compiler preserves exact words/cuts/music/grade and fits meaningful lower gestures without zoom',()=>{
 const result=compileVisualVariant(baseline,preset,prior,analysis,{runId:'unit-test-visual',analysisSha256:'d'.repeat(64)});
 assert.deepEqual(result.compiled.outputCaptions,compiled.outputCaptions);assert.deepEqual(result.compiled.plan.clips,compiled.plan.clips);
 assert.deepEqual(result.job.music,baseline.music);assert.deepEqual(result.job.color,baseline.color);
 assert.ok(result.changes.length>0);assert.ok(result.job.scenes.every(s=>s.viewport.zoom===1));
 assert.ok(result.job.scenes.find(s=>s.kind==='split').viewport.width<baseline.viewports.split.width);
 const bad=structuredClone(result.job);bad.scenes[1].viewport=baseline.viewports.split;
 assert.throws(()=>compileEditorialJob(bad,preset,prior),/crops protected/);
});
test('unknown low-confidence geometry leaves the baseline unchanged rather than fabricating observations',()=>{
 const weak=structuredClone(analysis);weak.observations.forEach(o=>{o.confidence=.2;o.face=null;o.decision.presentation='retain';});
 const result=compileVisualVariant(baseline,preset,prior,weak,{runId:'unit-test-visual',analysisSha256:'d'.repeat(64)});
 assert.equal(result.changes.length,0);assert.ok(result.job.visualUnderstanding.segments.every(s=>s.protectedRects.length===0));
});

test('approximate held-object boxes cannot crop the model-observed person extent',()=>{
 const observed=structuredClone(analysis);observed.observations.forEach(o=>{o.person={x:.1,y:.2,width:.8,height:.8};});
 const original=compileVisualVariant(baseline,preset,prior,observed,{runId:'unit-test-body',analysisSha256:'d'.repeat(64)});
 const result=guardObservedPerson(original,baseline,preset,prior,observed);
 assert.deepEqual(result.compiled.outputCaptions,compiled.outputCaptions);
 assert.ok(result.job.visualUnderstanding.segments.every(s=>s.protectedRects.some(b=>Math.abs(b.y+b.height-base.source.height)<.01)));
 const tooTight=structuredClone(result.job);tooTight.scenes[1].viewport=original.job.scenes[1].viewport;
 assert.throws(()=>compileEditorialJob(tooTight,preset,prior),/crops protected/);
 assert.equal(observed.observations[0].person.height,.8);
});
test('reprise needs actual reading time and the visual evidence cannot borrow source/output units',()=>{
 const short=structuredClone(baseline);short.scenes[2].from=298;
 assert.throws(()=>compileEditorialJob(short,preset,prior),/reading time/);
 const result=compileVisualVariant(baseline,preset,prior,analysis,{runId:'unit-test-visual',analysisSha256:'d'.repeat(64)});
 const wrong=structuredClone(result.job);wrong.visualUnderstanding.segments[0].from=1;
 assert.throws(()=>compileEditorialJob(wrong,preset,prior),/does not map/);
 const zoom=structuredClone(result.job);zoom.scenes[0].viewport.zoom=1.01;
 assert.throws(()=>compileEditorialJob(zoom,preset,prior),/unapproved zoom/);
});
test('image transport requires exact independent approval and rejects a changed image before any network request',async()=>{
 const c={...readQwenConfig({QWEN_ENABLED:'true',QWEN_REGION:'ap-southeast-1',QWEN_BASE_URL:'https://test.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',QWEN_MODEL:'qwen3.8-flash',QWEN_API_KEY:'fixture-not-real'}),maxInputBytes:8*1024*1024};
 const body={model:c.model,max_tokens:c.maxOutputTokens,messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/jpeg;base64,dGVzdC1vbmx5'}}]}]};
 const call={url:c.baseUrl+'/chat/completions',region:c.region,model:c.model,body,timeoutMs:c.timeoutMs,maxInputBytes:c.maxInputBytes,maxResponseBytes:c.maxResponseBytes,maxRequestsPerRun:1};
 const p={call,bodyText:JSON.stringify(body),payloadSha256:visualDigest(call)};
 let calls=0;const fetchImpl=()=>{calls++;throw Error('Should not fetch');};
 await assert.rejects(()=>invokeQwen(p,c,{fetchImpl}),/APPROVAL_REQUIRED/);
 const altered=structuredClone(p);altered.call.body.messages[0].content[0].image_url.url+='changed';
 await assert.rejects(()=>invokeQwen(altered,c,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/APPROVAL_REQUIRED/);
 assert.equal(calls,0);
});
