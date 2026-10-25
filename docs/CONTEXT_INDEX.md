# Где искать контекст и куда регистрировать изменения

Точка входа — [AGENTS.md](../AGENTS.md). Сначала выбрать строку по задаче; весь проект перечитывать не требуется. Факты реализации проверять по коду, готовность экспорта — по MP4 и совпадающему SHA256 в отчёте.

| Задача | Основной документ | Реестр / реализация / доказательства |
| --- | --- | --- |
| Текущий проход: лицо ведущего, чистые фото | [PRESENTER_FRAMING.md](PRESENTER_FRAMING.md) | [.agent/plans/0019-presenter-and-clean-photos.md](../.agent/plans/0019-presenter-and-clean-photos.md), edits/context-domestic-003.json, scripts/prepare-presenter-accents.mjs, artifacts/jobs/context-domestic-003/ |
| Продукт, архитектура, потоки | [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md), [ARCHITECTURE.md](ARCHITECTURE.md), [SYSTEM_MAP.md](SYSTEM_MAP.md) | src/index.ts → src/Root.tsx; команды package.json |
| Правила разработчика и монтажных ролей | [AGENT_WORK_STYLE.md](AGENT_WORK_STYLE.md), [контракты ролей](../instructions/editing/README.md) | AGENTS.md управляет разработчиком; instructions/editing/ — решениями монтажных ролей |
| Слова, source/output и звук | [EDITING_CONTRACT.md](EDITING_CONTRACT.md), [REUSABLE_EDITING.md](REUSABLE_EDITING.md) | edits/, src/director/editorial-job.ts, artifacts/jobs/<id>/selection.json |
| Ассеты, фото и схемы | [CONTEXTUAL_VISUAL_LIBRARY.md](CONTEXTUAL_VISUAL_LIBRARY.md), [DOMESTIC_PHOTO_STORY.md](DOMESTIC_PHOTO_STORY.md) | assets/catalog.json — единственный каталог; artifacts/visual-library/usage/ — использование |
| Цвет и before/after | [COLOR_WORKFLOW.md](COLOR_WORKFLOW.md) | scripts/lib/editorial_grade.py, scripts/review-editorial-color.py, tests/editorial-grade.test.py, artifacts/jobs/context-domestic-003/color/ |
| Стили, брендбук, референсы | [STYLE_SYSTEM.md](STYLE_SYSTEM.md), [REFERENCE_AUDIT.md](REFERENCE_AUDIT.md) | style-presets/grammars/, style-presets/runtime/, brandbooks/catalog.json, reference-library/catalog.json |
| Qwen, разрешения и история анализа | [QWEN_SETUP.md](QWEN_SETUP.md), [VISUAL_UNDERSTANDING.md](VISUAL_UNDERSTANDING.md) | artifacts/director/, artifacts/visual/; приватный .env.qwen не копировать в документацию |
| Проверка и завершение | [VERIFICATION.md](VERIFICATION.md) | artifacts/jobs/<id>/{validation,final-report,visual-review}.json, final-frames/; out/<id>.mp4 |
| Решения и сложные изменения | [DECISIONS.md](DECISIONS.md), [.agent/PLANS.md](../.agent/PLANS.md) | Живой план в .agent/plans/; предыдущие результаты сохраняются |

При добавлении материала зарегистрировать его в соответствующем существующем каталоге, при добавлении подсистемы — обновить владельца/поток в ARCHITECTURE/SYSTEM_MAP и маршрут здесь. Новую команду внести в package.json и VERIFICATION, долговечное решение — в DECISIONS. Текущее исполнение и проверки вести в ExecPlan; не переносить весь журнал в AGENTS.md. Служебное происхождение фото остаётся в библиотеке/отчётах, без экранной надписи.

Быстрый поиск: `rg -n "presenterFraming" src scripts tests`; `rg -n "context-domestic-003|0019" docs .agent package.json`; `npm run library:find -- --domain domestic --aesthetic photographic`. `npm run context:check` проверяет зарегистрированные пути и локальные Markdown-ссылки этого индекса.
