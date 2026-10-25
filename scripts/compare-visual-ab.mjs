import {readFile,writeFile} from 'node:fs/promises';
import {visualFolder,prepareVisualCall,validateVisualAnalysis} from './lib/visual-understanding.mjs';
import {loadJob} from './lib/editorial-job.mjs';
import {directionEvidence} from './lib/direction-evidence.mjs';
import {fingerprint} from './lib/media.mjs';
import {writeVisualComparisonPage} from './lib/visual-comparison-page.mjs';
const i=process.argv.indexOf('--run'),run=i<0?null:process.argv[i+1],folder=visualFolder(run);
const prepared=await prepareVisualCall(run),analysis=JSON.parse(await readFile(`${folder}/analysis.json`,'utf8'));
validateVisualAnalysis(prepared,analysis);
const a=await loadJob(`${run}-a`),b=await loadJob(`${run}-b`);
for(const field of ['cuts','music','color','source'])if(JSON.stringify(a.job[field])!==JSON.stringify(b.job[field]))throw Error(`A/B differs in locked ${field}`);
if(a.presetSha256!==b.presetSha256||JSON.stringify(a.compiled.outputCaptions)!==JSON.stringify(b.compiled.outputCaptions))throw Error('A/B speech or style mismatch');
const outputs=[];
for(const ctx of [a,b]){
 const r=JSON.parse(await readFile(`${ctx.report}/final-report.json`,'utf8'));
 if(r.jobSha256!==ctx.jobSha256||r.presetSha256!==ctx.presetSha256||await fingerprint(`out/${ctx.id}.mp4`)!==r.technical.sha256||r.visual!=='control-stills-inspected')throw Error('A/B requires fresh QC and inspected final MP4 stills');
 outputs.push({id:ctx.id,sha256:r.technical.sha256,mixSha256:r.mixSha256,baseSha256:r.baseSha256,physical:r.physical,speechStatus:r.speech.status});
}
if(outputs[0].mixSha256!==outputs[1].mixSha256||outputs[0].baseSha256!==outputs[1].baseSha256)throw Error('A/B source footage or PCM mix differs');
const evidence=await directionEvidence(b.id,b.jobSha256);
if(!evidence.visualInference||evidence.payloadSha256!==prepared.payloadSha256)throw Error('B has no fresh actual image-analysis evidence');
const decisions=analysis.observations.map(o=>({unitId:o.unitId,frameIds:o.frameIds,confidence:o.confidence,whatHappens:o.whatHappens,...o.decision,changedScenes:evidence.changes.filter(c=>c.unitIds.includes(o.unitId)).map(c=>c.sceneFrom)}));
const comparison={runId:run,status:'actual-a-b-compared',style:a.preset.id,outputs,changes:evidence.changes,decisions,limitations:analysis.limitations,artisticApproval:'candidate; user review',audioAudition:'not-performed'};
await writeFile(`${folder}/comparison.json`,JSON.stringify(comparison,null,2)+'\n');
await writeFile(`${folder}/COMPARISON.md`,`# Реальное A/B · ${a.preset.id}\n\nОдинаковые исходник, ${a.compiled.outputCaptions.length} слов, ${a.compiled.timeline.durationInFrames} кадров, нарезка, стиль, PCM-микс и цвет. Оба фактических MP4 прошли QC; контрольные кадры именно из этих файлов просмотрены. ASR A/B: ${outputs.map(o=>o.speechStatus).join(' / ')}.\n\n${outputs.map(o=>`- [${o.id}](../../../out/${o.id}.mp4), SHA256 ${o.sha256}`).join('\n')}\n\nИзменённых сцен: ${evidence.changes.length}. Нулевое число допустимо: нельзя придумывать изменения ради демонстрации.\n\n${evidence.changes.map(c=>`## Output ${(c.sceneFrom/30).toFixed(2)}–${(c.sceneUntil/30).toFixed(2)}s\n\n${JSON.stringify(c,null,2)}`).join('\n\n')}\n\nОграничения модели: ${analysis.limitations.join(' ')}. Художественное утверждение пользователем и непрерывное человеческое прослушивание не заявляются.\n`);
const reportFile=`${folder}/COMPARISON.md`,markdown=await readFile(reportFile,'utf8');
await writeFile(reportFile,markdown+'\n## Все решения, включая отказ от дополнительных эффектов\n\n'+decisions.map(d=>`- ${d.unitId} (${d.frameIds.join(', ')}; confidence ${d.confidence}): ${d.whatHappens} ${d.reason} Почему без дополнительных эффектов: ${d.whyNoMore} Связанные изменённые сцены: ${d.changedScenes.length?d.changedScenes.join(', '):'нет; существующая композиция сохранена'}.`).join('\n')+'\n');
await writeVisualComparisonPage(folder,comparison);
console.log(JSON.stringify({status:comparison.status,changedScenes:evidence.changes.length,report:`${folder}/COMPARISON.md`,outputs:outputs.map(o=>o.id)},null,2));
