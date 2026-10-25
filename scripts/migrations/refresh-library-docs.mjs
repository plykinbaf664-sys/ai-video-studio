import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {fingerprint} from '../lib/media.mjs';
await mkdir('docs/history',{recursive:true});
for(const name of ['COLOR_WORKFLOW','DESIGN_LIBRARY_MANUAL','EDITING_CONTRACT'])await copyFile(`docs/${name}.md`,`docs/history/${name}.md`);
const texts={
'docs/DESIGN_LIBRARY_MANUAL.md':`# Библиотека: текущее состояние и пополнение

Материалы уже предоставлены: 15 скриншотов, 3 видео, 4 MP3, 4 исходных SFX, SVG и Onest/Inter с OFL. Не просить заново отсутствующий «пакет», когда файлы есть на диске. Канонические каталоги: assets/catalog.json, brandbooks/catalog.json, reference-library/catalog.json. Реестры из первоначального Design Kit — история.

Файлы: brandbooks/media/ — брендбук; reference-library/media/video/ и screenshots/ — анализ; assets/library/music/ — реальные mixkit-*.mp3, fonts/ — шрифты, sfx/ — оригинальные звуки. Перед копированием в public/generated/ проверить файл/хеш/происхождение. Создание записи не означает художественного утверждения.

Добавление: npm run design:add -- reference --id example --title Example --file reference-library/media/video/example.mp4 --start 2 --end 5 --axis graphics --technique "Конкретный приём". Это образец синтаксиса для нового существующего файла, не реальный зарегистрированный example. Точные флаги — scripts/lib/register-design-item.mjs. После импорта: npm run design:check.

Видео-референсы используются для структуры, не как автоматически разрешённый B-roll. Музыка выбирается конкретным asset ID из сценического пресета; для неё есть исходный отрезок, уровни и ducking, измерения в artifacts/reference-audit/audio-mixes.json. Происхождение и нынешние Mixkit-условия: assets/library/music/licenses/PROVENANCE.md. Официальный CDN вернул 403; совпадение байтов с ним не утверждается.

Для следующих профессиональных компонентов предпочтителен небольшой согласованный набор — сравнение, процесс/связи, цитата, доказательство — с типографикой и смысловыми условиями применения. Оригинальные SVG-символы в src/design/stages/Symbols.tsx уже используются. Неподтверждённые иконки и случайные изображения не импортируются ради заполнения сцены.
`,
'docs/COLOR_WORKFLOW.md':`# Цветокоррекция и проверка

Цель — читаемое лицо, натуральная кожа и согласованная световая структура. Цвет сам по себе не заменяет съёмку/свет/кадр. У source.mp4 нет надёжных цветовых тегов; Log/HDR не предполагаются и детали пересвеченного источника не выдумываются.

Порядок: проверить метаданные/диапазон/цветовые условия → выбрать контрольные кадры лица и светов → нейтрализовать экспозицию/WB без плоского выравнивания → умеренный контраст и насыщенность → сопоставить соседние планы → творческий look по референсу → before/after, уровни, кожа и готовый MP4. Не добавлять автоматически teal/orange, зерно или виньетку ради слова «киношный».

Текущая реализация: scripts/prepare-reference-base.py один раз создаёт hash-bound кэш 720×1280/30fps из реальных source PTS. Используется мягкая SDR display-RGB коррекция: gamma .985, contrast 1.035, saturation .975, RGB gain [1.008,1,.995]. Это исходник-специфичный нейтральный профиль; не ACES/Log-преобразование и не восстановление клиппинга. Точные параметры и source-frame mapping: public/generated/reference-edit/base.manifest.json. Производный файл не заменяет оригинал; промежуточное H264-кодирование crf12 явно документировано.

Текст/графика сохраняют брендовые значения и не проходят через этот профиль. Видимая контрастная сценография/световая атмосфера Signal отделена от обработки кожи. Все 450 кадров кэша сопоставлены с оригинальными PTS, далее проверяется каждый видимый портретный кадр финала. Измерения не заменяют художественную оценку.

Автоматическое skin-isolation, согласование разных камер, HDR delivery и восстановление пересветов не заявляются. Показатель качества — реальный контрольный кадр и видео, не наличие эффектов или параметров.
`,
'docs/EDITING_CONTRACT.md':`# Речь, время и сценический план

Речь/исходник неизменны; отбор реплик и усиление мысли задаёт монтажный план. Нельзя придумывать цитаты, числа и доказательства. Визуальная сцена имеет purpose и опору на конкретный референсный таймкод.

## Две временные шкалы
source — время оригинала; output — время после отбора. src/director/timeline.ts проверяет целые слова, явное выравнивание по 30fps, отсутствие разрывов/наложений и отображает слова через sourceWordToOutput. Пример вычитания паузы не заменяет фактический расчёт. Для текущей выборки source 0–5 / 7.7–11.6 / 36.9–43 → output 0–5 / 5–8.9 / 8.9–15.

## Слои решения
EDL исходных клипов остаётся общим техническим clock. style-presets/runtime/personal-*.json.staging задаёт визуальные сцены и музыку, src/director/scene-direction.ts — реализованную геометрию и видимость. Типы layout должны соответствовать существующему renderer. Каждый невидимый источник при graphic cutaway объявлен явно; голос и output clock продолжаются.

Субтитры берутся из retained output words, не исходных таймкодов напрямую. Один текущий слой, обычные подписи максимум две строки. На развязке слова раскрываются по реальным word timestamps, чтобы не испортить паузу. Уже услышанная цитата схемы — отдельная context quote; проверяется requireEarlierQuote. Навигационные метки — editorial labels, не реплики автора. Фраза «Всё решаю сам» не подтверждена и не показывается как произнесённая.

Для нового источника нужны новая стенограмма/план с его SHA, пересчёт и новый QC. Нельзя применить старые шрифтовые/визуальные зоны ко всякому лицу автоматически и объявить автоматический смысловой монтаж готовым. Контракты ролей: instructions/editing/.
`,
'reference-library/README.md':'# Референсная библиотека\n\nКанонический catalog.json содержит 15 скриншотов и три видео пользователя (IMG_3320/3321/3322). Записи draft/reference-only: разрешают анализ приёмов, не копирование чужого видеоряда или музыки. Реальный разбор и таймкоды — docs/REFERENCE_AUDIT.md, доказательства — artifacts/reference-audit/. Референсные времена относятся к самому референсу, не нашему source/output.\n',
'brandbooks/README.md':'# Брендбук\n\nВ catalog.json зарегистрирован Personal Design Kit, статус draft; реальные Onest/Inter, палитра и ограничения связаны с assets/catalog.json. Это не пустой каталог. Первый visual-v1 пользователем отклонён; утверждение новой режиссуры отдельно от регистрации материалов. Действующие правила — media/BRANDBOOK.md и docs/STYLE_SYSTEM.md.\n',
'style-presets/README.md':'# Стилевые контракты\n\nruntime/ содержит baseline и три исполняемых сценических personal-направления. Поле staging действительно задаёт сцены, смысловые задачи, референсы и музыку. src/design/stages/ исполняет их. Три направления candidate до художественной оценки пользователя.\n\n20 JSON в корне — неисполненные проекты. archive/personal-v1/ — отклонённый первый визуальный пакет; archive/design-kit-specs/ — первоначальная спецификация. Они не определяют текущий Studio. Проверка: npm run design:check. Полные правила: docs/STYLE_SYSTEM.md.\n',
'src/legacy/personal-v1/README.md':'# Исторический personal-v1\n\nЭтот визуальный пакет отклонён пользователем за поверхностные различия. Он сохранён как код истории и не подключён к действующему Studio. Его статусы/параметры не являются требованиями к новым стилям. Активный renderer — src/design/stages/.\n',
'assets/library/fonts/README.md':'# Реальные шрифты\n\nOnest/Onest-Variable.ttf и Inter/InterVariable.ttf установлены локально вместе с OFL.txt и проверкой кириллицы. Канонический реестр — assets/catalog.json; runtime-копии готовит prepare:edit. Не применять инструкции первоначального Kit о download_required: они исторические.\n',
'assets/library/README.md':'# Материалы проекта\n\nИсточник истины — assets/catalog.json. В библиотеке реально есть Onest/Inter/OFL, четыре mixkit MP3, четыре исходных WAV и SVG. asset-registry.json — только указатель на канонический каталог. Музыкальные условия/происхождение — music/licenses/. Для исходных библиотечных файлов нет автоматического удаления или массового копирования в public.\n'
};
for(const [file,text] of Object.entries(texts))await writeFile(file,text);
const fontIndex={canonicalRegistry:'assets/catalog.json',fonts:[{id:'personal-onest',name:'Onest',status:'installed-cyrillic-verified',file:'assets/library/fonts/Onest/Onest-Variable.ttf',license:'assets/library/fonts/Onest/OFL.txt'},{id:'personal-inter',name:'Inter',status:'installed-cyrillic-verified',file:'assets/library/fonts/Inter/InterVariable.ttf',license:'assets/library/fonts/Inter/OFL.txt'}]};await writeFile('assets/library/fonts/font-registry.json',JSON.stringify(fontIndex,null,2)+'\n');
let brand=await readFile('brandbooks/media/BRANDBOOK.md','utf8');brand=brand.replace('Нет доказательств частоты кадров, анимаций и аудио в референсных видео.','Дополнение 2026-10-23: три видео-референса доступны и разобраны; актуальные сцены/таймкоды — docs/REFERENCE_AUDIT.md. Первый visual-v1 отклонён пользователем. Новые направления должны оцениваться по реальному видео, не по регистрации или тестам.');await writeFile('brandbooks/media/BRANDBOOK.md',brand);
const brands=JSON.parse(await readFile('brandbooks/catalog.json','utf8'));brands.items.find(b=>b.id==='personal-design-kit').source.sha256=await fingerprint('brandbooks/media/BRANDBOOK.md');await writeFile('brandbooks/catalog.json',JSON.stringify(brands,null,2)+'\n');
const refs=JSON.parse(await readFile('reference-library/catalog.json','utf8'));const beats={'img-3320':[[0,3000,'typography','Headline hierarchy'],[108000,120000,'typography','Larger meaningful words']], 'img-3321':[[10500,13000,'graphics','Paper field and independent portrait window'],[26000,40000,'graphics','Editorial collage / changed image proportions'],[158000,160000,'typography','Standalone editorial statement']], 'img-3322':[[6000,10000,'graphics','Split screen with structured UI'],[11500,13000,'transitions','Full graphic cutaway, voice retained'],[15000,18000,'motion','Sequential meaningful nodes'],[27000,33000,'graphics','Topic nodes above speaker']]};
for(const [id,rows] of Object.entries(beats))refs.items.find(r=>r.id===id).beats=rows.map(([startMs,endMs,axis,technique])=>({startMs,endMs,axis,technique}));await writeFile('reference-library/catalog.json',JSON.stringify(refs,null,2)+'\n');
const index=JSON.parse(await readFile('reference-library/media/reference-index.json','utf8'));index.scope='Historical screenshot-only index; videos are in canonical reference-library/catalog.json';await writeFile('reference-library/media/reference-index.json',JSON.stringify(index,null,2)+'\n');
await writeFile('reference-library/media/video/README.md','# Видео пользователя\n\nIMG_3320 (124.2s), IMG_3321 (172.8s), IMG_3322 (51.63s) зарегистрированы в reference-library/catalog.json как analysis/reference-only. Разбор: docs/REFERENCE_AUDIT.md. Чужие лица, интерфейсы и числа не переносятся в наш MP4.\n');
console.log('Removed stale empty/not-downloaded claims from live library documents and indexes');
