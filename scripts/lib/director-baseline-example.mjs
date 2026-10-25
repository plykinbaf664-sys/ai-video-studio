/** Explicit adaptation of the existing real-source edit for offline integration QC.
 * This function does not analyze new material and is never a generation fallback. */
export const authorBaselineExample = request => {
  const {packet,ctx,contextSha256}=request,context=packet.context;
  if(ctx.id!=='dry-irony-tight')throw new Error('Baseline example is only defined for the existing dry-irony-tight source; not an automatic director');
  const wordId=index=>context.words[index].id;
  const rangeForUnit=unit=>({firstWordId:unit.wordIds[0],lastWordId:unit.wordIds.at(-1)});
  const groups=[['hook'],['dishes'],['dinner'],['repair'],['independence'],['payoff-start','payoff-end']];
  const roles=['hook','example','example','example','explanation','payoff'];
  const intents=[
    'Начать исходным уверенным заявлением; не раскрывать иронию раньше примеров.',
    'Сохранить первый бытовой пример как продолжение исходного заявления.',
    'Сохранить второй пример и повтор «сам» как часть авторской подачи.',
    'Добавить третий реально произнесённый пример; не рисовать причинные стрелки.',
    'Сохранить самоописание, с которым будет соотноситься финальная реплика.',
    'Закончить последним бытовым примером, сохранив слова и порядок оригинала.',
  ];
  const beats=groups.map((ids,i)=>{
    const units=ids.map(id=>context.units.find(u=>u.id===id));if(units.some(u=>!u))throw new Error('Baseline cut map changed');
    return {id:`beat-${i}`,role:roles[i],unitIds:ids,intent:intents[i],evidence:{firstWordId:units[0].wordIds[0],lastWordId:units.at(-1).wordIds.at(-1)},uncertainty:'Интонация и жесты не проанализированы подключённой моделью; требуется просмотр.'};
  });
  const quotes=sourceRanges=>sourceRanges.map(q=>{
    const first=context.words.find(w=>w.sourceStartMs===q.sourceStartMs),last=context.words.find(w=>w.sourceEndMs===q.sourceEndMs);
    if(!first||!last)throw new Error('Baseline quote provenance changed');
    return {firstWordId:first.id,lastWordId:last.id};
  });
  const refs={speaker:['img-3321',10500,13000],quote:['img-3321',158000,160000],split:['img-3322',6000,10000],full:['img-3320',108000,120000],comparison:['img-3321',158000,160000]};
  const scenes=ctx.compiled.scenes.map((s,i)=>{
    let anchor;
    if(s.kind==='comparison'){
      const last=ctx.compiled.provenance.find(w=>w.sourceEndMs===s.quotes.at(-1).sourceEndMs);
      anchor={timeline:'output',kind:'after-word',wordId:wordId(last.sourceWordIndex),offsetFrames:s.from-Math.ceil((last.endMs+ctx.preset.captions.tailMs)*30/1000)};
    }else{
      const unit=ctx.compiled.timeline.clips.findLast(c=>c.outputStartFrame<=s.from);
      anchor={timeline:'output',kind:'unit-start',unitId:unit.id,offsetFrames:s.from-unit.outputStartFrame};
    }
    const visible=ctx.compiled.provenance.filter(w=>w.endMs*30/1000>s.from&&w.startMs*30/1000<s.until);
    const q=quotes(s.quotes),evidence=s.kind==='comparison'?{firstWordId:q[0].firstWordId,lastWordId:q.at(-1).lastWordId}:{firstWordId:wordId(visible[0].sourceWordIndex),lastWordId:wordId(visible.at(-1).sourceWordIndex)};
    const [referenceId,startMs,endMs]=refs[s.kind];
    return {id:`scene-${i}`,kind:s.kind,anchor,purpose:s.purpose,evidence,reference:{referenceId,startMs,endMs},quotes:q};
  });
  const common={beats,omissions:[],productionNeeds:[],selfReview:[{risk:'ASR-разночтение «женщине/женщины» и уточнённое начало «тоже» не подтверждены человеческим прослушиванием.',mitigation:'Сохранить исходную речь и отдельные source refinements; прослушать отмеченные места, не переписывать текст по одному ASR.'}]};
  return {version:1,requestId:context.requestId,contextSha256,
    authorship:{kind:'baseline-adaptation',name:'Codex: явный перенос текущего ручного монтажа и авторский вариант с приоритетом говорящего; провайдер не вызывался'},
    observationsUsed:context.observations.available,
    treatments:[
      {...structuredClone(common),id:'structured',title:'Перечень и сопоставление',thesis:'Исходное заявление последовательно раскрывается через бытовые примеры.',emotionalArc:'Уверенное заявление → примеры → самоописание → финальный пример → сопоставление услышанного.',whyThisWorks:'Перенос уже существующей режиссуры в новый контракт; проверка воспроизводимости, не доказательство нового AI-решения.',scenes},
      {...structuredClone(common),id:'performance',title:'Подача автора на первом плане',thesis:'Сохранить всю мысль и дать бытовым примерам прозвучать без дополнительного перечня.',emotionalArc:'Говорящий ведёт историю; крупная текущая речь выделяет только финальную реплику.',whyThisWorks:'Убирает промежуточные графические композиции и итоговое сравнение, оставляя основную работу исполнению автора. Эффект требует просмотра.',
        scenes:[{...structuredClone(scenes[0]),id:'opening',evidence:{firstWordId:context.words[0].id,lastWordId:beats[4].evidence.lastWordId},purpose:'Непрерывный приоритет лица и речи до финального примера.'},{...structuredClone(scenes.find(s=>s.kind==='full')),id:'ending',purpose:'Выделить финальную реплику текущими словами на полном кадре, без ретроспективных карточек.'}],
        selfReview:[...structuredClone(common.selfReview),{risk:'Без графического списка повторение может восприниматься монотонно; жесты и интонация не оценены автоматически.',mitigation:'Сравнить реальную подачу двух раскадровок и прослушать целиком до выбора художественного победителя.'}]},
    ],recommendation:{treatmentId:'structured',reason:'Для проверки совместимости выбрать перенос существующего монтажа. Вариант performance оставлен для сравнения; художественный победитель ещё не определён.'}};
};
