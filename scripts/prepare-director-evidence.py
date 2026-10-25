"""Local source frames for directing review. Extraction is not gesture analysis."""
import argparse
import hashlib
import json
from fractions import Fraction
from pathlib import Path
import av

parser = argparse.ArgumentParser()
parser.add_argument('--job', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
job = json.loads((root / args.job).read_text(encoding='utf-8'))
source = root / 'public/source.mp4'
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
if source_hash != job['sourceSha256']:
    raise ValueError('Director evidence: original source changed')
output = (root / args.output).resolve()
if not output.is_relative_to(root / 'artifacts/director'):
    raise ValueError('Director evidence output must stay in artifacts/director')
output.mkdir(parents=True, exist_ok=True)
targets = []
for cut in job['cuts']:
    for position, seconds in [('start', cut['start']), ('middle', (cut['start'] + cut['end']) / 2), ('end', cut['end'] - 1 / 30)]:
        targets.append({'unitId': cut['id'], 'position': position, 'requestedSourceSeconds': seconds})
targets.sort(key=lambda item: item['requestedSourceSeconds'])
frames = []
with av.open(str(source)) as container:
    stream = container.streams.video[0]
    stream.thread_type = 'NONE'
    previous = None
    index = 0
    for frame in container.decode(stream):
        seconds = float(frame.pts * stream.time_base)
        while index < len(targets) and seconds >= targets[index]['requestedSourceSeconds']:
            target = targets[index]
            chosen = previous if previous and abs(previous[0] - target['requestedSourceSeconds']) < abs(seconds - target['requestedSourceSeconds']) else (seconds, frame)
            filename = f'frame-{index:03d}.jpg'
            codec = av.CodecContext.create('mjpeg', 'w')
            codec.width, codec.height = chosen[1].width, chosen[1].height
            codec.pix_fmt = 'yuvj420p'
            codec.time_base = Fraction(1, 30)
            data = b''.join(bytes(p) for p in codec.encode(chosen[1].reformat(format='yuvj420p'))) + b''.join(bytes(p) for p in codec.encode(None))
            (output / filename).write_bytes(data)
            frames.append({**target, 'actualSourceSeconds': chosen[0], 'file': (output / filename).relative_to(root).as_posix(), 'sha256': hashlib.sha256(data).hexdigest()})
            index += 1
        if index == len(targets):
            break
        previous = (seconds, frame)
if len(frames) != len(targets):
    raise ValueError('Director evidence: source did not cover all targets')
manifest = {'version': 1, 'sourceSha256': source_hash, 'sourceFile': 'public/source.mp4', 'timeline': 'source', 'status': 'extracted-not-analyzed', 'frames': frames,
            'limitation': 'Three sampled frames per reviewed unit do not establish gesture, intonation, motion or aesthetic quality. Original video is available locally; no upload occurred.'}
(output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Director: extracted {len(frames)} actual source frames, no visual analysis or upload')
