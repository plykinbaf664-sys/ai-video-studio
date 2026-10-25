import {readFile,writeFile} from 'node:fs/promises';
import {visualFolder,visualPreflight,prepareVisualCall} from './lib/visual-understanding.mjs';
import {fingerprint} from './lib/media.mjs';
const i=process.argv.indexOf('--run'),run=i<0?null:process.argv[i+1],folder=visualFolder(run);
let attempt=null,receipt=null;
try{attempt=JSON.parse(await readFile(`${folder}/attempt.json`,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const prepared=attempt?await prepareVisualCall(run):await visualPreflight(run),s=prepared.summary;
if(attempt&&attempt.payloadSha256!==s.payloadSha256)throw Error('Preserve attempted payload: inputs changed');
try{receipt=JSON.parse(await readFile(`${folder}/receipt.json`,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
if(receipt&&(receipt.payloadSha256!==s.payloadSha256||receipt.analysisSha256!==await fingerprint(`${folder}/analysis.json`)))throw Error('Stale image analysis');
const status=receipt?'validated-image-analysis':attempt?'attempted-see-transport-or-failure':'awaiting-separate-image-approval';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const files=[];
for(const variant of ['a','b']){
 const id=`${run}-${variant}`;
 try{
  const r=JSON.parse(await readFile(`artifacts/jobs/${id}/final-report.json`,'utf8'));
  if(await fingerprint(`out/${id}.mp4`)!==r.technical.sha256)throw Error('Changed final MP4');
  files.push({variant,id,sha256:r.technical.sha256,frames:r.technical.frames,speech:r.speech.status});
 }catch(error){if(error.code!=='ENOENT')throw error;}
}
const units=prepared.context.units.map(u=>({id:u.id,sourceStartMs:u.sourceStartMs,sourceEndMs:u.sourceEndMs,outputStartFrame:u.outputStartFrame,durationInFrames:u.durationInFrames,frames:prepared.selected.filter(f=>f.retainedUnitIds.includes(u.id)).map(f=>f.id)}));
await writeFile(`${folder}/review.json`,JSON.stringify({status,summary:s,units,exports:files,attemptReserved:Boolean(attempt)},null,2)+'\n');
const figures=prepared.selected.map(f=>`<figure><a href="frames/${escape(f.id)}.jpg"><img loading="lazy" src="frames/${escape(f.id)}.jpg" alt="Кадр ${escape(f.id)}"></a><figcaption>${escape(f.id)} · source ${(f.sourceMs/1000).toFixed(3)}s<br>${escape(f.retainedUnitIds.join(', '))}<br>${escape(f.reasons.join(', '))}</figcaption></figure>`).join('');
await writeFile(`${folder}/index.html`,`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visual Understanding · ${escape(run)}</title><style>body{background:#111319;color:#f6f3ec;font:16px/1.5 Arial;margin:24px}a{color:#e87942}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px}figure{margin:0}img{width:100%;display:block}figcaption{font-size:13px}pre{white-space:pre-wrap}section{max-width:1100px}video{width:300px;max-width:100%}</style><h1>Visual Understanding · ${escape(run)}</h1><section><p>Статус: кадры извлечены локально. Анализ изображений в Qwen ещё не выполнен; отправка требует отдельного разрешения.</p><p>Для отправки подготовлено ${s.frames} JPEG 360×640 (${s.imageBytes.toLocaleString('ru-RU')} байт изображений; весь JSON ${s.inputBytes.toLocaleString('ru-RU')} байт). Провайдер Alibaba Cloud Model Studio, регион ${escape(s.region)}, модель ${escape(s.model)}. Один запрос, без повторов; максимум ${s.maxOutputTokens} выходных токенов, ${s.timeoutMs/1000}s. Фактическая стоимость пока неизвестна.</p><p>Будут переданы лица, человек и фон на перечисленных кадрах, сохранённые слова с source/output таймкодами, брендбук, правила стиля и схема ответа. Видео, аудио и чужие референсы не передаются.</p><p><a href="request.json">Текстовый контекст</a> · <a href="frames.json">Все кадры и исходные PTS</a> · <a href="preflight.json">Точные лимиты запроса</a> · <a href="payload.json">Полное тело запроса с JPEG</a></p><p>SHA256 разрешаемого payload: <code>${escape(s.payloadSha256)}</code></p><h2>Монтаж</h2>${files.length?files.map(f=>`<p>Версия ${f.variant.toUpperCase()}: ${f.frames} кадров, ASR ${escape(f.speech)}. <a href="../../../out/${escape(f.id)}.mp4">MP4</a> · <a href="../../jobs/${escape(f.id)}/index.html">Кадры и отчёт</a></p><video controls playsinline preload="metadata" src="../../../out/${escape(f.id)}.mp4"></video>`).join(''):'<p>Проверенные экспорты пока не созданы.</p>'}<p>Версия B появится только после настоящего согласованного анализа; её отсутствие не заменяется имитацией.</p><h2>Состав выборки</h2><pre>${escape(JSON.stringify(units,null,2))}</pre></section><h2>Именно эти ${s.frames} кадра включены в запрос</h2><div class="grid">${figures}</div></html>`);
if(attempt){
 const file=`${folder}/index.html`,html=await readFile(file,'utf8');
 await writeFile(file,html.replace('Статус: кадры извлечены локально. Анализ изображений в Qwen ещё не выполнен; отправка требует отдельного разрешения.',receipt?'Статус: настоящий согласованный image-анализ Qwen выполнен. Наблюдения и ограничения сохранены в analysis.json; действительность финального B проверяется отдельно.':'Статус: попытка запроса зарезервирована. Проверьте transport.json/failure.json; автоматического повторного вызова нет.'));
}
console.log(JSON.stringify({run,status,gallery:`${folder}/index.html`,...s,exports:files},null,2));
