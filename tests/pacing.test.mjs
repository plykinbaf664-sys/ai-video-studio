import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileEditorialJob} from '../src/director/editorial-job.ts';
import {auditSpeechPacing} from '../src/director/pacing.ts';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const job=await read('edits/dry-irony-tight.json'),prior=await read(job.transcriptFile),preset=await read('style-presets/grammars/dry-irony.json');
const awaitableOld=await read('edits/dry-irony-story.json');
test('natural cut keeps the entire speech, caps waiting and preserves graphic reading time',()=>{
 const tight=compileEditorialJob(job,preset,prior),oldJob=awaitableOld;
 assert.equal(tight.timeline.durationInFrames,548);assert.equal(tight.outputCaptions.length,40);assert.equal(tight.omittedWords.length,0);
 const pace=auditSpeechPacing(tight.outputCaptions,600);assert.equal(pace.status,'passed');assert.ok(pace.largestGapMs<=560.001);
 assert.deepEqual(tight.outputCaptions.map(w=>w.text),tight.transcript.captions.map(w=>w.text));
 const split=tight.scenes.find(s=>s.kind==='split');assert.ok(split.until-split.quotes[2].revealFrame>=24);
 assert.ok(auditSpeechPacing(compileEditorialJob(oldJob,preset,prior).outputCaptions,600).largestGapMs>3000);
});
test('pacing policy blocks reintroduced waiting without cutting words to satisfy the limit',()=>{
 const loose=structuredClone(awaitableOld);loose.pacing=job.pacing;
 assert.throws(()=>compileEditorialJob(loose,preset,prior),/pacing policy/);
 const unsafe=structuredClone(job);unsafe.cuts[1].start=8.7;
 assert.throws(()=>compileEditorialJob(unsafe,preset,prior));
});
