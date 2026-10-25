"""Actual final mix/voice/frame QC, with explicitly declared graphic cutaways."""
import argparse,io,json,subprocess,wave,hashlib,runpy
from lib.speech_reference import build_source_voice_reference
from pathlib import Path
import av,numpy as np
p=argparse.ArgumentParser()
for k in ['output','layout','map','ffmpeg','voice','bed','mix','report']:p.add_argument('--'+k,required=True)
p.add_argument('--base',default='public/generated/reference-edit/footage.mp4')
a=p.parse_args();mapping=json.loads(Path(a.map).read_text(encoding='utf-8'));layout=json.loads(Path(a.layout).read_text(encoding='utf-8'));rate=8000
roi=mapping.get('job',{}).get('source',{}).get('verificationRoi',{'x':260,'y':430,'width':220,'height':220})
rx,ry=roi['x'],roi['y'];rr,rb=rx+roi['width'],ry+roi['height']
frame_count=mapping['timeline']['durationInFrames'];fps=mapping['timeline']['fps'];sample_count=round(frame_count*rate/fps)
if fps!=30 or len(layout)!=frame_count:raise RuntimeError('Video/layout time base mismatch')
def audio(file):
    raw=subprocess.check_output([a.ffmpeg,'-v','error','-i',str(file),'-map','0:a:0','-vn','-ac','1','-ar',str(rate),'-c:a','pcm_s16le','-f','wav','-'])
    with wave.open(io.BytesIO(raw),'rb') as w:return np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)
def corr(x,y):
    x=x-x.mean();y=y-y.mean();den=np.linalg.norm(x)*np.linalg.norm(y);return float(np.dot(x,y)/den) if den else 1.
def resize(arr):return av.VideoFrame.from_ndarray(np.ascontiguousarray(arr),format='gray').reformat(width=48,height=64,format='gray').to_ndarray().reshape(-1).astype(float)
actual=audio(a.output);bed=audio(a.bed);expected=audio(a.mix)
# At8kHz one30fps frame is266.666 samples. Cutting an already-downsampled
# reference rounds source/output positions differently and shifts phonetic
# waveforms by a fractional sample. Build the independent original-source
# reference on the exact48kHz clock (1600samples/frame), concatenate, THEN
# downsample the complete reference to the analysis rate. No prepared voice
# WAV is used as ground truth.
decode=runpy.run_path('scripts/prepare-editorial-audio.py')['decode']
source48=decode('public/source.mp4',48000)
voice=build_source_voice_reference(source48,mapping['timeline']['clips'],frame_count,rate)
reference_aac=Path(a.output).parent/'encoder-reference.m4a'
subprocess.check_call([a.ffmpeg,'-v','error','-y','-i',a.mix,'-c:a','libfdk_aac','-b:a','192k','-ar','48000','-f','mp4',str(reference_aac)])
reference_encoded=audio(reference_aac)
actual_voice=actual[:sample_count]-bed[:sample_count];blocks=[]
for start in range(0,sample_count,2000):
    length=min(2000,sample_count-start);v=voice[start:start+length];heard=actual_voice[start:start+length];mix=expected[start:start+length];out=actual[start:start+length]
    if len(out)!=length:raise RuntimeError('Missing final audio samples')
    r=corr(v,heard);rmix=corr(mix,out);error=float(np.sqrt(np.mean((v-heard)**2)))
    reference_rms=float(np.sqrt(np.mean(v*v)))
    calibrated_voice=reference_encoded[start:start+length]-bed[start:start+length]
    calibrated_error=float(np.sqrt(np.mean((v-calibrated_voice)**2)))
    allowed_noise=max(30.,calibrated_error*1.5+10)
    codec_floor=reference_rms<100 and error<=allowed_noise
    okay=(r>=.85 or codec_floor) and rmix>=.95
    blocks.append({'startMs':start/8,'voiceCorrelationAfterKnownBedSubtraction':r,'mixCorrelation':rmix,'voiceRmsError':error,'referenceVoiceRms':reference_rms,'calibratedEncoderRmsError':calibrated_error,'allowedLowLevelNoise':allowed_noise,'criterion':'AAC-calibrated noise floor below -50dBFS source signal; retained words still require strict waveform match' if codec_floor else 'waveform correlation','status':'passed' if okay else 'failed'})
