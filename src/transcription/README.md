# Локальная транскрибация

Адаптер: scripts/transcribe-source.mjs + scripts/transcribe-local.py. faster-whisper 1.2.1 / CTranslate2 4.4.0, CPU/int8, модель small; установка в requirements-transcription.txt.

Выход: public/generated/transcript.json. Таймкоды всегда source, формат Caption из @remotion/captions, сохраняются confidence и asr-draft-unreviewed. Файлы приватные, в Git не входят; видео/голос внешнему API не передаются.
