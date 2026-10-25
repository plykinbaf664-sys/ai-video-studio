"""Extract previews only from the actual hash-checked delivery, never Studio."""
import argparse,av,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--report',required=True);a=p.parse_args()
folder=Path(a.report);validation=json.loads((folder/'validation.json').read_text(encoding='utf-8'));file=Path(validation['technical']['file']);sha=hashlib.sha256(file.read_bytes()).hexdigest()
if sha!=validation['technical']['sha256']:raise RuntimeError('Delivery changed before frame extraction')
story=json.loads((folder/'storyboard.json').read_text(encoding='utf-8'));points=[s['frame'] for s in story['stills']];items=[]
selection=json.loads((folder/'selection.json').read_text(encoding='utf-8'));words=selection['outputCaptions']
# Inspect the actual editorial face cut on both sides, not just its midpoint.
for scene in selection['scenes']:
    if scene.get('presenterFraming'):
        points.extend(max(0,min(validation['technical']['frames']-1,scene['from']+delta)) for delta in (-1,0,1))
starts=[w['startMs'] for i,w in enumerate(words) if i==0 or words[i-1].get('pageBreakAfter') or words[i-1]['text'].strip().endswith(('.','!','?'))]
if starts:
    onset=round(starts[-1]*30/1000)
    if any(s['kind']=='full' and s['from']<=onset<s['until'] for s in selection['scenes']):points.extend([max(0,onset-2),min(validation['technical']['frames']-1,onset+2)])
points=sorted(set(points))
dest=folder/'final-frames';dest.mkdir(parents=True,exist_ok=True)
with av.open(str(file)) as c:
    for i,f in enumerate(c.decode(video=0)):
        if i not in points:continue
        image=f.reformat(width=360,height=640,format='rgb24');image.pts=0;target=dest/f'frame-{i}.png'
        with av.open(str(target),'w') as out:
            stream=out.add_stream('png',rate=1);stream.width=360;stream.height=640;stream.pix_fmt='rgb24'
            for packet in stream.encode(image):out.mux(packet)
            for packet in stream.encode():out.mux(packet)
        items.append({'frame':i,'file':target.as_posix(),'seconds':i/30,'mediaSha256':sha})
if len(items)!=len(points):raise RuntimeError('Missing final previews')
(folder/'final-previews.json').write_text(json.dumps(items,indent=2)+'\n',encoding='utf-8');print(f'Extracted {len(items)} frames from actual final MP4',flush=True)
