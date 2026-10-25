import type {Caption} from '@remotion/captions';

/** Output clock only. Timing estimates flag waiting; they never authorize cuts. */
export const auditSpeechPacing=(words:Caption[],maximumGapMs:number)=>{
 if(!Number.isFinite(maximumGapMs)||maximumGapMs<150||maximumGapMs>1200)throw new Error('Invalid natural pacing limit');
 const gaps=words.slice(1).flatMap((word,i)=>{
  const previous=words[i],durationMs=word.startMs-previous.endMs;
  if(durationMs<=0)return [];
  return [{timeline:'output' as const,after:previous.text.trim(),before:word.text.trim(),startMs:previous.endMs,endMs:word.startMs,durationMs,status:durationMs>maximumGapMs+.001?'review-required':'passed'}];
 });
 return {status:gaps.some(g=>g.status!=='passed')?'review-required':'passed',maximumGapMs,largestGapMs:Math.max(0,...gaps.map(g=>g.durationMs)),gaps,limitation:'Word boundaries are source-acoustic/ASR estimates. Use this audit to propose/review cuts, never to delete quiet consonants automatically.'};
};
