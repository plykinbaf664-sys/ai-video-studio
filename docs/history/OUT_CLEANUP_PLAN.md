# Аудит out/ и предложение очистки

Дата: 2026-10-21T21:36:10.826Z. Статус: **ожидается подтверждение пользователя; ничего не удалено и не перемещено**.

Всего 71 файлов, 135 205 692 байт. JSON-манифест со снимком SHA-256 каждого файла: .cache/out-cleanup-manifest.json.

## Предлагается удалить только эти 19 файлов

Это временные декодированные WAV и промежуточные изображения. Их постоянных потребителей в src/, scripts/ и сохранённых диагностических скриптах не найдено. WAV создаются заново перед чтением. Все JSON, SRT, скрипты, финальные MP4 и свидетельства проведённого визуального QC сохраняются.

Объём: **23 280 447 байт (22.20 МиБ)**.

| Файл | Байт |
| --- | ---: |
| out/audio-qc/edited.wav | 480370 |
| out/audio-qc/source.wav | 860146 |
| out/first-test-qc.png | 168894 |
| out/semantic-frames/element-180.png | 1661429 |
| out/semantic-frames/element-870.png | 1884198 |
| out/semantic-preview.png | 1651746 |
| out/source-10.png | 205935 |
| out/source-31.png | 211550 |
| out/source-43.png | 217991 |
| out/source-51.png | 200184 |
| out/transcription/source-16khz.wav | 1720212 |
| out/visual-qc/previews/element-030.png | 1687727 |
| out/visual-qc/previews/element-090.png | 1691254 |
| out/visual-qc/previews/element-123.png | 1785125 |
| out/visual-qc/previews/element-300.png | 1711326 |
| out/visual-qc/previews/element-450.png | 1796671 |
| out/visual-qc/previews/element-600.png | 1608950 |
| out/visual-qc/previews/element-810.png | 1846279 |
| out/visual-qc/previews/element-873.png | 1890460 |

## Перенести с сохранением содержимого

Эти 50 файлов не удалять. Относительные ссылки в HTML, диагностических скриптах и документации обновить вместе с переносом. Старый полный MP4 сохранить как отдельное готовое видео в out/.

| Откуда | Куда |
| --- | --- |
| out/audio-qc/sync.json | artifacts/reports/audio-sync.json |
| out/audio-qc/timeline.json | artifacts/editing/audio-qc-timeline.json |
| out/basic-captions-reference.md | docs/references/remotion-basic-captions.md |
| out/caption-exports/dialogue-output.srt | artifacts/caption-exports/dialogue-output.srt |
| out/caption-exports/legacy/1792617447835-legacy-1792617124071-legacy-semantic-cut.srt | artifacts/caption-exports/legacy/1792617447835-legacy-1792617124071-legacy-semantic-cut.srt |
| out/caption-exports/legacy/1792617447836-legacy-semantic-cut.output.srt | artifacts/caption-exports/legacy/1792617447836-legacy-semantic-cut.output.srt |
| out/check-semantic-studio.mjs | scripts/diagnostics/legacy/check-semantic-studio.mjs |
| out/check-studio.mjs | scripts/diagnostics/legacy/check-studio.mjs |
| out/create-edit-plan.mjs | scripts/diagnostics/legacy/create-edit-plan.mjs |
| out/edit-plan.validation.json | artifacts/reports/edit-plan.validation.json |
| out/extract-visual-before.mjs | scripts/diagnostics/legacy/extract-visual-before.mjs |
| out/first-test.verification.json | artifacts/reports/first-test.verification.json |
| out/repair-caption-data.mjs | scripts/diagnostics/legacy/repair-caption-data.mjs |
| out/semantic-cut.verification.json | artifacts/reports/semantic-cut.verification.json |
| out/semantic-edit-decisions.json | artifacts/editing/semantic-edit-decisions.json |
| out/semantic-output-captions.json | artifacts/caption-exports/dialogue-output.json |
| out/semantic-studio.json | artifacts/diagnostics/semantic-studio.json |
| out/semantic-studio.png | artifacts/diagnostics/semantic-studio.png |
| out/source-metadata.json | artifacts/reports/source-metadata.json |
| out/studio-check.json | artifacts/diagnostics/studio-check.json |
| out/studio-check.png | artifacts/diagnostics/studio-check.png |
| out/transcription/source-metadata.json | artifacts/reports/transcription-source-metadata.json |
| out/visual-qc/after-030.png | artifacts/visual-qc/after-030.png |
| out/visual-qc/after-090.png | artifacts/visual-qc/after-090.png |
| out/visual-qc/after-123.png | artifacts/visual-qc/after-123.png |
| out/visual-qc/after-300.png | artifacts/visual-qc/after-300.png |
| out/visual-qc/after-450.png | artifacts/visual-qc/after-450.png |
| out/visual-qc/after-600.png | artifacts/visual-qc/after-600.png |
| out/visual-qc/after-810.png | artifacts/visual-qc/after-810.png |
| out/visual-qc/after-873.png | artifacts/visual-qc/after-873.png |
| out/visual-qc/before-1.png | artifacts/visual-qc/before-1.png |
| out/visual-qc/before-20.png | artifacts/visual-qc/before-20.png |
| out/visual-qc/before-27.png | artifacts/visual-qc/before-27.png |
| out/visual-qc/before-6.png | artifacts/visual-qc/before-6.png |
| out/visual-qc/before.verification.json | artifacts/visual-qc/before.verification.json |
| out/visual-qc/capture-final.mjs | scripts/diagnostics/legacy/capture-final.mjs |
| out/visual-qc/check-studio-after.mjs | scripts/diagnostics/legacy/check-studio-after.mjs |
| out/visual-qc/edit-plan-before.json | artifacts/visual-qc/edit-plan-before.json |
| out/visual-qc/final-frames.png | artifacts/visual-qc/final-frames.png |
| out/visual-qc/frames-review.html | artifacts/visual-qc/frames-review.html |
| out/visual-qc/player-review.html | artifacts/visual-qc/player-review.html |
| out/visual-qc/semantic-cut-before.mp4 | out/semantic-cut-before.mp4 |
| out/visual-qc/source-1.png | artifacts/visual-qc/source-1.png |
| out/visual-qc/source-20.png | artifacts/visual-qc/source-20.png |
| out/visual-qc/source-27.png | artifacts/visual-qc/source-27.png |
| out/visual-qc/source-6.png | artifacts/visual-qc/source-6.png |
| out/visual-qc/studio-after.json | artifacts/visual-qc/studio-after.json |
| out/visual-qc/studio-after.png | artifacts/visual-qc/studio-after.png |
| out/visual-qc/transcript-before.json | artifacts/visual-qc/transcript-before.json |
| out/visual-qc/visual-report.json | artifacts/visual-qc/visual-report.json |

