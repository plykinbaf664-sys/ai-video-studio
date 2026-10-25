import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileTimeline,validateTranscriptCuts,captionsForClip,sourceWordToOutput} from '../src/director/timeline.ts';
import {auditCaptionTimeline} from '../src/director/speech-integrity.ts';
import {validateEditorialDirection,editorialViewport,editorialSpeech} from '../src/director/editorial-v3.ts';
import {imagePlacement} from '../src/director/scene-direction.ts';
const d=JSON.parse(await readFile('style-presets/directions/dry-irony-v3.json','utf8'));
const prior=JSON.parse(await readFile('public/generated/reference-edit/edit.json','utf8'));
const transcript=structuredClone(prior.transcript);
for(const r of d.captionRefinements??[])transcript.captions.find(w=>w.text.trim()===r.text&&w.startMs===r.sourceStartMs).startMs=r.correctedStartMs;
let start=0;const plan={...prior.plan,clips:d.sourceClips.map(c=>{const v={id:c.id,sourceStartSeconds:c.start,sourceEndSeconds:c.end,outputStartSeconds:start,playbackRate:1,reason:c.purpose};start+=c.end-c.start;return v;})};
const timeline=compileTimeline(plan),captions=timeline.clips.flatMap(c=>captionsForClip(transcript.captions,c,30).map(w=>sourceWordToOutput(w,c,30)));
test('v3 trims only pauses, preserves all 22 source words and remaps after each cut',()=>{
 validateEditorialDirection(d);validateTranscriptCuts(transcript,plan);
 const audit=auditCaptionTimeline(plan,transcript,captions);
 assert.equal(timeline.durationInFrames,414);assert.equal(captions.length,22);assert.ok(audit.boundaries.every(x=>x.status==='passed'));
 assert.deepEqual(captions.map(x=>x.text),prior.outputCaptions.map(x=>x.text));
 assert.equal(captions[11].startMs,4860);assert.equal(captions[16].startMs,9320);assert.equal(captions[21].endMs,12840);
 assert.equal(audit.provenance[21].sourceEndMs,42040);
});
test('v3 protects face throughout, enlarges paper portrait and returns to full frame for payoff',()=>{
 for(let f=0;f<414;f++){
  const v=editorialViewport(d,f),p=imagePlacement(v);
  assert.ok(p.x+220*p.scale>=v.x&&p.x+520*p.scale<=v.x+v.width);
  assert.ok(p.y+260*p.scale>=v.y&&p.y+680*p.scale<=v.y+v.height);
 }
 assert.equal(editorialViewport(d,180).width,952);assert.equal(editorialViewport(d,360).height,1920);
 assert.equal(editorialSpeech(captions,320,d).text,'тоже');
 assert.equal(editorialSpeech(captions,345,d).text,'тоже моя');
 assert.equal(editorialSpeech(captions,360,d).text,'тоже моя инициатива.');
 assert.throws(()=>validateEditorialDirection({...d,scenes:[{from:0,layout:'arbitrary-effect'}]}));
});
test('v3 default music policy prohibits phrase pumping and a dramatic stop',()=>{
 assert.equal(d.music.mode,'steady');assert.equal(d.music.duckDb,0);assert.equal(d.music.stopSeconds,13.8);
 assert.throws(()=>validateEditorialDirection({...d,music:{...d.music,duckDb:-12}}));
 assert.throws(()=>validateEditorialDirection({...d,music:{...d.music,stopSeconds:8.9}}));
});
