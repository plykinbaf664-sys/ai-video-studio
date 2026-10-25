import { readFile, writeFile, stat } from "node:fs/promises";
import { fingerprint } from "./lib/media.mjs";

const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const report = await read("artifacts/speech-qc/speech-integrity.json");
const media = await read("artifacts/speech-qc/media-integrity.json");
const verification = await read("artifacts/reports/semantic-cut.verification.json");
const movie = verification.file;
const plan = await read("public/generated/edit-plan.json");
const transcript = await read("public/generated/transcript.json");
const oldPlan = await read("artifacts/speech-qc/before/edit-plan.json");
const hash = await fingerprint(movie);
if (hash !== report.mediaSha256 || hash !== verification.sha256) throw new Error("Reports do not describe the final MP4");
const transcriptUnchanged = await fingerprint("public/generated/transcript.json") === await fingerprint("artifacts/speech-qc/before/transcript.json");
const clipsUnchanged = JSON.stringify(plan.clips) === JSON.stringify(oldPlan.clips);
const styleUnchanged = JSON.stringify(plan.style) === JSON.stringify(oldPlan.style);
if (!transcriptUnchanged || !clipsUnchanged || !styleUnchanged) throw new Error("Unexpected source editing/design change");
const seconds = ms => (ms / 1000).toFixed(3);
const rows = transcript.segments.map(segment => {
  const clip = plan.clips.find(c => segment.startMs >= c.sourceStartSeconds * 1000 && segment.endMs <= c.sourceEndSeconds * 1000);
  if (!clip) throw new Error("A complete original phrase was removed");
  const offset = (clip.outputStartSeconds - clip.sourceStartSeconds) * 1000;
  return `| ${segment.text} | ${seconds(segment.startMs)}–${seconds(segment.endMs)} | ${seconds(segment.startMs + offset)}–${seconds(segment.endMs + offset)} |`;
});
const manual = report.finalRecognition.reviewItems.map(item => {
  const expected = item.expected;
  const heard = item.recognized;
  return `| ${expected?.text.trim() ?? "—"} | ${heard?.text ?? "—"} | ${seconds(expected?.startMs ?? heard.startMs)}–${seconds(expected?.endMs ?? heard.endMs)} | ${item.kind}; Δstart ${item.startDeltaMs ?? "—"} мс, Δend ${item.endDeltaMs ?? "—"} мс |`;
});
const document = `# Проверка речи, изображения и субтитров

Дата: ${new Date().toISOString()}. Готовый файл: ${movie}, ${(await stat(movie)).size} байт, SHA-256 ${hash}.

## Причина ошибки на 4-й секунде

В прежнем public/generated/edit-plan.json overlay premise показывал «Всё решаю сам» в output 3.7–4.9 с. Его purpose/evidence прямо называли текст редакционным перефразированием. Он не входил в captions исходной стенограммы. Надпись создал подготовленный монтажный план; рендер исполнил его. Это не работа автономного AI-режиссёра: такой модуль пока не реализован.

Повторное локальное распознавание всего source.mp4 не нашло точной фразы. Начальная реплика: «Ни одной женщине я никогда не позволял указывать, что мне делать». Первый клип сохранял source 0–5 с целиком. Проверка прежнего MP4: все 900 изображений и звук 40 слов соответствовали выбранным source time, лаг 0 мс. Утверждение о вырезанном начале не подтверждено; подтверждён ошибочный заголовок, выглядевший как субтитр.

## Что исправлено

Удалён только неподтверждённый overlay premise. Исходник и стенограмма неизменны. Диапазоны шести клипов, их порядок, длительность, настройки стиля и компоненты src/design не менялись. Оставшийся финальный акцент «Тоже моя инициатива» — дословный повтор сохранённой речи, а не обычный синхронный субтитр: реплика звучит в output 25.760–28.240 с, акцент повторяет её в 28.600–29.900 с.

Точное требование «в начале слышна фраза “Всё решаю сам”» не заявляется выполненным: эта речь не обнаружена в предоставленном исходнике. Голос не синтезировался, неподтверждённый текст не выдаётся за речь. Для восстановления именно этой формулировки нужен подтверждённый фрагмент исходного звука. Пользователь уточнил, что имел в виду надпись на 4-й секунде; она удалена.

## Временные шкалы

Оригинальная стенограмма остаётся в source time. Для каждого слова применяется outputMs = sourceMs + (outputStartFrame − sourceStartFrame) × 1000/fps. Video, звук и captions находятся в общей Sequence с source trim. Сам caption display использует локальное source time внутри этой Sequence; JSON/SRT exports используют пересчитанное output time. Прямое использование source time в итоговом SRT запрещается проверкой происхождения.

| Реплика по исходной ASR-стенограмме | Source, с | Output, с |
| --- | --- | --- |
${rows.join("\n")}

## Реально выполненные проверки готового MP4

- Рендер npm run render:semantic: ${verification.width}×${verification.height}, ${verification.fps} fps, ${verification.frames} кадров; видео ${verification.videoDuration} с, аудио ${verification.audioDuration} с, ${verification.videoCodec}/${verification.audioCodec}, ${verification.audioSampleRate} Hz.
- Полное декодирование: ${verification.fullDecode}; дополнительных subtitle streams: ${verification.subtitleStreamCount}.
- Waveform в обеих половинах каждого клипа: ${verification.audioSync.checks.length} проверок, ${verification.audioSync.status}.
- Аудио каждого сохранённого слова: ${media.summary.audioWordsCompared}; максимальный лаг ${media.summary.maximumAudioLagMs} мс, тихих непроверяемых слов ${media.summary.quietWordsForReview}.
- Весь звук, включая паузы и границы клипов: ${media.summary.continuousAudioBlocks} последовательных блоков до 250 мс, минимальная корреляция ${media.summary.continuousAudioMinimumCorrelation}; общая физическая проверка ${media.status}.
- Все ${media.summary.videoFramesCompared} кадра сопоставлены с фактическими source PTS в пределах одного output-кадра. Сравниваются нижние 65% изображения без текстового слоя: gray 48×64, MAE ≤5; максимальный MAE ${media.summary.maximumVideoPixelError}. Это проверка происхождения кадров, не автоматическое чтение губ.
- Происхождение ${report.captionTimeline.provenance.length} слов проверено; субтитров без сохранённого исходного слова нет. Удалённых слов исходной стенограммы: ${report.captionTimeline.omittedWords.length}. На всех склейках есть запас до/после слов; начало source=0 сохранено.
- Повторное ASR всего исходника и финального аудио локальным faster-whisper small, без текстовой подсказки. Источник и финал привязаны SHA-256 к отчётам. Финальное ASR: ${report.finalRecognition.recognizedWords} слов, ${report.finalRecognition.wordErrors} лексических расхождений, ${report.finalRecognition.reviewItems.length} пунктов ручной проверки.
- Регрессионные тесты npm test: 15/15 passed. ESLint/TypeScript npm run lint: passed. npm run validate:edit: passed. Эти проверки не заменяют проверки готового медиа.
- Вручную осмотрены декодированные кадры нового MP4 на 1, 4, 14 и 29 с: на 4 с отсутствует неподтверждённый заголовок, на остальных выбранных кадрах один читаемый текстовый блок, лицо/руки не закрыты. Кадры: artifacts/speech-qc/frame-{001,004,014,029}.png. Это визуальный осмотр, не человеческое прослушивание.

## Ручная проверка и честный статус

Статус семантического ASR QC: **${report.status}**. Расхождения ASR не являются доказательством ошибочного монтажа. Совпадение waveform доказывает сохранение выбранного звука, но не доказывает правильность каждого слова/границы в исходной ASR-стенограмме. Начало исходного файла не содержит запаса до нулевого таймкода; автоматически доказать полноту артикуляции, уже записанной на source=0, невозможно.

| Ожидается в captions | Повторное ASR | Интервал captions в output, с | Причина ручной проверки |
| --- | --- | --- | --- |
${manual.length ? manual.join("\n") : "| — | — | — | Автоматических расхождений не обнаружено; слуховая проверка всё равно не заменена |"}

Прослушать указанные интервалы, особенно неоднозначное слово в реплике о ванной. Отдельно подтвердить человеческим прослушиванием естественность начала и пяти склеек. Система не исправляла текст автоматически по ошибке повторного ASR и не меняла source word timings без доказательств.

Локальный CTranslate2 4.4 аварийно завершался с 0xC0000094 при обработке короткого остатка после 30 секунд. Для ASR добавлена только аналитическая тишина ${report.asrAnalysis.analysisOnlyPaddingMs} мс; готовый звук/видео не удлинялись. Распознавание на этой тишине сгенерировало «Редактор субтитров Н.Закомолдина». Это сохранено отдельно как ложное распознавание за границей 30-секундного монтажа, не добавлено в captions и не выдано за речь. Полное ASR теперь завершилось. API word timestamps и локального распознавания: [официальный faster-whisper](https://github.com/SYSTRAN/faster-whisper).

## Артефакты и следующие запуски

- artifacts/speech-qc/speech-integrity.json — полная карта происхождения слов, обе ASR-сверки, ошибки/неопределённости, границы склеек, происхождение акцента.
- artifacts/speech-qc/media-integrity.json — все проверки звука и 900 кадров.
- artifacts/speech-qc/{source,final}.asr.json — распознавание фактического аудио.
- artifacts/speech-qc/before/ — прежний MP4 и данные, сохранённые перед исправлением.
- out/semantic-cut-synced.mp4 — новая версия: Windows не позволила заменить открытый/заблокированный прежний MP4. scripts/lib/semantic-output.mjs выбирает последний проверенный путь из verification JSON, поэтому повторный QC проверяет именно новую версию.
- npm run verify:speech — повторная проверка; -- --strict возвращает код 2 при нерешённых ASR-вопросах. Обычный режим отличает выполненную проверку от полного семантического одобрения.
- npm run render:semantic проверяет происхождение captions/цитат до рендера, затем физическую и ASR-сверку готового pending MP4 до замены конечного файла. При доказанной физической ошибке/ошибке распознавания как процесса прежний MP4 сохраняется. ASR-неопределённости явно остаются review-required.

Очистка старого out/ не выполнялась: подтверждения списка удаления не было. Новый pending MP4 и WAV создаются вне out/. Старый манифест очистки после нового рендера требуется сформировать заново.
`;
await writeFile("docs/history/SPEECH_SYNC_QC.md", document);
console.log("Wrote historical SemanticCut QC at docs/history/SPEECH_SYNC_QC.md for verified final hash " + hash);
