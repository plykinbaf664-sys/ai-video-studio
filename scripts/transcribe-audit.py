"""Independent local ASR of actual media audio; never accepts an expected-text prompt."""
import argparse
import hashlib
import importlib.metadata
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_XET"] = "1"

from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio
import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument("--manifest", required=True)
parser.add_argument("--cache", required=True)
args = parser.parse_args()
jobs = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
model = WhisperModel("small", device="cpu", compute_type="int8", cpu_threads=2,
                     num_workers=1, download_root=args.cache, local_files_only=True)
for job in jobs:
    digest = hashlib.sha256()
    with Path(job["media"]).open("rb") as media:
        for chunk in iter(lambda: media.read(1024 * 1024), b""):
            digest.update(chunk)
    media_hash = digest.hexdigest()
    destination = Path(job["output"])
    options = {"version": 3, "model": "small", "language": "ru", "beamSize": 5, "temperature": 0,
               "minimumAnalysisTailMs": 1000,
               "wordTimestamps": True, "conditionOnPreviousText": False, "vad": False, "prompt": None}
    if destination.exists():
        previous = json.loads(destination.read_text(encoding="utf-8"))
        if previous.get("mediaSha256") == media_hash and (previous.get("decodeOptions") == options or
            ((job.get("reuseExisting") or job["timeline"] == "source") and previous.get("engine") == "faster-whisper" and
             previous.get("model") == "small" and previous.get("decodeOptions", {}).get("prompt") is None and previous.get("words"))):
            print(f"Reusing hash-bound ASR: {destination}", flush=True)
            continue
    print(f"Recognizing {job['timeline']}: {job['audio']}", flush=True)
    audio = decode_audio(job["audio"], sampling_rate=16000)
    real_duration_ms = len(audio) * 1000 / 16000
    remainder = len(audio) % (30 * 16000)
    padding_samples = max(0, 16000 - remainder)
    # CTranslate2 4.4 on this CPU crashes with integer divide-by-zero on the
    # 16ms residual after the first 30s window. Pad analysis only, never media.
    if padding_samples:
        audio = np.pad(audio, (0, padding_samples))
    segments, info = model.transcribe(audio, language="ru", beam_size=5,
                                      word_timestamps=True, condition_on_previous_text=False,
                                      vad_filter=False, temperature=0)
    words, phrases, padding_words = [], [], []
    for segment in segments:
        print(f"[{segment.start:.2f}-{segment.end:.2f}] {segment.text}", flush=True)
        phrases.append({"startMs": round(segment.start * 1000), "endMs": round(segment.end * 1000),
                        "text": segment.text.strip(), "noSpeechProbability": segment.no_speech_prob,
                        "avgLogprob": segment.avg_logprob})
        for word in segment.words or []:
            if word.word.strip():
                item = {"text": word.word.strip(), "startMs": round(word.start * 1000),
                        "endMs": round(word.end * 1000), "confidence": word.probability}
                if item["startMs"] >= real_duration_ms:
                    padding_words.append(item)
                else:
                    words.append(item)
    result = {"timeline": job["timeline"], "media": job["media"], "mediaSha256": media_hash,
              "createdAt": datetime.now(timezone.utc).isoformat(), "engine": "faster-whisper",
              "engineVersion": importlib.metadata.version("faster-whisper"), "model": "small",
              "language": info.language, "decodeOptions": options, "prompt": None, "segments": phrases, "words": words,
              "complete": True, "actualAudioDurationMs": real_duration_ms,
              "analysisOnlyPaddingMs": padding_samples * 1000 / 16000, "paddingRecognitions": padding_words,
              "limitations": "Independent decode, same ASR model family; text and word times can be wrong."}
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(words)} words: {destination}", flush=True)
