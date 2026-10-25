import av,json,hashlib,argparse,copy
from pathlib import Path
import numpy as np
from lib.editorial_grade import grade_rgb
p=argparse.ArgumentParser();p.add_argument('--folder',default='public/generated/reference-edit');p.add_argument('--report',default='artifacts/reference-edit/base.validation.json');args=p.parse_args()
folder=Path(args.folder);manifest=json.loads((folder/'base.manifest.json').read_text(encoding='utf-8'))
if manifest['sourceSha256']!=hashlib.sha256(Path('public/source.mp4').read_bytes()).hexdigest() or manifest['sha256']!=hashlib.sha256((folder/'footage.mp4').read_bytes()).hexdigest():raise RuntimeError('Base/source hash mismatch')
def images(file,profile=None):
    items=[]
    with av.open(file) as c:
        for frame in c.decode(video=0):
            if profile and profile.get('face'):
                # Compare to the declared local grade, rather than penalizing a
                # deliberate spatial exposure correction as a timing mismatch.
                small=frame.reformat(width=180,height=320,format='rgb24').to_ndarray()
                scaled=copy.deepcopy(profile);scaled['face']['center']=[v/4 for v in profile['face']['center']];scaled['face']['radius']=[v/4 for v in profile['face']['radius']]
                gray=av.VideoFrame.from_ndarray(grade_rgb(small,scaled),format='rgb24').to_ndarray(format='gray')
            else:gray=frame.reformat(width=180,height=320,format='gray').to_ndarray()
            roi=gray[107:163,65:120].reshape(-1).astype(float)
            items.append((float(frame.pts*frame.time_base),roi))
    return items
source=images('public/source.mp4',manifest.get('profile'));base=images(str(folder/'footage.mp4'));times=np.array([x[0] for x in source]);checks=[]
for i,(_,actual) in enumerate(base):
    wanted=manifest['frameMap'][i]['sourceSeconds'];near=np.where(abs(times-wanted)<=1/30+.001)[0];scores=[]
    for j in near:
        ref=source[j][1];x=ref-ref.mean();y=actual-actual.mean();scores.append(float(np.dot(x,y)/(np.linalg.norm(x)*np.linalg.norm(y))))
    best=int(np.argmax(scores));checks.append({'frame':i,'sourceSeconds':wanted,'matchedSourceSeconds':float(times[near[best]]),'correlation':scores[best],'status':'passed' if scores[best]>=.97 else 'failed'})
status='passed' if len(checks)==manifest['frames'] and all(x['status']=='passed' for x in checks) else 'failed'
Path(args.report).write_text(json.dumps({'status':status,'sourceSha256':manifest['sourceSha256'],'baseSha256':manifest['sha256'],'frames':checks,'minimumCorrelation':min(x['correlation'] for x in checks),'note':'All derived frames compared to actual source PTS. Local-grade profiles are applied to expected source pixels at analysis resolution; threshold .97 is unchanged.'},indent=2)+'\n',encoding='utf-8')
print(f'Original to graded edit: {status}, {len(checks)} frames, min correlation {min(x["correlation"] for x in checks):.6f}',flush=True)
if status!='passed':raise SystemExit(1)
