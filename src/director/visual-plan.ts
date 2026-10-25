/** Bounded data consumed by the existing renderer. No generated code, URLs or arbitrary layout. */
export type DomesticSubject='dishwashing'|'cooking'|'bathroom-repair'|'laundry-hanging';
export type VisualAsset={id:string;sha256:string;kind:'illustration'|'template';runtimeFile?:string;template?:'process'|'comparison'|'system';domains:string[];intents:string[];styles:string[];rights:'project-original'|'generated'|'licensed';provenanceFile:string;aesthetic?:'photographic'|'illustrated'|'native';subjects?:DomesticSubject[];castId?:string;photoSafety?:{width:number;height:number;protectedRegions:{x:number;y:number;width:number;height:number}[]}};
export type DiagramNode={id:string;label:string;role:'editorial-explanation'|'quote-reprise';sourceStartMs:number;sourceEndMs:number;revealFrame:number};
export type VisualBeat={id:string;from:number;until:number;sourceStartMs:number;sourceEndMs:number;assetId:string;intent:'contrast'|'explain-process'|'compare'|'explain-system';layout:'upper-panel'|'cutaway';why:string;nodes?:DiagramNode[];edges?:{from:string;to:string}[];presentation?:'family-photo';subject?:DomesticSubject;seriesId?:string};
export type VisualPlan={version:1;domain:'domestic'|'ai'|'general';authorship:'editor-directed'|'provider'|'local-rules';assets:VisualAsset[];beats:VisualBeat[];restraint:string;shots:{from:number;reason:string}[];policy?:'domestic-counterpoint-v1'};
const demand=(ok:unknown,message:string)=>{if(!ok)throw Error(`Visual plan: ${message}`);};
const hash=(s:string)=>/^[a-f0-9]{64}$/.test(s);
export const activeVisual=(plan:VisualPlan|undefined,frame:number)=>plan?.beats.find(b=>frame>=b.from&&frame<b.until);
export const domesticSubjects=(text:string):DomesticSubject[]=>{
 const result:DomesticSubject[]=[];
 if(/посуд|тарел|чашк/iu.test(text)&&/помы|мыть|мо[её]т|мою|перемы/iu.test(text))result.push('dishwashing');
 if(/ужин|обед|завтрак|ед[ау]/iu.test(text)&&/готов|свар|жар/iu.test(text))result.push('cooking');
 if(/ванн|раков|сантех|смесит/iu.test(text)&&/почин|ремонт|чинить|исправ/iu.test(text))result.push('bathroom-repair');
 if(/бель|одежд|рубаш|носк/iu.test(text)&&/развеш|повес|веша|суши/iu.test(text))result.push('laundry-hanging');
 return result;
};
export const photoGeometry=(beat:VisualBeat,safe:{x:number;width:number})=>beat.layout==='cutaway'?{x:0,y:0,width:1080,height:1920,fit:'cover' as const}:{x:safe.x,y:150,width:safe.width,height:454,fit:'contain' as const};
export const photoProtectedRects=(asset:VisualAsset,beat:VisualBeat,safe:{x:number;width:number})=>{
 const p=asset.photoSafety;if(!p)return [];
 const box=photoGeometry(beat,safe),scale=(box.fit==='cover'?Math.max:Math.min)(box.width/p.width,box.height/p.height),x=box.x+(box.width-p.width*scale)/2,y=box.y+(box.height-p.height*scale)/2;
 return p.protectedRegions.map(r=>({x:x+r.x*p.width*scale,y:y+r.y*p.height*scale,right:x+(r.x+r.width)*p.width*scale,bottom:y+(r.y+r.height)*p.height*scale}));
};
export const validateVisualPlan=(plan:VisualPlan,duration:number,style:string,words:{sourceStartMs:number;sourceEndMs:number;startMs:number;endMs:number;text:string}[],sceneFrames:number[],validatedAccentFrames:number[]=[])=>{
 demand(plan.version===1&&['domestic','ai','general'].includes(plan.domain)&&['editor-directed','provider','local-rules'].includes(plan.authorship)&&plan.restraint?.trim(),'identity/restraint required');
 demand(new Set(plan.assets.map(a=>a.id)).size===plan.assets.length,'duplicate assets');
 demand(plan.policy===undefined||plan.policy==='domestic-counterpoint-v1'&&plan.domain==='domestic','ineligible storyboard policy');
 for(const a of plan.assets){
  demand(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id)&&hash(a.sha256)&&['project-original','generated','licensed'].includes(a.rights),'invalid asset identity/rights');
  demand(a.provenanceFile?.startsWith('assets/')&&!/[\\:]|(?:^|\/)\.\.(?:\/|$)/.test(a.provenanceFile),'unsafe provenance');
  demand(a.domains.includes(plan.domain)&&a.styles.includes(style),'asset domain/style mismatch');
  demand(a.kind==='illustration'?a.runtimeFile?.startsWith('generated/assets/')&&!/[\\:]|(?:^|\/)\.\.(?:\/|$)/.test(a.runtimeFile):a.kind==='template'&&['process','comparison','system'].includes(a.template??''),'unregistered renderer/path');
  if(a.photoSafety)demand(a.photoSafety.width>0&&a.photoSafety.height>0&&a.photoSafety.protectedRegions.length>0&&a.photoSafety.protectedRegions.every(r=>Object.values(r).every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=1&&r.y+r.height<=1),'invalid photo protection');
 }
 demand(new Set(plan.beats.map(b=>b.id)).size===plan.beats.length,'duplicate beats');
 let occupied=0;
 for(let i=0;i<plan.beats.length;i++){
  const b=plan.beats[i],asset=plan.assets.find(a=>a.id===b.assetId),span=b.until-b.from;
  demand(Number.isInteger(b.from)&&Number.isInteger(b.until)&&b.from>=0&&b.until<=duration&&span>=45,'short/outside insert');
  const previous=plan.beats[i-1],serial=plan.policy==='domestic-counterpoint-v1'&&b.seriesId&&previous?.seriesId===b.seriesId&&b.from===previous.until;
  demand(i===0||b.from>=previous.until+30||serial,'overlap or insufficient breathing space');
  demand(asset&&asset.intents.includes(b.intent)&&b.why?.trim()&&['upper-panel','cutaway'].includes(b.layout),'unmotivated/unavailable insert');
  demand(b.intent!=='contrast'||plan.domain!=='ai','AI explanation cannot silently use domestic contrast');
  const evidence=words.filter(w=>w.sourceStartMs>=b.sourceStartMs&&w.sourceEndMs<=b.sourceEndMs);
  demand(evidence.length&&evidence[0].sourceStartMs===b.sourceStartMs&&evidence[evidence.length-1].sourceEndMs===b.sourceEndMs&&evidence.some(w=>w.endMs*30/1000>b.from&&w.startMs*30/1000<b.until),'insert must overlap exact retained speech evidence');
  if(b.presentation||b.subject||b.seriesId){
   demand(plan.policy==='domestic-counterpoint-v1'&&b.presentation==='family-photo'&&asset!.kind==='illustration'&&asset!.aesthetic==='photographic'&&asset!.subjects?.includes(b.subject!)&&asset!.photoSafety&&b.intent==='contrast','photo series needs a matching photographic asset and policy');
   demand(domesticSubjects(evidence.map(w=>w.text).join(' ')).includes(b.subject!),'photo action is unrelated to retained speech');
   demand(b.from>0&&b.until<duration&&(!previous||b.sourceStartMs>previous.sourceEndMs),'photo series cannot cover opening/payoff or repeat source evidence');
   demand(b.layout!=='cutaway'||span<=75,'overlong domestic cutaway');
   if(serial)demand(previous.assetId!==b.assetId&&previous.subject!==b.subject,'serial examples must change action and image');
  }
  const nodes=b.nodes??[];
  if(asset!.kind==='illustration')demand(nodes.length===0&&!(b.edges?.length),'illustration cannot invent diagram labels');
  else {
   demand(nodes.length>=2&&nodes.length<=4&&new Set(nodes.map(n=>n.id)).size===nodes.length,'diagram needs 2–4 distinct nodes');
   demand(asset!.template!=='comparison'||nodes.length===2,'comparison needs two nodes');
   for(const n of nodes){
    const proof=words.filter(w=>w.sourceStartMs>=n.sourceStartMs&&w.sourceEndMs<=n.sourceEndMs);
    demand(n.label.trim()&&n.label.length<=32&&!/[0-9%]/.test(n.label),'unsupported statistic or long label');
    demand(proof.length&&proof[0].sourceStartMs===n.sourceStartMs&&proof[proof.length-1].sourceEndMs===n.sourceEndMs&&proof.every(w=>evidence.includes(w)),'diagram label lacks retained word evidence');
    demand(['editorial-explanation','quote-reprise'].includes(n.role),'diagram label must declare editorial role');
    if(n.role==='quote-reprise')demand(n.label===proof.map(w=>w.text.trim()).join(' '),'quote differs from actual speech');
    demand(Number.isInteger(n.revealFrame)&&n.revealFrame>=b.from&&n.revealFrame>=Math.ceil(proof[proof.length-1].endMs*30/1000)+6&&n.revealFrame<=b.until-24,'label must follow spoken evidence and allow reading');
   }
   for(const e of b.edges??[]){
    const from=nodes.findIndex(n=>n.id===e.from),to=nodes.findIndex(n=>n.id===e.to);
    demand(from>=0&&to>=0&&from!==to,'invalid diagram relation');
    demand(asset!.template==='process'?to===from+1:asset!.template==='system'?from===0&&to>0:false,'relation unsupported by diagram grammar');
   }
  }
  occupied+=span;
 }
 for(const id of new Set(plan.beats.map(b=>b.seriesId).filter(Boolean))){const group=plan.beats.filter(b=>b.seriesId===id);demand(group.length>=2&&group.length<=4&&new Set(group.map(b=>b.subject)).size===group.length&&new Set(group.map(b=>b.assetId)).size===group.length,'invalid/repeated domestic series');const casts=group.map(b=>plan.assets.find(a=>a.id===b.assetId)?.castId);demand(casts.every(c=>c&&c===casts[0]),'inconsistent cast in photographic series');}
 demand(occupied<=duration*.45,'visual overload: inserts cover more than 45 percent');
 demand(new Set(plan.shots.map(s=>s.from)).size===plan.shots.length&&plan.shots.length===sceneFrames.length,'every shot needs a unique motivation');
 plan.shots.forEach((s,i)=>demand(s.from===sceneFrames[i]&&s.reason?.trim()&&(i===0||s.from-plan.shots[i-1].from>=(validatedAccentFrames.includes(s.from)?15:45)),'unmotivated/rapid shot alternation'));
 return plan;
};
