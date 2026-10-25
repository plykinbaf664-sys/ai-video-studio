"""Decoded AAC sample peaks, not an intersample true-peak/loudness analysis."""
import av,json,argparse,hashlib
from pathlib import Path
import numpy as np
p=argparse.ArgumentParser();p.add_argument('--files',nargs='+');p.add_argument('--report',default='artifacts/reference-edit/audio-levels.json');args=p.parse_args()
files=[Path(f) for f in args.files] if args.files else [Path('public/source.mp4')]+[Path(f'out/reference-{name}.mp4') for name in ['editorial-focus','signal-dynamic','dry-irony']]
items=[]
for file in files:
    maximum=0.;samples=0;clipped=0
    with av.open(str(file)) as c:
        for frame in c.decode(audio=0):
            values=frame.to_ndarray()
            if values.dtype.kind!='f': values=values.astype(float)/np.iinfo(values.dtype).max
            maximum=max(maximum,float(np.abs(values).max()));samples+=values.size;clipped+=int((np.abs(values)>=1).sum())
    digest=hashlib.sha256()
    with file.open('rb') as raw:
        for chunk in iter(lambda:raw.read(1024*1024),b''):digest.update(chunk)
    items.append({'file':str(file),'sha256':digest.hexdigest(),'samplePeak':maximum,'samplePeakDbFS':float(20*np.log10(max(maximum,1e-12))),'samplesAboveFullScale':clipped,'samples':samples,'fractionAboveFullScale':clipped/max(samples,1)})
passed=all(x['samplesAboveFullScale']==0 for x in (items if args.files else items[1:]))
report={'status':'passed' if passed else 'review-required','items':items,'limitations':['Decoded sample peak only; not EBU R128 or intersample true-peak mastering','Source voice and known music bed are checked separately by verify-reference-media.py; this utility only checks decoded final peaks']}
Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
if not passed: raise SystemExit(1)
