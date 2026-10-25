import {Video} from '@remotion/media';
import {staticFile} from 'remotion';
import type {Viewport} from '../../director/scene-direction';
import {imagePlacement} from '../../director/scene-direction';

/** One source clock; changing the frame changes composition, never playback. */
export const PortraitWindow:React.FC<{viewport:Viewport;full:boolean}>=({viewport:v,full})=>{
 const image=imagePlacement(v);
 return <div data-footage-window style={{position:'absolute',left:v.x,top:v.y,width:v.width,height:v.height,overflow:'hidden',borderRadius:full?0:22,boxShadow:full?undefined:'0 12px 48px rgba(40,27,18,.10)'}}>
  <Video name="Real edited source, muted; voice shares output clock" src={staticFile('generated/dry-irony-v3/footage.mp4')} muted objectFit="contain" style={{position:'absolute',width:720*image.scale,height:1280*image.scale,left:image.x-v.x,top:image.y-v.y}}/>
 </div>;
};
