# Visual Understanding — локальная подготовка и отдельное разрешение

Актуально 25.10.2026. ExecPlan0016 технически выполнен. После отдельного согласования37 кадров и оценки цены пользователь ответил «да давай делать». Ровно один настоящий image-запрос Qwen выполнен:7 наблюдений,21982 input/4476 output tokens. Обе версии созданы, прошли фактический QC; по10 кадров именно из каждого MP4 просмотрены. comparison.json/COMPARISON.md/comparison.html подтверждают одинаковые PCM/кэш/нарезку/слова/стиль. Художественный статус candidate, ASR review-required. При повторной выдаче проверять final-report.json и текущие SHA.

A: out/visual-001-a.mp4,11,307,048 байт, SHA25685f6f1586a54e8223868da426856504033ec82334567aa3b4558d32979c938fc.1080×1920/30,548 кадров/18.266667s,40 слов,74 аудиоблока,0ms максимальный лаг слова;10 кадров именно из MP4 просмотрены. ASR review-required сохранён. Исходник и прежние два MP4 не изменялись.

B: out/visual-001-b.mp4,10,490,508 байт, SHA2567d5b5adb8a538efe2cfc8cf09472a7fb8ce235e666a60626e73315f4cf911240. Те же параметры/слова/нарезка/цвет/PCM. Min visible correlation A0.997306/B0.997510, word0.999941; музыка steady, вариация0.000258dB, запас голоса14dB. Оба−11.36LUFS/−0.33dBTP, sample clipping0. Числа не являются художественной оценкой.

Изменения B: output0–3.47s и10.73–12.93s окно952→743px по ширине;3.47–10.73s окно952→655px. Source top224px, больше тела/рук/планшета в нижней области, лицо меньше. Кадр/графика/текст на12.93–18.27s остаются как в A. Это следствие реального object/person наблюдения плюс явная консервативная postcondition, а не произвольное увеличение числа эффектов. Наблюдения/причины отказа от добавлений по всем7 units находятся в comparison.json и исходном analysis.json.

