# Рабочие сценарии

Visual Understanding0016: локальная адаптивная выборка и image preflight → отдельное разрешение → реальный Qwen image-анализ → ограниченный компилятор/person guard → прежние prepare/preview/render/QC → фактическое A/B. Run visual-001 отправлен один раз после явного разрешения,7 наблюдений сохранены; обе версии прошли фактический QC/просмотр и сравнение. docs/VISUAL_UNDERSTANDING.md. Текстовый режиссёр0013–0015 уже реализован.

Текущий job — dry-irony-tight: prepare:tight → preview:tight → render:tight, он же default render. Studio /DryIronyTight. Все40 слов,548 кадров/18.27s, лимит обычных промежутков600ms. Следующий semantic-direction этап пока только план docs/SEMANTIC_DIRECTION_PLAN.md. Далее сохранено описание предыдущего31s Story.

Основной путь: edits/<id>.json + style-presets/grammars/dry-irony.json → prepare:story → preview:story → render:story (pending → decode → source/base/output frames → waveform/ASR/peaks/loudness/steady-gain → MP4/галерея). Default render запускает Story. Данные public/generated/jobs/<id>, рабочее .cache/jobs/<id>, доказательства artifacts/jobs/<id>. Текущее задание 31s/930 кадров/40 слов, подробнее docs/REUSABLE_EDITING.md. Предыдущие prepare:v3/preview:v3/render:v3 (13.8s/22 слова) и отдельный сравнительный сценарий трёх 15s вариантов сохранены.

1. Подготовка: npm run prepare:edit проверяет исходный хеш, целые слова и отображение шкал; создаёт видеокэш с покадровым source PTS, миксы и известные зависимости. Кэш не заменяет оригинал как источник истины.
2. Предпросмотр: npm run studio → DryIronyStory, прежняя DryIronyV3 и три сохранённые Reference-композиции. Графика и оригинальный голос используют output clock; звук взят из того же проверяемого микса, что рендер. Сначала оценка контрольных кадров, затем длинный экспорт.
3. Рендер: npm run render:styles → pending в .cache/reference-edit/ → technical/visual/audio/ASR QC → готовые MP4 в out/. Незавершённый файл не выдаётся как готовый.
4. Регрессия старого ядра: npm run validate:edit; render:semantic; verify:semantic. Source/output логика и реальная речь сохраняются. Старое ASR review-required не становится человечески подтверждённой расшифровкой от нового технического прогона.
5. Пополнение библиотеки: design:add регистрирует реальный файл/источник без автоматического утверждения; design:check проверяет зависимости. Видео-референс — анализ; чужие кадры не попадают в ролик как разрешённый B-roll.
# Расширение 0017: контекстные визуалы

Сохранённая речь + brief/стиль → director request с готовыми visualAssets → treatment.visuals по word IDs → compileDirectorResponse → EditorialJob.visualPlan → проверка библиотеки/хешей и подготовка runtime assets → существующие storyboard/renderer/QC → MP4. Если элемента нет: поиск своей библиотеки → Commons/Openverse (только общие запросы, результаты не cleared) либо явная генерация → проверка происхождения/назначения → новая versioned registration. До готовности сохраняется говорящий. Каталог/стенд/usage: artifacts/visual-library/. Подробности: docs/CONTEXTUAL_VISUAL_LIBRARY.md.

