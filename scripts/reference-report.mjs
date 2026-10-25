import {readFile,writeFile} from 'node:fs/promises';
import {fingerprint} from './lib/media.mjs';
const slugs=['editorial-focus','signal-dynamic','dry-irony'],rows=[];
for(const slug of slugs){
 const r=JSON.parse(await readFile(`artifacts/reference-edit/${slug}.validation.json`,'utf8'));
 const m=JSON.parse(await readFile(r.mediaReport,'utf8'));
 const asr=JSON.parse(await readFile(`artifacts/reference-edit/${slug}.asr.json`,'utf8'));
 const sha256=await fingerprint(`out/reference-${slug}.mp4`);
 if(sha256!==r.technical.sha256||sha256!==asr.mediaSha256||!asr.complete||m.status!=='passed'||r.speech.wordErrors)throw new Error(`Stale/failed QC: ${slug}`);
 if(await fingerprint(`style-presets/runtime/personal-${slug}.json`)!==r.styleSha256)throw new Error('Style changed after export');
 rows.push({slug,file:`out/reference-${slug}.mp4`,sha256,bytes:r.technical.bytes,frames:r.technical.frames,videoDuration:r.technical.videoDuration,audioDuration:r.technical.audioDuration,fullDecode:r.technical.fullDecode,physical:m.summary,minimumWordWaveformCorrelation:Math.min(...m.audioWords.map(w=>w.correlation)),speech:{status:r.speech.status,wordErrors:r.speech.wordErrors,expected:r.speech.expectedWords,recognized:r.speech.recognizedWords,reviewItems:r.speech.reviewItems},lowConfidence:r.manualReview,samplePeakDbFS:r.levels.items[0].samplePeakDbFS,samplesAboveFullScale:r.levels.items[0].samplesAboveFullScale,subtitleStreams:r.technical.subtitleStreamCount,sourceUnchanged:r.sourceUnchanged});
}
let visualRecord;try{visualRecord=JSON.parse(await readFile('artifacts/reference-edit/visual-review.json','utf8'));}catch{/* A new export still needs inspection. */}
const inspected=rows.every(r=>visualRecord?.files?.some(x=>x.slug===r.slug&&x.sha256===r.sha256));
const report={at:new Date().toISOString(),status:'technical-and-physical-passed; ASR timing review items retained',artisticApproval:'candidate; pending user review',items:rows,visualReview:{status:inspected?'control-stills-inspected':'new-output-needs-visual-review',actualFinalFrames:12,framesPerStyle:[30,195,285,397],runtimeSpeechGeometry:'Checked on active render frames: single current-speech layer, max two lines, safe area, protected face, no clipping',comparison:'artifacts/reference-edit/comparison.png',gallery:'artifacts/reference-edit/index.html',limitation:'Human audio audition and continuous human lip-reading were not performed. Frame/word correlation and independent local ASR are separate evidence; do not call them artistic approval.'}};
await writeFile('artifacts/reference-edit/final-report.json',JSON.stringify(report,null,2)+'\n');
const table=rows.map(r=>`| ${r.slug} | ${(r.bytes/1024/1024).toFixed(2)} MiB | ${r.frames} / ${r.videoDuration}s | ${r.speech.wordErrors} | ${r.physical.visibleSourceFrames} + ${r.physical.declaredGraphicFrames} | ${r.samplePeakDbFS.toFixed(2)} |`).join('\n');
const hashes=rows.map(r=>`- ${r.file}: ${r.sha256}`).join('\n');
const review=rows.flatMap(r=>r.speech.reviewItems.map(x=>`- ${r.slug}: «${x.expected.text.trim()}», субтитры ${x.expected.startMs/1000}s; ASR финального микса ${x.recognized.startMs/1000}s; конец совпал. ${x.status}.`)).join('\n');
const confidence=rows.map(r=>`- ${r.slug}: ${r.lowConfidence.map(x=>`«${x.text}» ${(x.startMs/1000).toFixed(2)}s (${x.confidence.toFixed(2)})`).join(', ')||'нет слов ниже .60'}.`).join('\n');
const doc=`# Новый монтаж по видео-референсам: фактический QC

Дата: ${report.at}. Три MP4 существуют; текущие хеши повторно сверены с техническими отчётами и независимым финальным ASR. Визуальная оценка пользователя остаётся отдельной: статусы candidate, не approved.

## Что изменено

Прежний v1 управлял главным образом небольшой текстовой плашкой. Введён сценический контракт, три разные композиционные системы и три реальные музыкальные подложки. Editorial — полноэкранный ведущий/текст без коробок/мотивированное приближение; Signal — нижнее окно ведущего, графические cutaway, карточки и связи; Dry Irony — светлое поле, отдельные окна, огромная уже произносимая цитата и пауза на развязке. Принципы взяты из конкретных IMG_3320/3321/3322 beats; чужие кадры, цифры, лица и аккаунты не вставлялись. Полный разбор: REFERENCE_AUDIT.md.

Исходный source.mp4 неизменён. Общий реальный 15s речевой монтаж: source 0–5 → output 0–5; source 7.7–11.6 → output 5–8.9; source 36.9–43 → output 8.9–15. Все 22 слова имеют source/output происхождение. Текущая речь выводится одним слоем, обычные субтитры максимум в две строки; схема Signal использует отдельно помеченные цитаты из уже прозвучавших фраз. Неподтверждённого «Всё решаю сам» нет.

Музыка: Feedback Dreams / Hip Hop 02 / Relax Beat из предоставленных файлов. Голос .84, музыкальная огибающая/ducking, fade-in/out, остановка музыки в Signal/Paper перед развязкой 11.6s. Vastness зарегистрирован, но не добавлен ради количества. Сведение и права/происхождение: artifacts/reference-audit/audio-mixes.json и assets/library/music/licenses/PROVENANCE.md. Sample peaks проверены; EBU R128/true-peak mastering не заявляется.

## Готовые файлы

Все: 1080×1920, 30 fps, H264 8-bit 4:2:0 full range, AAC 48kHz, без subtitle streams и одноимённого SRT. Аудиопоток 15.019s: разница 19ms — упаковка AAC; это не измеренный сдвиг речи.

| Вариант | Размер | Кадры / видео | ASR lexical errors | Видимый исходник + graphic frames | Sample peak dBFS |
| --- | --- | --- | --- | --- | --- |
${table}

${hashes}

## Реально выполнено

- Полное декодирование всех трёх MP4; проверка размеров, CFR, кодеков/потоков/длительностей/начала, неизменности source и финальных SHA-256.
- Все 450 кадров промежуточного исходного монтажа сопоставлены с реальными source PTS. Каждый видимый кадр финала проверен по области лица в пределах одного выходного кадра. Signal: 82 кадра намеренно отведены графическим сценам — не выданы за совпавшее видимое видео.
- Для каждого результата все 22 исходных слова сопоставлены с фактическим звуком после вычитания известной музыкальной подложки; минимальная корреляция слов > .9999, измеренный лучший lag 0ms при шаге поиска 1ms. Это проверка сохранности исходного звука, не утверждение человеческого lip-reading.
- Все 60 последовательных блоков по 250ms проверены по полному ожидаемому миксу и голосу. У очень тихого фонового звука AAC под музыкой меняет корреляцию; допускается только измеренный codec noise floor, отдельно от строгой проверки каждого слова. При исправлении QA калибровка выполнена через тот же libfdk_aac/192k. Сырые значения и критерии сохранены, низкая корреляция пауз не скрыта.
- Независимое локальное faster-whisper small распознавало фактический финальный AAC без подстановки ожидаемого текста. Во всех трёх 22/22, lexical differences 0. Ошибки оценки границ ASR сохранены ниже.
- Геометрический guard на кадрах активной речи: один текущий слой, максимум две строки, safe area, отсутствие клиппинга и пересечения с защищённым лицом. Подготовлены 12 контрольных кадров из готовых MP4: 1.00, 6.50, 9.50, 13.23s каждого варианта. ${inspected?'Их просмотр зафиксирован и привязан к текущим SHA-256 в visual-review.json.':'Текущие файлы требуют отдельного визуального просмотра; отметка старых кадров к новым хешам не применяется.'} Это не непрерывный ручной просмотр всего видео.
- Основное ядро сохранено: npm run lint; npm test — 26/26; npm run validate:edit — прежний 30s план; npm run design:check — 12 ассетов, 3 candidate, 20 неисполняемых drafts; npm run context:check; npm run audit:out; npm ls --depth=0.
- node scripts/verify-design-kit.mjs — все 56 исходных manifest-файлов целы; node scripts/sync-design-assets.mjs — канонический каталог; node scripts/check-design-preview.mjs — три baseline-кадра и действующий Studio. Главный bundle реально использован для всех трёх новых рендеров. preview-reference-styles.mjs проверял 18 сценических stills и Studio; reference-final-previews.py / reference-gallery.mjs создали кадры/галерею именно из готовых файлов.

Реальные команды рендера в этом проходе: node scripts/render-reference-styles.mjs, затем повторная проверка после исправления ложных срабатываний QA через --only=signal,paper --reuse=signal. Все три pending MP4 были действительно отрендерены; reuse повторно выполнил physical/ASR/peaks, не создавал подмену. Временный диагностический --reuse затем удалён из публичного скрипта: будущий npm run render:styles всегда рендерит заново перед QC.

## Оставлено для ручной проверки

${review}

Слуховой контроль 9.7–10.8s: определить точный воспринимаемый старт протяжного «И». Единый caption timestamp 10.22s основан на предыдущем распознавании выделенного голоса; финальный ASR по-разному относит тихое начало к этому слову в присутствии разной музыки. Исходный фрагмент не вырезан; waveform совпадает. Не переносить подпись автоматически по одному такому результату ASR.

Низкая уверенность финального ASR (< .60):

${confidence}

Нужны слуховая оценка баланса музыки/голоса и пользовательская художественная оценка темпа/графики. Непрерывное человеческое прослушивание здесь не выполнялось. Настоящий 3D, автоматическое понимание нового исходника, сложный многокамерный color matching/HDR и 20 готовых стилей не заявляются. Текущий цвет — умеренный источник-специфичный SDR-профиль, не обещание «кино» по названию фильтра; алгоритм/границы в COLOR_WORKFLOW.md.

## Где смотреть и что дальше

[Галерея трёх роликов](../artifacts/reference-edit/index.html), [12 кадров](../artifacts/reference-edit/comparison.png). npm run studio → http://localhost:3001 → Reference-editorial / Reference-signal / Reference-paper. npm run render:styles повторяет подготовку, рендер и фактический QC. out/ содержит только готовые видео; исходники/архивы не удалены. Следующий минимальный шаг — художественно выбрать одно направление и довести конкретные 3–4 сценических блока; затем подключать эту библиотеку к смысловому плану.
`;
await writeFile('docs/REFERENCE_EDIT_QC.md',doc);
console.log('Wrote docs/REFERENCE_EDIT_QC.md and hash-checked final-report.json');
