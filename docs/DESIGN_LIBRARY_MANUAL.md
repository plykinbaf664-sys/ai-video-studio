# Библиотека: текущее состояние и пополнение

Материалы уже предоставлены: 15 скриншотов, 3 видео, 4 MP3, 4 исходных SFX, SVG и Onest/Inter с OFL. Не просить заново отсутствующий «пакет», когда файлы есть на диске. Канонические каталоги: assets/catalog.json, brandbooks/catalog.json, reference-library/catalog.json. Реестры из первоначального Design Kit — история.

Файлы: brandbooks/media/ — брендбук; reference-library/media/video/ и screenshots/ — анализ; assets/library/music/ — реальные mixkit-*.mp3, fonts/ — шрифты, sfx/ — оригинальные звуки. Перед копированием в public/generated/ проверить файл/хеш/происхождение. Создание записи не означает художественного утверждения.

Добавление: npm run design:add -- reference --id example --title Example --file reference-library/media/video/example.mp4 --start 2 --end 5 --axis graphics --technique "Конкретный приём". Это образец синтаксиса для нового существующего файла, не реальный зарегистрированный example. Точные флаги — scripts/lib/register-design-item.mjs. После импорта: npm run design:check.

Видео-референсы используются для структуры, не как автоматически разрешённый B-roll. Музыка выбирается конкретным asset ID из сценического пресета; для неё есть исходный отрезок, уровни и ducking, измерения в artifacts/reference-audit/audio-mixes.json. Происхождение и нынешние Mixkit-условия: assets/library/music/licenses/PROVENANCE.md. Официальный CDN вернул 403; совпадение байтов с ним не утверждается.

Для следующих профессиональных компонентов предпочтителен небольшой согласованный набор — сравнение, процесс/связи, цитата, доказательство — с типографикой и смысловыми условиями применения. Оригинальные SVG-символы в src/design/stages/Symbols.tsx уже используются. Неподтверждённые иконки и случайные изображения не импортируются ради заполнения сцены.
