import av,json
from pathlib import Path
import numpy as np

def save(file,arr):
    f=av.VideoFrame.from_ndarray(arr,format='rgb24').reformat(width=360,height=640,format='rgb24');f.pts=0
    with av.open(str(file),'w') as out:
        s=out.add_stream('png',rate=1);s.width=360;s.height=640;s.pix_fmt='rgb24'
        for p in s.encode(f):out.mux(p)
        for p in s.encode():out.mux(p)

def at(file,t):
    with av.open(file) as c:
        s=c.streams.video[0];c.seek(max(0,int(t/s.time_base)),stream=s,backward=True)
        previous=None
        for f in c.decode(video=0):
            if float(f.pts*f.time_base)<t:previous=f;continue
            best=min([x for x in [previous,f] if x is not None],key=lambda x:abs(float(x.pts*x.time_base)-t));return best.to_ndarray(format='rgb24')

folder=Path('artifacts/dry-irony-v3/color');folder.mkdir(parents=True,exist_ok=True)
manifest=json.loads(Path('public/generated/dry-irony-v3/base.manifest.json').read_text(encoding='utf-8'));items=[]
for frame in [30,183,361]:
    mapping=manifest['frameMap'][frame];source=at('public/source.mp4',mapping['actualSourceSeconds']);graded=at('public/generated/dry-irony-v3/footage.mp4',frame/30)
    a=folder/f'before-{frame}.png';b=folder/f'after-{frame}.png';save(a,source);save(b,graded)
    def metrics(arr):
        values=arr.astype(float)/255;luma=values[:,:,0]*.2126+values[:,:,1]*.7152+values[:,:,2]*.0722;face=luma[430:650,260:480]
        return {'faceMedianLuma':float(np.median(face)),'faceP95Luma':float(np.percentile(face,95)),'fullFrameClippedFraction':float((values.max(axis=2)>=254/255).mean())}
    before=metrics(source);after=metrics(graded)
    if after['fullFrameClippedFraction']-before['fullFrameClippedFraction']>.005:raise RuntimeError('Grade introduced excessive extra clipped highlights')
    items.append({'frame':frame,'sourceSeconds':mapping['actualSourceSeconds'],'beforeFile':a.as_posix(),'afterFile':b.as_posix(),'before':before,'after':after})
Path('artifacts/dry-irony-v3/color.json').write_text(json.dumps({'baseSha256':manifest['sha256'],'profile':manifest['profile'],'items':items,'limitation':'Source-specific manually positioned feathered exposure region. Luma metrics do not prove artistic skin quality or recover source clipping.'},indent=2)+'\n',encoding='utf-8')
print(json.dumps(items),flush=True)
