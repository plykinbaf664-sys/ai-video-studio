"""Compare retained original waveform to rendered audio near both ends of each clip."""
import argparse
import json
import wave
from pathlib import Path

import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--timeline", required=True)
parser.add_argument("--report", required=True)
args = parser.parse_args()

def read_audio(file):
    with wave.open(file, "rb") as audio:
        if audio.getnchannels() != 1 or audio.getsampwidth() != 2 or audio.getframerate() != 8000:
            raise ValueError("Expected mono PCM16 / 8000 Hz.")
        return np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2").astype(np.float64)

source = read_audio(args.source)
output = read_audio(args.output)
timeline = json.loads(Path(args.timeline).read_text(encoding="utf-8"))
rate = 8000
window = 4000
radius = 800
checks = []
for clip in timeline["clips"]:
    source_start = round(clip["sourceStartFrame"] * rate / 30)
    output_start = round(clip["outputStartFrame"] * rate / 30)
    length = round(clip["durationInFrames"] * rate / 30)
    for half in range(2):
        offsets = range(max(800, half * length // 2), min(length - window - 800, (half + 1) * length // 2), 800)
        candidates = [(float(np.std(source[source_start + offset:source_start + offset + window])), offset) for offset in offsets]
        if not candidates:
            continue
        rms, offset = max(candidates)
        if rms < 10:
            checks.append({"clip": clip["id"], "half": half, "status": "too-quiet-to-compare"})
            continue
        template = source[source_start + offset:source_start + offset + window]
        template = template - np.mean(template)
        template_norm = np.linalg.norm(template)
        best = (-1.0, 0)
        for lag in range(-radius, radius + 1, 8):
            start = output_start + offset + lag
            if start < 0 or start + window > len(output):
                continue
            candidate = output[start:start + window]
            candidate = candidate - np.mean(candidate)
            denominator = template_norm * np.linalg.norm(candidate)
            correlation = float(np.dot(template, candidate) / denominator) if denominator else 0
            if correlation > best[0]:
                best = (correlation, lag)
        correlation, lag = best
        checks.append({"clip": clip["id"], "half": half, "status": "passed" if correlation >= 0.85 and abs(lag) <= rate / 30 else "failed", "correlation": round(correlation, 5), "lagMs": lag * 1000 / rate})

passed = all(check["status"] != "failed" for check in checks)
passed = passed and all(any(check["clip"] == clip["id"] and check["status"] == "passed" for check in checks) for clip in timeline["clips"])
report = {"status": "passed" if passed else "failed", "method": "PCM waveform correlation within +/-100ms; accepted lag <= one 30fps frame", "checks": checks, "limitation": "Proves audio matches retained source times; does not validate ASR wording or perceived comic timing."}
Path(args.report).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2), flush=True)
if not passed:
    raise SystemExit(1)
