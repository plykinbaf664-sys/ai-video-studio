import {openBrowser,getCompositions,renderMedia} from '@remotion/renderer';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root,inspectSource,fingerprint,verifyVideo} from './lib/media.mjs';
import {directionEvidence} from './lib/direction-evidence.mjs';
import {loadJob,python} from './lib/editorial-job.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
import {jobViewport,jobImage} from '../src/director/editorial-job.ts';
import {compareRecognizedSpeech} from '../src/director/speech-integrity.ts';
import {editorialRuntime} from './lib/editorial-runtime.mjs';
import {bindVisualAssets} from './lib/visual-library.mjs';
const ctx=await loadJob(),{id,folder,report,work,compiled:edit}=ctx;
const runtime=await editorialRuntime(id);
await validateDesignLibrary();const source=await inspectSource();
if(source.sha256!==ctx.job.sourceSha256||source.width!==ctx.job.source.width||source.height!==ctx.job.source.height)throw new Error('Source differs from job: re-inspect and re-transcribe');
const base=path.join(root,folder,'footage.mp4'),baseHash=await fingerprint(base),map=`${report}/selection.json`,selectionHash=await fingerprint(map);
const storyboard=JSON.parse(await readFile(`${report}/storyboard.json`,'utf8'));
if(storyboard.baseSha256!==baseHash||storyboard.jobSha256!==ctx.jobSha256||storyboard.presetSha256!==ctx.presetSha256)throw new Error('Run prepare:story and preview:story before render');
const visualBindings=await bindVisualAssets(ctx.job),visualRendererSha256=await fingerprint('src/design/scenes/VisualComponents.tsx');
if(ctx.job.visualPlan&&(JSON.stringify(storyboard.visualBindings)!==JSON.stringify(visualBindings)||storyboard.visualRendererSha256!==visualRendererSha256))throw Error('Visual library/renderer changed after storyboard');
let baseReview;try{baseReview=JSON.parse(await readFile(`${report}/base.validation.json`,'utf8'));}catch{/* First preparation. */}
const manifestData=JSON.parse(await readFile(`${folder}/base.manifest.json`,'utf8'));
const expectedSourceFrames=edit.timeline.clips.flatMap(c=>Array.from({length:c.durationInFrames},(_,i)=>(c.sourceStartFrame+i)/30));
const matchingProof=baseReview?.status==='passed'&&baseReview.sourceSha256===source.sha256&&baseReview.baseSha256===baseHash&&baseReview.frames.length===expectedSourceFrames.length&&manifestData.sha256===baseHash&&manifestData.frameMap.length===expectedSourceFrames.length&&expectedSourceFrames.every((s,i)=>Math.abs(baseReview.frames[i].sourceSeconds-s)<1e-7&&Math.abs(manifestData.frameMap[i].sourceSeconds-s)<1e-7);
if(!matchingProof)python(['scripts/verify-reference-base.py','--folder',folder,'--report',`${report}/base.validation.json`]);else console.log('Reusing hash-bound original/source-PTS frame proof; footage and cuts unchanged');
python(['scripts/verify-steady-music.py','--folder',folder,'--profile',`${folder}/profile.json`,'--report',report]);
const mix=path.join(root,folder,'continuous.mix.wav'),bed=path.join(root,folder,'continuous.bed.wav'),voice=path.join(root,folder,'continuous.voice.wav'),mixHash=await fingerprint(mix);
const pending=path.join(root,work,'render.mp4'),layout=path.join(root,work,'layout.json'),ffmpeg=path.join(root,'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
await writeFile(layout,JSON.stringify(Array.from({length:edit.timeline.durationInFrames},(_,f)=>({...jobViewport(ctx.job,f),image:jobImage(ctx.job,f)}))));
const renderInputs={jobSha256:ctx.jobSha256,presetSha256:ctx.presetSha256,baseHash,mixHash,selectionHash,compositionSha256:await fingerprint('src/design/scenes/EditorialStory.tsx'),scenesSha256:await fingerprint('src/design/scenes/SceneLibrary.tsx'),signalSha256:await fingerprint('src/design/scenes/SignalInfographics.tsx'),contractSha256:await fingerprint('src/director/editorial-job.ts'),visualRendererSha256,visualContractSha256:await fingerprint('src/director/visual-plan.ts'),visualBindings};
if(process.argv.includes('--qc-only')){
 const saved=JSON.parse(await readFile(path.join(work,'render-inputs.json'),'utf8'));
 if(JSON.stringify(saved.inputs)!==JSON.stringify(renderInputs)||saved.outputSha256!==await fingerprint(pending))throw new Error('QC resume rejected: render inputs/output changed');
}else{
const serveUrl=await runtime.bundle();
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromiumOptions:process.env.AI_VIDEO_SOFTWARE_GL==='1'?{gl:'swangle'}:{}});
try{
 const composition=(await getCompositions({serveUrl,inputProps:{jobId:id},puppeteerInstance:browser,port:3113})).find(c=>c.id===ctx.compositionId);if(!composition)throw new Error('Generic composition missing');
 let previous=-1;await renderMedia({serveUrl,composition,inputProps:{jobId:id},puppeteerInstance:browser,port:3113,outputLocation:pending,codec:'h264',crf:18,x264Preset:'veryfast',disallowParallelEncoding:true,ffmpegOverride:({args})=>args.includes('libx264')?[...args.slice(0,-1),'-threads','1','-x264-params','rc-lookahead=8:sync-lookahead=0',args[args.length-1]]:args,pixelFormat:'yuv420p',audioCodec:'aac',audioBitrate:'192k',audioSampleRate:48000,concurrency:1,mediaCacheSizeInBytes:256*1024*1024,offthreadVideoCacheSizeInBytes:64*1024*1024,offthreadVideoThreads:1,logLevel:'error',onProgress:p=>{const step=Math.floor(p.progress*10);if(step!==previous){previous=step;console.log(`${id} render ${step*10}%`);}}});
}finally{await browser.close({silent:true});}
await writeFile(path.join(work,'render-inputs.json'),JSON.stringify({inputs:renderInputs,outputSha256:await fingerprint(pending)},null,2)+'\n');
}
const technical=await verifyVideo(pending,source,{durationInFrames:edit.timeline.durationInFrames});
python(['scripts/verify-reference-media.py','--output',pending,'--base',base,'--layout',layout,'--map',path.join(root,map),'--ffmpeg',ffmpeg,'--voice',voice,'--bed',bed,'--mix',mix,'--report',`${report}/media.json`]);
python(['scripts/check-personal-audio.py','--files',pending,'--report',`${report}/sample-peaks.json`]);
const loud=spawnSync(ffmpeg,['-hide_banner','-nostats','-i',pending,'-map','0:a:0','-vn','-af','loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-c:a','pcm_s16le','-f','null','-'],{encoding:'utf8',maxBuffer:8*1024*1024});
if(loud.error)throw loud.error;if(loud.status!==0)throw new Error('Loudness check failed');
const block=loud.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);if(!block)throw new Error('No loudness measurement');const measured=JSON.parse(block[0]);
if(!Number.isFinite(Number(measured.input_tp))||Number(measured.input_tp)>=0)throw new Error('True peak clips');
await writeFile(`${report}/loudness.json`,JSON.stringify({method:'Input measurements only; normalization output discarded; delivered audio untouched',integratedLufs:Number(measured.input_i),truePeakDbTP:Number(measured.input_tp),raw:measured},null,2)+'\n');
const audio=path.join(root,work,'final.wav'),asrFile=path.join(root,report,'final.asr.json'),manifest=path.join(root,work,'asr-jobs.json');
const extracted=spawnSync(ffmpeg,['-v','error','-y','-threads','1','-i',pending,'-map','0:a:0','-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',audio],{cwd:root,stdio:'inherit'});
if(extracted.error)throw extracted.error;if(extracted.status!==0)throw new Error('Final audio extraction failed');
await writeFile(manifest,JSON.stringify([{media:pending,audio,timeline:'output',output:asrFile}]));
python(['scripts/transcribe-audit.py','--manifest',manifest,'--cache',path.join(root,'.cache/whisper')]);
const asr=JSON.parse(await readFile(asrFile,'utf8'));if(!asr.complete||asr.mediaSha256!==technical.sha256)throw new Error('Partial/stale ASR');
const speech=compareRecognizedSpeech(edit.outputCaptions,asr.words.filter(w=>w.startMs<edit.timeline.durationInFrames*1000/30));
// Disagreements remain review items, never rewrite real speech to please ASR.
// Do not publish an unreviewed lexical discrepancy. A separate evidence record
// must bind this actual output hash and every unresolved item.
let review=null;
if(speech.wordErrors){
 try{review=JSON.parse(await readFile(`${report}/speech-review.json`,'utf8'));}catch{/* Require explicit evidence below. */}
 if(review?.outputSha256!==technical.sha256){
  python(['scripts/transcribe-speech-windows.py','--output',pending,'--bed',bed,'--report',`${report}/final.windows.asr.json`]);
  const evidenceRun=spawnSync(process.execPath,['scripts/review-editorial-speech.mjs','--job',id],{cwd:root,stdio:'inherit'});if(evidenceRun.error)throw evidenceRun.error;if(evidenceRun.status!==0)throw new Error('Unresolved ASR difference: evidence review did not pass');
  review=JSON.parse(await readFile(`${report}/speech-review.json`,'utf8'));
 }
 if(review?.outputSha256!==technical.sha256||JSON.stringify(review.reviewItems)!==JSON.stringify(speech.reviewItems)||!review.evidence?.length)throw new Error(`Final ASR has ${speech.wordErrors} lexical discrepancies; inspect ${asrFile} and record source/waveform evidence before delivery`);
 for(const evidence of review.evidence){if(typeof evidence.file!=='string'||!evidence.file.startsWith('artifacts/')||evidence.file.includes('..')||await fingerprint(evidence.file)!==evidence.sha256)throw new Error('Stale/unsafe speech-review evidence');}
}
if(await fingerprint(base)!==baseHash||await fingerprint(mix)!==mixHash||await fingerprint(ctx.jobFile)!==ctx.jobSha256||await fingerprint(ctx.presetFile)!==ctx.presetSha256||await fingerprint(map)!==selectionHash)throw new Error('Inputs changed during render');
if(JSON.stringify(await bindVisualAssets(ctx.job))!==JSON.stringify(visualBindings)||await fingerprint('src/design/scenes/VisualComponents.tsx')!==visualRendererSha256)throw Error('Visual inputs changed during render');
const director=await directionEvidence(id,ctx.jobSha256);
const file=path.join(root,'out',`${id}.mp4`);await copyFile(pending,file);if(await fingerprint(file)!==technical.sha256)throw new Error('Delivered hash mismatch');
const media=JSON.parse(await readFile(`${report}/media.json`,'utf8'));
await writeFile(`${report}/validation.json`,JSON.stringify({checkedAt:new Date().toISOString(),status:speech.status,technical:{...technical,file},jobSha256:ctx.jobSha256,presetSha256:ctx.presetSha256,baseSha256:baseHash,mixSha256:mixHash,selectionSha256:selectionHash,physical:media.summary,speech,review,lowConfidence:asr.words.filter(w=>w.confidence<.6),artisticApproval:'candidate; user review',limitations:['No continuous human audio audition or human phonetic alignment.','Manual source-specific subject box and color mask, no automatic skin or face detection.','Quotes/list are retained speech, not autonomous semantic inference.']},null,2)+'\n');
console.log(`Actual checked MP4: ${file}; speech ${speech.status}`);
const validationFile=`${report}/validation.json`,validation=JSON.parse(await readFile(validationFile,'utf8'));
validation.director=director;
if(ctx.job.visualUnderstanding){
 validation.visualUnderstanding=ctx.job.visualUnderstanding;
 validation.limitations=validation.limitations.map(text=>text==='Manual source-specific subject box and color mask, no automatic skin or face detection.'?'Manual source-face fallback plus sparse Qwen image observations; no continuous face/gesture tracking. Source-specific color mask remains manual.':text);
}
validation.limitations=validation.limitations.map(text=>text==='Quotes/list are retained speech, not autonomous semantic inference.'?'On-screen quotes derive from retained speech; directing provenance is recorded separately.':text);
await writeFile(validationFile,JSON.stringify(validation,null,2)+'\n');
const delivery=spawnSync(process.execPath,['scripts/editorial-job-delivery.mjs','--job',id],{cwd:root,stdio:'inherit'});if(delivery.error)throw delivery.error;if(delivery.status!==0)throw new Error('Delivery previews failed');
