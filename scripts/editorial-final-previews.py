import av,json,hashlib
from pathlib import Path
folder=Path('artifacts/dry-irony-v3/final-frames');folder.mkdir(parents=True,exist_ok=True)
points=[30,85,183,216,270,295,361,405];items=[]
current=json.loads(Path('artifacts/dry-irony-v3/validation.json').read_text(encoding='utf-8'))['technical']['file']
for version,file,frames in [('v3',current,points),('v2','out/reference-dry-irony.mp4',[30,195,397])]:
    sha=hashlib.sha256(Path(file).read_bytes()).hexdigest()
    with av.open(file) as c:
        for i,f in enumerate(c.decode(video=0)):
            if i not in frames:continue
            image=f.reformat(width=360,height=640,format='rgb24');image.pts=0;target=folder/f'{version}-{i}.png'
            with av.open(str(target),'w') as out:
                s=out.add_stream('png',rate=1);s.width=360;s.height=640;s.pix_fmt='rgb24'
                for p in s.encode(image):out.mux(p)
                for p in s.encode():out.mux(p)
            items.append({'version':version,'frame':i,'seconds':i/30,'file':target.as_posix(),'mediaSha256':sha})
if len(items)!=11:raise RuntimeError('Missing actual final frames')
Path('artifacts/dry-irony-v3/final-previews.json').write_text(json.dumps(items,indent=2)+'\n',encoding='utf-8')
print('Extracted 8 actual V3 and 3 matched-source V2 stills.',flush=True)
