import av,json,wave,hashlib
from pathlib import Path
import numpy as np
folder=Path('public/generated/reference-edit');rate=48000;n=15*rate
def decode(file):
    chunks=[]
    with av.open(str(file)) as c:
        resampler=av.AudioResampler(format='fltp',layout='stereo',rate=rate)
        for f in c.decode(audio=0):
            chunks.extend(x.to_ndarray().T for x in resampler.resample(f))
        chunks.extend(x.to_ndarray().T for x in resampler.resample(None))
    return np.concatenate(chunks)
def save(file,data):
    with wave.open(str(file),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.round(np.clip(data,-1,1)*32767).astype('<i2').tobytes())
voice=decode('.cache/reference-edit/voice.wav')[:n]
if len(voice)!=n:raise RuntimeError('Voice edit must be exactly 15 seconds')
assets=json.loads(Path('assets/catalog.json').read_text(encoding='utf-8'))['items'];reports=[];t=np.arange(n)/rate
for slug in ['editorial-focus','signal-dynamic','dry-irony']:
    style=json.loads(Path(f'style-presets/runtime/personal-{slug}.json').read_text(encoding='utf-8'));d=style['staging'];asset=next(a for a in assets if a['id']==d['musicAssetId'])
    music=decode(asset['path']);start=round(d['musicStartSeconds']*rate);music=music[start:start+n]
    if len(music)<n:raise RuntimeError('Music selection too short; no silent fallback')
    rms=float(np.sqrt(np.mean(music**2)));gain=10**(d['musicPauseDb']/20)/max(rms,1e-8)
    envelope=np.ones(n,dtype=np.float32)
    duck=10**(d['musicDuckDb']/20)
    for begin,end in [(0,3.44),(5.26,7.84),(10.22,14.04)]:
        attack=np.clip((t-(begin-.12))/.12,0,1);release=np.clip(((end+.28)-t)/.28,0,1)
        influence=np.minimum(attack,release);envelope=np.minimum(envelope,1-(1-duck)*influence)
    envelope*=np.minimum(t/.18,1)
    stop=d['musicStopFrame']/30;fade=.14 if stop<15 else .6
    envelope*=np.clip((stop-t)/fade,0,1)
    bed=music*(gain*envelope[:,None]);mix=voice+bed
    peak=float(np.abs(mix).max())
    if peak>=.97:raise RuntimeError(f'Insufficient mix headroom {slug}: {peak}')
    save(folder/f'{slug}.bed.wav',bed);save(folder/f'{slug}.mix.wav',mix)
    save(folder/f'{slug}.voice.wav',voice)
    speech=np.concatenate([voice[round(a*rate):round(b*rate)] for a,b in [(0,3.44),(5.26,7.84),(10.22,14.04)]])
    reports.append({'style':style['id'],'musicAssetId':asset['id'],'musicSha256':asset['sha256'],'musicSourceStartSeconds':d['musicStartSeconds'],'musicPauseTargetDbFS':d['musicPauseDb'],'duckDb':d['musicDuckDb'],'musicLinearGain':gain,'voiceGain':.84,'samplePeak':peak,'durationSeconds':len(mix)/rate,'musicStopSeconds':stop,'voiceSpeechRms':float(np.sqrt(np.mean(speech**2))),'mixSha256':hashlib.sha256((folder/f'{slug}.mix.wav').read_bytes()).hexdigest()})
    print(f'{slug}: music included, duck {d["musicDuckDb"]}dB, peak {peak:.4f}, stop {stop:.2f}s',flush=True)
Path('artifacts/reference-audit/audio-mixes.json').write_text(json.dumps(reports,indent=2)+'\n',encoding='utf-8')
