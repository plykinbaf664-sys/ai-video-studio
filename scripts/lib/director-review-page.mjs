import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from './media.mjs';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/** Static local review; no scripts, remote resources or unescaped provider markup. */
export const writeDirectorReviewPage = async (file, reviewed) => {
  const {request,response,result} = reviewed;
  const transport=reviewed.transport==='qwen-api'?'Qwen API':'локальный JSON';
  const words = request.packet.context.words;
  const evidence=request.packet.localEvidence;
  const localLink=file=>esc(path.relative(path.dirname(filePath),path.join(root,file)).replaceAll('\\','/'));
  const filePath=file;
  const evidenceHtml=evidence?`<h2>Кадры оригинала — исходная шкала</h2><p>Это реальные извлечённые кадры; анализ жестов и интонации не выполнен.</p><div class="frames">${evidence.frames.map(f=>`<figure><img loading="lazy" src="${localLink(f.file)}" alt="Исходный кадр"><figcaption>${esc(f.unitId)} · ${f.actualSourceSeconds.toFixed(3)} с</figcaption></figure>`).join('')}</div><p><a href="${localLink(evidence.sourceFile)}">Открыть оригинал для прослушивания и просмотра</a></p>`:'';
  const excerpt = range => {
    const start = words.findIndex(w => w.id === range.firstWordId), end = words.findIndex(w => w.id === range.lastWordId);
    return words.slice(start,end+1).map(w => w.text).join(' ');
  };
  const candidates = result.candidates.map(c => `<article><h2>${esc(c.treatment.title)} · ${esc(c.treatment.id)}</h2>
    <p><b>Замысел:</b> ${esc(c.treatment.thesis)}</p><p>${esc(c.treatment.emotionalArc)}</p><p>${esc(c.treatment.whyThisWorks)}</p>
    <p>${(c.durationInFrames/30).toFixed(2)} с · ${c.retainedWordCount} слов · статус: ${esc(c.status)}</p>
    <h3>История</h3><ol>${c.treatment.beats.map(b => `<li><b>${esc(b.role)}</b> — ${esc(excerpt(b.evidence))}<br>${esc(b.intent)}<br><small>${esc(b.uncertainty)}</small></li>`).join('')}</ol>
    <h3>Сцены — итоговая шкала</h3><table><thead><tr><th>Время</th><th>Сцена</th><th>Зачем</th><th>Опора на речь / референс</th></tr></thead><tbody>${c.scenes.map((s,i) => `<tr><td>${(s.from/30).toFixed(2)}–${(s.until/30).toFixed(2)} с</td><td>${esc(s.kind)}</td><td>${esc(s.purpose)}</td><td>${esc(excerpt(c.treatment.scenes[i].evidence))}<br>${esc(s.reference)}</td></tr>`).join('')}</tbody></table>
    <h3>Убрано</h3><p>${c.treatment.omissions.length ? c.treatment.omissions.map(o => `${esc(o.unitId)}: ${esc(o.reason)}`).join('<br>') : 'Речь не удалена.'}</p>
    <h3>Проверить просмотром и прослушиванием</h3><ul>${c.reviewItems.map(x => `<li>${esc(x)}</li>`).join('')}${c.treatment.selfReview.map(x => `<li>${esc(x.risk)} → ${esc(x.mitigation)}</li>`).join('')}</ul></article>`).join('');
  await writeFile(file,`<!doctype html><html lang="ru"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="viewport" content="width=device-width"><title>Режиссёр — ${esc(request.packet.context.requestId)}</title><style>body{font:17px/1.5 system-ui;background:#f6f3ec;color:#111319;max-width:1160px;margin:36px auto;padding:0 24px}article{border-top:2px solid #aaa;margin-top:40px;padding-top:12px}table{border-collapse:collapse;width:100%}td,th{padding:12px;border-bottom:1px solid #bbb;text-align:left;vertical-align:top}small{color:#555}.frames{display:flex;gap:12px;flex-wrap:wrap}.frames figure{margin:0;width:150px}.frames img{width:150px}figcaption{font-size:12px}</style><h1>Два режиссёрских замысла</h1><p>${esc(request.packet.context.brief.objective)}</p><p>Источник решений: ${esc(response.authorship.kind)} — ${esc(response.authorship.name)}. Транспорт: ${esc(transport)}; качество требует отдельной проверки.</p><p><b>Рекомендация:</b> ${esc(result.recommendation.treatmentId)}. ${esc(result.recommendation.reason)}</p><p>Отсутствующие наблюдения: ${esc(request.packet.context.observations.missing.join(', '))}. План проверен структурно; готовый ролик ещё не оценён.</p>${candidates}${evidenceHtml}</html>`,'utf8');
};
