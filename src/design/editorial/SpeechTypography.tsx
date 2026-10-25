import {useLayoutEffect,useMemo,useRef} from 'react';
import {interpolate,useCurrentFrame,useVideoConfig} from 'remotion';
import type {EditorialDirection} from '../../director/editorial-v3';
import type {Viewport} from '../../director/scene-direction';
import {imagePlacement} from '../../director/scene-direction';
type Cue={text:string;startMs:number;endMs:number};
export const measuredEditorialLines=(text:string,preferred:number,minimum:number,width:number,weight:number,family='PersonalOnest')=>{
 const ctx=document.createElement('canvas').getContext('2d');if(!ctx)throw new Error('Text measurement unavailable');
 const words=text.trim().split(/\s+/);
 for(let size=preferred;size>=minimum;size--){
  ctx.font=`${weight} ${size}px ${family}`;
  const measure=(t:string)=>ctx.measureText(t).width-Math.max(0,t.length-1)*.9;
  if(measure(text)<=width)return {size,lines:[text]};
  const fits=words.slice(1).map((_,i)=>[words.slice(0,i+1).join(' '),words.slice(i+1).join(' ')]).filter(lines=>lines.every(t=>measure(t)<=width)).sort((a,b)=>Math.abs(measure(a[0])-measure(a[1]))-Math.abs(measure(b[0])-measure(b[1])));
  if(fits.length)return {size,lines:fits[0]};
 }
 throw new Error(`V3 speech does not fit two readable lines: ${text}`);
};
export const SpeechTypography:React.FC<{cue:Cue;direction:EditorialDirection;viewport:Viewport;mode:'body'|'poster'|'payoff'}>=({cue,direction:d,viewport,mode})=>{
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),ref=useRef<HTMLDivElement>(null);
 const preferred=mode==='body'?d.type.body:mode==='poster'?d.type.poster:d.type.hero;
 const layout=useMemo(()=>measuredEditorialLines(cue.text,preferred,d.type.minimum,804,d.type.weight),[cue.text,preferred,d]);
 const y=mode==='poster'?1390:mode==='payoff'?150:154;
 const opacity=interpolate(frame-cue.startMs*fps/1000,[0,5],[.85,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 useLayoutEffect(()=>{
  const card=ref.current,root=card?.closest('[data-editorial-v3]');if(!card||!root)throw new Error('Missing V3 text root');
  const a=root.getBoundingClientRect(),b=card.getBoundingClientRect(),scale=a.width/1080;if(!scale)return;
  const r={x:(b.left-a.left)/scale,y:(b.top-a.top)/scale,right:(b.right-a.left)/scale,bottom:(b.bottom-a.top)/scale};
  if(root.querySelectorAll('[data-current-speech]').length!==1||r.x<95||r.right>901||r.y<139||r.bottom>1621)throw new Error(`V3 speech collision/safe area: ${cue.text}`);
  const p=imagePlacement(viewport),face={x:p.x+220*p.scale,right:p.x+520*p.scale,y:p.y+260*p.scale,bottom:p.y+680*p.scale};
  if(r.x<face.right&&r.right>face.x&&r.y<face.bottom&&r.bottom>face.y)throw new Error('V3 text overlaps face');
  const lines=[...card.querySelectorAll<HTMLElement>('[data-speech-line]')];
  if(lines.length>2||lines.some(x=>x.scrollWidth>x.clientWidth+1))throw new Error('V3 clipped subtitle');
  card.dataset.visualQc='passed';card.dataset.frame=String(frame);
 },[frame,cue.text,viewport]);
 return <div ref={ref} data-current-speech data-mode={mode} data-font-size={layout.size} style={{position:'absolute',left:96,top:y,maxWidth:804,fontFamily:'PersonalOnest',fontSize:layout.size,fontWeight:d.type.weight,lineHeight:1.04,letterSpacing:-.9,color:mode==='payoff'?d.paper:d.ink,opacity,textShadow:mode==='payoff'?'0 2px 14px rgba(0,0,0,.25)':undefined}}>
  {layout.lines.map((line,i)=><div data-speech-line key={i} style={{whiteSpace:'nowrap'}}>{line.split(' ').map((w,j)=><span key={j} style={{color:mode==='payoff'&&/^инициатива[.!]?$/i.test(w)?d.accent:undefined,textDecoration:mode==='poster'&&/^сам$/i.test(w)?'underline':undefined,textDecorationColor:d.accent,textDecorationThickness:3,textUnderlineOffset:10}}>{j?' ':''}{w}</span>)}</div>)}
 </div>;
};
