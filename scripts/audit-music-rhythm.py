import av,json,hashlib
from pathlib import Path
import numpy as np
results=[]
for file in sorted(Path('assets/library/music').glob('*.mp3')):
    chunks=[]
    with av.open(str(file)) as c:
        tags=dict(c.metadata);resampler=av.AudioResampler(format='fltp',layout='mono',rate=8000)
        for frame in c.decode(audio=0):
            for f in resampler.resample(frame):chunks.append(f.to_ndarray().reshape(-1))
    audio=np.concatenate(chunks);hop=128;n=1024
    windows=np.lib.stride_tricks.sliding_window_view(audio,n)[::hop]
    spectrum=np.abs(np.fft.rfft(windows*np.hanning(n),axis=1))
    flux=np.maximum(np.diff(np.log1p(spectrum),axis=0),0).mean(axis=1)
    envelope=np.maximum(flux-np.percentile(flux,55),0);center=envelope-envelope.mean();rate=8000/hop
    scores=[]
    for bpm in range(65,151):
        lag=round(60*rate/bpm);score=float(np.dot(center[lag:],center[:-lag])/max(len(center)-lag,1));scores.append((score,bpm))
    estimate=max(scores)[1];period=60/estimate
    peaks=[i for i in range(1,len(envelope)-1) if envelope[i]>=envelope[i-1] and envelope[i]>envelope[i+1] and envelope[i]>np.percentile(envelope,80)]
    onsets=[round((i+1)*hop/8000,3) for i in peaks]
    seconds=np.array([np.sqrt(np.mean(audio[i:i+8000]**2)) for i in range(0,len(audio),8000)])
    results.append({'file':str(file).replace('\\','/'),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'tags':tags,'durationSeconds':len(audio)/8000,'samplePeak':float(np.max(np.abs(audio))),'estimatedBpm':estimate,'periodSeconds':period,'rmsPerSecond':seconds.tolist(),'onsetsSeconds':onsets,'limitations':'Spectral-flux estimate; half/double tempo ambiguity. Not a manual audition or genre guarantee.'})
    print(f'{file.name}: estimated {estimate} BPM, metadata={tags}',flush=True)
Path('artifacts/reference-audit/music-analysis.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
