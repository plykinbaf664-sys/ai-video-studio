/** One-time wording/links migration after the user's explicit audio preference. */
import {readFile,writeFile,copyFile} from 'node:fs/promises';
const file='scripts/editorial-delivery.mjs';let source=await readFile(file,'utf8');
await copyFile(file,'artifacts/dry-irony-v3/music-before-steady/editorial-delivery.mjs');
await copyFile('docs/DRY_IRONY_V3_QC.md','artifacts/dry-irony-v3/music-before-steady/QC.md');
const changes=[
 ['out/dry-irony-v3.mp4','out/dry-irony-v3-steady.mp4'],
 ['preparedMusicComparison:mixes.mixes','musicPolicy:mixes'],
 ['Подготовлено два музыкальных микса с идентичным голосом; финальный использует pause.','По требованию пользователя музыка идёт ровным слышимым фоном весь ролик, без phrase ducking и остановки на финале.'],
 ['- Реальный Relax Beat с приглушением под голос. Pause заканчивает музыку на 8.9s перед финальной репликой; continuous сохранён как сравнение. Голос обоих WAV побитно одинаков. Выбор pause сделан по драматургии; ручное прослушивание баланса здесь не заявляется.','- Реальный Relax Beat идёт непрерывно на одном gain: без приглушения по фразам, подъёма в паузах и остановки перед развязкой. Только плавные края .15/.25s. Один уровень выбран по всему фрагменту с запасом минимум 14dB относительно каждого сохранённого слова; измерения реального PCM — steady-music.json. Исходный голос не менялся; ручное прослушивание здесь не заявляется.'],
 ['; альтернативный микс: /DryIronyV3-Continuous.','. Основной микс continuous имеет постоянный уровень; прежний микс с паузой сохранён в music-before-steady/.'],
 ["const visualStatus=visual?.sha256===sha?'control-stills-inspected':'control-stills-awaiting-inspection';","const copiedVisual=r.videoCopy?.status==='passed'&&visual?.sha256===await fingerprint(r.videoCopy.before);\nconst visualStatus=visual?.sha256===sha?'control-stills-inspected':copiedVisual?'reviewed-video-copied-exactly':'control-stills-awaiting-inspection';"]
];
for(const [before,after] of changes){if(!source.includes(before))throw new Error(`Expected delivery text missing: ${before.slice(0,70)}`);source=source.replaceAll(before,after);}
const pattern=/<h2>Два звуковых решения[\s\S]*?<h2>Кадры готового V3<\/h2>/;
if(!pattern.test(source))throw new Error('Expected old music players missing');
source=source.replace(pattern,'<h2>Ровная фоновая музыка</h2><p>Один постоянный уровень, без приглушения по фразам и скачков в паузах. Только короткие плавные края начала и конца.</p><audio controls preload="none" src="../../public/generated/dry-irony-v3/continuous.mix.wav"></audio><h2>Кадры готового V3</h2>');
await writeFile(file,source);
console.log('Delivery links and current music policy updated; previous generator and QC preserved.');
