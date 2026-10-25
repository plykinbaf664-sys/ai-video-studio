import type {Caption} from '@remotion/captions';
import type {Viewport} from './scene-direction.ts';
import {buildCaptionCues} from '../design/caption-layout.ts';
export type EditorialDirection={
 version:number;id:string;parentStyleId:string;approvalStatus:string;brandbookId:string;assetIds:string[];referenceIds:string[];fps:number;durationInFrames:number;
 sourceClips:{id:string;start:number;end:number;purpose:string}[];
 scenes:{from:number;layout:string;purpose:string;reference:string}[];
 paper:string;ink:string;accent:string;type:{body:number;poster:number;hero:number;minimum:number;weight:number};
 music:{mode:'steady';assetId:string;sourceStartSeconds:number;pauseDbFS:number;minimumVoiceLeadDb:number;duckDb:number;stopSeconds:number;attackSeconds:number;releaseSeconds:number;fadeInSeconds:number;fadeOutSeconds:number};
 captionRefinements?:{text:string;sourceStartMs:number;correctedStartMs:number;evidence:string}[];
 color:Record<string,unknown>;
};
export const validateEditorialDirection=(d:EditorialDirection)=>{
 if(d.id!=='dry-irony-v3'||d.version!==1||d.brandbookId!=='personal-design-kit'||d.approvalStatus!=='candidate'||d.fps!==30||d.durationInFrames!==414)throw new Error('Unsupported editorial direction');
 if(d.scenes.length!==4||d.scenes[0].from!==0||d.scenes.some((s,i)=>!['portrait','poster','full'].includes(s.layout)||!Number.isInteger(s.from)||s.from>=d.durationInFrames||!s.purpose||!s.reference||(i>0&&s.from<=d.scenes[i-1].from)))throw new Error('Invalid editorial scene schedule');
 if(d.sourceClips.length!==3||d.sourceClips.some(c=>c.end<=c.start||!c.purpose)||!d.assetIds.includes(d.music.assetId)||d.type.minimum<64||d.music.mode!=='steady'||d.music.duckDb!==0||d.music.stopSeconds!==d.durationInFrames/d.fps||d.music.minimumVoiceLeadDb<12)throw new Error('Invalid editorial media policy: continuous steady background required');
};
export const editorialViewport=(d:EditorialDirection,frame:number):Viewport=>{
 const phase=[...d.scenes].reverse().find(s=>s.from<=frame)?.layout;
 if(phase==='full')return {x:0,y:0,width:1080,height:1920,sourceY:0,zoom:1.025,visible:true};
 if(phase==='poster')return {x:64,y:176,width:952,height:1184,sourceY:200,zoom:1,visible:true};
 return {x:64,y:390,width:952,height:1320,sourceY:140,zoom:1,visible:true};
};
export const editorialSpeech=(captions:Caption[],frame:number,d:EditorialDirection)=>{
 const ms=frame*1000/d.fps;
 const cue=buildCaptionCues(captions,d.durationInFrames*1000/d.fps).find(c=>ms>=c.startMs&&ms<c.endMs);
 if(!cue)return null;
 const fullAt=d.scenes.find(s=>s.layout==='full')!.from;
 if(frame>=fullAt-1){
  const spoken=cue.words.filter(w=>w.startMs<=ms);
  if(!spoken.length)return null;
  return {...cue,text:spoken.map(w=>w.text.trim()).join(' '),startMs:spoken[spoken.length-1].startMs};
 }
 return cue;
};
