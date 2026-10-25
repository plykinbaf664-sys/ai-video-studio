import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {loadJob} from './lib/editorial-job.mjs';
import {visualLibrary,retrieveVisuals,visualSnapshot} from './lib/visual-library.mjs';
import {compileEditorialJob} from '../src/director/editorial-job.ts';
import {fingerprint} from './lib/media.mjs';
const base=await loadJob('visual-001-b'),job=structuredClone(base.job),id='context-domestic-001';
job.id=id;job.compositionId='ContextDomestic';job.baseReuseJobId=base.id;
const medium=structuredClone(base.job.scenes[0].viewport),lower=structuredClone(base.job.scenes[1].viewport),full=structuredClone(base.job.scenes.at(-1).viewport);
job.scenes=[
 {from:0,kind:'full',purpose:'Дать уверенное заявление лицом в кадре; без подсказки к шутке.',viewport:full},
 {from:104,kind:'speaker',purpose:'У первой бытовой декларации открыть сатирический контрапункт сверху, сохранив ведущего и руки снизу.',viewport:lower},
 {from:163,kind:'full',purpose:'Вернуть живую подачу на ужине и ремонте; повтор иллюстраций ослабил бы первый контраст.',viewport:full},
 {from:298,kind:'speaker',purpose:'На самоописании независимости сменить композицию для смыслового поворота; без зума и дополнительных объектов.',viewport:medium},
 {from:388,kind:'full',purpose:'Развязка держится на лице и паузе. Убрать графику до финальной реплики.',viewport:full},
].map(s=>({...s,reference:'img-3322:14.3–19.3',quotes:[]}));
const words=base.compiled.provenance.filter(w=>w.clipId==='dishes'),entry=retrieveVisuals(await visualLibrary(),{domain:'domestic',intent:'contrast',style:job.presetId,query:words.map(w=>w.text).join(' ')})[0]?.asset;
if(!entry)throw Error('No cleared domestic contrast asset; keep speaker instead of an unverified substitute');
job.visualPlan={version:1,domain:'domestic',authorship:'editor-directed',assets:[visualSnapshot(entry)],beats:[{id:'dishes-contradiction',from:104,until:163,sourceStartMs:words[0].sourceStartMs,sourceEndMs:words.at(-1).sourceEndMs,assetId:entry.id,intent:'contrast',layout:'upper-panel',why:'Слова «Я сам решил помыть посуду» противопоставлены вымышленной бытовой сцене: жена указывает на посуду. Это авторская шутка, не установленный факт о семье говорящего.'}],restraint:'Одна иллюстрация на 18.27 секунды. Ужин/ремонт без произвольных картинок, самоописание и развязка — живая подача. Не возвращать одинаковую вставку на каждый глагол.',shots:job.scenes.map(s=>({from:s.from,reason:s.purpose}))};
compileEditorialJob(job,base.preset,base.prior);
await writeFile(`edits/${id}.json`,JSON.stringify(job,null,2)+'\n');await mkdir(`artifacts/jobs/${id}`,{recursive:true});
await writeFile(`artifacts/jobs/${id}/visual-direction.json`,JSON.stringify({jobId:id,jobSha256:await fingerprint(`edits/${id}.json`),mode:'editor-directed-contextual-library',visualInference:false,parentJobId:base.id,parentJobSha256:base.jobSha256,inheritedObservationFile:'artifacts/visual/visual-001/analysis.json',inheritedObservationSha256:await fingerprint('artifacts/visual/visual-001/analysis.json'),limitation:'No new model inference. Uses historically reviewed broad subject protection and the same source/cuts/audio. New contextual creative decisions are editor-directed and asset retrieval is deterministic. Fictional illustration is not family evidence.'},null,2)+'\n');
const prepared=spawnSync(process.execPath,['scripts/prepare-editorial-job.mjs','--job',id],{stdio:'inherit',env:process.env});
if(prepared.error)throw prepared.error;if(prepared.status!==0)throw Error('Context demo preparation failed');
console.log(`Prepared ${id}; inspect storyboard before render.`);
