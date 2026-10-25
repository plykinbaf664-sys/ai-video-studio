import {readFile,writeFile} from 'node:fs/promises';
import {openBrowser} from '@remotion/renderer';
export const contactSheet=async({output,title,items,columns=3,width=320})=>{
 const height=Math.round(width*16/9),figures=[];
 for(const item of items)figures.push(`<figure><img src="data:image/png;base64,${(await readFile(item.file)).toString('base64')}"><figcaption>${item.label}</figcaption></figure>`);
 const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromiumOptions:process.env.AI_VIDEO_SOFTWARE_GL==='1'?{gl:'swangle'}:{}});
 try{
  const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  await page.setViewport({width:columns*(width+10)+38,height:Math.ceil(items.length/columns)*(height+42)+90,deviceScaleFactor:1});
  const html=`<meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#18191e;color:#f6f3ec;font:16px Arial}h1{font-size:23px;margin:0 0 22px}main{display:grid;grid-template-columns:repeat(${columns},${width}px);gap:10px}figure{margin:0}img{display:block;width:${width}px;height:${height}px}figcaption{padding:10px 0;height:32px;font-size:14px}</style><h1>${title}</h1><main>${figures.join('')}</main>`;
  await page.goto({url:'about:blank',timeout:30000});await page.evaluate(async t=>{document.write(t);document.close();await Promise.all([...document.images].map(x=>x.decode()));},html);
  const shot=await page._client().send('Page.captureScreenshot',{format:'png'});await writeFile(output,Buffer.from(shot.value.data,'base64'));
 }finally{await browser.close({silent:true});}
};
