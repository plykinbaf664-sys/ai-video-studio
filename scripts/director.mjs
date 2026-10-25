import {readFile,writeFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root,fingerprint} from './lib/media.mjs';
import {buildDirectorRequest,loadFreshRequest,reviewResponse,selectTreatment,runFolder,writeJson,validId,validateDirection,digest} from './lib/director-workflow.mjs';
import {writeDirectorReviewPage} from './lib/director-review-page.mjs';
import {qwenCheck,qwenPreflight,generateWithQwen} from './lib/qwen-workflow.mjs';
import {authorBaselineExample} from './lib/director-baseline-example.mjs';
import {loadJob,python} from './lib/editorial-job.mjs';

const [action,...args] = process.argv.slice(2);
const allowed = {'prepare':['run','job','objective','audience','allow-omissions'],'example':['run'],'provider-check':[],'preflight':['run'],'generate':['run','approve-payload'],'review':['run','response'],'select':['run','response','treatment'],'stage':['run']};
if (!allowed[action]) throw new Error('Use director:prepare / director:generate / director:review / director:select / director:stage; see docs/DIRECTOR_WORKFLOW.md');
const flags = {};
for (let i=0;i<args.length;i++) {
  const key=args[i].slice(2);
  if (!args[i].startsWith('--') || !allowed[action].includes(key) || key in flags) throw new Error(`Unknown/duplicate argument: ${args[i]}`);
  if (key==='allow-omissions') flags[key]=true;
  else {const value=args[++i];if (!value || value.startsWith('--')) throw new Error(`Missing --${key}`);flags[key]=value;}
}
const runId=validId(flags.run ?? 'first-director'),folder=runFolder(runId);
const execute = (script, more=[]) => {
  const child=spawnSync(process.execPath,[script,...more],{cwd:root,stdio:'inherit',shell:false});
  if (child.error) throw child.error;
  if (child.status!==0) throw new Error(`Director handoff failed: ${script}`);
};

if (action==='prepare') {
  const brief={objective:flags.objective ?? 'Собрать законченную мысль с естественным темпом, сохранив авторскую подачу и развязку.',audience:flags.audience ?? 'Не задана: не придумывать аудиторию; явно указать допущения.',preserveAllSpeech:!flags['allow-omissions']};
  if ([brief.objective,brief.audience].some(v => v.length>2000 || !v.trim())) throw new Error('Brief must contain 1–2000 characters per field');
  try{await stat(path.join(folder,'request.json'));throw new Error('Director: run already exists; choose a new --run id');}catch(error){if(error.code!=='ENOENT')throw error;}
  const jobId=validId(flags.job ?? 'dry-irony-tight');
  await loadJob(jobId);
  python(['scripts/prepare-director-evidence.py','--job',`edits/${jobId}.json`,'--output',`artifacts/director/${runId}/evidence`]);
  const request=await buildDirectorRequest({runId,jobId,brief});
  await writeJson(path.join(folder,'request.json'),{createdAt:new Date().toISOString(),packet:request.packet,contextSha256:request.contextSha256},true);
  await writeFile(path.join(folder,'BRIEF.md'),`# Режиссёрское задание ${runId}\n\n${brief.objective}\n\n${request.packet.context.words.length} реальных слов, ${request.packet.context.units.length} проверяемых исходных фрагментов. Сохранять всю речь: ${brief.preserveAllSpeech}.\n\nПровайдер не подключён. Два варианта не созданы автоматически. Запрос приватный, никуда не отправлен. Формат ответа включён в request.json.\n\nНе выполнены: ${request.packet.context.observations.missing.join(', ')}.\n`);
  console.log(JSON.stringify({status:'awaiting-provider-or-authored-response',request:path.relative(root,path.join(folder,'request.json')),contextSha256:request.contextSha256,networkRequests:0},null,2));
} else if (action==='example') {
  const request=await loadFreshRequest(runId),response=authorBaselineExample(request);
  validateDirection(request,response);
  await writeJson(path.join(folder,'authored-response.json'),response,true);
  console.log(JSON.stringify({status:'baseline-adaptation-not-provider-generation',response:path.relative(root,path.join(folder,'authored-response.json')),networkRequests:0},null,2));
} else if(action==='provider-check'){
  console.log(JSON.stringify(qwenCheck(),null,2));
} else if(action==='preflight'){
  console.log(JSON.stringify(await qwenPreflight(runId),null,2));
} else if (action==='generate') {
  console.log(JSON.stringify(await generateWithQwen(runId,flags['approve-payload']),null,2));
} else if (action==='review') {
  if (!flags.response) throw new Error('Use --response <workspace-local.json>');
  const reviewed=await reviewResponse(runId,flags.response);
  await writeDirectorReviewPage(path.join(reviewed.folder,'index.html'),reviewed);
  await writeDirectorReviewPage(path.join(folder,'index.html'),reviewed);
  console.log(JSON.stringify({status:reviewed.result.status,authorship:reviewed.response.authorship,review:path.relative(root,path.join(reviewed.folder,'index.html')),candidates:reviewed.result.candidates.map(c=>({id:c.treatment.id,frames:c.durationInFrames,words:c.retainedWordCount,manualReviewItems:c.reviewItems.length}))},null,2));
} else if (action==='select') {
  if (!flags.response || !flags.treatment) throw new Error('Use --response <file> --treatment <id>');
  const candidate=await selectTreatment({runId,responseFile:flags.response,treatmentId:flags.treatment});
  console.log(JSON.stringify({status:'selected-plan-media-unreviewed',job:`edits/${candidate.job.id}.json`,next:`npm run director:stage -- --run ${runId}`},null,2));
} else {
  const request=await loadFreshRequest(runId),selected=JSON.parse(await readFile(path.join(folder,'selected.json'),'utf8'));
  const responseFile=path.join(folder,'revisions',selected.responseSha256,'response.json');
  const response=JSON.parse(await readFile(responseFile,'utf8'));
  const reviewed=validateDirection(request,response),candidate=reviewed.candidates.find(c=>c.treatment.id===selected.treatmentId);
  if (!candidate || digest(response)!==selected.responseSha256 || selected.contextSha256!==request.contextSha256 || selected.jobId!==candidate.job.id || await fingerprint(path.join(root,'edits',`${candidate.job.id}.json`))!==selected.jobSha256 || digest(candidate.job)!==digest(JSON.parse(await readFile(path.join(root,'edits',`${candidate.job.id}.json`),'utf8')))) throw new Error('Director: stale/changed selection or job');
  execute('scripts/prepare-editorial-job.mjs',['--job',candidate.job.id]);
  execute('scripts/preview-editorial-job.mjs',['--job',candidate.job.id]);
  // Switch interactive preview only after media preparation and headless layout checks.
  await writeJson(path.join(root,'public/generated/director/selected.json'),{jobId:candidate.job.id,jobSha256:selected.jobSha256});
  await writeJson(path.join(folder,'staged.json'),{jobId:candidate.job.id,jobSha256:selected.jobSha256,status:'storyboard-prepared-final-render-not-run',studio:'http://localhost:3001/DirectorPreview'});
  console.log(JSON.stringify({status:'storyboard-prepared-final-render-not-run',studio:'http://localhost:3001/DirectorPreview',storyboard:`artifacts/jobs/${candidate.job.id}/storyboard.png`,render:`node scripts/render-editorial-job.mjs --job ${candidate.job.id}`},null,2));
}
