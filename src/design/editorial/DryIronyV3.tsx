import {Audio} from '@remotion/media';
import type {Caption} from '@remotion/captions';
import {AbsoluteFill,staticFile,useCurrentFrame} from 'remotion';
import directionJson from '../../../style-presets/directions/dry-irony-v3.json';
import {editorialViewport,editorialSpeech,validateEditorialDirection} from '../../director/editorial-v3';
import {imagePlacement} from '../../director/scene-direction';
import type {EditorialDirection} from '../../director/editorial-v3';
import {usePersonalFonts} from '../fonts-personal';
import {PortraitWindow} from './PortraitWindow';
import {SpeechTypography} from './SpeechTypography';
export const editorialDirection=directionJson as EditorialDirection;
validateEditorialDirection(editorialDirection);
export type DryIronyProps={captions:Caption[];audioMode:'pause'|'continuous'};
export const DryIronyV3:React.FC<DryIronyProps>=({captions,audioMode})=>{
 const frame=useCurrentFrame(),ready=usePersonalFonts(),d=editorialDirection;
 const viewport=editorialViewport(d,frame),phase=[...d.scenes].reverse().find(s=>s.from<=frame)!.layout;
 const full=phase==='full',cue=editorialSpeech(captions,frame,d);
 const image=imagePlacement(viewport),shadeEnd=image.y+260*image.scale-8;
 if(!ready)return <AbsoluteFill/>;
 return <AbsoluteFill data-editorial-v3 data-layout={phase} style={{background:d.paper,overflow:'hidden'}}>
  <PortraitWindow viewport={viewport} full={full}/>
  {full&&<AbsoluteFill style={{background:`linear-gradient(180deg,rgba(10,12,16,.82) 0px,rgba(10,12,16,.72) 260px,transparent ${shadeEnd}px)`,pointerEvents:'none'}}/>}
  {cue&&<SpeechTypography cue={cue} direction={d} viewport={viewport} mode={full?'payoff':phase==='poster'?'poster':'body'}/>}
  <Audio name="Original voice + steady quiet Relax Beat" src={`${staticFile(`generated/dry-irony-v3/${audioMode}.mix.wav`)}?policy=${d.music.mode}-${d.music.pauseDbFS}`}/>
 </AbsoluteFill>;
};
export const loadEditorialV3=async({props}:{props:DryIronyProps})=>{
 const response=await fetch(staticFile('generated/dry-irony-v3/edit.json'));
 if(!response.ok)throw new Error('Run npm run prepare:v3');const edit=await response.json();
 if(edit.timeline.durationInFrames!==414||edit.outputCaptions.length!==22)throw new Error('Wrong V3 real speech timeline');
 return {props:{...props,captions:edit.outputCaptions}};
};
