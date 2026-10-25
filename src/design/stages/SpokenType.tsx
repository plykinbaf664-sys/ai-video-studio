import {useLayoutEffect,useMemo,useRef} from 'react';
import {interpolate,useCurrentFrame} from 'remotion';
import type {StyleContract} from '../../styles/contract';
import type {Viewport} from '../../director/scene-direction';
import {imagePlacement} from '../../director/scene-direction';
export type SpeechCue={text:string;startMs:number;endMs:number};
const fit=(text:string,preferred:number,min:number,width:number,weight:number)=>{
 const context=document.createElement('canvas').getContext('2d');if(!context)throw new Error('Cannot measure text');
 const words=text.trim().split(/\s+/);
 for(let size=preferred;size>=min;size--){
  context.font=`${weight} ${size}px PersonalOnest`;
  const measure=(s:string)=>context.measureText(s).width-(Math.max(0,s.length-1)*.7);
  if(measure(text)<=width)return {lines:[text],size};
  const options=words.slice(1).map((_,i)=>{const lines=[words.slice(0,i+1).join(' '),words.slice(i+1).join(' ')];return {lines,score:Math.abs(measure(lines[0])-measure(lines[1]))+(/^(не|и|что|мне|в)$/i.test(words[i])?width:0)};}).filter(x=>x.lines.every(line=>measure(line)<=width)).sort((a,b)=>a.score-b.score);
  if(options.length)return {lines:options[0].lines,size};
 }
 throw new Error(`Speech cannot fit two lines: ${text}`);
};
export const SpokenType:React.FC<{cue:SpeechCue;style:StyleContract;viewport:Viewport;poster?:boolean}>=({cue,style,viewport,poster=false})=>{
 const frame=useCurrentFrame(),ref=useRef<HTMLDivElement>(null),variant=style.staging!.renderer;
 const payoff=frame>=348,hero=poster||payoff,settings=hero?style.design.heading:style.design.subtitle;
 const width=variant==='signal'&&!payoff?764:804;
 const displayText=hero&&variant!=='paper'?cue.text.toUpperCase():cue.text;
 const layout=useMemo(()=>fit(displayText,settings.preferredSize,settings.minSize,width,style.design.font.headingWeight),[displayText,settings,width,style.design.font.headingWeight]);
 const x=variant==='signal'&&!payoff?136:96,y=poster?1320:variant==='signal'&&!payoff?300:payoff?150:176;
 const p=interpolate(frame-cue.startMs*30/1000,[0,style.rules.motion.quoteFadeFrames],[.82,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 useLayoutEffect(()=>{
  const card=ref.current,root=card?.closest('[data-reference-frame]');if(!card||!root)throw new Error('Missing scene QC root');
  const parent=root.getBoundingClientRect(),b=card.getBoundingClientRect(),s=parent.width/1080;if(!s)return;
  const rect={x:(b.left-parent.left)/s,y:(b.top-parent.top)/s,right:(b.right-parent.left)/s,bottom:(b.bottom-parent.top)/s};
  if(root.querySelectorAll('[data-current-speech]').length!==1)throw new Error('Duplicate speech text');
  if(rect.x<95||rect.right>901||rect.y<139||rect.bottom>1621)throw new Error(`Text outside safe area: ${cue.text}`);
  if(viewport.visible){const image=imagePlacement(viewport);const face={x:image.x+220*image.scale,right:image.x+520*image.scale,y:image.y+260*image.scale,bottom:image.y+680*image.scale};if(rect.x<face.right&&rect.right>face.x&&rect.y<face.bottom&&rect.bottom>face.y)throw new Error('Speech covers face');}
  const lines=[...card.querySelectorAll<HTMLElement>('[data-speech-line]')];if(lines.length>2||lines.some(l=>l.scrollWidth>l.clientWidth+1))throw new Error('Clipped speech');
  card.dataset.visualQc='passed';card.dataset.frame=String(frame);
 },[frame,cue.text,viewport]);
 return <div ref={ref} data-current-speech data-lines={layout.lines.length} data-font-size={layout.size} style={{position:'absolute',left:x,top:y,maxWidth:width,fontFamily:'PersonalOnest',fontWeight:hero?style.design.font.headingWeight:600,fontSize:layout.size,lineHeight:settings.lineHeight,letterSpacing:-.7,color:variant==='paper'?'#111319':'#F6F3EC',opacity:p,translate:`0 ${(1-p)*12}px`,textShadow:variant==='editorial'?'0 2px 16px rgba(0,0,0,.35)':undefined,zIndex:10}}>
  {layout.lines.map((line,i)=><div key={i} data-speech-line style={{whiteSpace:'nowrap'}}>{line.split(' ').map((w,j)=><span key={j} style={{color:variant!=='paper'&&/^(сам|никогда|инициатива)[.,!?]?$/i.test(w)?'#E87942':undefined,fontWeight:/^(сам|никогда|инициатива)[.,!?]?$/i.test(w)?style.design.font.headingWeight:undefined}}>{j?' ':''}{w}</span>)}</div>)}
 </div>;
};
