import {useLayoutEffect,useRef} from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill,staticFile,useCurrentFrame} from 'remotion';
import {usePersonalFonts} from '../fonts-personal';
import {SpeakerScene,SpokenQuoteScene,SplitEnumerationScene,ComparisonScene} from './SceneLibrary';
import {compileEditorialJob,editorialCues,jobImage,jobViewport,protectedSourceRects} from '../../director/editorial-job';
import {activeVisual,photoProtectedRects} from '../../director/visual-plan';
import {ContextVisual} from './VisualComponents';
import {SignalInfographics} from './SignalInfographics';
import type {CompiledEditorialJob} from '../../director/editorial-job';

export type EditorialStoryProps={jobId:string;edit:CompiledEditorialJob|null};
const overlaps=(a:{x:number;y:number;right:number;bottom:number},b:typeof a)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
export const EditorialStory:React.FC<EditorialStoryProps>=({edit})=>{
 const ready=usePersonalFonts(),frame=useCurrentFrame(),root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  if(!ready||!edit||!root.current)return;
  const el=root.current,a=el.getBoundingClientRect(),scale=a.width/1080;if(!scale)return;
  const {job,preset}=edit,safe=preset.safe,image=jobImage(job,frame);
  const protectedBoxes=jobViewport(job,frame).visible?protectedSourceRects(job,frame).map(f=>({x:image.x+f.x*image.scale,y:image.y+f.y*image.scale,right:image.x+(f.x+f.width)*image.scale,bottom:image.y+(f.y+f.height)*image.scale})):[];
  const visualBeat=activeVisual(job.visualPlan,frame),asset=job.visualPlan?.assets.find(a=>a.id===visualBeat?.assetId);
  const photoBoxes=visualBeat&&asset&&visualBeat.presentation==='family-photo'?photoProtectedRects(asset,visualBeat,safe):[];
  const boxes=[...el.querySelectorAll<HTMLElement>('[data-text-element]')].map(card=>{
   const b=card.getBoundingClientRect(),r={x:(b.left-a.left)/scale,y:(b.top-a.top)/scale,right:(b.right-a.left)/scale,bottom:(b.bottom-a.top)/scale};
   if(r.x<safe.x-.5||r.right>safe.x+safe.width+.5||r.y<safe.y-.5||r.bottom>safe.y+safe.height+.5||[...protectedBoxes,...photoBoxes].some(face=>overlaps(r,face)))throw new Error(`Text outside safe area/over face or gesture at ${frame}: ${card.textContent}`);
   const lines=[...card.querySelectorAll<HTMLElement>('[data-speech-line]')];if(lines.length>2||lines.some(line=>line.scrollWidth>line.clientWidth+1))throw new Error(`Clipped/long text at ${frame}`);
   return r;
  });
  if(el.querySelectorAll('[data-current-speech]').length>1||boxes.some((b,i)=>boxes.slice(i+1).some(c=>overlaps(b,c))))throw new Error(`Duplicate/overlapping text at ${frame}`);
  for(const panel of el.querySelectorAll<HTMLElement>('[data-insert-panel], [data-insert-label]')){
   const b=panel.getBoundingClientRect(),r={x:(b.left-a.left)/scale,y:(b.top-a.top)/scale,right:(b.right-a.left)/scale,bottom:(b.bottom-a.top)/scale};
   if(r.x<safe.x-.5||r.right>safe.x+safe.width+.5||r.y<safe.y-.5||r.bottom>safe.y+safe.height+.5||protectedBoxes.some(face=>overlaps(r,face))||panel.hasAttribute('data-insert-label')&&photoBoxes.some(face=>overlaps(r,face))||boxes.some(t=>overlaps(r,t)))throw Error(`Context graphic overlaps speech/subject or safe area at ${frame}`);
  }
  for(const label of el.querySelectorAll<HTMLElement>('[data-diagram-label]'))if(label.scrollWidth>label.clientWidth+1||label.scrollHeight>label.clientHeight+1)throw Error(`Clipped diagram at ${frame}`);
  el.dataset.visualQc='passed';el.dataset.checkedFrame=String(frame);
 },[ready,edit,frame]);
 if(!ready||!edit)return <AbsoluteFill/>;
 const p=edit.preset,scene=edit.scenes.find(s=>frame>=s.from&&frame<s.until)!;
 const signal=p.id==='signal-dynamic';
 const visual=activeVisual(edit.job.visualPlan,frame),contextual=Boolean(edit.job.visualPlan);
 const ms=frame*1000/30,group=editorialCues(edit.outputCaptions,p,edit.timeline.durationInFrames*1000/30).find(c=>ms>=c.startMs&&ms<c.endMs);
 const words=scene.kind==='full'?group?.words.filter(w=>w.startMs<=ms):group?.words;
 const cue=group&&words?.length?{text:words.map(w=>w.text.trim()).join(' '),from:Math.ceil((scene.kind==='full'?words[words.length-1].startMs:group.startMs)*30/1000)}:null;
 if(scene.kind==='comparison'&&cue)throw new Error('Comparison would duplicate active speech');
 const image=jobImage(edit.job,frame),shadeEnd=image.y+edit.job.source.face.y*image.scale-8;
 return <AbsoluteFill ref={root} data-editorial-job={edit.job.id} data-scene={scene.kind} style={{background:p.palette.paper,overflow:'hidden'}}>
  {signal&&!contextual&&<SignalInfographics edit={edit} scene={scene}/>}
  <SpeakerScene edit={edit}/>
  {scene.kind==='full'&&<AbsoluteFill style={{background:`linear-gradient(180deg,rgba(10,12,16,.82) 0px,rgba(10,12,16,.72) 260px,transparent ${shadeEnd}px)`,pointerEvents:'none'}}/>}
  {scene.kind==='split'&&!signal&&!contextual&&<SplitEnumerationScene edit={edit} scene={scene}/>}
  {scene.kind==='comparison'&&<ComparisonScene edit={edit} scene={scene}/>}
  {visual&&<ContextVisual beat={visual} asset={edit.job.visualPlan!.assets.find(a=>a.id===visual.assetId)!} preset={p}/>}
  {cue&&<SpokenQuoteScene text={cue.text} preset={p} x={p.safe.x} y={visual?.layout==='cutaway'?1400:visual?.presentation==='family-photo'?660:visual?.layout==='upper-panel'?590:signal?(scene.kind==='full'?150:scene.kind==='split'?570:330):scene.kind==='quote'?1390:scene.kind==='split'?510:150} width={p.safe.width} size={scene.kind==='quote'?p.typography.quote:scene.kind==='full'?p.typography.hero:p.typography.body} color={visual?.layout==='cutaway'?'#F6F3EC':signal?p.palette.ink:scene.kind==='full'?p.palette.paper:undefined} from={cue.from} role="speech"/ >}
  <Audio name="Original unmodified speech + one constant-gain bed" src={staticFile(`generated/jobs/${edit.job.id}/continuous.mix.wav`)}/>
 </AbsoluteFill>;
};
export const loadEditorialStory=async({props}:{props:EditorialStoryProps})=>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(props.jobId))throw new Error('Invalid job id');
 const response=await fetch(staticFile(`generated/jobs/${props.jobId}/edit.json`));if(!response.ok)throw new Error(`Prepare job ${props.jobId} first`);
 const data=await response.json();
 const edit=compileEditorialJob(data.job,data.preset,data.input);
 if(JSON.stringify(edit.outputCaptions)!==JSON.stringify(data.outputCaptions))throw new Error('Stale generated speech mapping');
 return {durationInFrames:edit.timeline.durationInFrames,props:{...props,edit}};
};
