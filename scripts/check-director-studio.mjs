import {openBrowser} from '@remotion/renderer';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from './lib/media.mjs';
import {validId,writeJson} from './lib/director-workflow.mjs';
const selected=JSON.parse(await readFile(path.join(root,'public/generated/director/selected.json'),'utf8'));
validId(selected.jobId);
if(await fingerprint(path.join(root,'edits',`${selected.jobId}.json`))!==selected.jobSha256)throw new Error('Stale director Studio selection');
const url='http://localhost:3001/DirectorPreview';
const response=await fetch(url,{signal:AbortSignal.timeout(3000)});await response.body?.cancel();
if(!response.ok)throw new Error('Start npm run studio before director:check-studio');
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 await page.goto({url,timeout:60000});
 const observed=await page.evaluate(async()=>{
  for(let i=0;i<120;i++){
   const el=document.querySelector('[data-editorial-job]');
   if(el?.getAttribute('data-visual-qc')==='passed'&&el.querySelector('canvas'))return {jobId:el.getAttribute('data-editorial-job'),geometry:'passed',frame:el.getAttribute('data-checked-frame'),text:el.querySelector('[data-current-speech]')?.textContent??null,canvasLoaded:true};
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  throw new Error('Director composition did not load a guarded video frame');
 });
 if(observed.jobId!==selected.jobId)throw new Error('Studio displays another job');
 const report={at:new Date().toISOString(),status:'passed',url,jobSha256:selected.jobSha256,...observed,limitation:'One loaded Studio frame and four separate storyboard stills do not establish full playback/audition or final MP4 quality.'};
 await writeJson(path.join(root,`artifacts/jobs/${selected.jobId}/director-studio.json`),report);
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close({silent:true});}
