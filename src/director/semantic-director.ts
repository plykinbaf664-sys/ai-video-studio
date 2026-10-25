import {compileEditorialJob} from './editorial-job.ts';
import type {EditorialJob, EditorialPreset, SceneKind} from './editorial-job.ts';
import type {EditPlan, Transcript} from './timeline.ts';
import type {VisualAsset,VisualPlan,VisualBeat} from './visual-plan.ts';

export type WordRange = {firstWordId: string; lastWordId: string};
export type DirectorWord = {id: string; text: string; sourceStartMs: number; sourceEndMs: number};
export type DirectorUnit = {id: string; sourceStartFrame: number; sourceEndFrame: number; wordIds: string[]};
export type ReferenceBeat = {referenceId: string; startMs: number; endMs: number; technique: string};
export type DirectorContext = {
  version: 1; requestId: string;
  brief: {objective: string; audience: string; preserveAllSpeech: boolean};
  words: DirectorWord[]; units: DirectorUnit[];
  references: ReferenceBeat[];
  observations: {available: string[]; missing: string[]};
  policy: {maximumGapMs: number; minimumQuoteHoldFrames: number};
  visualAssets?:VisualAsset[];
};
export type DirectorAnchor =
  | {timeline: 'output'; kind: 'unit-start'; unitId: string; offsetFrames: number}
  | {timeline: 'output'; kind: 'after-word'; wordId: string; offsetFrames: number};
export type DirectorTreatment = {
  id: string; title: string; thesis: string; emotionalArc: string; whyThisWorks: string;
  beats: {id: string; role: 'hook'|'example'|'explanation'|'turn'|'payoff'; unitIds: string[]; intent: string; evidence: WordRange; uncertainty: string}[];
  omissions: {unitId: string; reason: string}[];
  scenes: {id: string; kind: SceneKind; anchor: DirectorAnchor; purpose: string; evidence: WordRange; reference: Omit<ReferenceBeat, 'technique'>; quotes: WordRange[]}[];
  productionNeeds: {capability: string; reason: string; evidence: WordRange; fallbackSceneId: string}[];
  selfReview: {risk: string; mitigation: string}[];
  visuals?:{domain:VisualPlan['domain'];restraint:string;policy?:VisualPlan['policy'];beats:{id:string;unitId:string;assetId:string;intent:VisualBeat['intent'];layout:VisualBeat['layout'];evidence:WordRange;why:string;nodes?:{id:string;label:string;role:'editorial-explanation'|'quote-reprise';evidence:WordRange}[];edges?:{from:string;to:string}[];presentation?:VisualBeat['presentation'];subject?:VisualBeat['subject'];seriesId?:string}[]};
};
export type DirectorResponse = {
  version: 1; requestId: string; contextSha256: string;
  authorship: {kind: 'baseline-adaptation'|'editor-authored'|'provider'; name: string};
  observationsUsed: string[];
  treatments: DirectorTreatment[];
  recommendation: {treatmentId: string; reason: string};
};

const fail = (message: string): never => {throw new Error(`Director: ${message}`);};
const requireValue = (ok: unknown, message: string): void => {if (!ok) fail(message);};
const unique = (values: string[], label: string) => requireValue(new Set(values).size === values.length, `duplicate ${label}`);

