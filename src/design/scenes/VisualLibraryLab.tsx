import {AbsoluteFill,useCurrentFrame} from 'remotion';
import {useLayoutEffect,useRef} from 'react';
import {Diagram} from './VisualComponents';
import {usePersonalFonts} from '../fonts-personal';
import signal from '../../../style-presets/grammars/signal-dynamic.json';
import focus from '../../../style-presets/grammars/editorial-focus.json';
import irony from '../../../style-presets/grammars/dry-irony.json';
import type {EditorialPreset} from '../../director/editorial-job';
import type {DiagramNode} from '../../director/visual-plan';
export const VisualLibraryLab:React.FC<{styleId:string}>=({styleId})=>{
 const ready=usePersonalFonts(),frame=useCurrentFrame(),root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{if(!root.current||!ready)return;for(const el of root.current.querySelectorAll<HTMLElement>('[data-diagram-label]'))if(el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1)throw Error('Lab diagram text clipped');},[frame,ready]);
 if(!ready)return <AbsoluteFill/>;
 const p=({ 'signal-dynamic':signal,'editorial-focus':focus,'dry-irony':irony}[styleId]??signal) as EditorialPreset;
 const index=Math.floor(frame/120),template=(['process','comparison','system'] as const)[index];
 const labels=[['Запрос','Модель','Ответ'],['Поиск','Генерация'],['AI-система','Данные','Модель','Проверка']][index];
 const nodes:DiagramNode[]=labels.map((label,i)=>({id:`n${i}`,label,role:'editorial-explanation',sourceStartMs:0,sourceEndMs:0,revealFrame:index*120+8+i*18}));
 const edges=template==='process'?[{from:'n0',to:'n1'},{from:'n1',to:'n2'}]:template==='system'?[{from:'n0',to:'n1'},{from:'n0',to:'n2'},{from:'n0',to:'n3'}]:[];
 return <AbsoluteFill ref={root} data-visual-library-lab style={{background:p.palette.paper,color:p.palette.ink,fontFamily:p.typography.family,padding:'140px 96px'}}>
  <div style={{fontSize:26,letterSpacing:3,color:p.palette.accent}}>БИБЛИОТЕКА / ДЕМОНСТРАЦИЯ</div>
  <div style={{fontSize:88,fontWeight:650,lineHeight:1.05,marginTop:50}}>{['Как устроен процесс','Сравнить подходы','Показать связи'][index]}</div>
  <div style={{position:'absolute',left:96,top:680}}><Diagram template={template} nodes={nodes} edges={edges} preset={p}/></div>
  <div style={{position:'absolute',left:96,right:96,top:1270,fontSize:44,lineHeight:1.3}}>Схема раскрывается по шагам.<br/>В рабочем ролике — по словам речи.</div>
  <div style={{position:'absolute',left:96,right:96,top:1560,fontSize:30,lineHeight:1.3,opacity:.65}}>Графический стенд. Новый исходник и речь об ИИ ещё не записаны. Подписи здесь — демонстрационные.</div>
 </AbsoluteFill>;
};
