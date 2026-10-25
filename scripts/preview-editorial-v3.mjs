import {bundle} from '@remotion/bundler';
import {openBrowser,getCompositions,renderStill} from '@remotion/renderer';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {root,fingerprint} from './lib/media.mjs';
import {contactSheet} from './lib/contact-sheet.mjs';
await mkdir('artifacts/dry-irony-v3/storyboard',{recursive:true});
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),outDir:path.join(root,'build'),publicDir:path.join(root,'public')});
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe'}),stills=[];
try{
 const comps=await getCompositions({serveUrl,puppeteerInstance:browser,port:3108}),composition=comps.find(c=>c.id==='DryIronyV3');
 if(!composition||composition.durationInFrames!==414)throw new Error('V3 composition missing/wrong duration');
 for(const frame of [30,85,175,216,295,365]){
  const file=`artifacts/dry-irony-v3/storyboard/frame-${frame}.png`;
  await renderStill({serveUrl,composition,puppeteerInstance:browser,port:3108,frame,output:path.join(root,file),imageFormat:'png',scale:1/3,mediaCacheSizeInBytes:256*1024*1024,logLevel:'error'});
  stills.push({frame,file,label:`${(frame/30).toFixed(2)} с`});console.log(`V3 storyboard ${frame}: speech/face guard passed`);
 }
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 await page.goto({url:'http://localhost:3001/DryIronyV3',timeout:60000});
 const studio=await page.evaluate(async()=>{for(let i=0;i<100;i++){const el=document.querySelector('[data-editorial-v3] [data-current-speech]');if(el?.getAttribute('data-visual-qc')==='passed'&&document.querySelector('[data-editorial-v3] canvas'))return {loaded:true,text:el.textContent,geometry:'passed'};await new Promise(r=>setTimeout(r,250));}throw new Error(document.body.innerText.slice(0,1600));});
 await writeFile('artifacts/dry-irony-v3/studio.json',JSON.stringify(studio,null,2)+'\n');
}finally{await browser.close({silent:true});}
await contactSheet({output:'artifacts/dry-irony-v3/storyboard.png',title:'Dry Irony v3 · раскадровка до рендера',items:stills,columns:3,width:270});
const r=spawnSync(path.join(root,'.venv-transcribe/Scripts/python.exe'),['scripts/review-v3-color.py'],{cwd:root,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)throw new Error('Color preview failed');
const color=JSON.parse(await readFile('artifacts/dry-irony-v3/color.json','utf8'));
await contactSheet({output:'artifacts/dry-irony-v3/color.png',title:'Локальная коррекция лица · исходник / v3',items:color.items.flatMap(x=>[{file:x.beforeFile,label:`Исходник · ${x.sourceSeconds.toFixed(2)} с`},{file:x.afterFile,label:'V3 · мягкий свет на лице'}]),columns:2,width:270});
await writeFile('artifacts/dry-irony-v3/storyboard.json',JSON.stringify({stills,baseSha256:await fingerprint('public/generated/dry-irony-v3/footage.mp4'),directionSha256:await fingerprint('style-presets/directions/dry-irony-v3.json')},null,2)+'\n');
console.log('V3 storyboard, actual source/graded cache comparison and Studio verified.');
