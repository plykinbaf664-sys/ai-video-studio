import av,json,hashlib,math
from pathlib import Path
import numpy as np
root=Path.cwd();out=root/'artifacts/reference-audit';out.mkdir(parents=True,exist_ok=True)
items=[]
def save_image(frame,dest):
    with av.open(str(dest),'w',format='image2') as c:
        stream=c.add_stream('png',rate=1);stream.width=240;stream.height=426;stream.pix_fmt='rgb24'
        for packet in stream.encode(frame.reformat(width=240,height=426,format='rgb24')):c.mux(packet)
        for packet in stream.encode():c.mux(packet)
for file in sorted((root/'reference-library/media/video').glob('*.MP4')):
    folder=out/file.stem;folder.mkdir(exist_ok=True);digest=hashlib.sha256(file.read_bytes()).hexdigest()
    samples=[];changes=[];previous=None;next_sample=0.;next_motion=0.
    with av.open(str(file)) as media:
        duration=media.duration/1000000;v=media.streams.video[0];video={'width':v.width,'height':v.height,'fps':str(v.average_rate),'duration':duration}
        for frame in media.decode(video=0):
            t=float(frame.pts*frame.time_base)
            if t>=next_motion:
                small=frame.reformat(width=48,height=84,format='gray').to_ndarray().astype(float)
                if previous is not None: changes.append({'time':round(t,3),'difference':round(float(np.abs(small-previous).mean()),3)})
                previous=small;next_motion=t+.24
            if t>=next_sample:
                dest=folder/f'{len(samples):03d}.png';save_image(frame,dest)
                samples.append({'time':round(t,3),'file':str(dest.relative_to(root)).replace('\\','/')});next_sample+=3
    items.append({'file':str(file.relative_to(root)).replace('\\','/'),'sha256':digest,**video,'samples':samples,'largestVisualChanges':sorted(changes,key=lambda x:x['difference'],reverse=True)[:30],'allChanges':changes})
    print(f'{file.name}: {duration:.2f}s, {len(samples)} sampled frames',flush=True)
(out/'videos.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
