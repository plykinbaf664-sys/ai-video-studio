import {bundle} from '@remotion/bundler';
import {openBrowser,getCompositions,renderMedia} from '@remotion/renderer';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root,sourcePath,inspectSource,verifyVideo,fingerprint,runRemotion} from './lib/media.mjs';
import {validateDesignLibrary} from './lib/design-library.mjs';
import {compareRecognizedSpeech} from '../src/director/speech-integrity.ts';
import {viewportAt,imagePlacement} from '../src/director/scene-direction.ts';
const onlyArg=process.argv.slice(2).find(x=>x.startsWith('--only='));
if(process.argv.slice(2).some(x=>x!==onlyArg))throw new Error('Only --only=editorial,signal,paper is supported. Each export must be freshly rendered.');
const only=onlyArg?.slice(7).split(',');
if(only&&(!only.length||only.some(v=>!['editorial','signal','paper'].includes(v))))throw new Error('Unknown scene variant');
await validateDesignLibrary();const source=await inspectSource();
const selection=JSON.parse(await readFile('artifacts/reference-edit/selection.json','utf8'));
if(source.sha256!==selection.sourceSha256)throw new Error('Wrong source');
const python=path.join(root,'.venv-transcribe/Scripts/python.exe'),ffmpeg=path.join(root,'node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');
const invoke=args=>{const r=spawnSync(python,args,{stdio:'inherit',env:{...process.env,PYTHONIOENCODING:'utf-8'}});if(r.error)throw r.error;if(r.status!==0)throw new Error(`Reference QC failed (${r.status})`);};
let baseVerified=false;
try{const b=JSON.parse(await readFile('artifacts/reference-edit/base.validation.json','utf8'));baseVerified=b.status==='passed'&&b.frames.length===450&&b.sourceSha256===source.sha256&&b.baseSha256===await fingerprint('public/generated/reference-edit/footage.mp4');}catch{/* No verified cache. */}
if(baseVerified)console.log('Reusing hash-bound 450-frame original-source cache verification.');else invoke(['scripts/verify-reference-base.py']);
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),outDir:path.join(root,'build'),publicDir:path.join(root,'public')});
const open=()=>openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
let browser=await open();let comps;
try{comps=(await getCompositions({serveUrl,puppeteerInstance:browser,port:3107})).filter(c=>c.id.startsWith('Reference-'));}finally{await browser.close({silent:true});}
for(const composition of comps){
 const variant=composition.id.replace('Reference-','');if(only&&!only.includes(variant))continue;
 const slug={editorial:'editorial-focus',signal:'signal-dynamic',paper:'dry-irony'}[variant];
 const style=JSON.parse(await readFile(`style-presets/runtime/personal-${slug}.json`,'utf8'));
 const work=path.join(root,`.cache/reference-edit/${slug}`);await mkdir(work,{recursive:true});
 const output=path.join(work,'render.mp4'),layout=path.join(work,'layout.json');
 await writeFile(layout,JSON.stringify(Array.from({length:450},(_,f)=>{const v=viewportAt(style.staging,f);return {...v,image:imagePlacement(v)};})));
 let last=-1;
 console.log(`Rendering reference-driven ${slug}`);
 browser=await open();try{await renderMedia({serveUrl,composition,puppeteerInstance:browser,port:3107,outputLocation:output,codec:'h264',crf:18,pixelFormat:'yuv420p',audioCodec:'aac',audioBitrate:'192k',audioSampleRate:48000,concurrency:1,mediaCacheSizeInBytes:256*1024*1024,offthreadVideoCacheSizeInBytes:64*1024*1024,offthreadVideoThreads:1,onProgress:p=>{const i=Math.floor(p.progress*10);if(i!==last){last=i;console.log(`${slug} ${i*10}%`);}},logLevel:'error'});}finally{await browser.close({silent:true});}
 const technical=await verifyVideo(output,source,{durationInFrames:450});
 const mediaReport=path.join(root,`artifacts/reference-edit/${slug}.media.json`);
 invoke(['scripts/verify-reference-media.py','--output',output,'--layout',layout,'--map',path.join(root,'artifacts/reference-edit/selection.json'),'--ffmpeg',ffmpeg,'--voice',path.join(root,`public/generated/reference-edit/${slug}.voice.wav`),'--bed',path.join(root,`public/generated/reference-edit/${slug}.bed.wav`),'--mix',path.join(root,`public/generated/reference-edit/${slug}.mix.wav`),'--report',mediaReport]);
 invoke(['scripts/check-personal-audio.py','--files',output,'--report',path.join(work,'levels.json')]);
 const audio=path.join(work,'final.wav'),jobs=path.join(work,'jobs.json'),asrFile=path.join(root,`artifacts/reference-edit/${slug}.asr.json`);
 runRemotion(['ffmpeg','-v','error','-y','-i',output,'-map','0:a:0','-vn','-ac','1','-ar','16000','-c:a','pcm_s16le',audio]);
 await writeFile(jobs,JSON.stringify([{media:output,audio,timeline:'output',output:asrFile}]));
 invoke(['scripts/transcribe-audit.py','--manifest',jobs,'--cache',path.join(root,'.cache/whisper')]);
 const asr=JSON.parse(await readFile(asrFile,'utf8'));if(!asr.complete||asr.mediaSha256!==technical.sha256)throw new Error('Stale final ASR');
 const speech=compareRecognizedSpeech(selection.outputCaptions,asr.words.filter(w=>w.startMs<15000));
 if(speech.wordErrors)throw new Error(`ASR lexical differences require review: ${slug}`);
 const final=path.join(root,`out/reference-${slug}.mp4`);await copyFile(output,final);
 if(await fingerprint(final)!==technical.sha256)throw new Error('Final copy mismatch');
 const physical=JSON.parse(await readFile(mediaReport,'utf8')),levels=JSON.parse(await readFile(path.join(work,'levels.json'),'utf8'));
 await writeFile(`artifacts/reference-edit/${slug}.validation.json`,JSON.stringify({status:speech.status,technical:{...technical,file:final},physicalSummary:physical.summary,mediaReport,speech,levels,style,styleSha256:await fingerprint(`style-presets/runtime/personal-${slug}.json`),sourceUnchanged:true,manualReview:asr.words.filter(w=>w.confidence<.6),artisticApproval:'pending user review; technical checks do not establish professional quality'},null,2)+'\n');
 console.log(`Created, decoded and checked: ${final}; ASR ${speech.status}`);
}
if(!only||new Set(only).size===3){
 invoke(['scripts/reference-final-previews.py']);
 for(const file of ['scripts/reference-gallery.mjs','scripts/audit-out.mjs','scripts/reference-report.mjs']){
  const result=spawnSync(process.execPath,[file],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;if(result.status!==0)throw new Error(`Delivery report failed: ${file}`);
 }
}
