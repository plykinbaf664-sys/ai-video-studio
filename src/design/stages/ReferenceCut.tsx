import {Video,Audio} from '@remotion/media';
import {AbsoluteFill,interpolate,staticFile,useCurrentFrame} from 'remotion';
import type {Caption} from '@remotion/captions';
import type {StageVariant} from '../../director/scene-direction';
import {viewportAt,imagePlacement} from '../../director/scene-direction';
import {sceneSpeechAt} from '../../director/scene-speech';
import {usePersonalFonts} from '../fonts-personal';
import {stageStyles,stageSlugs} from './styles';
import {SpokenType} from './SpokenType';
import {Symbol} from './Symbols';
export type ReferenceProps={variant:StageVariant;captions:Caption[]};
export const ReferenceCut:React.FC<ReferenceProps>=({variant,captions})=>{
 const frame=useCurrentFrame(),ready=usePersonalFonts(),style=stageStyles[variant],direction=style.staging!;
 const view=viewportAt(direction,frame),image=imagePlacement(view),slug=stageSlugs[variant];
 const phase=[...direction.scenes].reverse().find(s=>s.from<=frame)?.layout;
 const cue=sceneSpeechAt(captions,frame);
 const paper=variant==='paper',signal=variant==='signal',payoff=phase==='payoff';
 if(!ready)return <AbsoluteFill/>;
 return <AbsoluteFill data-reference-frame data-variant={variant} data-layout={phase} data-source-visible={view.visible} style={{background:paper?'#F6F3EC':'#111319',overflow:'hidden'}}>
  {signal&&!payoff&&<GraphWorld frame={frame} graphic={phase==='graphic'}/>}
  <div data-footage-window style={{position:'absolute',left:view.x,top:view.y,width:view.width,height:view.height,overflow:'hidden',borderRadius:paper?32:signal&&!payoff?38:0,opacity:view.visible?1:0,boxShadow:paper?'0 22px 60px rgba(45,27,17,.12)':signal&&!payoff?'0 0 0 1px rgba(246,243,236,.18)':undefined}}>
   <Video src={staticFile('generated/reference-edit/footage.mp4')} muted objectFit="contain" style={{position:'absolute',width:720*image.scale,height:1280*image.scale,left:image.x-view.x,top:image.y-view.y,filter:paper&&frame>=425?'grayscale(1)':undefined}}/>
  </div>
  {!paper&&(!signal||payoff)&&<AbsoluteFill style={{background:'linear-gradient(180deg,rgba(7,10,16,.88) 0%,rgba(7,10,16,.74) 12%,rgba(7,10,16,.35) 23%,transparent 37%)',pointerEvents:'none'}}/>}
  {paper&&<><div style={{position:'absolute',left:96,top:142,fontFamily:'PersonalInter',fontSize:20,letterSpacing:3,color:'#68635D'}}>ЛИЧНАЯ ИСТОРИЯ</div><div style={{position:'absolute',left:96,top:(phase==='poster'||payoff)?236:364,width:90,height:2,background:'#E87942'}}/>{(phase==='poster'||payoff)&&<div style={{position:'absolute',left:96,top:1260,fontFamily:'PersonalInter',fontSize:20,letterSpacing:3,color:'#68635D'}}>{payoff?'03 / ФИНАЛ':'02 / РЕШЕНИЕ'}</div>}</>}
  {variant==='editorial'&&!payoff&&<div style={{position:'absolute',left:96,top:140,fontFamily:'PersonalInter',fontSize:20,letterSpacing:3,color:'#E87942'}}>{frame<150?'01 / ПОЗИЦИЯ':frame<267?'02 / РЕШЕНИЕ':'03 / ФИНАЛ'}</div>}
  {cue&&<SpokenType cue={cue} style={style} viewport={view} poster={paper&&(phase==='poster'||payoff)}/>}
  <Audio name="Original voice + licensed music; exact precomputed mix" src={staticFile(`generated/reference-edit/${slug}.mix.wav`)}/>
 </AbsoluteFill>;
};
const GlassQuote:React.FC<{text:string;y:number;index:number}>=({text,y,index})=><div data-context-quote style={{position:'absolute',left:144,top:y,width:760,padding:'34px 42px',border:'1px solid rgba(232,121,66,.42)',borderRadius:44,background:'linear-gradient(135deg,rgba(246,243,236,.10),rgba(246,243,236,.025))',boxShadow:'0 12px 70px rgba(232,121,66,.14),inset 0 1px 0 rgba(246,243,236,.2)',fontFamily:'PersonalOnest',fontSize:62,fontWeight:650,color:'#F6F3EC',display:'flex',alignItems:'center',gap:32}}><span style={{fontFamily:'PersonalInter',fontSize:24,color:'#E87942'}}>0{index}</span>{text}</div>;
const GraphWorld:React.FC<{frame:number;graphic:boolean}>=({frame,graphic})=>{
 const chapter=frame<150?0:frame<267?1:2;
 const age=frame-(chapter===0?0:chapter===1?150:307);
 const p=interpolate(age,[0,12],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
 return <AbsoluteFill>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at 16% 24%,rgba(232,121,66,.19),transparent 37%),radial-gradient(ellipse at 86% 64%,rgba(232,121,66,.12),transparent 34%),#0C0E12'}}/>
  <div data-graphic-ui style={{position:'absolute',left:96,top:146,width:804,display:'flex',gap:4,fontFamily:'PersonalInter',fontSize:20,letterSpacing:1,color:'#F6F3EC'}}>{['ПОЗИЦИЯ','РЕШЕНИЕ','ФИНАЛ'].map((s,i)=><div key={s} style={{width:268,padding:'10px 12px',border:'1px solid rgba(246,243,236,.14)',background:i===chapter?'linear-gradient(90deg,rgba(232,121,66,.4),transparent)':'transparent',color:i===chapter?'#F6F3EC':'#77777C'}}>{i+1} / {s}</div>)}</div>
  {graphic?<><GlassQuote text="Не позволял" y={450} index={1}/>{frame>=267&&<><svg style={{position:'absolute',left:526,top:590}} width="4" height="180"><path d="M2 0v180" stroke="#E87942" strokeWidth="1.5" strokeDasharray="4 8"/></svg><GlassQuote text="Сам решил" y={790} index={2}/></>}<div style={{position:'absolute',left:480,top:frame>=267?1110:780,color:'#E87942'}}><Symbol kind={frame>=267?'dish':'agency'} size={120}/></div></>:<>
   {chapter>0&&<div data-context-quote style={{position:'absolute',left:116,top:210,fontFamily:'PersonalInter',fontSize:24,color:'#97949A'}}>Не позволял{chapter>1?'  →  Сам решил':''}</div>}
   <div style={{position:'absolute',left:96,top:270,width:888,height:430,borderRadius:52,border:'1px solid rgba(246,243,236,.18)',background:'linear-gradient(135deg,rgba(246,243,236,.11),rgba(246,243,236,.025))',boxShadow:'0 24px 90px rgba(0,0,0,.35),0 0 100px rgba(232,121,66,.08)',translate:`0 ${(1-p)*24}px`}}/>
   <div style={{position:'absolute',left:136,top:586,color:'#E87942',opacity:p}}><Symbol kind={chapter===1&&frame>=198?'dish':chapter===2&&frame>=320?'laundry':'agency'} size={78}/></div>
   <svg style={{position:'absolute',left:250,top:620}} width="600" height="30"><path d="M0 15H600" stroke="rgba(232,121,66,.45)" strokeWidth="1"/><circle cx={600*p} cy="15" r="4" fill="#E87942"/></svg>
  </>}
 </AbsoluteFill>;
};
