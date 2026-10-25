export type StageVariant='editorial'|'paper'|'signal';
export type StageDirection={
  renderer:StageVariant;
  referenceBeats:{referenceId:string;startSeconds:number;endSeconds:number;technique:string}[];
  musicAssetId:string;
  musicStartSeconds:number;
  musicPauseDb:number;
  musicDuckDb:number;
  musicStopFrame:number;
  scenes:{from:number;layout:string;purpose:string}[];
};
export type Viewport={x:number;y:number;width:number;height:number;sourceY:number;zoom:number;visible:boolean};
export const viewportAt=(direction:StageDirection,frame:number):Viewport=>{
 const phase=[...direction.scenes].reverse().find(s=>s.from<=frame)?.layout;
 if(direction.renderer==='signal'){
  if(phase==='graphic')return {x:0,y:0,width:1080,height:1920,sourceY:0,zoom:1,visible:false};
  if(phase==='payoff')return {x:0,y:0,width:1080,height:1920,sourceY:0,zoom:1.045,visible:true};
  return {x:56,y:820,width:968,height:1040,sourceY:180,zoom:1,visible:true};
 }
 if(direction.renderer==='paper'){
  if(phase==='poster'||phase==='payoff')return {x:100,y:260,width:880,height:980,sourceY:180,zoom:1,visible:true};
  return {x:168,y:420,width:744,height:1323,sourceY:0,zoom:1,visible:true};
 }
 const zoom=frame>=38&&frame<108?1.045:frame>=348?1.065:1;
 return {x:0,y:0,width:1080,height:1920,sourceY:0,zoom,visible:true};
};
export const imagePlacement=(v:Viewport)=>{
 const scale=v.width/720*v.zoom;
 return {scale,x:v.x+(v.width-v.width*v.zoom)/2,y:v.y-v.sourceY*scale+(1-v.zoom)*v.height*.36};
};
