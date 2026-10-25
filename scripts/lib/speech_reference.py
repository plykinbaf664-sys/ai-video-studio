"""Independent original-source waveform on an exact frame-compatible clock."""
from fractions import Fraction
import av
import numpy as np

def build_source_voice_reference(source48,clips,frame_count,rate=8000,voice_gain=.84):
    voice48=np.zeros((frame_count*1600,2),dtype=np.float32)
    for clip in clips:
        s=clip['sourceStartFrame']*1600;o=clip['outputStartFrame']*1600;n=clip['durationInFrames']*1600
        voice48[o:o+n]=source48[s:s+n]*voice_gain
    frame=av.AudioFrame.from_ndarray(np.ascontiguousarray(voice48.T),format='fltp',layout='stereo')
    frame.sample_rate=48000;frame.pts=0;frame.time_base=Fraction(1,48000)
    resampler=av.AudioResampler(format='s16',layout='mono',rate=rate)
    parts=[f.to_ndarray().reshape(-1) for f in resampler.resample(frame)]
    parts.extend(f.to_ndarray().reshape(-1) for f in resampler.resample(None))
    return np.concatenate(parts).astype(float)[:round(frame_count*rate/30)]
