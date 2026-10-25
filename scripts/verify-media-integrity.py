"""Compare actual final audio and every video frame with the planned source times."""
import argparse
import io
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

parser = argparse.ArgumentParser()
for option in ("source", "output", "map", "ffmpeg", "report"):
    parser.add_argument("--" + option, required=True)
args = parser.parse_args()
mapping = json.loads(Path(args.map).read_text(encoding="utf-8"))
fps = mapping["timeline"]["fps"]
rate = 8000

def decode(file, video=False):
    if video:
        options = ["-map", "0:v:0", "-an", "-vsync", "0", "-vf",
                   "crop=iw:ih*0.65:0:ih*0.35,scale=48:64,format=gray",
                   "-c:v", "rawvideo", "-pix_fmt", "gray", "-f", "image2pipe", "-"]
    else:
        options = ["-map", "0:a:0", "-vn", "-ac", "1", "-ar", str(rate),
                   "-c:a", "pcm_s16le", "-f", "wav", "-"]
    data = subprocess.check_output([args.ffmpeg, "-v", "error", "-i", file] + options)
    if video:
        return np.frombuffer(data, dtype="u1").reshape(-1, 64 * 48)
    with wave.open(io.BytesIO(data), "rb") as audio:
        return np.frombuffer(audio.readframes(audio.getnframes()), dtype="<i2").astype(np.float64)

def timestamps(file):
    probe = str(Path(args.ffmpeg).with_name("ffprobe.exe" if Path(args.ffmpeg).suffix == ".exe" else "ffprobe"))
    data = json.loads(subprocess.check_output([probe, "-v", "error", "-select_streams", "v:0",
                      "-show_frames", "-show_entries", "frame=best_effort_timestamp_time", "-of", "json", file]))
    return np.array([float(frame["best_effort_timestamp_time"]) for frame in data["frames"]])

original = decode(args.source)
edited = decode(args.output)
continuous_audio = []
for clip in mapping["timeline"]["clips"]:
    source_begin = round(clip["sourceStartFrame"] * rate / fps)
    output_begin = round(clip["outputStartFrame"] * rate / fps)
    samples = round(clip["durationInFrames"] * rate / fps)
    for offset in range(0, samples, rate // 4):
        length = min(rate // 4, samples - offset)
        reference = original[source_begin + offset:source_begin + offset + length]
        actual = edited[output_begin + offset:output_begin + offset + length]
        if len(actual) != len(reference):
            raise RuntimeError("Missing audio samples in a retained clip")
        ref_centered = reference - reference.mean()
        actual_centered = actual - actual.mean()
        denominator = np.linalg.norm(ref_centered) * np.linalg.norm(actual_centered)
        correlation = float(np.dot(ref_centered, actual_centered) / denominator) if denominator else 1.0
        rms_error = float(np.sqrt(np.mean((reference - actual) ** 2)))
        quiet = float(np.std(reference)) < 10
        continuous_audio.append({"clipId": clip["id"], "outputStartMs": (output_begin + offset) * 1000 / rate,
                                 "lengthMs": length * 1000 / rate, "correlation": round(correlation, 6), "rmsError": round(rms_error, 4),
                                 "status": "passed" if (rms_error <= 20 if quiet else correlation >= 0.85) else "failed"})
audio_checks = []
for word in mapping["provenance"]:
    clip = next(clip for clip in mapping["timeline"]["clips"] if clip["id"] == word["clipId"])
    source_start = round(word["sourceStartMs"] * rate / 1000)
    output_start = round(word["startMs"] * rate / 1000)
    length = max(round((word["sourceEndMs"] - word["sourceStartMs"]) * rate / 1000), 640)
    length = min(length, round(clip["sourceEndFrame"] * rate / fps) - source_start)
    template = original[source_start:source_start + length]
    template = template - template.mean()
    norm = np.linalg.norm(template)
    check = {"clipId": clip["id"], "text": word["text"].strip(), "sourceStartMs": word["sourceStartMs"],
             "outputStartMs": word["startMs"], "lengthMs": length * 1000 / rate}
    if len(template) < 320 or np.std(template) < 10:
        check["status"] = "review-required-quiet"
    else:
        best_correlation, best_lag = -1, 0
        for lag in range(-800, 801, 8):
            start = output_start + lag
            if start < 0 or start + length > len(edited):
                continue
            candidate = edited[start:start + length]
            candidate = candidate - candidate.mean()
            denominator = norm * np.linalg.norm(candidate)
            correlation = float(np.dot(template, candidate) / denominator) if denominator else 0
            if correlation > best_correlation:
                best_correlation, best_lag = correlation, lag
        check.update({"status": "passed" if best_correlation >= 0.85 and abs(best_lag) <= rate / fps else "failed",
                      "correlation": round(best_correlation, 6), "lagMs": best_lag * 1000 / rate})
    audio_checks.append(check)

source_video, output_video = decode(args.source, True), decode(args.output, True)
source_times, output_times = timestamps(args.source), timestamps(args.output)
if len(source_times) != len(source_video) or len(output_times) != len(output_video):
    raise RuntimeError("Decoded frame count differs from actual frame timestamps")
video_checks = []
for clip in mapping["timeline"]["clips"]:
    for local in range(clip["durationInFrames"]):
        frame = clip["outputStartFrame"] + local
        if frame >= len(output_video):
            raise RuntimeError("Final video is missing planned frames")
        wanted = (clip["sourceStartFrame"] + local) / fps
        candidates = np.where(np.abs(source_times - wanted) <= 1 / fps + 0.001)[0]
        if not len(candidates):
            raise RuntimeError("No source frame near planned time")
        differences = np.abs(source_video[candidates].astype(np.float32) - output_video[frame].astype(np.float32)).mean(axis=1)
        best = int(np.argmin(differences))
        error = float(differences[best])
        video_checks.append({"clipId": clip["id"], "outputFrame": frame,
                             "expectedSourceSeconds": wanted, "matchedSourceSeconds": float(source_times[candidates[best]]),
                             "meanAbsolutePixelError": round(error, 4), "status": "passed" if error <= 5 else "failed"})
audio_failed = any(item["status"] == "failed" for item in audio_checks + continuous_audio)
video_failed = any(item["status"] == "failed" for item in video_checks)
if len(output_video) != mapping["timeline"]["durationInFrames"]:
    video_failed = True
report = {"status": "failed" if audio_failed or video_failed else "passed",
          "method": {"audio": "Every retained word PCM correlation +/-100ms in 1ms steps; minimum 0.85; lag <= one output frame",
                     "video": "Every decoded output frame compared to actual source PTS within one output frame; lower 65% excludes text overlay; 48x64 gray MAE <= 5"},
          "audioWords": audio_checks, "continuousAudio": continuous_audio, "videoFrames": video_checks,
          "summary": {"audioWordsCompared": len(audio_checks), "quietWordsForReview": sum(item["status"] == "review-required-quiet" for item in audio_checks),
                      "continuousAudioBlocks": len(continuous_audio), "continuousAudioMinimumCorrelation": min(item["correlation"] for item in continuous_audio),
                      "videoFramesCompared": len(video_checks), "maximumVideoPixelError": max(item["meanAbsolutePixelError"] for item in video_checks),
                      "maximumAudioLagMs": max((abs(item.get("lagMs", 0)) for item in audio_checks), default=0)},
          "limitations": ["Does not judge articulation already missing at source time zero", "Image comparison confirms source time, not human lip reading", "Word mapping depends on ASR timing estimates"]}
Path(args.report).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": report["status"], **report["summary"]}), flush=True)
if report["status"] == "failed":
    raise SystemExit(1)
