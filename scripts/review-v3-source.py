import av,json,hashlib
from pathlib import Path
folder=Path('artifacts/dry-irony-v3/source-review');folder.mkdir(parents=True,exist_ok=True)
points=[0,3.5,4.6,7.7,10.6,11.3,37.4,38.0,38.22,39.5,42.04,42.6,43.0]
source=Path('public/source.mp4');items=[]
for t in points:
    with av.open(str(source)) as c:
        s=c.streams.video[0];c.seek(int(t/s.time_base),stream=s,backward=True)
        for f in c.decode(video=0):
            if float(f.pts*f.time_base)+.009<t:continue
            image=f.reformat(width=270,height=480,format='rgb24');image.pts=0
            target=folder/f'source-{t:.2f}.png'
            with av.open(str(target),'w') as out:
                stream=out.add_stream('png',rate=1);stream.width=270;stream.height=480;stream.pix_fmt='rgb24'
                for p in stream.encode(image):out.mux(p)
                for p in stream.encode():out.mux(p)
            items.append({'seconds':t,'actualSourceSeconds':float(f.pts*f.time_base),'file':target.as_posix()});break
Path('artifacts/dry-irony-v3/source-review.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'frames':items},indent=2)+'\n',encoding='utf-8')
print(f'Extracted {len(items)} actual source control frames')