/** Deterministic compiler, not a language model or a claim of visual understanding. */
export const compileDirectorResponse = (
  context: DirectorContext, contextSha256: string, response: DirectorResponse,
  baseJob: EditorialJob, preset: EditorialPreset, prior: {plan: EditPlan; transcript: Transcript},
) => {
  requireValue(response.version === 1 && response.requestId === context.requestId && response.contextSha256 === contextSha256, 'stale request/context binding');
  requireValue(response.observationsUsed.every(o => context.observations.available.includes(o)), 'claims unavailable audio/visual observations');
  unique(response.observationsUsed, 'observation');
  requireValue(response.treatments.length === 2, 'exactly two treatments required');
  unique(response.treatments.map(t => t.id), 'treatment id');
  const wordById = new Map(context.words.map((w, i) => [w.id, {...w, index: i}]));
  const sourceUnits = new Map(context.units.map(u => [u.id, u]));
  const candidates = response.treatments.map(treatment => {
    const orderedIds = treatment.beats.flatMap(b => b.unitIds);
    unique(orderedIds, 'retained source unit');
    unique(treatment.beats.map(b => b.id), 'beat id');
    unique(treatment.scenes.map(s => s.id), 'scene id');
    const omittedIds = treatment.omissions.map(o => o.unitId);
    unique(omittedIds, 'omitted unit');
    requireValue(orderedIds.length > 0 && orderedIds.every(id => sourceUnits.has(id)), 'unknown/empty retained units');
    requireValue(omittedIds.every(id => sourceUnits.has(id) && !orderedIds.includes(id)), 'unknown or retained omitted unit');
    requireValue(context.units.every(u => orderedIds.includes(u.id) || omittedIds.includes(u.id)), 'unaccounted source unit');
    requireValue(!context.brief.preserveAllSpeech || omittedIds.length === 0, 'brief forbids omitting speech');
    const rangeWords = (range: WordRange) => {
      const first = wordById.get(range.firstWordId), last = wordById.get(range.lastWordId);
      requireValue(first && last && first.index <= last.index, 'unknown/reversed word evidence');
      return context.words.slice(first!.index, last!.index + 1);
    };
    for (const beat of treatment.beats) {
      const ids = beat.unitIds.flatMap(id => sourceUnits.get(id)?.wordIds ?? []);
      requireValue(rangeWords(beat.evidence).every(w => ids.includes(w.id)), `beat ${beat.id} evidence outside its speech`);
    }
    let cursor = 0;
    const selected = orderedIds.map(id => {
      const unit = sourceUnits.get(id)!;
      const item = {...unit, outputStartFrame: cursor};
      cursor += unit.sourceEndFrame - unit.sourceStartFrame;
      return item;
    });
    const reordered = orderedIds.some((id, i) => i > 0 && context.units.findIndex(u => u.id === id) < context.units.findIndex(u => u.id === orderedIds[i - 1]));
    requireValue(`${context.requestId}-${treatment.id}`.length <= 64, 'combined job id exceeds 64 characters');
    const retained = new Set(selected.flatMap(u => u.wordIds));
    const requireRetainedRange = (range: WordRange) => {
      const words = rangeWords(range);
      requireValue(words.every(w => retained.has(w.id)), 'evidence/quote refers to removed words');
      return words;
    };
    const outputWord = (id: string) => {
      const word = wordById.get(id), unit = selected.find(u => u.wordIds.includes(id));
      requireValue(word && unit, 'anchor refers to unknown/removed word');
      const offsetMs = (unit!.outputStartFrame - unit!.sourceStartFrame) * 1000 / 30;
      return {...word!, startMs: word!.sourceStartMs + offsetMs, endMs: word!.sourceEndMs + offsetMs};
    };
    const scenes = treatment.scenes.map(scene => {
      const a = scene.anchor;
      requireValue(a.timeline === 'output' && Number.isInteger(a.offsetFrames) && a.offsetFrames >= 0 && a.offsetFrames <= 60, 'invalid output anchor');
      let from: number;
      if (a.kind === 'unit-start') {
        const unit = selected.find(u => u.id === a.unitId);
        requireValue(unit, 'anchor refers to unknown/removed unit');
        from = unit!.outputStartFrame + a.offsetFrames;
      } else {
        from = Math.ceil((outputWord(a.wordId).endMs + preset.captions.tailMs) * 30 / 1000) + a.offsetFrames;
      }
      const evidence = requireRetainedRange(scene.evidence);
      const ref = scene.reference;
      requireValue(context.references.some(b => b.referenceId === ref.referenceId && ref.startMs >= b.startMs && ref.endMs <= b.endMs && ref.endMs > ref.startMs), 'unregistered reference interval');
      requireValue(preset.scenes.includes(scene.kind), 'unsupported scene capability');
      const quotes = scene.quotes.map(q => {
        const words = requireRetainedRange(q);
        return {startMs: words[0].sourceStartMs, endMs: words[words.length - 1].sourceEndMs};
      });
      return {from, kind: scene.kind, purpose: scene.purpose, reference: `${ref.referenceId}:${ref.startMs / 1000}–${ref.endMs / 1000}`, quotes, evidence, sceneId: scene.id};
    });
    const job: EditorialJob = {
      ...structuredClone(baseJob), id: `${context.requestId}-${treatment.id}`, compositionId: 'DirectorPreview',
      baseReuseJobId: reordered ? undefined : baseJob.id,
      cuts: selected.map(unit => ({id: unit.id, start: unit.sourceStartFrame / 30, end: unit.sourceEndFrame / 30, purpose: treatment.beats.find(b => b.unitIds.includes(unit.id))!.intent})),
      scenes: scenes.map(({from, kind, purpose, reference, quotes}) => ({from, kind, purpose, reference, quotes})),
      pacing: {maximumGapMs: context.policy.maximumGapMs, policy: 'Natural speech; director cannot pad duration or override protected audio.'},
    };
    // Never inherit old absolute output coordinates when source units are reordered.
    delete job.visualPlan;
    if(treatment.visuals){
      const requested=treatment.visuals,assets:VisualAsset[]=[];
      const beats=requested.beats.map(b=>{
        const unit=selected.find(u=>u.id===b.unitId),asset=context.visualAssets?.find(a=>a.id===b.assetId),proof=requireRetainedRange(b.evidence);
        requireValue(unit&&asset&&proof.every(w=>unit!.wordIds.includes(w.id)),'visual cue needs a registered asset and retained unit evidence');
        if(!assets.some(a=>a.id===asset!.id))assets.push(structuredClone(asset!));
        const nodes=b.nodes?.map(n=>{const evidence=requireRetainedRange(n.evidence);requireValue(evidence.every(w=>proof.some(p=>p.id===w.id)),'diagram proof outside cue');return {id:n.id,label:n.label,role:n.role,sourceStartMs:evidence[0].sourceStartMs,sourceEndMs:evidence[evidence.length-1].sourceEndMs,revealFrame:Math.ceil((outputWord(evidence[evidence.length-1].id).endMs+preset.captions.tailMs)*30/1000)+6};});
        return {id:b.id,assetId:b.assetId,intent:b.intent,layout:b.layout,why:b.why,from:unit!.outputStartFrame,until:unit!.outputStartFrame+unit!.sourceEndFrame-unit!.sourceStartFrame,sourceStartMs:proof[0].sourceStartMs,sourceEndMs:proof[proof.length-1].sourceEndMs,...(nodes?{nodes}:{}),...(b.edges?{edges:b.edges}:{}),...(b.presentation?{presentation:b.presentation}:{}),...(b.subject?{subject:b.subject}:{}),...(b.seriesId?{seriesId:b.seriesId}:{})};
      });
      job.visualPlan={version:1,domain:requested.domain,authorship:response.authorship.kind==='provider'?'provider':'editor-directed',assets,beats,restraint:requested.restraint,shots:scenes.map(s=>({from:s.from,reason:s.purpose})),...(requested.policy?{policy:requested.policy}:{})};
    }
    const compiled = compileEditorialJob(job, preset, prior);
    requireValue(compiled.provenance.length === retained.size, 'duplicated or missing source words');
    const reviewItems: string[] = [];
    scenes.forEach((scene, i) => {
      const end = compiled.scenes[i].until;
      requireValue(scene.evidence.some(w => {
        const out = outputWord(w.id);
        return out.endMs * 30 / 1000 > scene.from && out.startMs * 30 / 1000 < end;
      }) || scene.kind === 'comparison' && scene.evidence.every(w => outputWord(w.id).endMs * 30 / 1000 <= scene.from), `scene ${scene.sceneId} unrelated to its evidence time`);
      for (const q of compiled.scenes[i].quotes) {
        requireValue(end - q.revealFrame >= context.policy.minimumQuoteHoldFrames, 'quote has insufficient reading hold');
        if (q.text.split(/\s+/).length / ((end - q.revealFrame) / 30) > 4) reviewItems.push(`Readability review: ${scene.sceneId}: ${q.text}`);
      }
    });
    for (const need of treatment.productionNeeds) {
      requireRetainedRange(need.evidence);
      requireValue(scenes.some(s => s.sceneId === need.fallbackSceneId), 'production need lacks executable fallback');
      reviewItems.push(`Unimplemented ${need.capability}: ${need.reason}; fallback ${need.fallbackSceneId}`);
    }
    if (reordered) reviewItems.push('Reordered source speech: human context/causality review required.');
    reviewItems.push('Watch/listen: meaning, delivery, rhythm, gesture and aesthetic quality remain unverified by plan validation.');
    return {treatment, job, durationInFrames: compiled.timeline.durationInFrames, retainedWordCount: compiled.provenance.length,
      omittedWords: compiled.omittedWords, wordMap: compiled.provenance, scenes: compiled.scenes, reviewItems,
      status: 'plan-validated-media-unreviewed' as const};
  });
  // Titles, explanations, labels or colour changes do not establish a different treatment.
  const signature = (c: typeof candidates[number]) => JSON.stringify({cuts: c.job.cuts.map(u => [u.start, u.end]), scenes: c.job.scenes.map(s => [s.kind, s.quotes]),visuals:c.job.visualPlan?.beats.map(b=>[b.assetId,b.intent,b.from,b.until,b.nodes,b.edges])});
  requireValue(signature(candidates[0]) !== signature(candidates[1]), 'treatments have identical editing direction');
  requireValue(candidates.some(c => c.treatment.id === response.recommendation.treatmentId), 'unknown recommended treatment');
  return {status: 'plan-validated-media-unreviewed' as const, candidates, recommendation: response.recommendation};
};
