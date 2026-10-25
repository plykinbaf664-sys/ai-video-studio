import {CanvasImage,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {photoGeometry} from '../../director/visual-plan';
import type {DiagramNode,VisualAsset,VisualBeat} from '../../director/visual-plan';
import type {EditorialPreset} from '../../director/editorial-job';

/** Three reusable, frame-driven compositions; the words and relations are data. */
export const Diagram:React.FC<{template:'process'|'comparison'|'system';nodes:DiagramNode[];edges:{from:string;to:string}[];preset:EditorialPreset;width?:number;height?:number}>=({template,nodes,edges,preset:p,width=804,height=360})=>{
 const frame=useCurrentFrame(),comparison=template==='comparison';
 const positions=nodes.map((_,i)=>comparison?{x:i*(width/2+12),y:80,w:width/2-12,h:200}:template==='system'&&i===0?{x:width*.32,y:12,w:width*.36,h:110}:template==='system'?{x:(i-1)*(width/(nodes.length-1)),y:220,w:width/(nodes.length-1)-16,h:110}:{x:i*width/nodes.length,y:90,w:width/nodes.length-18,h:170});
 return <div data-visual-component={template} style={{position:'relative',width,height,fontFamily:p.typography.family,color:p.palette.ink}}>
  <svg width={width} height={height} style={{position:'absolute',inset:0}}>
   <defs><marker id={`arrow-${template}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill={p.palette.accent}/></marker></defs>
   {edges.map((e,i)=>{const a=nodes.findIndex(n=>n.id===e.from),b=nodes.findIndex(n=>n.id===e.to);if(a<0||b<0||frame<Math.max(nodes[a].revealFrame,nodes[b].revealFrame))return null;const x=positions[a],y=positions[b],vertical=template==='system';return <path key={i} d={vertical?`M${x.x+x.w/2} ${x.y+x.h} C${x.x+x.w/2} ${x.y+x.h+50},${y.x+y.w/2} ${y.y-50},${y.x+y.w/2} ${y.y-12}`:`M${x.x+x.w} ${x.y+x.h/2} L${y.x-8} ${y.y+y.h/2}`} stroke={p.palette.accent} strokeWidth={3} fill="none" markerEnd={`url(#arrow-${template})`}/>;})}
  </svg>
  {nodes.map((n,i)=>{if(frame<n.revealFrame)return null;const r=positions[i];return <div key={n.id} data-diagram-label data-editorial-role={n.role} style={{position:'absolute',left:r.x,top:r.y,width:r.w,height:r.h,boxSizing:'border-box',padding:20,border:`2px solid ${p.palette.accent}`,borderRadius:18,background:p.palette.paper,display:'flex',alignItems:'center',justifyContent:'center',textAlign:'center',fontSize:44,fontWeight:p.typography.weight,lineHeight:1.15,opacity:interpolate(frame-n.revealFrame,[0,p.motion.entryFrames],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}),translate:`0 ${interpolate(frame-n.revealFrame,[0,p.motion.entryFrames],[p.id==='editorial-focus'?0:12,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}px`}}>{n.label}</div>;})}
 </div>;
};

export const ContextVisual:React.FC<{beat:VisualBeat;asset:VisualAsset;preset:EditorialPreset}>=({beat,asset,preset:p})=>{
 const frame=useCurrentFrame(),cutaway=beat.layout==='cutaway',top=cutaway?320:150,height=cutaway?900:380;
 if(beat.presentation==='family-photo'){
  const g=photoGeometry(beat,p.safe);
  return <div data-context-visual={beat.id} data-asset-id={asset.id} data-photo-presentation={beat.layout} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
   <div data-insert-panel={cutaway?undefined:true} data-photo-cutaway={cutaway?true:undefined} style={{position:'absolute',left:g.x,top:g.y,width:g.width,height:g.height,overflow:'hidden',borderRadius:cutaway?0:6,opacity:cutaway?1:interpolate(frame-beat.from,[0,4],[.9,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>
    <CanvasImage src={staticFile(asset.runtimeFile!)} style={{width:'100%',height:'100%',objectFit:g.fit}}/>
    {cutaway&&<div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(0,0,0,.26),transparent 25%,transparent 57%,rgba(0,0,0,.8) 90%)'}}/>}
   </div>
  </div>;
 }
 return <div data-context-visual={beat.id} data-asset-id={asset.id} style={{position:'absolute',inset:0,pointerEvents:'none'}}>
  {cutaway&&<div style={{position:'absolute',inset:0,background:p.palette.paper}}/>}
  <div data-insert-panel style={{position:'absolute',left:p.safe.x,top,width:p.safe.width,height,overflow:'hidden',borderRadius:p.id==='dry-irony'?8:22,opacity:interpolate(frame-beat.from,[0,p.motion.entryFrames],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}>
   {asset.kind==='illustration'?<CanvasImage src={staticFile(asset.runtimeFile!)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<Diagram template={asset.template!} nodes={beat.nodes??[]} edges={beat.edges??[]} preset={p} width={p.safe.width} height={height-40}/>}
  </div>
  <div data-insert-label style={{position:'absolute',left:p.safe.x,top:top+height+12,width:p.safe.width,fontFamily:p.typography.family,fontSize:26,letterSpacing:2,color:p.palette.ink,opacity:.7,textAlign:'center'}}>{asset.kind==='illustration'?'САТИРИЧЕСКАЯ ИЛЛЮСТРАЦИЯ':'ПОЯСНЯЮЩАЯ СХЕМА'}</div>
 </div>;
};
