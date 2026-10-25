import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
test('non-third-frame cuts preserve analytic waveform phase before 8k analysis',()=>{
 const code=`import sys,json,numpy as np
sys.path.insert(0,'scripts')
from lib.speech_reference import build_source_voice_reference
t=np.arange(48000)/48000
mono=.1*np.sin(2*np.pi*3000*t)
source=np.column_stack((mono,mono)).astype(np.float32)
clips=[{'sourceStartFrame':1,'outputStartFrame':0,'durationInFrames':3},{'sourceStartFrame':10,'outputStartFrame':3,'durationInFrames':3}]
reference=build_source_voice_reference(source,clips,6,voice_gain=1)
analytic=np.sin(2*np.pi*3000*np.arange(1600)/8000)
central=slice(100,700)
corr=float(np.corrcoef(reference[central],analytic[central])[0,1])
legacy=np.sin(2*np.pi*3000*np.arange(round(8000/30),round(8000/30)+800)/8000)
old=float(np.corrcoef(legacy[central],analytic[central])[0,1])
print(json.dumps({'samples':len(reference),'correlation':corr,'legacyFractionalPhaseCorrelation':old}))`;
 const python=path.join('.venv-transcribe',process.platform==='win32'?'Scripts/python.exe':'bin/python');
 const r=spawnSync(python,['-c',code],{encoding:'utf8'});assert.equal(r.status,0,r.stderr||String(r.error));
 const data=JSON.parse(r.stdout);assert.equal(data.samples,1600);assert.ok(data.correlation>.99999);assert.ok(data.legacyFractionalPhaseCorrelation<.8);
});
