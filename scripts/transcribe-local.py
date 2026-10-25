"""Local CPU speech recognition. No media or transcript is sent to an API."""

import argparse
import importlib.metadata
import json
import os
from datetime import datetime, timezone
from pathlib import Path

os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["HF_HUB_DISABLE_XET"] = "1"

from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument("--audio", required=True)
parser.add_argument("--source-metadata", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--model", default="small")
parser.add_argument("--cache", required=True)
args = parser.parse_args()

source = json.loads(Path(args.source_metadata).read_text(encoding="utf-8"))
print(f"Loading local Whisper {args.model} on CPU/int8...", flush=True)
model = WhisperModel(
    args.model, device="cpu", compute_type="int8", cpu_threads=2,
    num_workers=1, download_root=args.cache,
)
segments, info = model.transcribe(
    args.audio, beam_size=5, word_timestamps=True,
    condition_on_previous_text=False, vad_filter=False,
)
captions = []
sentences = []
for segment in segments:
    print(f"[{segment.start:.2f} - {segment.end:.2f}] {segment.text}", flush=True)
    sentences.append({
        "startMs": round(segment.start * 1000),
        "endMs": round(segment.end * 1000),
        "text": segment.text.strip(),
        "avgLogprob": segment.avg_logprob,
        "noSpeechProbability": segment.no_speech_prob,
    })
    for word in segment.words or []:
        if not word.word.strip():
            continue
        start_ms = round(word.start * 1000)
        end_ms = max(start_ms + 1, round(word.end * 1000))
        captions.append({
            "text": " " + word.word.strip(),
            "startMs": start_ms,
            "endMs": end_ms,
            "timestampMs": round((start_ms + end_ms) / 2),
            "confidence": word.probability,
        })
if not captions:
    raise RuntimeError("No speech words found; refusing to invent a transcript.")

result = {
    "version": "0.1.0",
    "timeline": "source",
    "sourceSha256": source["sha256"],
    "sourceDurationSeconds": source["durationInSeconds"],
    "engine": "faster-whisper",
    "engineVersion": importlib.metadata.version("faster-whisper"),
    "runtimeVersion": importlib.metadata.version("ctranslate2"),
    "model": args.model,
    "device": "cpu",
    "language": info.language,
    "languageProbability": info.language_probability,
    "createdAt": datetime.now(timezone.utc).isoformat(),
    "reviewStatus": "asr-draft-unreviewed",
    "segments": sentences,
    "captions": captions,
}
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Saved {len(captions)} source-timed words to {output}", flush=True)
