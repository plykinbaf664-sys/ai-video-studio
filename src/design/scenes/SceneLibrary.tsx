import {Video} from '@remotion/media';
import {interpolate,staticFile,useCurrentFrame} from 'remotion';
import {measuredEditorialLines} from '../editorial/SpeechTypography';
import {jobViewport,jobImage} from '../../director/editorial-job';
import type {CompiledEditorialJob,EditorialPreset} from '../../director/editorial-job';

/** Layout primitives consume a job clock; no source path, duration or copy here. */
export const SpeakerScene:React.FC<{edit:CompiledEditorialJob}>=({edit})=>{
 const frame=useCurrentFrame(),v=jobViewport(edit.job,frame),image=jobImage(edit.job,frame);
 const full=edit.scenes.find(s=>frame>=s.from&&frame<s.until)?.kind==='full';
 // Cutaways occlude this layer with an opaque visual; keep media painting on the shared clock.
 // CSS visibility:hidden can stall requestVideoFrameCallback during a seek in Chromium.
 return <div data-footage-window style={{position:'absolute',left:v.x,top:v.y,width:v.width,height:v.height,overflow:'hidden',borderRadius:full?0:22,boxShadow:full?undefined:'0 12px 48px rgba(40,27,18,.10)'}}>
  <Video name="Real source on shared output clock" src={staticFile(`generated/jobs/${edit.job.id}/footage.mp4`)} muted style={{position:'absolute',width:edit.job.source.width*image.scale,height:edit.job.source.height*image.scale,left:image.x-v.x,top:image.y-v.y}}/>
 </div>;
};

export const EditorialText:React.FC<{text:string;preset:EditorialPreset;x:number;y:number;width:number;size:number;minimum?:number;color?:string;from:number;role:'speech'|'quote-reprise';accent?:boolean}>=({text,preset:p,x,y,width,size,minimum,color,from,role,accent})=>{
 const frame=useCurrentFrame(),layout=measuredEditorialLines(text,size,minimum??p.typography.minimum,width,p.typography.weight,p.typography.family);
 const entry=interpolate(frame-from,[0,p.motion.entryFrames],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <div data-text-element data-current-speech={role==='speech'?'true':undefined} data-text-role={role} data-font-size={layout.size} style={{position:'absolute',left:x,top:y,width,fontFamily:p.typography.family,fontSize:layout.size,fontWeight:p.typography.weight,letterSpacing:-.9,lineHeight:1.04,color:color??p.palette.ink,opacity:.85+.15*entry,transform:`translateY(${p.motion.translatePixels*(1-entry)}px)`}}>
  {layout.lines.map((line,i)=><div data-speech-line key={i} style={{whiteSpace:'nowrap'}}>{line.split(' ').map((word,j)=><span key={j} style={{color:accent&&j===line.split(' ').length-1?p.palette.accent:undefined}}>{j?' ':''}{word}</span>)}</div>)}
 </div>;
};
export const SpokenQuoteScene=EditorialText;

export const SplitEnumerationScene:React.FC<{edit:CompiledEditorialJob;scene:CompiledEditorialJob['scenes'][number]}>=({edit,scene})=>{
 const frame=useCurrentFrame(),p=edit.preset;
 return <div data-scene-graphic="enumeration">
  {scene.quotes.filter(q=>q.revealFrame<=frame).map((q,i)=>{
   const y=154+i*114,entry=interpolate(frame-q.revealFrame,[0,p.motion.entryFrames],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
   return <div key={q.sourceStartMs} data-source-start-ms={q.sourceStartMs} data-source-end-ms={q.sourceEndMs}>
    <div style={{position:'absolute',left:96,top:y,width:804,height:96,border:'1px solid rgba(17,19,25,.15)',borderRadius:18,opacity:entry}}/>
    <div style={{position:'absolute',left:118,top:y+40,width:12,height:12,borderRadius:6,background:p.palette.accent,opacity:entry}}/>
    <EditorialText text={q.text} preset={p} x={154} y={y+17} width={722} size={58} minimum={54} from={q.revealFrame} role="quote-reprise"/>
   </div>;
  })}
 </div>;
};
export const ComparisonScene:React.FC<{edit:CompiledEditorialJob;scene:CompiledEditorialJob['scenes'][number]}>=({edit,scene})=>{
 const p=edit.preset;
 return <div data-scene-graphic="comparison">
  {scene.quotes.map((q,i)=><div key={q.sourceStartMs} data-source-start-ms={q.sourceStartMs} data-source-end-ms={q.sourceEndMs}>
   <div style={{position:'absolute',left:96,top:152+i*260,width:804,height:230,borderTop:`${i?3:1}px solid ${i?p.palette.accent:'rgba(17,19,25,.3)'}`}}/>
   <EditorialText text={q.text} preset={p} x={96} y={178+i*260} width={804} size={86} from={scene.from} role="quote-reprise" accent={i===1}/>
  </div>)}
 </div>;
};
