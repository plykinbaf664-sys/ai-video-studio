"""Local adaptive frame sampling. Pixel metrics are measurements, NOT AI observations."""
import argparse, hashlib, json, math
from pathlib import Path
import av
import numpy as np

p=argparse.ArgumentParser()
p.add_argument('--job',default='qwen-cut-001-thematic-grouping')
p.add_argument('--run',required=True)
p.add_argument('--style',choices=['signal-dynamic','editorial-focus','dry-irony'],default='signal-dynamic')
a=p.parse_args()
if not all(x.isalnum() or x=='-' for x in a.run+a.job):raise ValueError('Unsafe id')
root=Path.cwd();job=json.loads((root/f'edits/{a.job}.json').read_text(encoding='utf-8'))
source=root/'public/source.mp4';sha=hashlib.sha256(source.read_bytes()).hexdigest()
if sha!=job['sourceSha256']:raise RuntimeError('Source changed')
folder=root/f'artifacts/visual/{a.run}'
folder.mkdir(parents=True,exist_ok=True)
if (folder/'frames.json').exists():raise RuntimeError('Run already sampled; use a new run id')
(folder/'frames').mkdir(exist_ok=True)
measurements=[];previous=None;next_probe=0
with av.open(str(source)) as c:
    v=c.streams.video[0];duration=float(c.duration/1e6);width=v.width;height=v.height
    for f in c.decode(video=0):
        t=float(f.pts*f.time_base)
        if t+1e-8<next_probe:continue
        gray=f.reformat(width=72,height=128,format='gray').to_ndarray().astype(float)/255
        histogram=np.histogram(gray,bins=16,range=(0,1),density=False)[0]/gray.size
        measurements.append({'sourceSeconds':t,'luma':float(gray.mean()),'darkFraction':float((gray<.08).mean()),'brightFraction':float((gray>.94).mean()),'pixelDifference':float(np.abs(gray-previous[0]).mean()) if previous is not None else 0,'histogramDifference':float(np.abs(histogram-previous[1]).sum()/2) if previous is not None else 0})
        previous=(gray,histogram);next_probe=t+.19
targets=[]
def add(t,reason):
    if 0<=t<duration:targets.append((float(t),reason))
for t in np.arange(0,duration,1.0):add(t,'base-1fps')
for cut in job['cuts']:
    for boundary in ['start','end']:
        for offset in [-.16,0,.16]:add(cut[boundary]+offset,'cut-'+boundary+':'+cut['id'])
scores=[m['pixelDifference'] for m in measurements[1:]]
motion_threshold=max(.035,float(np.quantile(scores,.85)))
events=[]
for i,m in enumerate(measurements):
    if not i:continue
    if m['histogramDifference']>.18 or abs(m['luma']-measurements[i-1]['luma'])>.055 or m['pixelDifference']>=motion_threshold:
        events.append({**m,'reason':'scene-or-light-change' if m['histogramDifference']>.18 or abs(m['luma']-measurements[i-1]['luma'])>.055 else 'pixel-motion-peak'})
chosen=[]
for event in sorted(events,key=lambda x:x['pixelDifference']+x['histogramDifference'],reverse=True):
    if any(abs(event['sourceSeconds']-e['sourceSeconds'])<.7 for e in chosen):continue
    chosen.append(event)
    if len(chosen)>=18:break
for event in chosen:
    for offset in [-.12,0,.12]:add(event['sourceSeconds']+offset,event['reason'])
# Quantized targets are only seek requests. Actual source PTS is recorded below.
merged={}
for t,reason in targets:
    key=round(t*30)/30
    if key>=duration:continue
    merged.setdefault(key,set()).add(reason)
pending=sorted(merged);samples=[];index=0
with av.open(str(source)) as c:
    for f in c.decode(video=0):
        if index>=len(pending):break
        t=float(f.pts*f.time_base)
        if t+1e-8<pending[index]:continue
        reasons=set();requested=[]
        while index<len(pending) and pending[index]<=t+1e-8:
            requested.append(pending[index]);reasons.update(merged[pending[index]]);index+=1
        fid=f'f{len(samples):04d}';file=folder/'frames'/f'{fid}.jpg'
        with av.open(str(file),'w',format='image2') as image:
            stream=image.add_stream('mjpeg',rate=1);stream.width=360;stream.height=640;stream.pix_fmt='yuvj420p'
            for packet in stream.encode(f.reformat(width=360,height=640,format='yuvj420p')):image.mux(packet)
            for packet in stream.encode():image.mux(packet)
        nearest=min(measurements,key=lambda m:abs(m['sourceSeconds']-t))
        samples.append({'id':fid,'sourceMs':round(t*1000,4),'requestedSourceMs':[round(s*1000,4) for s in requested],'actualPts':f.pts,'timeBase':str(f.time_base),'width':360,'height':640,'file':str(file.relative_to(root)).replace('\\','/'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size,'reasons':sorted(reasons),'retainedUnitIds':[cut['id'] for cut in job['cuts'] if cut['start']<=t<cut['end']],'metrics':{k:nearest[k] for k in ['luma','darkFraction','brightFraction','pixelDifference','histogramDifference']}})
if index<len(pending):raise RuntimeError('Sampling incomplete')
manifest={'version':1,'timeline':'source','sourceSha256':sha,'source':{'width':width,'height':height,'durationSeconds':duration},'jobId':a.job,'jobSha256':hashlib.sha256((root/f'edits/{a.job}.json').read_bytes()).hexdigest(),'sampling':{'baseFps':1,'probeFps':5,'extraCutOffsetsSeconds':[-.16,0,.16],'motionThreshold':motion_threshold,'changeEvents':chosen,'notice':'Pixel motion/luma are local measurements; they do not identify a face, hand, emotion or semantic event.'},'frames':samples,'cloudStatus':'not-sent','limitations':['Source frames sampled, not continuous gesture/face tracking.','Very short actions between samples may be missed.','Raw source exposure is measured; existing approved grade remains unchanged.']}
manifest['style']=a.style
(folder/'frames.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'run':a.run,'frames':len(samples),'retainedFrames':sum(bool(s['retainedUnitIds']) for s in samples),'imageBytes':sum(s['bytes'] for s in samples),'sourceHashMatched':True,'cloudRequests':0}))