## Оставить на месте

- out/first-test.mp4 (40042884 байт)
- out/semantic-cut.mp4 (30396484 байт)

Исходник public/source.mp4, действующие public/generated/edit-plan.json и transcript.json, src/, assets/, style-presets/, конфигурации и исходные скрипты проекта не являются кандидатами на удаление. brandbooks/ и reference-library/ пока отсутствуют.

## Проверенные зависимости и обязательные изменения

- src/director/load-edit.ts и scripts/lib/edit-plan.mjs читают public/generated/{edit-plan,transcript}.json и исходник; временные изображения/WAV из out/ им не нужны.
- scripts/lib/media.mjs: writeReport сейчас сохраняет JSON в out/. Перенаправить в artifacts/reports/.
- scripts/verify-semantic-cut.mjs читает предыдущий semantic-cut.verification.json для сохранения визуальных свидетельств. Перенести этот вход вместе с изменением пути чтения.
- scripts/lib/audio-sync.mjs создаёт WAV/timeline/sync при каждом запуске; WAV не являются исходниками. WAV и временный timeline направить в отдельную рабочую папку; итоговый QC сохранять в artifacts/reports/.
- scripts/transcribe-source.mjs: источником повторного запуска является public/generated/transcript.json с проверкой SHA-256; source-16khz.wav — регенерируемый промежуточный файл.
- scripts/validate-edit-plan.mjs и scripts/lib/design-assets.mjs создают subtitle exports в out/. Перенаправить в artifacts/caption-exports/, отдельно от готовых MP4.
- 7 скриптов сейчас находятся внутри out/. Их сохранить в scripts/diagnostics/legacy/, обновить пути. Два скрипта изменяют монтажный план/транскрипт для конкретного исходника: не запускать их при очистке.
- docs/STAGE1_STATUS.md и STAGE2_STATUS.md ссылаются на старые Studio PNG. Эти файлы сохраняются; ссылки обновить. Все visual-qc доказательства, планы, транскрипты и отчёты, кроме промежуточных previews/, также сохраняются.

## Автоматическая уборка после подтверждения

1. out/ хранит только проверенные готовые MP4; pending MP4 создаются в .cache/jobs/ с уникальным каталогом задания.
2. Временные WAV/превью создаются в каталоге своего задания, очищаются при завершении; итоговые отчёты сохраняются вне out/.
3. Очиститель ограничен созданными системой временными каталогами, проверяет абсолютный путь и отказывается от ссылок/junction. Никакого удаления по расширению из всего проекта или удаления готовых видео.
4. Для старого содержимого применить только данный манифест после подтверждения: проверить SHA-256 до действий, отказываться при изменении файлов/коллизии назначения. Неизвестные файлы требуют отдельного разбора.
5. После переноса: npm test, npm run lint, validate:edit, verify:output и verify:semantic, проверка Studio/композиций, контроль сохранности исходника и монтажных данных, проверка что out/ содержит только готовые MP4.

## Проверки до очистки

npm test: 10/10 passed. npm run lint: passed. Исходник и действующий монтажный план прочитаны, SHA-256 совпадает, план: 900 кадров, 40 слов. Три MP4 проверяются через ffprobe отдельно; это не новая полная проверка декодирования. Проверки после очистки ещё не проводились: очистка ожидает подтверждения.
