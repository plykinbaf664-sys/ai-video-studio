import av,json,wave,hashlib,argparse
from pathlib import Path
import numpy as np

def decode(file,rate=48000):
    parts=[]
    with av.open(str(file)) as c:
        r=av.AudioResampler(format='fltp',layout='stereo',rate=rate)
        for f in c.decode(audio=0):parts.extend(x.to_ndarray().T for x in r.resample(f))
        parts.extend(x.to_ndarray().T for x in r.resample(None))
    return np.concatenate(parts)

def save(file,data):
    with wave.open(str(file),'wb') as w:
        w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000);w.writeframes(np.round(np.clip(data,-1,1)*32767).astype('<i2').tobytes())

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--folder',default='public/generated/dry-irony-v3');parser.add_argument('--work',default='.cache/dry-irony-v3');parser.add_argument('--report',default='artifacts/dry-irony-v3');parser.add_argument('--profile',default='style-presets/directions/dry-irony-v3.json');args=parser.parse_args()
    direction=json.loads(Path(args.profile).read_text(encoding='utf-8'));policy=direction['music']
    folder=Path(args.folder);edit=json.loads((folder/'edit.json').read_text(encoding='utf-8'));duration=direction['durationInFrames']/direction['fps'];n=round(duration*48000);t=np.arange(n)/48000
    voice=decode(Path(args.work)/'voice.wav')[:n]
    if len(voice)!=n:raise RuntimeError('Missing source voice samples')
    catalog=json.loads(Path('assets/catalog.json').read_text(encoding='utf-8'))['items'];asset=next(a for a in catalog if a['id']==policy['assetId'])
    music=decode(asset['path']);s=round(policy['sourceStartSeconds']*48000);music=music[s:s+n]
    if len(music)!=n or hashlib.sha256(Path(asset['path']).read_bytes()).hexdigest()!=asset['sha256']:raise RuntimeError('Missing or changed music')
    intervals=[]
    for word in edit['outputCaptions']:
        if intervals and word['startMs']/1000-intervals[-1][1]<.45:intervals[-1][1]=word['endMs']/1000
        else:intervals.append([word['startMs']/1000,word['endMs']/1000])
    if policy.get('mode')!='steady' or policy['duckDb']!=0 or policy['stopSeconds']!=duration:raise RuntimeError('User requires continuous constant-gain background')
    gain=10**(policy['pauseDbFS']/20)/float(np.sqrt(np.mean(music**2)))
    # One conservative gain for the entire song segment, never driven by the
    # instantaneous voice level. Keep each retained word above the music.
    for word in edit['outputCaptions']:
        a=round(word['startMs']*48);b=round(word['endMs']*48)
        v=float(np.sqrt(np.mean(voice[a:b]**2)));m=float(np.sqrt(np.mean(music[a:b]**2)))
        if m>1e-10:gain=min(gain,v/(m*10**(policy['minimumVoiceLeadDb']/20)))
    envelope=np.minimum(t/policy['fadeInSeconds'],1)*np.clip((duration-t)/policy['fadeOutSeconds'],0,1)
    reports=[]
    for mode in ['continuous','pause']:
        # pause.* names remain a compatibility alias, not a second treatment.
        stop=duration;bed=music*(gain*envelope)[:,None];mix=voice+bed
        if abs(mix).max()>=.97:raise RuntimeError('Insufficient headroom')
        save(folder/f'{mode}.bed.wav',bed);save(folder/f'{mode}.mix.wav',mix);save(folder/f'{mode}.voice.wav',voice)
        speech=np.zeros(n,dtype=bool)
        for begin,end in intervals:speech[round(begin*48000):round(end*48000)]=True
        reports.append({'mode':mode,'policy':'steady constant gain; pause filename is compatibility alias','musicAssetId':asset['id'],'musicSha256':asset['sha256'],'stopSeconds':stop,'durationSeconds':duration,'voiceGain':.84,'musicLinearGain':gain,'centralGainRangeDb':float(20*np.log10(envelope[(t>.3)&(t<duration-.3)].max()/envelope[(t>.3)&(t<duration-.3)].min())),'speechIntervalsSeconds':intervals,'voiceSpeechRms':float(np.sqrt(np.mean(voice[speech]**2))),'musicUnderSpeechRms':float(np.sqrt(np.mean(bed[speech]**2))),'samplePeak':float(abs(mix).max()),'mixSha256':hashlib.sha256((folder/f'{mode}.mix.wav').read_bytes()).hexdigest(),'voiceSha256':hashlib.sha256((folder/f'{mode}.voice.wav').read_bytes()).hexdigest()})
    if reports[0]['voiceSha256']!=reports[1]['voiceSha256']:raise RuntimeError('Audio comparison must preserve identical voice')
    # Source-only acoustic evidence for the disputed short vowel. These measurements
    # do not pretend to be human phonetic review or exact forced alignment.
    source=decode('public/source.mp4');energy=[]
    for at in np.arange(37.7,38.7,.02):
        data=source[round(at*48000):round((at+.02)*48000)]
        energy.append({'sourceSeconds':round(float(at),2),'rmsDbFS':float(20*np.log10(max(float(np.sqrt(np.mean(data**2))),1e-10)))})
    per_word=[]
    for word in edit['outputCaptions']:
        a=round(word['startMs']*48);b=round(word['endMs']*48);v=float(np.sqrt(np.mean(voice[a:b]**2)));m=float(np.sqrt(np.mean(bed[a:b]**2)))
        per_word.append({'text':word['text'].strip(),'voiceAboveMusicDb':float(20*np.log10(max(v,1e-10)/max(m,1e-10)))})
    if min(x['voiceAboveMusicDb'] for x in per_word)<policy['minimumVoiceLeadDb']-.01:raise RuntimeError('Music masks a retained source word')
    (Path(args.report)/'audio-mixes.json').write_text(json.dumps({'selected':'continuous','reason':'Explicit user preference: audible unobtrusive steady background, no phrase ducking, no pause boosts, no dramatic stop. Only short edge fades.','mixes':reports,'perWordVoiceLead':per_word,'shortIOriginalAcousticEvidence':energy,'limitation':'Constant gain removes artificial pumping; natural musical rhythm remains. Measurements are not human listening or a phonetic boundary.'},indent=2)+'\n',encoding='utf-8')
    print(json.dumps(reports),flush=True)