words=[]
for w in mapping['provenance']:
    start=round(w['startMs']*8);length=min(max(640,round((w['endMs']-w['startMs'])*8)),sample_count-start);reference=voice[start:start+length];best=(-2,0)
    for lag in range(-800,801,8):
        pos=start+lag
        if pos<0 or pos+length>len(actual_voice):continue
        r=corr(reference,actual_voice[pos:pos+length])
        if r>best[0]:best=(r,lag)
    words.append({'text':w['text'],'outputStartMs':w['startMs'],'correlation':best[0],'lagMs':best[1]/8,'status':'passed' if best[0]>=.85 and abs(best[1])<=rate/30 else 'failed'})
base=[]
with av.open(a.base) as c:
    for f in c.decode(video=0):
        gray=f.to_ndarray(format='gray');base.append(resize(gray[ry:rb,rx:rr]))
frames=[]
with av.open(a.output) as c:
    for i,f in enumerate(c.decode(video=0)):
        if i>=frame_count:raise RuntimeError('Unexpected extra output frames')
        pos=layout[i]
        if not pos['visible']:
            frames.append({'frame':i,'status':'declared-graphic-cutaway','sourceClockPreserved':True});continue
        scale=pos['image']['scale'];x=round(pos['image']['x']+rx*scale);y=round(pos['image']['y']+ry*scale);r=round(pos['image']['x']+rr*scale);b=round(pos['image']['y']+rb*scale)
        if x<0 or y<0 or r>1080 or b>1920:raise RuntimeError('Face ROI outside output')
        gray=f.to_ndarray(format='gray');pixels=resize(gray[y:b,x:r]);indices=list(range(max(0,i-1),min(frame_count,i+2)));scores=[corr(base[k],pixels) for k in indices];at=int(np.argmax(scores));score=scores[at]
        frames.append({'frame':i,'matchedBaseFrame':indices[at],'faceRegionCorrelation':score,'status':'passed' if score>=.97 else 'failed'})
if len(frames)!=frame_count or len(base)!=frame_count:raise RuntimeError('Missing final/base frames')
failed=[x for x in blocks+words+frames if x['status']=='failed']
report={'status':'failed' if failed else 'passed','method':{'voice':'Every source word waveform, actual AAC minus known music bed; +/-100ms, lag <=1/30s; no music-dominated shortcut','continuousAudio':'All 60 x 250ms blocks, voice after bed subtraction plus complete expected mix','video':'Every visible portrait frame matched to hash-bound graded source cache within one output frame in protected face region. Full graphic frames counted separately, not misreported as visible source matches'},'summary':{'words':len(words),'audioBlocks':len(blocks),'frames':len(frames),'visibleSourceFrames':sum(x['status']=='passed' for x in frames),'declaredGraphicFrames':sum(x['status']=='declared-graphic-cutaway' for x in frames),'maximumWordLagMs':max(abs(x['lagMs']) for x in words),'minimumVoiceCorrelation':min(x['voiceCorrelationAfterKnownBedSubtraction'] for x in blocks),'minimumMixCorrelation':min(x['mixCorrelation'] for x in blocks),'minimumVisibleFrameCorrelation':min(x.get('faceRegionCorrelation',1) for x in frames)},'audioWords':words,'continuousAudio':blocks,'videoFrames':frames,'failures':failed,'limitations':['ASR word boundaries remain estimates','Image correlation verifies timing and portrait region, not artistic quality or human lip-reading','Frame map for the derived cache is verified separately against original source PTS']}
digest=lambda file:hashlib.sha256(Path(file).read_bytes()).hexdigest()
report['hashes']={k:digest(v) for k,v in {'output':a.output,'base':a.base,'source':'public/source.mp4','selection':a.map,'mix':a.mix,'bed':a.bed,'layout':a.layout}.items()}
report['method']['continuousAudio']=f'All {len(blocks)} contiguous blocks up to 250ms, voice after bed subtraction plus complete expected mix'
report['method']['referenceClock']='Original source float stereo48k, exact1600samples per output frame, cuts/concatenation before downsampling to8k. Avoids fractional-sample reference error for frame boundaries not divisible by3.'
report['summary']['minimumWordCorrelation']=min(x['correlation'] for x in words)
Path(a.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps({'status':report['status'],**report['summary']}),flush=True)
if failed:raise SystemExit(1)
