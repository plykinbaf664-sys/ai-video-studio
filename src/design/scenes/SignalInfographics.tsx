import {interpolate,useCurrentFrame} from 'remotion';
import type {CompiledEditorialJob} from '../../director/editorial-job';
import {EditorialText} from './SceneLibrary';

const ItemMark:React.FC<{text:string}>=({text})=>{
 const kind=/посуд/i.test(text)?'dish':/ужин/i.test(text)?'dinner':/почин/i.test(text)?'repair':'point';
 return <svg width="46" height="46" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
  {kind==='dish'?<><circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="10"/><path d="M4 10v28M44 10v28"/></>:kind==='dinner'?<><path d="M8 31h32M12 31a12 12 0 0 1 24 0M24 17v-3M6 36h36M18 7v4M30 7v4"/></>:kind==='repair'?<path d="m12 36 16-16a10 10 0 0 0 12-12l-7 7-5-5 7-7a10 10 0 0 0-13 12L6 31a4 4 0 0 0 6 5Z"/>:<circle cx="24" cy="24" r="8"/>}
 </svg>;
};

/** Local component geometry; copy and reveal times come from verified source ranges. */
export const SignalInfographics:React.FC<{edit:CompiledEditorialJob;scene:CompiledEditorialJob['scenes'][number]}>=({edit,scene})=>{
 const frame=useCurrentFrame(),p=edit.preset;
 const active=scene.quotes.filter(q=>q.revealFrame<=frame).length-1;
 const chapter=scene.kind==='split'?1:scene.kind==='full'?2:0;
 if(scene.kind==='full'||scene.kind==='comparison')return null;
 return <div data-scene-graphic="signal-explainer">
  <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 19% 17%,rgba(232,121,66,.17),transparent 32%),radial-gradient(ellipse at 84% 29%,rgba(232,121,66,.10),transparent 29%)',pointerEvents:'none'}}/>
  <div data-text-element data-text-role="editorial-navigation" style={{position:'absolute',left:96,top:148,width:804,height:42,display:'flex',fontFamily:'PersonalInter',fontSize:23,color:p.palette.ink,letterSpacing:.3}}>
   {['ПОЗИЦИЯ','ДЕЙСТВИЯ','ФИНАЛ'].map((text,i)=><div key={text} style={{width:268,display:'flex',alignItems:'center',gap:12,padding:'0 16px',border:'1px solid rgba(246,243,236,.16)',borderRadius:8,background:i===chapter?'rgba(232,121,66,.24)':'rgba(255,255,255,.02)',color:i===chapter?p.palette.ink:'#AAA7A2'}}><span style={{color:i===chapter?p.palette.accent:undefined}}>{String(i+1).padStart(2,'0')}</span>{text}</div>)}
  </div>
  {scene.kind==='split'&&scene.quotes.filter(q=>q.revealFrame<=frame).map((q,i)=>{
   const y=226+i*108;
   const entry=interpolate(frame-q.revealFrame,[0,p.motion.entryFrames],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
   const selected=i===active;
   return <div key={q.sourceStartMs} data-source-start-ms={q.sourceStartMs} data-source-end-ms={q.sourceEndMs} style={{position:'absolute',left:96,top:y,width:804,height:92,opacity:entry,translate:`0 ${(1-entry)*14}px`,filter:`blur(${(1-entry)*4}px)`}}>
    <div style={{position:'absolute',inset:0,border:`1px solid ${selected?'rgba(232,121,66,.60)':'rgba(246,243,236,.21)'}`,borderRadius:32,background:selected?'linear-gradient(110deg,rgba(232,121,66,.25),rgba(246,243,236,.08))':'linear-gradient(110deg,rgba(246,243,236,.09),rgba(246,243,236,.025))',boxShadow:selected?'0 0 48px rgba(232,121,66,.14), inset 0 1px rgba(255,255,255,.12)':'inset 0 1px rgba(255,255,255,.08)'}}/>
    <div style={{position:'absolute',left:23,top:23,color:selected?p.palette.accent:'#AAA7A2'}}><ItemMark text={q.text}/></div>
   </div>;
  })}
  {scene.kind==='split'&&scene.quotes.filter(q=>q.revealFrame<=frame).map((q,i)=><EditorialText key={q.sourceStartMs} text={q.text} preset={p} x={190} y={246+i*108} width={682} size={58} minimum={54} color={p.palette.ink} from={q.revealFrame} role="quote-reprise"/>)}
 </div>;
};
