import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileEditorialJob,editorialCues} from '../src/director/editorial-job.ts';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const job=await read('edits/dry-irony-story.json'),preset=await read('style-presets/grammars/dry-irony.json'),prior=await read(job.transcriptFile);
test('same grammar works for full story and short cut with different retained speech',()=>{
 const long=compileEditorialJob(job,preset,prior),short=structuredClone(job);
 short.id='short-fixture';short.cuts=[job.cuts[2]];short.scenes=[{...job.scenes[0]}];
 const small=compileEditorialJob(short,preset,prior);
 assert.equal(long.timeline.durationInFrames,930);assert.equal(long.outputCaptions.length,40);
 assert.equal(small.timeline.durationInFrames,111);assert.equal(small.outputCaptions.length,4);
 assert.equal(small.outputCaptions[0].text.trim(),'Сам');assert.equal(small.outputCaptions[0].startMs,780);
 assert.equal(long.omittedWords.length,0);assert.deepEqual(long.outputCaptions.map(w=>w.text),long.transcript.captions.map(w=>w.text));
 assert.ok(!('sourceClips' in preset)&&!('durationInFrames' in preset));
});
test('retrospective labels are generated from retained verbatim evidence and wait for captions',()=>{
 const edit=compileEditorialJob(job,preset,prior),split=edit.scenes.find(s=>s.kind==='split');
 assert.equal(split.quotes[0].text,'помыть посуду.');
 const last=split.quotes[2];assert.ok(last.revealFrame*1000/30>=last.spokenOutputEndMs+preset.captions.tailMs);
 const bad=structuredClone(job);bad.scenes[3].quotes[0].startMs=9300;
 assert.throws(()=>compileEditorialJob(bad,preset,prior),/removed\/partial/);
 const spoiler=structuredClone(job);spoiler.scenes[6].from=830;
 assert.throws(()=>compileEditorialJob(spoiler,preset,prior),/follow both/);
});
test('orphan graphics, unsafe face crops, speech cuts and pumping are rejected',()=>{
 for(const mutate of [j=>j.cuts[1].end=9.5,j=>j.viewports.split.sourceY=500,j=>j.scenes[3].quotes.push(j.scenes[3].quotes[0]),j=>j.scenes[2].from=j.scenes[1].from]){
  const bad=structuredClone(job);mutate(bad);assert.throws(()=>compileEditorialJob(bad,preset,prior));
 }
 assert.throws(()=>compileEditorialJob(job,{...preset,music:{...preset.music,duckDb:-10}},prior),/continuous/);
});
test('groups use grammar rules without dragging words across removed intervals',()=>{
 const edit=compileEditorialJob(job,preset,prior),groups=editorialCues(edit.outputCaptions,preset,31000);
 assert.ok(groups.every(g=>g.words.length<=preset.captions.maximumWords&&g.text.length<=preset.captions.maximumCharacters));
 assert.ok(groups.every((g,i)=>g.endMs<=(groups[i+1]?.startMs??31000)));
 assert.equal(edit.outputCaptions.find(w=>w.text.trim()==='И').startMs,24720);
 assert.equal(edit.outputCaptions[0].startMs,440);
 assert.equal(edit.outputCaptions.find(w=>w.text.trim()==='посуду.').endMs,7420);
 assert.equal(edit.outputCaptions.find(w=>w.text.trim()==='тоже').startMs,26520);
 assert.ok(!groups.some(g=>g.text.startsWith('тоже')&&g.startMs<26520));
});
