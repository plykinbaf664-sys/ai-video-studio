import {openBrowser,getCompositions,renderStill} from '@remotion/renderer';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from './lib/media.mjs';
import {loadJob} from './lib/editorial-job.mjs';
import {contactSheet} from './lib/contact-sheet.mjs';
import {editorialRuntime} from './lib/editorial-runtime.mjs';
import {bindVisualAssets} from './lib/visual-library.mjs';
const ctx=await loadJob(),{compiled:edit,folder,report,id}=ctx;
const generated=JSON.parse(await readFile(`${folder}/edit.json`,'utf8'));
if(generated.jobSha256!==ctx.jobSha256||generated.presetSha256!==ctx.presetSha256)throw new Error('Run prepare:story for the changed job/preset');
await mkdir(`${report}/storyboard`,{recursive:true});
const runtime=await editorialRuntime(id),serveUrl=await runtime.bundle();
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromiumOptions:process.env.AI_VIDEO_SOFTWARE_GL==='1'?{gl:'swangle'}:{}}),stills=[];
const visualBindings=await bindVisualAssets(edit.job);
const frames=[...new Set([...edit.scenes.flatMap(s=>[Math.min(s.from+30,s.until-1),Math.max(s.from,s.until-16)]),...(edit.job.visualPlan?.beats.flatMap(b=>[b.from,b.from+12,b.until-1,...(b.nodes??[]).map(n=>n.revealFrame+9)])??[])])].sort((a,b)=>a-b);
try{
 const composition=(await getCompositions({serveUrl,puppeteerInstance:browser,port:3112,inputProps:{jobId:id},timeoutInMilliseconds:120000})).find(c=>c.id===ctx.compositionId);
 if(!composition||composition.durationInFrames!==edit.timeline.durationInFrames)throw new Error('Wrong job composition/clock');
 for(const frame of frames){const file=`${report}/storyboard/frame-${frame}.png`;await renderStill({serveUrl,composition,inputProps:{jobId:id},puppeteerInstance:browser,port:3112,frame,output:path.join(root,file),imageFormat:'png',scale:1/3,mediaCacheSizeInBytes:256*1024*1024,logLevel:'error'});stills.push({frame,file,label:`${(frame/30).toFixed(2)} с · ${edit.scenes.find(s=>frame>=s.from&&frame<s.until).kind}`});console.log(`Storyboard ${frame}: layout guard passed`);}
 let studioRunning=false;try{const response=await fetch('http://localhost:3001',{signal:AbortSignal.timeout(1500)});studioRunning=response.ok;await response.body?.cancel();}catch{/* Interactive Studio is optional for an unattended render. */}
 if(studioRunning&&['dry-irony-story','dry-irony-tight'].includes(id)){
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});
 await page.goto({url:`http://localhost:3001/${ctx.compositionId}`,timeout:60000});
 const studio=await page.evaluate(async()=>{for(let i=0;i<100;i++){const el=document.querySelector('[data-editorial-job]');if(el?.getAttribute('data-visual-qc')==='passed'&&el.querySelector('canvas'))return {loaded:true,job:el.getAttribute('data-editorial-job'),geometry:'passed',text:el.querySelector('[data-current-speech]')?.textContent};await new Promise(r=>setTimeout(r,250));}throw new Error(document.body.innerText.slice(0,1600));});
 await writeFile(`${report}/studio.json`,JSON.stringify(studio,null,2)+'\n');
 }else await writeFile(`${report}/studio.json`,JSON.stringify({loaded:false,status:'not-checked',reason:studioRunning?'Custom job: use the inputProps-selected headless storyboard; Studio defaults to dry-irony-story.':'Studio is not running; headless storyboard is valid. Start npm run studio for interactive preview.'},null,2)+'\n');
}finally{await browser.close({silent:true});}
await contactSheet({output:`${report}/storyboard.png`,title:`${edit.preset.id} · сцены до рендера`,items:stills,columns:4,width:270});
await writeFile(`${report}/storyboard.json`,JSON.stringify({stills,baseSha256:await fingerprint(`${folder}/footage.mp4`),jobSha256:ctx.jobSha256,presetSha256:ctx.presetSha256,visualBindings,visualRendererSha256:await fingerprint('src/design/scenes/VisualComponents.tsx')},null,2)+'\n');
