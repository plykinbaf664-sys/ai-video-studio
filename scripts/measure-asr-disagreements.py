"""Acoustic evidence for ASR review items; never changes captions or media."""
import argparse,json,runpy,hashlib
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser()
for k in ['output','bed','comparison','report']:p.add_argument('--'+k,required=True)
a=p.parse_args();decode=runpy.run_path('scripts/prepare-editorial-audio.py')['decode']
bed=decode(a.bed,16000).mean(axis=1);actual=decode(a.output,16000).mean(axis=1)[:len(bed)];voice=actual-bed
comparison=json.loads(Path(a.comparison).read_text(encoding='utf-8'));items=[]
for index,item in enumerate(comparison['reviewItems']):
    word=item.get('recognized') or item.get('expected');lo=max(0,round(word['startMs']*16));hi=min(len(voice),round(word['endMs']*16))
    if hi-lo<160:lo=max(0,lo-1280);hi=min(len(voice),max(hi,lo+2560))
    data=voice[lo:hi]
    items.append({'reviewIndex':index,'kind':item['kind'],'text':word['text'],'probeStartMs':lo/16,'probeEndMs':hi/16,'voiceAfterKnownBedRmsDbFS':float(20*np.log10(max(float(np.sqrt(np.mean(data**2))),1e-10))),'voicePeakDbFS':float(20*np.log10(max(float(np.max(np.abs(data))),1e-10)))})
report={'mediaSha256':hashlib.sha256(Path(a.output).read_bytes()).hexdigest(),'bedSha256':hashlib.sha256(Path(a.bed).read_bytes()).hexdigest(),'method':'Actual final AAC mono 16k minus actual prepared bed, direct RMS/peak over every disputed ASR interval. Zero-length ASR words use a nominal 160ms neighborhood clamped to actual media bounds; actual probe bounds are recorded. No source transcript used in acoustic measurement.','items':items,'limitation':'Energy is not phonetic or semantic recognition; use with source waveform, independent ASR and human listening.'}
Path(a.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(items,ensure_ascii=True),flush=True)
