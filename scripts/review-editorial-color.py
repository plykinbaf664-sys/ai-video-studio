"""Local source/previous/current grade comparison; never uploads private frames."""
import argparse, hashlib, json
from pathlib import Path
import av
import numpy as np
from lib.editorial_grade import grade_rgb

p=argparse.ArgumentParser();p.add_argument('--job',required=True);p.add_argument('--baseline',default='context-domestic-002');a=p.parse_args()
for value in (a.job,a.baseline):
    if not value or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in value):raise ValueError('Registered job IDs required')
job_file=Path(f'edits/{a.job}.json');job=json.loads(job_file.read_text(encoding='utf-8'))
baseline=json.loads(Path(f'edits/{a.baseline}.json').read_text(encoding='utf-8'))
source=Path('public/source.mp4');sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
if sha(source)!=job['sourceSha256']:raise RuntimeError('Source changed')
folder=Path(f'artifacts/jobs/{a.job}/color');folder.mkdir(parents=True,exist_ok=True)
rows=[];measurements=[]
def save_png(array,path):
    with av.open(str(path),'w') as out:
        stream=out.add_stream('png',rate=1);stream.width=array.shape[1];stream.height=array.shape[0];stream.pix_fmt='rgb24'
        frame=av.VideoFrame.from_ndarray(array,format='rgb24')
        for packet in stream.encode(frame):out.mux(packet)
        for packet in stream.encode():out.mux(packet)
for seconds in (1.4,28.67,41.1):
    with av.open(str(source)) as container:
        stream=container.streams.video[0];container.seek(int(seconds/stream.time_base),stream=stream,backward=True)
        frame=next(f for f in container.decode(video=0) if float(f.pts*f.time_base)>=seconds)
        rgb=frame.to_ndarray(format='rgb24');actual=float(frame.pts*frame.time_base)
    versions=[rgb,grade_rgb(rgb,baseline['color']),grade_rgb(rgb,job['color'])]
    row=[]
    for col,(label,array) in enumerate(zip(('SOURCE','PREVIOUS','CINEMATIC CANDIDATE'),versions)):
        save_png(array,folder/f'{seconds:.2f}-{col}.png')
        row.append(av.VideoFrame.from_ndarray(array,format='rgb24').reformat(width=300,height=534,format='rgb24').to_ndarray())
        # Fixed source ROI is a manual measurement area, not automatic skin isolation.
        face=array[430:650,260:480];luma=face.astype(float)@np.array([.2126,.7152,.0722])/255
        measurements.append({'sourceSeconds':actual,'version':label,'faceMedianLuma':float(np.median(luma)),
            'clippedChannelFraction':float(np.mean(np.any(array>=254,axis=2))),
            'crushedPixelFraction':float(np.mean(np.all(array<=2,axis=2)))})
    rows.append(np.concatenate(row,axis=1))
save_png(np.concatenate(rows,axis=0),folder/'comparison.png')
report={'jobId':a.job,'jobSha256':sha(job_file),'sourceSha256':sha(source),'baselineJobId':a.baseline,
    'gradeModuleSha256':sha(Path('scripts/lib/editorial_grade.py')),
    'baselineJobSha256':sha(Path(f'edits/{a.baseline}.json')),'profile':job['color'],'measurements':measurements,
    'comparison':'comparison.png','columnOrder':['source','previous','cinematic candidate'],'limitations':'Manual SDR display-RGB grade. Original clipped highlights cannot be recovered. Still comparison does not establish final MP4 quality or user approval.'}
(folder/'review.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2),flush=True)
