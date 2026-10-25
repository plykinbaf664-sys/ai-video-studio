"""Measure the delivered-to-render bed against the real source MP3, not settings alone."""
import json,hashlib,runpy,argparse
from pathlib import Path
import numpy as np
decode=runpy.run_path('scripts/prepare-editorial-audio.py')['decode']
p=argparse.ArgumentParser();p.add_argument('--profile',default='style-presets/directions/dry-irony-v3.json');p.add_argument('--folder',default='public/generated/dry-irony-v3');p.add_argument('--report',default='artifacts/dry-irony-v3');args=p.parse_args()
folder=Path(args.folder);report_folder=Path(args.report)
d=json.loads(Path(args.profile).read_text(encoding='utf-8'));m=d['music'];n=round(d['durationInFrames']/d['fps']*48000)
assets=json.loads(Path('assets/catalog.json').read_text(encoding='utf-8'))['items'];asset=next(x for x in assets if x['id']==m['assetId'])
source=decode(asset['path']);start=round(m['sourceStartSeconds']*48000);source=source[start:start+n]
bed=decode(folder/'continuous.bed.wav');voice=decode(folder/'continuous.voice.wav')
if len(bed)!=n or len(voice)!=n:raise RuntimeError('Background or voice duration changed')
gains=[]
for at in range(14400,n-14400-9600,9600):
    x=source[at:at+9600].reshape(-1).astype(float);y=bed[at:at+9600].reshape(-1).astype(float)
    gain=float(np.dot(x,y)/np.dot(x,x));gains.append(gain)
variation=float(20*np.log10(max(gains)/min(gains)))
if min(gains)<=0 or variation>.03:raise RuntimeError(f'Music gain pumping/dropout found: {variation}dB')
selection=json.loads((report_folder/'selection.json').read_text(encoding='utf-8'));words=[]
for w in selection['outputCaptions']:
    a=round(w['startMs']*48);b=round(w['endMs']*48);v=float(np.sqrt(np.mean(voice[a:b]**2)));music=float(np.sqrt(np.mean(bed[a:b]**2)))
    words.append({'text':w['text'].strip(),'voiceAboveMusicDb':float(20*np.log10(max(v,1e-10)/max(music,1e-10)))})
if min(x['voiceAboveMusicDb'] for x in words)<m['minimumVoiceLeadDb']-.05:raise RuntimeError('Music level interferes with a retained word')
report={'status':'passed','method':'Least-squares gain estimated every 200ms from actual prepared PCM vs real source MP3; only 300ms edge exclusions. Actual AAC is separately compared to this known mix.','centralGainVariationDb':variation,'expectedAutomationDb':0,'minimumVoiceAboveMusicDb':min(x['voiceAboveMusicDb'] for x in words),'perWord':words,'bedSha256':hashlib.sha256((folder/'continuous.bed.wav').read_bytes()).hexdigest(),'limitation':'Natural musical rhythm/dynamics remain; constant applied gain is not a flat acoustic waveform or human listening.'}
(report_folder/'steady-music.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:v for k,v in report.items() if k!='perWord'}),flush=True)
