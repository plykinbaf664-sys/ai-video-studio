import {bundle} from '@remotion/bundler';
import {openBrowser,getCompositions,renderMedia} from '@remotion/renderer';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root,inspectSource,fingerprint,verifyVideo,runRemotion} from './lib/media.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
import {validateEditorialDirection,editorialViewport} from '../src/director/editorial-v3.ts';
import {imagePlacement} from '../src/director/scene-direction.ts';
import {compareRecognizedSpeech} from '../src/director/speech-integrity.ts';
const audioOnly=process.argv.includes('--audio-only');
await validateDesignLibrary();const source=await inspectSource();
const directory='artifacts/dry-irony-v3',work=path.join(root,'.cache/dry-irony-v3');await mkdir(work,{recursive:true});
const d=JSON.parse(await readFile('style-presets/directions/dry-irony-v3.json','utf8'));validateEditorialDirection(d);
const selection=JSON.parse(await readFile(`${directory}/selection.json`,'utf8'));
const edit=JSON.parse(await readFile('public/generated/dry-irony-v3/edit.json','utf8'));
const directionSha256=await fingerprint('style-presets/directions/dry-irony-v3.json');
if(source.sha256!==selection.sourceSha256||edit.directionSha256!==directionSha256)throw new Error('Stale source/direction; run npm run prepare:v3');
const python=path.join(root,'.venv-transcribe/Scripts/python.exe'),ffmpeg=path.join(root,'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const invoke=args=>{const r=spawnSync(python,args,{cwd:root,stdio:'inherit',env:{...process.env,PYTHONIOENCODING:'utf-8'}});if(r.error)throw r.error;if(r.status!==0)throw new Error(`V3 check failed: ${args[0]}`);};
const base=path.join(root,'public/generated/dry-irony-v3/footage.mp4'),baseHash=await fingerprint(base);
let cached;try{cached=JSON.parse(await readFile(`${directory}/base.validation.json`,'utf8'));}catch{/* New base. */}
if(cached?.status!=='passed'||cached.baseSha256!==baseHash||cached.sourceSha256!==source.sha256||cached.frames.length!==414)invoke(['scripts/verify-reference-base.py','--folder','public/generated/dry-irony-v3','--report',`${directory}/base.validation.json`]);
const mix=path.join(root,'public/generated/dry-irony-v3/continuous.mix.wav'),bed=path.join(root,'public/generated/dry-irony-v3/continuous.bed.wav'),voice=path.join(root,'public/generated/dry-irony-v3/continuous.voice.wav');
const mixHash=await fingerprint(mix),selectionHash=await fingerprint(`${directory}/selection.json`);
invoke(['scripts/verify-steady-music.py']);
const pending=path.join(work,'render.mp4'),layout=path.join(work,'layout.json');
await writeFile(layout,JSON.stringify(Array.from({length:d.durationInFrames},(_,f)=>{const v=editorialViewport(d,f);return {...v,image:imagePlacement(v)};})));
let videoCopy=null;
if(audioOnly){
 const previous=JSON.parse(await readFile(`${directory}/validation.json`,'utf8'));
 let oldDirection=previous.direction;
 if(!oldDirection){const file=`${directory}/music-before-steady/direction.json`;if(await fingerprint(file)!==previous.directionSha256)throw new Error('No verified previous visual direction');oldDirection=JSON.parse(await readFile(file,'utf8'));}
 const visualKey=dir=>JSON.stringify({...dir,music:undefined});
 if(visualKey(oldDirection)!==visualKey(d)||previous.baseSha256!==baseHash||previous.selectionSha256!==selectionHash||await fingerprint(previous.technical.file)!==previous.technical.sha256)throw new Error('Audio-only operation requires unchanged verified visual edit');
 const mux=spawnSync(ffmpeg,['-v','error','-y','-i',previous.technical.file,'-i',mix,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','libfdk_aac','-b:a','192k','-ar','48000','-t',String(d.durationInFrames/d.fps),pending],{cwd:root,stdio:'inherit'});
 if(mux.error)throw mux.error;if(mux.status!==0)throw new Error('Audio-only mux failed');
 invoke(['scripts/verify-video-copy.py','--before',previous.technical.file,'--after',pending,'--report',`${directory}/video-copy.json`]);
 videoCopy=JSON.parse(await readFile(`${directory}/video-copy.json`,'utf8'));
}else{
const storyboard=JSON.parse(await readFile(`${directory}/storyboard.json`,'utf8'));
if(storyboard.baseSha256!==baseHash||storyboard.directionSha256!==directionSha256)throw new Error('Storyboard is stale; run npm run preview:v3 before long render');
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),outDir:path.join(root,'build'),publicDir:path.join(root,'public')});
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const composition=(await getCompositions({serveUrl,puppeteerInstance:browser,port:3109})).find(c=>c.id==='DryIronyV3');if(!composition)throw new Error('V3 composition missing');
 let previous=-1;await renderMedia({serveUrl,composition,puppeteerInstance:browser,port:3109,outputLocation:pending,codec:'h264',crf:18,pixelFormat:'yuv420p',audioCodec:'aac',audioBitrate:'192k',audioSampleRate:48000,concurrency:1,mediaCacheSizeInBytes:256*1024*1024,offthreadVideoCacheSizeInBytes:64*1024*1024,offthreadVideoThreads:1,logLevel:'error',onProgress:p=>{const step=Math.floor(p.progress*10);if(step!==previous){previous=step;console.log(`Dry Irony v3 ${step*10}%`);}}});
}finally{await browser.close({silent:true});}
}
const technical=await verifyVideo(pending,source,{durationInFrames:d.durationInFrames});
invoke(['scripts/verify-reference-media.py','--output',pending,'--base',base,'--layout',layout,'--map',path.join(root,`${directory}/selection.json`),'--ffmpeg',ffmpeg,'--voice',voice,'--bed',bed,'--mix',mix,'--report',`${directory}/media.json`]);
invoke(['scripts/check-personal-audio.py','--files',pending,'--report',`${directory}/sample-peaks.json`]);
const loud=spawnSync(ffmpeg,['-hide_banner','-nostats','-i',pending,'-map','0:a:0','-vn','-af','loudnorm=I=-16:TP=-1:LRA=11:print_format=json','-c:a','pcm_s16le','-f','null','-'],{encoding:'utf8',maxBuffer:8*1024*1024});
if(loud.error)throw loud.error;if(loud.status!==0)throw new Error('Loudness analysis failed');
const block=loud.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);if(!block)throw new Error('No actual loudness measurement');
const loudness=JSON.parse(block[0]);if(!Number.isFinite(Number(loudness.input_tp))||Number(loudness.input_tp)>=0)throw new Error('Clipping found in actual true-peak analysis');
await writeFile(`${directory}/loudness.json`,JSON.stringify({method:'FFmpeg loudnorm input measurements only; normalization output discarded; final audio untouched',integratedLufs:Number(loudness.input_i),truePeakDbTP:Number(loudness.input_tp),loudnessRangeLU:Number(loudness.input_lra),raw:loudness},null,2)+'\n');
const audio=path.join(work,'final.wav'),asrFile=path.join(root,`${directory}/final.asr.json`),jobs=path.join(work,'asr-jobs.json');
runRemotion(['ffmpeg','-v','error','-y','-i',pending,'-map','0:a:0','-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',audio]);
await writeFile(jobs,JSON.stringify([{media:pending,audio,timeline:'output',output:asrFile}]));
invoke(['scripts/transcribe-audit.py','--manifest',jobs,'--cache',path.join(root,'.cache/whisper')]);
const asr=JSON.parse(await readFile(asrFile,'utf8'));if(!asr.complete||asr.mediaSha256!==technical.sha256)throw new Error('Final ASR is partial/stale');
const speech=compareRecognizedSpeech(selection.outputCaptions,asr.words.filter(w=>w.startMs<d.durationInFrames*1000/d.fps));
if(speech.wordErrors)throw new Error('Final ASR lexical differences require inspection before delivery');
if(await fingerprint(base)!==baseHash||await fingerprint(mix)!==mixHash||await fingerprint('style-presets/directions/dry-irony-v3.json')!==directionSha256||await fingerprint(`${directory}/selection.json`)!==selectionHash)throw new Error('Inputs changed during render/QC');
const file=path.join(root,'out/dry-irony-v3-steady.mp4');await copyFile(pending,file);if(await fingerprint(file)!==technical.sha256)throw new Error('Delivered file hash mismatch');
const media=JSON.parse(await readFile(`${directory}/media.json`,'utf8'));
await writeFile(`${directory}/validation.json`,JSON.stringify({checkedAt:new Date().toISOString(),status:speech.status,technical:{...technical,file},direction:d,directionSha256,videoCopy,baseSha256:baseHash,mixSha256:mixHash,selectionSha256:selectionHash,physical:media.summary,speech,lowConfidence:asr.words.filter(w=>w.confidence<.6),artisticApproval:'candidate; separate user review',limitations:['No continuous human audio audition. Independent ASR and original-waveform checks are complementary evidence.','Manually positioned source-specific feathered face correction, no automatic face/skin detection.']},null,2)+'\n');
console.log(`Actual MP4 created and checked: ${file}; independent ASR ${speech.status}`);
invoke(['scripts/editorial-final-previews.py']);
for(const script of ['scripts/editorial-delivery.mjs','scripts/audit-out.mjs']){const r=spawnSync(process.execPath,[script],{cwd:root,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error(`Delivery failed: ${script}`);}
