# AI Video Studio

Текущий творческий проход — [планы ведущего и чистые фотографии0019](docs/PRESENTER_FRAMING.md), кандидат context-domestic-003, Studio /ContextDomesticPhoto; [цвет и сравнение](docs/COLOR_WORKFLOW.md). Статус экспорта — только по фактическому [отчёту003](artifacts/jobs/context-domestic-003/final-report.json). Реализованы **3 стиля**: Editorial Focus, Dry Irony, Signal Dynamic; версии монтажа не являются новыми стилями. Default render остаётся Tight. Ниже сохранён результат предшествующего0016.

Текущий этап — [Visual Understanding](docs/VISUAL_UNDERSTANDING.md): один настоящий image-анализ37 кадров после отдельного разрешения, без повторов. [Версия A](out/visual-001-a.mp4) и [версия B](out/visual-001-b.mp4) прошли QC и просмотр10 кадров каждая. [Общее сравнение](artifacts/visual/visual-001/comparison.html) показывает3 изменённые сцены. [Галерея кадров и состав запроса](artifacts/visual/visual-001/index.html), [план0016](.agent/plans/0016-visual-understanding.md), [разбор шести редакторских поправок](docs/QWEN_AMENDMENT_AUDIT.md). Предыдущие результаты/default Tight сохраняются.

Локальный профессиональный смысловой видеомонтаж на Remotion. Исходник: public/source.mp4. Готовые видео: out/. Только код и проверенный файл подтверждают работу; художественное утверждение отдельно.

Режиссёрский процесс: director:prepare → ответ из файла или Qwen → проверка → director:select → director:stage. [Мануал](docs/DIRECTOR_WORKFLOW.md), [подключение Qwen Cloud](docs/QWEN_SETUP.md), шаблон .env.qwen.example. Qwen подключён через приватную .env.qwen:25.10.2026 получен один реальный текстовый ответ. Его два плана потребовали редакторской доработки, сохранённой отдельно от оригинала. [Фактический отчёт](docs/QWEN_FIRST_RUN.md). director:provider-check и director:preflight работают без API-вызова; новая генерация требует подтверждения конкретного payload. Автономное профессиональное качество по одному ответу не заявляется.

## Запуск

Новый Qwen + редакторский результат: **[qwen-cut-001-thematic-grouping.mp4](out/qwen-cut-001-thematic-grouping.mp4)** —18.27s,1080×1920/30, все40 слов. [Галерея и кадры готового файла](artifacts/jobs/qwen-cut-001-thematic-grouping/index.html), [QC](artifacts/jobs/qwen-cut-001-thematic-grouping/REPORT.md). Тезис → постепенно раскрываемый перечень → самоописание → финальная реплика. Полное декодирование,548 фактических кадров и звук проверены,10 финальных кадров просмотрены. Два ASR-вопроса для слуховой проверки: «женщине/женщины»0.58–1.04s и начало «тоже»14.24–14.89s. Studio: http://localhost:3001/DirectorPreview. Повторный рендер уже подготовленного задания без API: `node scripts/render-editorial-job.mjs --job qwen-cut-001-thematic-grouping`. Новый API-вызов не нужен для просмотра или рендера этого результата.

Сохранённый результат по умолчанию — **Dry Irony Tight**,18.27s / все40 слов: [MP4](out/dry-irony-tight.mp4), [галерея](artifacts/jobs/dry-irony-tight/index.html), [фактический QC](artifacts/jobs/dry-irony-tight/REPORT.md). Долгие паузы предыдущего31s варианта сокращены; по word map обычные промежутки440–560ms. `npm run studio` → http://localhost:3001/DryIronyTight; `npm run render` или `render:tight` готовит данные, раскадровку, рендер и QC. [Политика темпа](docs/PACING_POLICY.md), [общий мануал](docs/REUSABLE_EDITING.md), [режиссёрский процесс](docs/DIRECTOR_WORKFLOW.md). Оформление и непрерывная тихая музыка сохранены. ASR review-required: сохранность голоса подтверждена, разночтение «женщине/женщины» требует слуховой проверки. Старые задания/отчёты доступны через render:story/render:v3/render:styles; текущее наличие прежних MP4 проверяется отдельно, не предполагается по историческим ссылкам.

