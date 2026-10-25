import {readFile,writeFile} from 'node:fs/promises';
import {fingerprint} from './lib/media.mjs';
import {contactSheet} from './lib/contact-sheet.mjs';
const folder='artifacts/dry-irony-v3',r=JSON.parse(await readFile(`${folder}/validation.json`,'utf8'));
const sha=await fingerprint('out/dry-irony-v3-steady.mp4');if(sha!==r.technical.sha256)throw new Error('Final delivery report hash mismatch');
const stills=JSON.parse(await readFile(`${folder}/final-previews.json`,'utf8'));if(stills.filter(x=>x.version==='v3').some(x=>x.mediaSha256!==sha))throw new Error('Stale preview images');
const comparison=[...stills.filter(x=>x.version==='v2'),...stills.filter(x=>x.version==='v3'&&[30,183,361].includes(x.frame))].map(s=>({...s,label:`${s.version.toUpperCase()} · ${s.seconds.toFixed(2)} с`}));
await contactSheet({output:`${folder}/comparison.png`,title:'Dry Irony · v2 сверху / v3 снизу · те же исходные моменты',items:comparison,columns:3,width:270});
const finalFrames=stills.filter(x=>x.version==='v3');
await contactSheet({output:`${folder}/final-frames.png`,title:'Dry Irony v3 · кадры готового MP4',items:finalFrames.map(x=>({...x,label:`${x.seconds.toFixed(2)} с`})),columns:4,width:240});
const loud=JSON.parse(await readFile(`${folder}/loudness.json`,'utf8')),mixes=JSON.parse(await readFile(`${folder}/audio-mixes.json`,'utf8')),levels=JSON.parse(await readFile(`${folder}/sample-peaks.json`,'utf8'));
const base=JSON.parse(await readFile(`${folder}/base.validation.json`,'utf8')),media=JSON.parse(await readFile(`${folder}/media.json`,'utf8'));
const asr=JSON.parse(await readFile(`${folder}/final.asr.json`,'utf8'));
const steady=JSON.parse(await readFile(`${folder}/steady-music.json`,'utf8'));
if(steady.status!=='passed'||steady.bedSha256!==media.hashes.bed)throw new Error('Steady music check is stale/failed');
if(media.hashes.output!==sha||asr.mediaSha256!==sha||media.status!=='passed'||base.status!=='passed'||!asr.complete||r.speech.wordErrors||levels.items[0].samplesAboveFullScale)throw new Error('Failed/stale final QC');
let visual;try{visual=JSON.parse(await readFile(`${folder}/visual-review.json`,'utf8'));}catch{/* New output not yet inspected. */}
const copiedVisual=r.videoCopy?.status==='passed'&&visual?.sha256===await fingerprint(r.videoCopy.before);
const visualStatus=visual?.sha256===sha?'control-stills-inspected':copiedVisual?'reviewed-video-copied-exactly':'control-stills-awaiting-inspection';
const shortI=r.speech.aligned.find(x=>x.expected?.text.trim()==='И');
await writeFile(`${folder}/final-report.json`,JSON.stringify({...r,visualStatus,loudness:loud,shortI,musicPolicy:mixes,steadyMusic:steady,manualAudioAudition:'not performed; final balance and phonetic interpretation remain open to human listening',previewFrames:finalFrames},null,2)+'\n');
const issues=r.speech.reviewItems.map(x=>`- «${x.expected?.text.trim()}»: ${JSON.stringify(x)}`).join('\n')||'Повторное финальное ASR не выявило расхождений за пределами допуска 350ms. Это не точная фонетическая разметка.';
const doc=`# Dry Irony v3 — результат и проверка

Файл: out/dry-irony-v3-steady.mp4. SHA-256: ${sha}. Размер: ${r.technical.bytes} байт. Видео 1080×1920, 30fps, 414 кадров, 13.8s; H264 8-bit 4:2:0 / AAC 48kHz, полный decode passed. По требованию пользователя музыка идёт ровным слышимым фоном весь ролик, без phrase ducking и остановки на финале. Художественное утверждение остаётся candidate.

${r.videoCopy?'Текущая правка затрагивает только звук. Все 414 H264-пакетов, extradata и PTS/DTS/durations побитно/точно совпали с предыдущим проверенным видео; изображение, монтаж и субтитры сохранены без перекодирования. Доказательство — video-copy.json.':''}

## Что изменено

- Три исходные реплики сохранены целиком. Source 0–4.6 / 7.7–11.3 / 37.4–43 → output 0–4.6 / 4.6–8.2 / 8.2–13.8. Сокращены .4/.3/.5s пауз. Все 22 слова пересчитаны через существующее timeline-ядро; реакция после последнего слова сохранена .96s. Три старых 15s MP4 не заменены.
- Увеличено окно ведущего: ширина 952 вместо 744 в обычной бумажной сцене; предметы/руки сохранены в пределах выбранной крупности, лицо и микрофон защищены. Убраны микроподписи/декоративная навигация. Крупные произнесённые фразы сменяют размер/позицию на бытовом контрпримере; «сам» имеет сдержанное подчёркивание. Это единственный новый смысловой графический акцент, без выдуманных цитат.
- На 10.4s — переход к полноэкранному ведущему. Развязка раскрывается по действительным началам слов; «инициатива» не появляется заранее. Финальная реакция остаётся без новых эффектов/заголовков.
- Цвет: локальная мягкая экспозиционная маска на области лица, защита ярких участков, умеренная нейтральная SDR-коррекция. Проверены три before/after; увеличение доли clipped pixels менее .2 процентного пункта. Это ручная настройка данного стабильного кадра, не автоматическое выделение кожи, не Log/HDR/восстановление исходного пересвета. Реальные измерения — color.json; профиль — style-presets/directions/dry-irony-v3.json.
- Реальный Relax Beat идёт непрерывно на одном gain: без приглушения по фразам, подъёма в паузах и остановки перед развязкой. Только плавные края .15/.25s. Один уровень выбран по всему фрагменту с запасом минимум 14dB относительно каждого сохранённого слова; измерения реального PCM — steady-music.json. Исходный голос не менялся; ручное прослушивание здесь не заявляется.

## Проверки фактического MP4

Все ${base.frames.length} исходных кадров проверены против оригинальных PTS с учётом заявленного grade (min correlation ${base.minimumCorrelation.toFixed(6)}). Все ${media.summary.frames} видимых кадров финала проверены по области лица (min ${media.summary.minimumVisibleFrameCorrelation.toFixed(6)}), намеренных graphic cutaway нет. Карта source/output и источники подписей проверены до рендера.

Все ${media.summary.words} слова проверены по исходному waveform после вычитания известной музыки: min correlation ${media.summary.minimumWordCorrelation.toFixed(6)}, измеренный lag ${media.summary.maximumWordLagMs}ms. Все ${media.summary.audioBlocks} последовательных аудиоблока проверены, включая остаток в конце. У тихого фона учитывается измеренный AAC noise floor; строгие проверки слов сохраняются. Хеши output/source/base/mix/bed/layout/selection записаны в media.json. Слова не растягивались, оригинальный звук сохранён с постоянным gain .84.

Финальное независимое локальное faster-whisper small: ${r.speech.expectedWords} ожидаемых / ${r.speech.recognizedWords} распознанных, lexical errors ${r.speech.wordErrors}, статус ${r.speech.status}. Распознавался фактический AAC без подсказки ожидаемого текста. Отдельное распознавание voice.wav используется для проверки спорного короткого «И»; акустические измерения исходника не выдаются за фонетическую экспертизу.

Sample peak ${levels.items[0].samplePeakDbFS.toFixed(2)}dBFS, сэмплов выше full scale ${levels.items[0].samplesAboveFullScale}; измерены входные показатели FFmpeg loudnorm: ${loud.integratedLufs} LUFS, true peak ${loud.truePeakDbTP}dBTP, LRA ${loud.loudnessRangeLU}LU. Нормализованный выход анализа отброшен, итоговый звук анализом не изменён. Громкость измерена, конкретный loudness target платформы не заявляется достигнутым.

Геометрия активных субтитров проверялась во время рендера: один слой, максимум две строки, размер не ниже 64px, границы safe area, отсутствие пересечения с лицом/клиппинга. Раскадровка из шести кадров и три source/grade-пары просмотрены до рендера. Из готового MP4 извлечены восемь кадров; их текущий статус ${visualStatus}. Это не непрерывное человеческое прослушивание/просмотр всех кадров.

## Неопределённости

${issues}

Низкая уверенность ASR (< .60): ${r.lowConfidence.map(x=>`«${x.text}» ${(x.startMs/1000).toFixed(2)}s (${x.confidence.toFixed(2)})`).join(', ')||'нет'}. Баланс музыки/голоса, художественный ритм и точное воспринимаемое начало короткого слова требуют слуховой оценки человеком. Автоматические проверки подтверждают сохранность и временное соответствие, не художественное одобрение.

## Реализация и запуск

Используемая библиотека — src/design/editorial/PortraitWindow.tsx и SpeechTypography.tsx; постановка DryIronyV3.tsx; source/output и правила развязки — src/director/editorial-v3.ts; режиссёрские параметры — style-presets/directions/dry-irony-v3.json. Это доработка Dry Irony, а не четвёртый независимый стиль. Источники — имеющиеся IMG_3321/3320, шрифт Onest и пользовательский Relax Beat. Случайных ассетов/публикаций/внешней передачи не было.

npm run prepare:v3 → npm run preview:v3 → npm run render:v3. Studio: http://localhost:3001/DryIronyV3. Основной микс continuous имеет постоянный уровень; прежний микс с паузой сохранён в music-before-steady/. Существующий npm run studio готовит актуальные данные; предыдущие Reference-композиции сохранены.

[Галерея](../artifacts/dry-irony-v3/index.html), [v2/v3](../artifacts/dry-irony-v3/comparison.png), [финальные кадры](../artifacts/dry-irony-v3/final-frames.png), [цвет до/после](../artifacts/dry-irony-v3/color.png). Команды/неудачные проверки и исправления фиксируются в .agent/plans/0009-dry-irony-v3.md; полные машинные отчёты рядом с галереей.
`;
await writeFile('docs/DRY_IRONY_V3_QC.md',doc);
await writeFile(`${folder}/index.html`,`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dry Irony v3</title><style>body{font:16px/1.5 Arial;margin:24px;background:#191a1f;color:#f6f3ec}h1{font-size:28px}h2{font-size:20px}main{display:flex;gap:32px;flex-wrap:wrap}section{max-width:470px;flex:1;min-width:280px}video{width:100%;max-height:720px;background:#09090b}a{color:#efa36c}p{max-width:1000px;color:#bbb}audio{width:100%;max-width:430px}.frames{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.frames img{width:100%}</style><h1>Dry Irony v3 — 13,8 секунды</h1><p>Увеличенный ведущий, сокращённые паузы, полноэкранная развязка, локальная коррекция лица. Исходные 22 слова сохранены. Технические проверки пройдены; ASR ${r.speech.status}; художественная оценка отдельно.</p><main><section><h2>V3 · новый монтаж</h2><video controls playsinline preload="metadata" src="../../out/dry-irony-v3-steady.mp4" poster="final-frames/v3-183.png"></video></section><section><h2>V2 · прежний Dry Irony, 15 с</h2><video controls playsinline preload="metadata" src="../../out/reference-dry-irony.mp4" poster="final-frames/v2-195.png"></video></section></main><h2>Ровная фоновая музыка</h2><p>Один постоянный уровень, без приглушения по фразам и скачков в паузах. Только короткие плавные края начала и конца.</p><audio controls preload="none" src="../../public/generated/dry-irony-v3/continuous.mix.wav"></audio><h2>Кадры готового V3</h2><div class="frames">${finalFrames.map(x=>`<a href="final-frames/${x.file.split('/').pop()}"><img src="final-frames/${x.file.split('/').pop()}" alt="${x.seconds.toFixed(2)} секунд"></a>`).join('')}</div><p><a href="../../out/dry-irony-v3-steady.mp4">Готовый MP4</a> · <a href="comparison.png">Сравнение v2/v3</a> · <a href="color.png">Цвет до/после</a> · <a href="../../docs/DRY_IRONY_V3_QC.md">Полный QC</a> · <a href="http://localhost:3001/DryIronyV3">Studio</a></p><p>Слуховая оценка микса человеком не выполнялась; автоматические waveform/ASR/уровни сохранены в отчёте.</p></html>`);
console.log('V3 gallery, real final comparisons and docs/DRY_IRONY_V3_QC.md created.');
