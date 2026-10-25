"""Extract previews from actual checked final MP4s, never from a replacement composition."""
import av, json, hashlib
from pathlib import Path
import numpy as np

slugs=['editorial-focus','signal-dynamic','dry-irony']
points=[30,195,285,397]
folder=Path('artifacts/reference-edit/previews');folder.mkdir(parents=True,exist_ok=True)
items=[];pixels={}
for slug in slugs:
    file=Path(f'out/reference-{slug}.mp4')
    sha=hashlib.sha256(file.read_bytes()).hexdigest()
    report=json.loads(Path(f'artifacts/reference-edit/{slug}.validation.json').read_text(encoding='utf-8'))
    if report['technical']['sha256']!=sha: raise RuntimeError('Final report hash mismatch')
    stills=[]
    with av.open(str(file)) as c:
        for i,frame in enumerate(c.decode(video=0)):
            if i not in points: continue
            image=frame.reformat(width=360,height=640,format='rgb24')
            target=folder/f'final-{slug}-{i}.png'
            stream=av.open(str(target),'w');s=stream.add_stream('png',rate=1);s.width=360;s.height=640;s.pix_fmt='rgb24'
            image.pts=0
            for packet in s.encode(image):stream.mux(packet)
            for packet in s.encode():stream.mux(packet)
            stream.close()
            pixels[(slug,i)]=image.to_ndarray()
            stills.append({'frame':i,'seconds':i/30,'file':target.as_posix()})
    if len(stills)!=len(points):raise RuntimeError('Missing preview frame')
    items.append({'slug':slug,'file':file.as_posix(),'sha256':sha,'stills':stills})
differences=[]
for j,a in enumerate(slugs):
    for b in slugs[j+1:]:
        values=[float(np.abs(pixels[(a,f)].astype(float)-pixels[(b,f)].astype(float)).mean()/255) for f in points]
        differences.append({'a':a,'b':b,'frames':points,'normalizedRgbMeanAbsoluteDifference':values,'note':'Different composition evidence, not an artistic quality score.'})
Path('artifacts/reference-edit/final-previews.json').write_text(json.dumps({'items':items,'differences':differences},indent=2)+'\n',encoding='utf-8')
print(json.dumps({'actualFinalStills':sum(len(x['stills']) for x in items),'differences':differences}))
