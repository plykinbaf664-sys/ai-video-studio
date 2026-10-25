import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser,getCompositions,renderStill} from '@remotion/renderer';
import {editorialRuntime} from './lib/editorial-runtime.mjs';
import {contactSheet} from './lib/contact-sheet.mjs';
import {fingerprint} from './lib/media.mjs';
await mkdir('artifacts/visual-library/previews',{recursive:true});
const runtime=await editorialRuntime('context-domestic-001'),serveUrl=await runtime.bundle(),items=[];
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromiumOptions:{gl:'swangle'}});
try{
 for(const styleId of ['signal-dynamic','editorial-focus','dry-irony']){
  const composition=(await getCompositions({serveUrl,inputProps:{styleId},puppeteerInstance:browser,port:3114,timeoutInMilliseconds:120000})).find(c=>c.id==='VisualLibraryLab');
  for(const frame of [80,200,320]){
   const file=`artifacts/visual-library/previews/${styleId}-${frame}.png`;
   await renderStill({serveUrl,composition,inputProps:{styleId},puppeteerInstance:browser,port:3114,frame,output:file,scale:1/3,logLevel:'error'});
   items.push({file,frame,styleId,sha256:await fingerprint(file),label:`${styleId} · ${['process','comparison','system'][Math.floor(frame/120)]}`});console.log(`Diagram preview: ${styleId} ${frame}`);
  }
 }
}finally{await browser.close({silent:true});}
await contactSheet({output:'artifacts/visual-library/diagrams.png',title:'Параметрические схемы · демонстрация без исходника',items,columns:3,width:270});
await writeFile('artifacts/visual-library/previews.json',JSON.stringify({status:'rendered-not-source-video',rendererSha256:await fingerprint('src/design/scenes/VisualComponents.tsx'),labSha256:await fingerprint('src/design/scenes/VisualLibraryLab.tsx'),items},null,2)+'\n');
