# Реальные команды и критерии

Короткие маршруты поиска и места регистрации изменений: [CONTEXT_INDEX.md](CONTEXT_INDEX.md). `npm run context:check` проверяет пути текущего0019 и локальные Markdown-ссылки индекса. `scripts/editorial-job-frames.py` извлекает из фактического MP4 также кадры до/на/после каждого объявленного акцента presenterFraming; это позволяет оценить реальные смены крупности отдельно от середины сцены.

0019: `node --test tests/presenter-framing.test.mjs` проверяет неизменность слов/нарезки/звука/фото/vision evidence, акценты36/322/464, сохранность face/microphone guard и отказ при чужом разрешении, сдвинутом слове, скрытом лице или чрезмерном zoom. `node scripts/prepare-editorial-job.mjs --job context-domestic-003` → `node scripts/preview-editorial-job.mjs --job context-domestic-003` → просмотр storyboard → `node scripts/render-editorial-job.mjs --job context-domestic-003`. Финальные кадры извлекаются из фактического MP4. Подробности/ограничения: PRESENTER_FRAMING.md.

Visual Understanding0016: `npm test` включает10 отдельных vision-регрессий (синтетическая геометрия/локальный transport fixture, не облачное распознавание). Они проверяют source/word/frame binding, защиту жестов/наблюдённого человека с предметом, три стиля, неизменные слова/нарезку/аудио/цвет, отказ от зума, низкую confidence и запрет отправки без точного image approval. `node scripts/visual-report.mjs --run visual-001` обновляет галерею без сети, сохраняя attempted payload. Один настоящий image API-вызов после отдельного согласования получен:37 кадров/7 units; его качество и ограничения зафиксированы отдельно от тестов. `visual:compare -- --run <id>` требует оба фактических MP4, одинаковые PCM/кэш/стиль/слова, актуальные QC/analysis receipts и просмотренные hash-bound кадры. При зависании системного Chrome локально используется AI_VIDEO_SOFTWARE_GL=1, без смены исходника/стиля/провайдера. docs/VISUAL_UNDERSTANDING.md.

Последняя версия Tight: npm run render / render:tight →548 кадров/18.2667s/40 слов, artifacts/jobs/dry-irony-tight/. Новые проверки: максимальный output word gap600ms (измерен560), регрессия точной48k waveform-шкалы для30fps границ, не кратных100ms. Эталон строится из оригинала48k, нарезается по1600 samples/frame и только потом понижается до8k; старый способ резать готовый8k эталон давал ложное фазовое расхождение. Ниже описан также предыдущий Story31s; его команда render:story теперь явная, не default.

Предыдущий путь: `npm run render:story` → подготовка/раскадровка/рендер/фактический QC/галерея. Он больше не является алиасом default render. Отдельно: `npm run prepare:story`, `npm run preview:story`. Задание 930 кадров/31s/40 слов; доказательства artifacts/jobs/dry-irony-story/. Предыдущий `render:v3` остаётся 414 кадров/13.8s/22 слова, `render:styles` — 450 кадров/15s. Мануал docs/REUSABLE_EDITING.md. Тесты проверяют тот же пресет с 31s/40 словами и другим реальным отбором 3.7s/4 слова, прежние временные и визуальные регрессии сохранены.

- npm run lint — ESLint/TypeScript.
- npm test — временные шкалы, происхождение речи, каталоги и выбор стиля.
- npm run design:check — схемы, реальные файлы/хеши/лицензии, ссылки на брендбук/референсы и реализуемые возможности.
- npm run context:check — актуальные маршруты документации, разделение ролей и отсутствие рабочих файлов в out/.
- npm run audit:out — проверенный инвентарь MP4/хешей, сохранность оригинала и трёх архивных v1; ничего не удаляет.
- V3 steady: verify-steady-music.py измеряет один gain по фактическому PCM каждые 200ms относительно исходной MP3, проверяет запас голоса на каждом слове. --audio-only в render-editorial-v3.mjs разрешён только при совпадении прежних визуальных данных, с проверкой всех H264-пакетов/таймкодов через verify-video-copy.py. Исторический MP4 с паузой сохраняется отдельно.
- node scripts/verify-design-kit.mjs — все 56 файлов оригинального manifest и действительные зависимости; не выполняет демонстрационные субтитры.
- npm run prepare:edit — реальные данные, видеокэш, исходный голос, три музыкальных микса.
- npm run studio — http://localhost:3001, единый корень с DryIronyStory, V3 и тремя Reference-композициями.
- npm run render:styles — три реальных MP4 с проверками перед выдачей.
- npm run validate:edit — регрессия прежнего source/output ядра. Отчёты идут в artifacts/reports/, subtitle exports в artifacts/caption-exports/.

## Два независимых порога

Технический: существующий ненулевой MP4, 1080×1920/30fps, число кадров точно из текущего edit plan, H264/AAC48k, полное декодирование, source hash, корректный source/output, исходные слова не обрезаны, музыка измерена и не маскирует голос, проверены sample/true peaks, повторное локальное ASR финального микса. ASR-расхождение — вопрос проверки, не доказательство отсутствия слова. Отчёт должен быть привязан к фактическому хешу файла. Новые задания имеют постоянный gain, без phrase ducking; исторические сравнительные миксы не переопределяют это предпочтение.

