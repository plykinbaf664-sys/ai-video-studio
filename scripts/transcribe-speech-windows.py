"""Second ASR pass on acoustically detected windows of the ACTUAL final AAC.
No transcript or expected words are inputs; first full-pass ASR remains intact.
Energy gate is explicit, not advertised as a neural VAD or forced alignment.
"""
import argparse,json,hashlib,os,runpy
from pathlib import Path
import numpy as np
os.environ['HF_HUB_OFFLINE']='1';os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
from faster_whisper import WhisperModel
p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--bed',required=True);p.add_argument('--report',required=True);p.add_argument('--cache',default='.cache/whisper');a=p.parse_args()
decode=runpy.run_path('scripts/prepare-editorial-audio.py')['decode']
actual=decode(a.output,16000).mean(axis=1);bed=decode(a.bed,16000).mean(axis=1);actual=actual[:len(bed)];voice=actual-bed
bins=[(i,min(i+320,len(voice))) for i in range(0,len(voice),320)]
active=[(s,e) for s,e in bins if float(np.sqrt(np.mean(voice[s:e]**2)))>10**(-38/20)]
raw=[]
for s,e in active:
    if raw and s-raw[-1][1]<=9600:raw[-1][1]=e
    else:raw.append([s,e])
windows=[]
for s,e in raw:
    lo=max(0,s-3200);hi=min(len(actual),e+4000)
    if windows and lo<=windows[-1][1]:windows[-1][1]=hi
    else:windows.append([lo,hi])
if not windows:raise RuntimeError('No acoustic speech windows found')
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2,num_workers=1,download_root=a.cache,local_files_only=True)
words=[];segments=[]
for lo,hi in windows:
    audio=actual[lo:hi].astype(np.float32)
    # Analysis padding only; the final media is never changed.
    audio=np.pad(audio,(0,max(0,16000-len(audio))))
    result,info=model.transcribe(audio,language='ru',beam_size=5,word_timestamps=True,condition_on_previous_text=False,vad_filter=False,temperature=0)
    for seg in result:
        print(f'Window {lo/16000:.2f}-{hi/16000:.2f}: {seg.text}',flush=True)
        segments.append({'startMs':round(lo/16+seg.start*1000),'endMs':round(lo/16+seg.end*1000),'text':seg.text})
        for w in seg.words or []:
            if w.start*16000>=hi-lo:continue
            words.append({'text':w.word.strip(),'startMs':round(lo/16+w.start*1000),'endMs':round(lo/16+w.end*1000),'confidence':w.probability})
tail=voice[30*16000:min(31*16000,len(voice))]
report={'complete':True,'timeline':'output','media':a.output,'mediaSha256':hashlib.sha256(Path(a.output).read_bytes()).hexdigest(),'bedSha256':hashlib.sha256(Path(a.bed).read_bytes()).hexdigest(),'engine':'faster-whisper','model':'small','prompt':None,'method':'Independent acoustic-window decode of actual final AAC. Window detection from actual AAC minus known bed: 20ms RMS > -38dBFS, merge quiet gaps <=600ms, pad 200ms before/250ms after. No expected text/timestamps used. First full-pass ASR is retained.','windows':[{'startMs':round(lo/16),'endMs':round(hi/16)} for lo,hi in windows],'words':words,'segments':segments,'tail30to31VoiceRmsDbFS':float(20*np.log10(max(float(np.sqrt(np.mean(tail**2))),1e-10))) if len(tail) else None,'limitations':['Energy gate can miss very quiet speech; original-waveform and full-pass ASR are still required.','Same model family; agreement is supporting evidence, not human phonetic approval.']}
Path(a.report).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(f'Saved second pass: {len(words)} words, {len(windows)} acoustic windows',flush=True)
