"""Prepare one hash-bound source edit/grade cache, shared by three scene directors."""
import av,json,hashlib,argparse
from pathlib import Path
from fractions import Fraction
import numpy as np
from shutil import copyfile
from lib.editorial_grade import grade_rgb
p=argparse.ArgumentParser();p.add_argument('--folder',default='public/generated/reference-edit');p.add_argument('--profile');p.add_argument('--reuse-cache');a=p.parse_args()
root=Path.cwd();edit_file=root/a.folder/'edit.json'
if not edit_file.exists():edit_file=root/'public/generated/personal/edit.json'
edit=json.loads(edit_file.read_text(encoding='utf-8'))
source=root/'public/source.mp4';sha=hashlib.sha256(source.read_bytes()).hexdigest()
if sha!=edit['plan']['source']['sha256']:raise RuntimeError('Source mismatch')
folder=root/a.folder;folder.mkdir(parents=True,exist_ok=True)
profile={'method':'source-specific SDR display RGB correction; no inferred Log/HDR transform','gamma':.985,'contrast':1.035,'saturation':.975,'rgbGain':[1.008,1.,.995]}
if a.profile:profile=json.loads(Path(a.profile).read_text(encoding='utf-8'))['color']
key=hashlib.sha256(json.dumps({'sha':sha,'clips':edit['plan']['clips'],'profile':profile},sort_keys=True).encode()).hexdigest()
manifest=folder/'base.manifest.json';destination=folder/'footage.mp4'
if manifest.exists() and destination.exists():
    old=json.loads(manifest.read_text(encoding='utf-8'))
    if old.get('key')==key and old['sha256']==hashlib.sha256(destination.read_bytes()).hexdigest():print('Using verified base cache',flush=True);raise SystemExit(0)
maps=[];index=0;reused=None;reuse_info=None;wanted_indices=[]
if a.reuse_cache:
    old_folder=Path(a.reuse_cache);old=json.loads((old_folder/'base.manifest.json').read_text(encoding='utf-8'));old_video=old_folder/'footage.mp4'
    old_hash=hashlib.sha256(old_video.read_bytes()).hexdigest()
    proof=Path('artifacts/jobs')/old_folder.name/'base.validation.json';checked=json.loads(proof.read_text(encoding='utf-8'))
    if old['sourceSha256']!=sha or old['profile']!=profile or old['sha256']!=old_hash or checked['status']!='passed' or checked['baseSha256']!=old_hash or checked['sourceSha256']!=sha:raise RuntimeError('Reuse requires the same source/grade and a hash-verified original-frame proof')
    by_source={round(m['sourceSeconds']*30):m for m in old['frameMap']}
    for clip in edit['plan']['clips']:
        for local in range(round((clip['sourceEndSeconds']-clip['sourceStartSeconds'])*30)):
            tick=round(clip['sourceStartSeconds']*30)+local
            if tick not in by_source:raise RuntimeError('Verified cache does not contain a requested source frame')
            item=by_source[tick];wanted_indices.append(item['outputFrame']);maps.append({**item,'outputFrame':len(maps),'sourceSeconds':tick/30,'clipId':clip['id']})
    if wanted_indices!=sorted(set(wanted_indices)):raise RuntimeError('This reuse fast path requires forward unique source frames')
    reused={old_index:new_index for new_index,old_index in enumerate(wanted_indices)};reuse_info={'file':old_video.as_posix(),'sha256':old_hash,'method':'Reuse decoded already-graded YUV frames; re-encode CRF12 without another RGB grade. New output is independently verified against original.'}
    if wanted_indices == list(range(old['frames'])) and len(wanted_indices) == edit['timeline']['durationInFrames']:
        # Direction-only revisions keep every source frame. Preserve the verified
        # compressed video exactly instead of adding another lossy generation.
        copyfile(old_video, destination)
        if hashlib.sha256(destination.read_bytes()).hexdigest() != old_hash:
            raise RuntimeError('Identical-frame cache copy hash mismatch')
        reuse_info['method'] = 'Byte-copy the identical verified frame sequence; no re-encode and no repeated grade. Original-source QC remains required.'
        manifest.write_text(json.dumps({'key':key,'sourceSha256':sha,'sha256':old_hash,'frames':len(maps),'fps':30,'profile':profile,'frameMap':maps,'reuse':reuse_info},indent=2)+'\n',encoding='utf-8')
        print(f'Copied {len(maps)} verified graded frames byte-for-byte; no generation loss',flush=True)
        raise SystemExit(0)
with av.open(str(destination),'w') as out:
    stream=out.add_stream('libx264',rate=30);stream.width=720;stream.height=1280;stream.pix_fmt='yuv420p';stream.options={'crf':'12','preset':'fast','threads':'2'}
    if reused is not None:
        with av.open(str(old_video)) as inp:
            for old_index,frame in enumerate(inp.decode(video=0)):
                if old_index not in reused:continue
                frame.pts=index;frame.time_base=Fraction(1,30)
                for packet in stream.encode(frame):out.mux(packet)
                index+=1
        print(f'Reused {index} verified graded source frames; no repeated color correction',flush=True)
    for clip in ([] if reused is not None else edit['plan']['clips']):
        start=clip['sourceStartSeconds'];count=round((clip['sourceEndSeconds']-start)*30)
        with av.open(str(source)) as inp:
            video=inp.streams.video[0];inp.seek(int(start/video.time_base),stream=video,backward=True)
            frames=inp.decode(video=0);previous=None;current=next(frames)
            for local in range(count):
                wanted=start+local/30
                while float(current.pts*current.time_base)<wanted:
                    previous=current
                    try:current=next(frames)
                    except StopIteration:break
                best=min([f for f in [previous,current] if f is not None],key=lambda f:abs(float(f.pts*f.time_base)-wanted))
                array=grade_rgb(best.to_ndarray(format='rgb24'),profile)
                frame=av.VideoFrame.from_ndarray(array,format='rgb24');frame.pts=index;frame.time_base=Fraction(1,30)
                for packet in stream.encode(frame):out.mux(packet)
                maps.append({'outputFrame':index,'sourceSeconds':wanted,'actualSourceSeconds':float(best.pts*best.time_base),'clipId':clip['id']});index+=1
        print(f'Prepared {clip["id"]}: {index} frames',flush=True)
    for packet in stream.encode():out.mux(packet)
if index!=edit['timeline']['durationInFrames']:raise RuntimeError('Unexpected source edit frame count')
manifest.write_text(json.dumps({'key':key,'sourceSha256':sha,'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'frames':index,'fps':30,'profile':profile,'frameMap':maps,'reuse':reuse_info},indent=2)+'\n',encoding='utf-8')
print(f'Prepared real {index/30:.2f}s footage; original source unchanged',flush=True)
