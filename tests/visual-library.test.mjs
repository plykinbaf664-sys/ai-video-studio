import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadJob} from '../scripts/lib/editorial-job.mjs';
import {visualLibrary,visualSnapshot,retrieveVisuals,bindVisualAssets,registerVisual} from '../scripts/lib/visual-library.mjs';
import {compileEditorialJob,jobViewport} from '../src/director/editorial-job.ts';
import {validateVisualPlan} from '../src/director/visual-plan.ts';
import {buildDirectorRequest,validateDirection} from '../scripts/lib/director-workflow.mjs';
import {authorBaselineExample} from '../scripts/lib/director-baseline-example.mjs';
import {fingerprint} from '../scripts/lib/media.mjs';
const ctx=await loadJob('context-domestic-001'),entries=await visualLibrary();
const compile=j=>compileEditorialJob(j,ctx.preset,ctx.prior);
test('contextual scene changes and illustration preserve every source word, cut and shared audio policy',async()=>{
 const baseline=await loadJob('visual-001-b');
 assert.deepEqual(ctx.compiled.outputCaptions,baseline.compiled.outputCaptions);
 assert.deepEqual(ctx.job.cuts,baseline.job.cuts);assert.deepEqual(ctx.job.music,baseline.job.music);
 assert.equal(ctx.compiled.timeline.durationInFrames,548);assert.equal(ctx.compiled.provenance.length,40);
 const hidden=structuredClone(ctx.job);hidden.visualPlan.beats[0].layout='cutaway';
 assert.deepEqual(compile(hidden).outputCaptions,ctx.compiled.outputCaptions);
 assert.equal(jobViewport(hidden,104).visible,false);assert.equal(jobViewport(hidden,163).visible,true);
});
test('retrieval separates domestic contradiction from AI explanation and reuses exact versioned assets',()=>{
 assert.equal(retrieveVisuals(entries,{domain:'domestic',intent:'contrast',style:'dry-irony',query:'помыть посуду'})[0].asset.id,'domestic-dishes-v1');
 assert.deepEqual(retrieveVisuals(entries,{domain:'ai',intent:'contrast',style:'signal-dynamic'}),[]);
 for(const style of ['signal-dynamic','editorial-focus','dry-irony'])assert.equal(retrieveVisuals(entries,{domain:'ai',intent:'explain-process',style})[0].asset.id,'diagram-process-v1');
});
test('unbound speech, crowds, hasty shots and mismatched contexts fail before render',()=>{
 for(const mutate of [j=>j.visualPlan.domain='ai',j=>j.visualPlan.beats[0].sourceStartMs++,j=>j.visualPlan.beats[0].until=130,j=>j.visualPlan.beats.push({...j.visualPlan.beats[0],id:'overlap'}),j=>j.visualPlan.shots[1].reason='',j=>j.visualPlan.assets[0].runtimeFile='../../.env.qwen']){
  const j=structuredClone(ctx.job);mutate(j);assert.throws(()=>compile(j),/Visual plan/);
 }
});
test('native explanation requires retained evidence, deliberate reveals and grammar-bound relations',()=>{
 const words=[{text:'запрос',sourceStartMs:1000,sourceEndMs:1400,startMs:1000,endMs:1400},{text:'модель',sourceStartMs:1500,sourceEndMs:2000,startMs:1500,endMs:2000}],asset=visualSnapshot(entries.find(a=>a.id==='diagram-process-v1'));
 const p={version:1,domain:'ai',authorship:'editor-directed',restraint:'Keep speaker elsewhere',assets:[asset],beats:[{id:'explain',from:0,until:180,sourceStartMs:1000,sourceEndMs:2000,assetId:asset.id,intent:'explain-process',layout:'upper-panel',why:'Explain the two stated processing stages',nodes:[{id:'query',label:'Запрос',role:'editorial-explanation',sourceStartMs:1000,sourceEndMs:1400,revealFrame:60},{id:'model',label:'Модель',role:'editorial-explanation',sourceStartMs:1500,sourceEndMs:2000,revealFrame:90}],edges:[{from:'query',to:'model'}]}],shots:[{from:0,reason:'Opening explanation'}]};
 assert.doesNotThrow(()=>validateVisualPlan(p,450,'signal-dynamic',words,[0]));
 for(const mutate of [b=>b.nodes[0].label='На 90% лучше',b=>b.nodes[0].revealFrame=0,b=>b.nodes[0].role='speech',b=>b.nodes[0].role='quote-reprise',b=>b.edges=[{from:'model',to:'query'}],b=>b.nodes[0].sourceStartMs=1001]){
  const bad=structuredClone(p);mutate(bad.beats[0]);assert.throws(()=>validateVisualPlan(bad,450,'signal-dynamic',words,[0]),/Visual plan/);
 }
});
test('library staging binds catalog snapshots and rights evidence; changing an asset hash is rejected',async()=>{
 assert.equal((await bindVisualAssets(ctx.job)).length,1);
 const bad=structuredClone(ctx.job);bad.visualPlan.assets[0].sha256='0'.repeat(64);
 await assert.rejects(bindVisualAssets(bad),/changed\/unregistered/);
 await assert.rejects(registerVisual({id:'uncleared-test',rights:'licensed',origin:'search result',review:{usable:true}},'assets/library/visuals/domestic-dishes-v1/illustration.png'),/Incomplete visual record|Third-party/);
 const before=await fingerprint('assets/catalog.json');
 await assert.rejects(registerVisual({id:'bad-metadata-fixture',rights:'generated',origin:'test fixture',review:{usable:true},tags:['test'],domains:['invented-domain'],intents:['contrast'],styles:['signal-dynamic'],width:1536,height:1024},'assets/library/visuals/domestic-dishes-v1/illustration.png'),/registration schema/);
 assert.equal(await fingerprint('assets/catalog.json'),before,'invalid registration must not mutate canonical catalogue');
});
test('director response can select registered visuals with real word IDs but cannot invent asset IDs',async()=>{
 const request=await buildDirectorRequest({runId:'library-contract-test',jobId:'dry-irony-tight',brief:{objective:'Бытовой контраст',audience:'Общий',preserveAllSpeech:true}}),response=authorBaselineExample(request),unit=request.packet.context.units.find(u=>u.id==='dishes');
 response.treatments[0].visuals={domain:'domestic',restraint:'Другие фразы оставить на лице',beats:[{id:'contrast',unitId:unit.id,assetId:'domestic-dishes-v1',intent:'contrast',layout:'upper-panel',evidence:{firstWordId:unit.wordIds[0],lastWordId:unit.wordIds.at(-1)},why:'Явная бытовая ирония, вымышленная иллюстрация'}]};
 const result=validateDirection(request,response);
 assert.equal(result.candidates[0].job.visualPlan.beats[0].from,104);
 assert.equal(result.candidates[0].job.visualPlan.beats[0].until,163);
 response.treatments[0].visuals.beats[0].assetId='invented-unlicensed';assert.throws(()=>validateDirection(request,response),/registered asset/);
});
