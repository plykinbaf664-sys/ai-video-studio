import {readFile,writeFile} from 'node:fs/promises';
import {openBrowser} from '@remotion/renderer';
const items=JSON.parse(await readFile('artifacts/reference-audit/videos.json','utf8'));
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 for(const item of items){for(let start=0;start<item.samples.length;start+=24){
  const samples=item.samples.slice(start,start+24);const figures=[];
  for(const s of samples)figures.push(`<figure><img src="data:image/png;base64,${(await readFile(s.file)).toString('base64')}"><figcaption>${s.time.toFixed(2)}s</figcaption></figure>`);
  await page.setViewport({width:1120,height:Math.ceil(samples.length/6)*348+50,deviceScaleFactor:1});
  const html=`<meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:10px;background:#191919;color:white}h1{font:20px Arial;margin:0 0 10px}main{display:grid;grid-template-columns:repeat(6,180px);gap:4px}figure{margin:0}img{display:block;width:180px;height:320px}figcaption{font:16px Arial;height:24px}</style><h1>${item.file} · ${start*3}–${Math.min(item.duration,(start+24)*3)}s</h1><main>${figures.join('')}</main>`;
  await page.goto({url:'about:blank',timeout:30000});await page.evaluate(async content=>{document.write(content);document.close();await Promise.all([...document.images].map(x=>x.decode()));},html);
  const shot=await page._client().send('Page.captureScreenshot',{format:'png'});
  const name=item.file.split('/').pop().replace('.MP4','');await writeFile(`artifacts/reference-audit/${name}-${start}.png`,Buffer.from(shot.value.data,'base64'));
 }}
}finally{await browser.close({silent:true});}
