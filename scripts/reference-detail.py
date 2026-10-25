import av
from pathlib import Path
folder=Path('artifacts/reference-audit/detail');folder.mkdir(exist_ok=True)
for name,times in [('IMG_3322',[6,7,8,9,10,12,15,18,21,27,30,42,45]),('IMG_3321',[10.5,12,20.5,27,39,66,159])]:
    with av.open(f'reference-library/media/video/{name}.MP4') as c:
        index=0
        for frame in c.decode(video=0):
            t=float(frame.pts*frame.time_base)
            if index>=len(times):break
            if t<times[index]:continue
            dest=folder/f'{name}-{times[index]}.png'
            with av.open(str(dest),'w',format='image2') as image:
                stream=image.add_stream('png',rate=1);stream.width=720;stream.height=1280;stream.pix_fmt='rgb24'
                for packet in stream.encode(frame.reformat(width=720,height=1280,format='rgb24')):image.mux(packet)
                for packet in stream.encode():image.mux(packet)
            index+=1