Визуальный: просмотр контрольных кадров из готового MP4; максимум две строки текущих субтитров, отсутствие дублирования/перекрытий, лицо и микрофон внутри заявленного окна, уместность крупности/графики/пауз. Полноэкранный graphic cutaway явно указан в сценическом плане; на нём нельзя ложно объявлять видимым исходный кадр. Различимость трёх визуальных систем проверяется отдельно от корректности текста. Ни число тестов, ни разница картинок не доказывают художественное качество.

Старые отчёты — docs/history/ и artifacts/history/. Их даты/пути сохраняются как история. Фактический новый отчёт: docs/REFERENCE_EDIT_QC.md и artifacts/reference-edit/.
# Режиссёр и подключение провайдера

Реальный текстовый вызов Qwen25.10.2026 и последующая редакторская доработка: docs/QWEN_FIRST_RUN.md. Эта проверка отделена от локальных HTTP-тестов. Выбранное задание qwen-cut-001-thematic-grouping имеет собственные storyboard, Studio, media/ASR QC в artifacts/jobs/qwen-cut-001-thematic-grouping/. `node scripts/render-editorial-job.mjs --job qwen-cut-001-thematic-grouping` рендерит подготовленное выбранное задание без нового обращения к API; default render остаётся DryIronyTight.

Подготовка облачного Qwen: tests/qwen-provider.test.mjs проверяет только локальный HTTP-симулятор (никогда Alibaba). Проверяются регион/URL, исключение ключей/медиа/путей, привязка разрешения к телу и endpoint, один запрос, HTTP/redirect/no-retry, truncation/refusal, лимиты, таймаут до заголовков и во время чтения, существующая семантическая проверка и lock попытки. director:provider-check и preflight — без сети. Успех тестов не подтверждает реальный ключ/модель/доступность API; docs/QWEN_SETUP.md.

Исполняемые проверки: `npm test`, `npm run lint`, `npm run context:check`. Локальный сквозной сценарий director:prepare → director:example → director:review → director:select → director:stage описан в docs/DIRECTOR_WORKFLOW.md. Проверяются реальные40 слов/548 кадров, два разных сценических плана, отсутствие провайдера и недоступных наблюдений, сохранность исходника/пресета/музыки/цвета, происхождение цитат, реальные интервалы референсов, чтение и output anchors. Контрольный пример не является тестом качества AI-режиссёра. Stage проверяет раскадровку в renderer; финальный MP4 появляется только после отдельного render с существующим фактическим QC.

# Проверки контекстной библиотеки (0017)

Дополнение0018: tests/domestic-storyboard.test.mjs проверяет конкретность действия, отказы для нейтральной/AI-темы, перенос на новые IDs/формулировки, раздельную поддержку setup/payoff, adjacency policy и photoSafety. `prepare:photos` → `preview:photos` → просмотр storyboard → `render:photos`; source/audio/ASR/final frames проверяются прежним ядром. Ожидание:548 frames,40 words,58 declaredGraphicFrames /490 visibleSourceFrames, тот же PCM. Нельзя считать это фактом без media.json и MP4. Тяжёлые previews/render и полный test suite запускать последовательно на8GB. Документ — DOMESTIC_PHOTO_STORY.md.

`npm run library:list`, `npm run library:brief -- --job visual-001-b --domain domestic`, `npm run design:check`; meaningful regression: tests/visual-library.test.mjs (word/clock preservation, cutaway visibility, theme-aware retrieval, asset/rights binding, unsafe inserts/statistics/relations, actual director schema compilation). Qwen allowlist regression должен исключать local runtime/provenance paths даже после добавления библиотеки. `npm run prepare:context` → `npm run preview:context` → фактический просмотр storyboard → `npm run render:context` (AI_VIDEO_SOFTWARE_GL=1 на этой машине). `node scripts/preview-visual-library.mjs` создаёт9 кадров схем/стилей; это не транскрибированный AI-source. Поиск Commons/Openverse проверяется отдельной явной командой, сетевые тесты не скрыты в npm test. Технический результат бытового MP4 — только artifacts/jobs/context-domestic-001/validation.json + final-report.json и совпадающий хеш. Подробности — CONTEXTUAL_VISUAL_LIBRARY.md.


## Завершение 0019 и цвет

`npm run test:color` — локальные численные регрессии SDR shoulder. `npm run color:review` — три пары/тройки source/002/003 с хешами job/source/grade; после любой правки цвета повторить. `npm run prepare:photos` → `npm run color:review` → `npm run preview:photos` → просмотр → `npm run render:photos`; AI_VIDEO_SOFTWARE_GL=1. Рендер и ASR последовательно на 8GB. При смене цвета baseReuseJobId не использовать: нужен новый кэш из оригинала. Проверка выдачи отвергает устаревшее сравнение цвета. Финальные кадры включают обе стороны каждой акцентной склейки.

Для восстановления после обрыва чата текущий длительный экспорт может работать отдельным скрытым процессом: PID и пути логов сохраняются в .cache/jobs/<id>/render-process.json, stdout/stderr рядом. Проверять PID вместе с CommandLine и логом, не запускать второй renderer вслепую. После завершённого захвата render-inputs.json позволяет существующий --qc-only с проверкой всех входов/хеша pending MP4. PID/прогресс не заменяют validation/final-report и просмотр финальных кадров.
