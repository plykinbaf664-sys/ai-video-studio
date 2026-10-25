"""QC plot of the actual supplied JPEGs and raw model boxes; not new media."""
import argparse,json,math
from pathlib import Path
import av
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--run',required=True);a=p.parse_args()
if not a.run or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in a.run):raise ValueError('Unsafe run')
folder=Path('artifacts/visual')/a.run
manifest=json.loads((folder/'frames.json').read_text(encoding='utf-8'))
analysis=json.loads((folder/'analysis.json').read_text(encoding='utf-8'))
frames=[f for f in manifest['frames'] if f['retainedUnitIds']]
cols=7;w=180;h=320;gap=10
canvas=np.full((math.ceil(len(frames)/cols)*(h+gap)+gap,cols*(w+gap)+gap,3),22,dtype=np.uint8)
index=[]
for i,s in enumerate(frames):
    with av.open(s['file']) as c:im=next(c.decode(video=0)).reformat(width=w,height=h,format='rgb24').to_ndarray().copy()
    obs=next(o for o in analysis['observations'] if o['unitId'] in s['retainedUnitIds'])
    boxes=[(obs['face'],(245,180,40)),(obs['person'],(50,210,130))]+[(o['box'],(255,80,90)) for o in obs['importantObjects']]
    for box,color in boxes:
        if box is None:continue
        x=max(0,round(box['x']*w));y=max(0,round(box['y']*h));r=min(w,round((box['x']+box['width'])*w));b=min(h,round((box['y']+box['height'])*h))
        im[y:min(y+2,h),x:r]=color;im[max(y,b-2):b,x:r]=color;im[y:b,x:min(x+2,w)]=color;im[y:b,max(x,r-2):r]=color
    y=gap+(i//cols)*(h+gap);x=gap+(i%cols)*(w+gap);canvas[y:y+h,x:x+w]=im
    index.append({'cell':i+1,'frameId':s['id'],'sourceMs':s['sourceMs'],'unitId':obs['unitId']})
with av.open(str(folder/'source-observations.png'),'w') as out:
    stream=out.add_stream('png',rate=1);stream.width=canvas.shape[1];stream.height=canvas.shape[0];stream.pix_fmt='rgb24'
    frame=av.VideoFrame.from_ndarray(canvas,format='rgb24');frame.pts=0
    for packet in stream.encode(frame):out.mux(packet)
    for packet in stream.encode():out.mux(packet)
(folder/'source-observations-index.json').write_text(json.dumps({'legend':{'amber':'raw model face','green':'raw model person','red':'raw model objects'},'order':'row-major','cells':index},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'QC plot: {len(index)} actual source images; raw model boxes, no tracking claim')
