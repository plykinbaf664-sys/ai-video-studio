import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {viewportAt,imagePlacement} from '../src/director/scene-direction.ts';
import {sceneSpeechAt,requireEarlierQuote} from '../src/director/scene-speech.ts';
import {assertSupportedStyle} from '../src/styles/contract.ts';
test('three directions have different scene grammars/music and protect the face across every visible frame',async()=>{
 const profiles=[];
 for(const name of ['editorial-focus','signal-dynamic','dry-irony']){
  const style=JSON.parse(await readFile(`style-presets/runtime/personal-${name}.json`,'utf8'));assertSupportedStyle(style);profiles.push(style);
  let hidden=0;
  for(let f=0;f<450;f++){
   const v=viewportAt(style.staging,f),p=imagePlacement(v);if(!v.visible){hidden++;continue;}
   assert.ok(p.x+220*p.scale>=v.x-1&&p.x+520*p.scale<=v.x+v.width+1);
   assert.ok(p.y+260*p.scale>=v.y-1&&p.y+680*p.scale<=v.y+v.height+1);
  }
  assert.equal(hidden,style.staging.renderer==='signal'?82:0);
  const invalid=structuredClone(style);invalid.staging.renderer='not-implemented';assert.throws(()=>assertSupportedStyle(invalid));
 }
 assert.equal(new Set(profiles.map(p=>p.staging.renderer)).size,3);assert.equal(new Set(profiles.map(p=>p.staging.musicAssetId)).size,3);
});
test('payoff is not revealed ahead of spoken words and diagram quotations must already have sounded',async()=>{
 const {outputCaptions}=JSON.parse(await readFile('public/generated/reference-edit/edit.json','utf8'));
 assert.equal(sceneSpeechAt(outputCaptions,360).text.trim(),'тоже');
 assert.equal(sceneSpeechAt(outputCaptions,385).text.trim(),'тоже моя');
 assert.match(sceneSpeechAt(outputCaptions,397).text,/инициатива/);
 assert.equal(sceneSpeechAt(outputCaptions,430),undefined);
 assert.throws(()=>requireEarlierQuote(outputCaptions,'Сам решил',2000));
 assert.throws(()=>requireEarlierQuote(outputCaptions,'Всё решаю сам',15000));
 assert.doesNotThrow(()=>requireEarlierQuote(outputCaptions,'Сам решил',8900));
});