- npm run prepare:edit — проверить источник/таймкоды, подготовить общий видеокэш и три музыкальных микса.
- npm run studio — один Studio на http://localhost:3001, текущая DryIronyTight, предыдущая DryIronyStory/V3 и три Reference-композиции.
- npm run render:styles — три экспорта с проверкой фактических файлов.
- npm run audit:out — безопасная инвентаризация готовых видео и хешей, без удаления.
- npm run lint; npm test; npm run design:check; npm run context:check — проверки проекта.

Технические FirstTest/SemanticCut доступны в папке Technical-history. Исходник не подменяется. Старые отвергнутые сравнения сохранены отдельно, не являются текущими образцами качества.

## Где что лежит

| Папка | Назначение |
| --- | --- |
| src/design/stages/ | Три сравнительных сценических направления предыдущего прохода |
| src/design/scenes/ | Повторно используемые говорящий / крупная речь / split-перечень / сравнение |
| style-presets/grammars/ | Независимая от исходника визуальная грамматика существующего Dry Irony |
| edits/ | Задания: source cuts, output scenes, реальные quote ranges, ручные crop/grade/audio |
| public/generated/jobs/ | Производные файлы каждого нового задания |
| artifacts/jobs/ | Проверки, кадры и галерея каждого задания |
| src/design/editorial/ | Компоненты доведённой Dry Irony v3: окно ведущего и типографика речи/развязки |
| style-presets/directions/dry-irony-v3.json | Сцены, конкретные source cuts, цвет и музыкальное решение v3 |
| style-presets/runtime/ | Исполняемые направления, сцены, музыка и референсные таймкоды |
| assets/catalog.json | Единственный каталог реальных ассетов/лицензий |
| brandbooks/media/ | Брендбук и визуальные ограничения |
| reference-library/media/video/ | Три видео-референса для анализа |
| instructions/editing/ | Контракты монтажных ролей; AGENTS.md — инструкции разработчику |
| public/generated/reference-edit/ | Проверяемый производный видеокэш/миксы/монтажные данные |
| .cache/ | Восстанавливаемые рабочие данные |
| artifacts/ | QC, кадры и воспроизводимые доказательства |
| archives/ и docs/history/ | Сохранённые исходные комплекты и прошлые состояния |

Подробности: [архитектура](docs/ARCHITECTURE.md), [разбор референсов](docs/REFERENCE_AUDIT.md), [стили](docs/STYLE_SYSTEM.md), [проверки](docs/VERIFICATION.md), [правила монтажа](instructions/editing/README.md). Для нового исходника нужна новая привязанная к его хешу расшифровка и монтажный план; произвольный файл автоматически режиссёром пока не разбирается.

Сравнительные версии предыдущего прохода: [три видео и кадры](artifacts/reference-edit/index.html), [контактный лист](artifacts/reference-edit/comparison.png), [отчёт](docs/REFERENCE_EDIT_QC.md). MP4: out/reference-editorial-focus.mp4, out/reference-signal-dynamic.mp4, out/reference-dry-irony.mp4.

Доведённая версия: [V3 и V2 рядом, текущая фоновая музыка](artifacts/dry-irony-v3/index.html), [проверки V3](docs/DRY_IRONY_V3_QC.md). `render:styles` сохраняет прежний сравнительный путь; исходные MP4 не заменяются новой V3.
# Контекстная визуальная библиотека

Последняя версия бытового примера: ContextDomesticPhoto / context-domestic-003: чистые фото, три акцентных крупных плана и новый SDR цвет. ContextDomesticPhoto002 сохраняет прежний 002. [Фото, prompts и команды](docs/DOMESTIC_PHOTO_STORY.md). Подготовка/проверка/рендер: `prepare:photos`, `preview:photos`, `render:photos`; новый исходник не нужен, прежние версии сохранены.

Накопительная библиотека изображений и параметрических схем, поиск Commons/Openverse и слово-привязанный visualPlan: [docs/CONTEXTUAL_VISUAL_LIBRARY.md](docs/CONTEXTUAL_VISUAL_LIBRARY.md). `npm run library:list`, `npm run library:brief -- --job visual-001-b --domain domestic`. Новый пример — ContextDomestic; стенд схем — VisualLibraryLab в существующем Studio. Подготовка/preview/render: `prepare:context`, `preview:context`, `render:context`; тяжёлые шаги последовательно, на этой машине AI_VIDEO_SOFTWARE_GL=1. `node scripts/serve-visual-review.mjs library 3106` открывает локальный каталог после сборки галереи. Фактическая готовность MP4 определяется отчётами QC и хешем файла.
