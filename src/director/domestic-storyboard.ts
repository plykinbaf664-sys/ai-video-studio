import {domesticSubjects} from './visual-plan.ts';
import type {VisualAsset,VisualBeat} from './visual-plan.ts';
export type DomesticBrief={domain:'domestic'|'ai'|'general';genre:'irony'|'neutral'|'instruction';relationship:'counterpoint'|'literal';illustrateExamples:boolean;contextReason:string};
export type DomesticUnit={id:string;from:number;until:number;words:{text:string;sourceStartMs:number;sourceEndMs:number}[]};
export type DomesticPolicy={version:number;id:string;maximumCoverage:number;minimumHoldFrames:number;maximumCutawayFrames:number;maximumSeriesItems:number};
const agency=(text:string)=>/(?:^|[^\p{L}])(?:сам[а]?|самостоятельно|решил[а]?|инициатива|независим[а-яё]*)(?:$|[^\p{L}])/iu.test(text);
/** Honest local rules: editorial genre/relationship comes from a brief, never a keyword pretending to be a model. */
export const planDomesticStory=({units,assets,style,brief,policy,duration}:{units:DomesticUnit[];assets:VisualAsset[];style:string;brief:DomesticBrief;policy:DomesticPolicy;duration:number})=>{
 if(policy.version!==1||policy.id!=='domestic-counterpoint-v1'||policy.minimumHoldFrames<45||policy.maximumCoverage>.45||policy.maximumSeriesItems>4)throw Error('Unsupported domestic storyboard policy');
 const eligible=brief.domain==='domestic'&&brief.genre==='irony'&&brief.relationship==='counterpoint'&&brief.illustrateExamples&&Boolean(brief.contextReason.trim());
 const texts=units.map(u=>u.words.map(w=>w.text.trim()).join(' '));
 let covered=0;
 const beats:VisualBeat[]=[],decisions=units.map((u,i)=>{
  const text=texts[i],subjects=domesticSubjects(text),next=texts[i+1]??'';
  const setup=/^(?:И|Потом)\s/iu.test(text)&&/^(?:тоже|это)\s/iu.test(next)&&agency(next);
  let reason:string;
  if(!eligible)reason='Нет явного brief бытовой иронии с контрастом: сохранить говорящего.';
  else if(subjects.length!==1)reason=subjects.length?'Несколько разных действий в одном отрезке: требуется отдельная смысловая раскадровка.':'Заявление/поворот/развязка без отдельного бытового действия: оставить подачу на лице.';
  else if(!agency(text)&&!setup)reason='Сам бытовой предмет не доказывает контраст с инициативой: не придумывать шутку.';
  else if(/не\s+(?:помыть|мыть|готовить|починить|чинить|развешивать)/iu.test(text))reason='Отрицание действия: положительная сценка могла бы исказить речь.';
  else if(u.until-u.from<policy.minimumHoldFrames)reason='Недостаточно времени для считывания фотографии.';
  else {
   const subject=subjects[0],asset=assets.find(a=>a.kind==='illustration'&&a.aesthetic==='photographic'&&a.photoSafety&&a.domains.includes('domestic')&&a.intents.includes('contrast')&&a.styles.includes(style)&&a.subjects?.includes(subject));
   if(!asset)reason=`Нет готового фотографического элемента для ${subject}; нужен поиск/создание, а пока сохранить говорящего.`;
   else if(covered+u.until-u.from>duration*policy.maximumCoverage)reason='Лимит плотности достигнут: сохранить речь и паузу на ведущем.';
   else {
    const layout=asset.photoSafety!.height>asset.photoSafety!.width&&u.until-u.from<=policy.maximumCutawayFrames?'cutaway':'upper-panel';
    const beat:VisualBeat={id:`photo-${u.id}`,from:u.from,until:u.until,sourceStartMs:u.words[0].sourceStartMs,sourceEndMs:u.words[u.words.length-1].sourceEndMs,assetId:asset.id,intent:'contrast',layout,presentation:'family-photo',subject,why:`${brief.contextReason} Отдельное действие «${text}» получает соответствующий вымышленный бытовой кадр. ${setup?'Это подводка: вернуться к лицу до следующей развязки.':layout==='cutaway'?'Короткая полноэкранная смена крупности внутри перечня; реальный голос продолжается.':'Ведущий и его жесты остаются видимы под фотографией.'}`};
    beats.push(beat);covered+=u.until-u.from;
    return {unitId:u.id,text,decision:'insert' as const,subject,assetId:asset.id,layout,role:setup?'payoff-setup':'claim-example',reason:beat.why};
   }
  }
  return {unitId:u.id,text,decision:'speaker' as const,reason};
 });
 // Adjacency is meaningful only for an explicit, bounded series of different actions.
 for(let i=0;i<beats.length;){let end=i+1;while(end<beats.length&&beats[end].from===beats[end-1].until&&end-i<policy.maximumSeriesItems)end++;if(end-i>=2)for(let j=i;j<end;j++)beats[j].seriesId=`examples-${beats[i].from}`;i=end;}
 return {policy:policy.id as 'domestic-counterpoint-v1',authorship:'local-rules' as const,eligible,brief,beats,decisions,coverage:covered/duration,restraint:'Иллюстрировать подходящие бытовые примеры, а не каждое слово. Заявление, самоописание и финальную реплику оставить на лице. Неподтверждённый контраст, неподходящая тема, отсутствующий ассет или короткая пауза — причина ничего не вставлять.'};
};
