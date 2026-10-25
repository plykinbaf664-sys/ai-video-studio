import {bundle} from '@remotion/bundler';
import {openBrowser,getCompositions,renderStill} from '@remotion/renderer';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from './lib/media.mjs';
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),outDir:path.join(root,'build'),publicDir:path.join(root,'public')});
await mkdir('artifacts/reference-edit/previews',{recursive:true});
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const comps=(await getCompositions({serveUrl,puppeteerInstance:browser,port:3106})).filter(c=>c.id.startsWith('Reference-'));
 for(const composition of comps)for(const frame of [30,80,195,285,330,397]){
  await renderStill({serveUrl,composition,puppeteerInstance:browser,port:3106,frame,output:path.join(root,`artifacts/reference-edit/previews/${composition.id}-${frame}.png`),imageFormat:'png',scale:.5,mediaCacheSizeInBytes:256*1024*1024,logLevel:'error'});
  console.log(`Visual check ${composition.id} ${frame}`);
 }
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});await page.goto({url:'http://localhost:3001/Reference-signal',timeout:60000});
 const studio=await page.evaluate(async()=>{const end=Date.now()+25000;while(Date.now()<end){const card=document.querySelector('[data-current-speech]');if(card?.getAttribute('data-visual-qc')==='passed'&&document.querySelector('[data-reference-frame] canvas'))return {loaded:true,text:card.textContent,geometry:'passed'};await new Promise(r=>setTimeout(r,200));}throw new Error(document.body.innerText.slice(0,1200));});
 await writeFile('artifacts/reference-edit/studio.json',JSON.stringify(studio,null,2)+'\n');
}finally{await browser.close({silent:true});}
