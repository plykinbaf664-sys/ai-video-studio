"""Prove that an audio-only replacement preserved every encoded video packet/time."""
import argparse,av,hashlib,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--before',required=True);p.add_argument('--after',required=True);p.add_argument('--report',required=True);a=p.parse_args()
def signature(file):
    digest=hashlib.sha256();times=[]
    with av.open(file) as c:
        v=c.streams.video[0];extra=bytes(v.codec_context.extradata or b'');digest.update(extra)
        for packet in c.demux(v):
            if not packet.size:continue
            digest.update(bytes(packet));times.append([float(packet.pts*packet.time_base),float(packet.dts*packet.time_base),float(packet.duration*packet.time_base)])
        return {'sha256':digest.hexdigest(),'packets':len(times),'times':times,'size':[v.width,v.height],'fps':float(v.average_rate)}
before=signature(a.before);after=signature(a.after)
if before!=after:raise RuntimeError('Encoded video bytes/timestamps changed during audio replacement')
report={'status':'passed','method':'Exact H264 extradata/packet bytes SHA-256 and all PTS/DTS/durations, no video encoding','videoPayloadSha256':before['sha256'],'packets':before['packets'],'size':before['size'],'fps':before['fps'],'before':a.before,'after':a.after}
Path(a.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8');print(json.dumps(report),flush=True)
