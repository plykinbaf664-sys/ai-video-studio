/** Evidence review, not human approval. Unknown cases stay blocked. */
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from './lib/media.mjs';
import {loadJob,python} from './lib/editorial-job.mjs';
import {compareRecognizedSpeech,normalizeSpeech} from '../src/director/speech-integrity.ts';
const {report,work,folder,compiled:edit}=await loadJob(),read=async f=>JSON.parse(await readFile(f,'utf8'));
const final=path.join(root,work,'render.mp4'),primary=await read(`${report}/final.asr.json`),secondary=await read(`${report}/final.windows.asr.json`),media=await read(`${report}/media.json`),sha=await fingerprint(final);
if(primary.mediaSha256!==sha||secondary.mediaSha256!==sha||media.hashes.output!==sha||!primary.complete||!secondary.complete||media.status!=='passed'||media.summary.minimumWordCorrelation<.99||media.summary.maximumWordLagMs!==0)throw new Error('Speech review lacks complete hash-bound original-waveform evidence');
const speech=compareRecognizedSpeech(edit.outputCaptions,primary.words),alternative=compareRecognizedSpeech(edit.outputCaptions,secondary.words);
await writeFile(`${work}/speech-comparison.json`,JSON.stringify(speech,null,2));
python(['scripts/measure-asr-disagreements.py','--output',final,'--bed',`${folder}/continuous.bed.wav`,'--comparison',`${work}/speech-comparison.json`,'--report',`${report}/disagreement-energy.json`]);
const energy=await read(`${report}/disagreement-energy.json`);
if(energy.mediaSha256!==sha||energy.bedSha256!==media.hashes.bed||secondary.bedSha256!==media.hashes.bed)throw new Error('Speech energy/secondary bed evidence changed');
const sourceFile='artifacts/speech-qc/source.asr.json',source=await read(sourceFile);
if(source.mediaSha256!==edit.job.sourceSha256||source.timeline!=='source')throw new Error('Source recognition is not bound to the original');
const decisions=speech.reviewItems.map((item,index)=>{
 if(item.kind==='match')return {index,classification:'timing-estimate-needs-listening',reason:'ASR can include preroll or stop early; job acoustic refinements retained, not overwritten to satisfy recognition'};
 if(item.kind==='unexpected-recognition'){
  const w=item.recognized,quiet=energy.items[index].voiceAfterKnownBedRmsDbFS<-45;
  const outside=secondary.windows.every(s=>w.endMs<s.startMs||w.startMs>s.endMs);
  if(!quiet||!outside)throw new Error(`Unexpected recognition requires manual inspection: ${w.text}`);
  return {index,classification:'probable-ASR-silence-hallucination',rmsDbFS:energy.items[index].voiceAfterKnownBedRmsDbFS,reason:'No acoustic speech window; actual retained source voice near noise floor; independent window decode does not recognize the word. No fake subtitle added.'};
 }
 const p=edit.provenance[item.expectedIndex];
 const sourceMatch=source.words.find(w=>normalizeSpeech(w.text)===normalizeSpeech(p.text)&&w.endMs>=p.sourceStartMs&&w.startMs<=p.sourceEndMs);
 const secondMatch=alternative.aligned.find(w=>w.expectedIndex===item.expectedIndex&&w.kind==='match');
 if(!sourceMatch&&!secondMatch)throw new Error(`No independent support for disputed source word: ${p.text}`);
 return {index,classification:'preserved-source-word-ASR-disagreement',sourceWord:sourceMatch??null,secondaryMatch:secondMatch??null,reason:'Original waveform retained at zero lag; recognition disagreement remains visible for human phonetic review, not treated as a cut failure'};
});
const evidence=[];
for(const file of [`${report}/media.json`,`${report}/final.windows.asr.json`,`${report}/disagreement-energy.json`,sourceFile])evidence.push({file,sha256:await fingerprint(file)});
await writeFile(`${report}/speech-review.json`,JSON.stringify({outputSha256:sha,status:'review-required',humanAudition:false,reviewItems:speech.reviewItems,evidence,decisions,secondary:alternative,limitation:'Evidence supports source preservation and probable ASR artifacts. It is not human confirmation of every word or phonetic boundary.'},null,2)+'\n');
console.log(`Source-preservation evidence recorded; primary ASR remains review-required, secondary lexical errors=${alternative.wordErrors}`);