Raw image-response: artifacts/visual/visual-001/response.txt; неизменённый структурированный анализ analysis.json; approval/transport/receipt.json сохраняют разрешение, usage и hash. По [тарифу Singapore](https://www.alibabacloud.com/help/en/model-studio/qwen3-8-flash) $0.15/$0.47 за миллион input/output: расчёт по usage $0.00540102; это оценка list price, не сверенный счёт. Повторного API-вызова не было.

Первый реальный ответ повторил одинаковые приблизительные боксы во всех7 units, а планшет виден ниже его рамки на реальных кадрах. Поэтому после исходного неизменённого visual-job-compiler добавлена явная локальная postcondition `scripts/lib/visual-person-guard.mjs`: если важный предмет и person наблюдены с достаточной confidence, сохранять также модельную область person. Это данные уже полученного ответа, без выдуманного трекинга/переписывания analysis.json/нового запроса. Отдельный compiler hash и originalCompilerChanges сохраняются в visual-direction.json. Первоначальный план/направление B сохранены как initial-compiler-*.json. Нельзя выдавать этот ограниченный контур за высокоточный автоматический анализ жестов и эмоций.

## Технический аудит

- Приватный .env.qwen задаёт модель `qwen3.8-flash`, регион `ap-southeast-1` (Singapore), региональный workspace endpoint Alibaba Cloud Model Studio. Ключ не печатается. Настройки не заменены другой моделью/аккаунтом.
- [Официальная карточка Qwen3.8-Flash](https://help.aliyun.com/en/model-studio/qwen3-8-flash) указывает вход Text/Image/Video и текстовый структурированный выход, включая Singapore. Проверено 25.10.2026; поддержка в документации не доказывает фактическую доступность image-вызова в аккаунте.
- [Chat Completions API](https://help.aliyun.com/en/model-studio/qwen-api-via-openai-chat-completions) принимает массив блоков `text`/`image_url`, в том числе JPEG Data URL. Для этого этапа выбрана явная последовательность изображений с индивидуальными source timestamps; raw video и его аудиодорожка не передаются.
- Прежний scripts/lib/qwen-provider.mjs намеренно формировал только текст. Его транспорт переиспользован: HTTPS/регион, exact payload hash, один запрос, redirect manual, ограничение тела/ответа/токенов, timeout до конца тела, без retry. Новая подготовка отделена в scripts/lib/visual-understanding.mjs; исходный текстовый workflow сохранён.
- Источник речи: сохранённая локальная расшифровка и уточнения из EditorialJob. `compileEditorialJob` → прежние `compileTimeline`/`sourceWordToOutput`/`auditCaptionTimeline`. Source ms не становятся output ms: каждому retained unit соответствуют sourceStart/end и outputStartFrame/duration, каждому слову — исходный id и преобразованный диапазон. Скорость 1, fps30.
- Переиспользованы исходник, 40 слов/548 кадров выбранного Qwen-assisted/editor-reviewed job, source-specific цвет, постоянный музыкальный gain, видеокэш с source PTS, Remotion, геометрические guards, waveform/ASR/frame/level QC. Само наличие работоспособного парсера не является доказательством качества AI.

## Поток и контракты

`sample-visual-source.py` → `artifacts/visual/<run>/frames.json` + JPEG → `visual-director.mjs preflight` → **отдельное разрешение** → `analyze` → schema/semantic validation → `prepare-visual-ab.mjs --mode b` → прежние prepare/preview/render/QC → `compare-visual-ab.mjs`.

Выборка локальная: 1fps по всему источнику; измерительные probes около5fps; дополнительные точки ±160ms возле выбранных границ и ±120ms возле наиболее заметных pixel/histogram/luma изменений. Записываются actual PTS, time base, requested timestamp, SHA256/размер JPEG и причины отбора. Pixel difference не называется распознаванием жеста, лица или эмоции. В `visual-001` локально102 кадра, в запрос включены только37 кадров, относящихся к семи сохранённым речевым фрагментам. Короткие события между кадрами могут быть пропущены. Выборка не переносит ASR-границы в canonical transcript.

Контракт contracts/visual-analysis.schema.json требует наблюдение для каждого retained unit, минимум два кадра именно из этого unit, confidence и отдельные видимые face/person/importantObjects/freeAreas. Движение, выражение и освещение описываются как наблюдения с неопределённостью; психологические выводы не требуются. Решение содержит `whatHappens`, реальные `thoughtWordIds`, один поддержанный presentation, причину и `whyNoMore`, а также разные примечания для трёх стилей. Неизвестная геометрия допускает null/низкую confidence, а не выдуманные координаты.

Проверка блокирует чужие/удалённые кадры, выдуманные слова, неполное покрытие, боксы за исходником и объявленные свободные области поверх наблюдённых лиц/жестов/предметов. Контекст связан с исходником, job, transcript, выбранным preset, правилами, схемой, брендбуком и компилятором. Смена любого из них меняет payload hash и требует нового согласования. После зарезервированной попытки preflight не перезаписывает исторический запрос. Raw ответ/transport/failure сохраняются, автоматического исправляющего платного запроса нет.

## Стили и границы компилятора

Политики трёх стилей — style-presets/policies/visual-understanding.json. Исполняемые грамматики — style-presets/grammars/{editorial-focus,signal-dynamic,dry-irony}.json. Для данного A/B выбран **Signal Dynamic в обеих версиях**. Изменение стиля между A и B нарушило бы сравнение.

| Стиль | Допустимое направление |
| --- | --- |
| Editorial Focus | Спокойный полный портрет, одна текущая типографическая подпись, без карточек |
| Signal Dynamic | Последовательные состояния инфографики сверху, защищённый ведущий снизу; референс IMG_3322:14.3–19.3 и26.3–31.2 |
| Dry Irony | Сохранённые сцены, выразительность лица и финальная реплика, сдержанные повторы уже услышанного |

Новый conservative compiler не принимает произвольный код, новые цитаты, зумы или эффекты. При confidence>=0.65 он объединяет доверенную ручную область лица с наблюдёнными лицом/важными предметами; окно может уменьшить масштаб изображения для сохранения полного жеста. `avoid-graphics` убирает карточки на покрывающей сцене и сохраняет оригинал. Низкая confidence оставляет прежние правила. Позиции пересчитываются из нормализованного source в output; боксы не подставляются в выходные координаты напрямую. Source размеры берутся из job.

Выбор по sparse images пока на уровне речевого unit и объединения прямоугольников, без непрерывного трекинга. Person/freeAreas/описания освещения и выражения сохраняются как evidence; автоматическая цветокоррекция и реконструкция эмоций не включены. Для всех трёх политик есть локальная регрессия сохранения речи/нарезки/музыки; это не три новых художественно утверждённых MP4.

На каждом кадре проверяются protected face/gesture/object, safe area, максимум две строки, отсутствие перекрытий/дублирования текста. Каждый quote-reprise ждёт соответствующих реальных слов и subtitle tail и остаётся минимум24 кадра. Голос скрытого видеослоя и его clock не отключаются.

## Повторяемые команды

```powershell
.venv-transcribe/Scripts/python.exe scripts/sample-visual-source.py --run visual-002 --job qwen-cut-001-thematic-grouping --style signal-dynamic
node scripts/visual-report.mjs --run visual-002
node scripts/prepare-visual-ab.mjs --run visual-002 --mode a
node scripts/prepare-editorial-job.mjs --job visual-002-a
node scripts/preview-editorial-job.mjs --job visual-002-a
node scripts/render-editorial-job.mjs --job visual-002-a
```

`visual-report` создаёт просматриваемую галерею и полный локальный payload, без сети. После отдельного согласования состава и текущего hash: `node scripts/visual-director.mjs analyze --run <run> --approve-image-payload <exact hash>`. Наличие этого CLI не разрешает Codex самостоятельно выдавать согласие пользователя.

После настоящего ответа: `prepare-visual-ab --mode b`, прежние prepare/preview/render для `<run>-b`, просмотр кадров именно из MP4 и hash-bound visual-review.json, затем `node scripts/compare-visual-ab.mjs --run <run>`. Компаратор требует одинаковые нарезку, слова, стиль, исходник, цвет, PCM-микс/кэш и свежие QC/vision evidence. Нулевое число изменений допустимо; демонстрационные отличия не придумываются. Синтетические fixtures используются только в тестах, никогда как production analysis.json.

## Состояние завершения

Разрешение, единственный image-вызов, обе раскадровки, финальные MP4/QC/20 просмотренных кадров и сравнение выполнены.73 теста,lint,design:check,context:check,audit:out passed. ASR-вопросы «женщине/женщины» и граница «тоже» требуют слухового просмотра; review-required не переименован в одобрение. Перенос на другой исходник и качественный трекинг не доказаны.

Просмотр без публикации: `node scripts/serve-visual-review.mjs visual-001 3105` → http://127.0.0.1:3105/artifacts/visual/visual-001/comparison.html. Сервер read-only, только loopback и allowlist данного run/его двух MP4; byte-range проверен206/32 байта, посторонний package.json404. Кнопки общего воспроизведения и перехода по сценам созданы; прямое Chrome-управление оборвалось, поэтому фактическая интерактивность страницы не объявляется проверенной до повторного UI-просмотра. MP4 и их кадры проверены независимо от браузерной страницы.

Отдельные локальные ограничения: автоматизация пользовательского Chrome была заблокирована UI другого расширения; это не связано с API Qwen. Повторный headless preview затем зависал на загрузке root; последовательный запуск с `AI_VIDEO_SOFTWARE_GL=1` прошёл. B использует тот же системный Chrome с программным GL; A выполнена с настройкой GL по умолчанию. Source/цвет/пресет/PCM одинаковые, но идентичность backend GL между A/B не заявляется. На машине8GB сервер Studio, запущенный в этом проходе, временно остановлен для рендера; пользовательские приложения не останавливались. Бесполезный параллельный helper переименования storyboard остановлен с сохранением кадров; рабочие и старые MP4 не удалялись.

Шесть поправок первого текстового Qwen отдельно классифицированы в docs/QWEN_AMENDMENT_AUDIT.md.
