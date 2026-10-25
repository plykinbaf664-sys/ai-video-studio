import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileTimeline,validateTranscriptCuts,captionsForClip,sourceWordToOutput} from '../src/director/timeline.ts';
import {auditCaptionTimeline,normalizeSpeech} from '../src/director/speech-integrity.ts';
import {selectPersonalStyle} from '../src/director/select-style.ts';
test('personal comparison keeps exactly 15 seconds, complete words and explicit source/output provenance',async()=>{
 const {plan,transcript}=JSON.parse(await readFile('public/generated/personal/edit.json','utf8'));
 validateTranscriptCuts(transcript,plan);const timeline=compileTimeline(plan);
 assert.equal(timeline.durationInFrames,450);
 const captions=timeline.clips.flatMap(c=>captionsForClip(transcript.captions,c,30).map(w=>sourceWordToOutput(w,c,30)));
 const audit=auditCaptionTimeline(plan,transcript,captions);
 assert.equal(captions.length,22);assert.ok(audit.boundaries.every(x=>x.status==='passed'));
 assert.equal(audit.provenance.at(-1).sourceEndMs,42040);assert.equal(captions.at(-1).endMs,14040);
 for(const quote of ['Не позволял','Сам решил'])assert.ok(normalizeSpeech(captions.map(w=>w.text).join(' ')).includes(normalizeSpeech(quote)));
 const canonical=JSON.parse(await readFile('public/generated/transcript.json','utf8'));
 assert.equal(canonical.captions[34].startMs,37400);
 assert.equal(transcript.captions[34].startMs,38220);
});
test('style recommendation is explainable, rejects missing brands/styles and never claims approval',()=>{
 for(const [intent,id] of [['story','personal-editorial-focus'],['explanation','personal-signal-dynamic'],['irony','personal-dry-irony']]){
  const result=selectPersonalStyle({brandId:'personal-design-kit',intent});assert.equal(result.styleId,id);assert.equal(result.approvalStatus,'candidate');assert.equal(result.autoPublish,false);
 }
 assert.throws(()=>selectPersonalStyle({brandId:'missing'}));assert.throws(()=>selectPersonalStyle({brandId:'personal-design-kit',styleId:'fake-style'}));
 assert.throws(()=>selectPersonalStyle({brandId:'personal-design-kit',styleId:''}));assert.throws(()=>selectPersonalStyle({brandId:'personal-design-kit',intent:'unknown'}));
});
