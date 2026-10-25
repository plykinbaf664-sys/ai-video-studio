import {readFile,writeFile} from 'node:fs/promises';
import {openBrowser} from '@remotion/renderer';
const folder='artifacts/reference-edit';
const data=JSON.parse(await readFile(`${folder}/final-previews.json`,'utf8'));
const names={'editorial-focus':'Editorial Focus','signal-dynamic':'Signal Dynamic','dry-irony':'Dry Irony'};
const notes={'editorial-focus':'Полноэкранный ведущий, текст без карточек, мотивированное приближение. Feedback Dreams с приглушением под речь.','signal-dynamic':'Разделённый экран, связанные графические карточки и два графических отступления. Hip Hop 02, остановка музыки перед развязкой.','dry-irony':'Светлая редакционная композиция, отдельное окно ведущего и крупные произнесённые цитаты. Relax Beat и музыкальная пауза.'};
const figures=[];
for(const item of data.items){
 const images=await Promise.all(item.stills.map(async s=>`<figure><img src="data:image/png;base64,${(await readFile(s.file)).toString('base64')}"><figcaption>${s.seconds.toFixed(2)} с</figcaption></figure>`));
 figures.push(`<section><h2>${names[item.slug]}</h2><div class="frames">${images.join('')}</div></section>`);
}
const css=`*{box-sizing:border-box}body{margin:0;padding:24px;background:#18191e;color:#f6f3ec;font-family:Arial,sans-serif}h1{font-size:25px;margin:0 0 8px}p{font-size:16px;color:#b9b7b5;margin:0 0 18px}main{display:flex;gap:20px}section{width:384px}h2{font-size:19px;margin:0 0 12px}.frames{display:grid;grid-template-columns:repeat(2,190px);gap:4px}figure{margin:0}img{display:block;width:190px;height:338px}figcaption{font-size:14px;padding:6px 0 10px}`;
const browser=await openBrowser('chrome',{browserExecutable:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 await page.setViewport({width:1240,height:850,deviceScaleFactor:1});
 const html=`<meta charset="utf-8"><style>${css}</style><h1>Один речевой монтаж — три сценических решения</h1><p>Кадры извлечены из готовых MP4. 15 секунд · 1080 × 1920 · 30 fps</p><main>${figures.join('')}</main>`;
 await page.goto({url:'about:blank',timeout:30000});await page.evaluate(async content=>{document.write(content);document.close();await Promise.all([...document.images].map(x=>x.decode()));},html);
 const shot=await page._client().send('Page.captureScreenshot',{format:'png'});
 await writeFile(`${folder}/comparison.png`,Buffer.from(shot.value.data,'base64'));
}finally{await browser.close({silent:true});}
const sections=data.items.map(item=>`<section><h2>${names[item.slug]}</h2><video controls preload="metadata" playsinline src="../../${item.file}" poster="previews/final-${item.slug}-195.png"></video><p>${notes[item.slug]}</p><a href="../../${item.file}">Открыть MP4</a><div class="stills">${item.stills.map(s=>`<a href="previews/${s.file.split('/').pop()}"><img src="previews/${s.file.split('/').pop()}" alt="Кадр ${s.frame}, ${s.seconds.toFixed(2)} с"></a>`).join('')}</div></section>`).join('');
await writeFile(`${folder}/index.html`,`<!doctype html><html lang="ru"><meta charset="utf-8"><title>AI Video Studio — новый монтаж по референсам</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px/1.5 Arial;background:#18191e;color:#f6f3ec;margin:24px}main{display:grid;grid-template-columns:repeat(3,minmax(220px,1fr));gap:28px;max-width:1300px}video{width:100%;max-height:650px;background:#09090b}h1{font-size:26px}h2{font-size:21px}p{color:#bbb;max-width:1100px}a{color:#efa36c}.stills{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:20px}.stills img{width:100%}@media(max-width:850px){main{grid-template-columns:1fr}}</style><h1>Один реальный фрагмент — три варианта</h1><p>15 с · 1080 × 1920 · 30 fps. Звук включается в каждом плеере отдельно. Речь/исходные склейки общие; композиция, графика и музыка различаются. Технические проверки выполнены. Художественное утверждение остаётся отдельной оценкой.</p><main>${sections}</main><p>Точность ASR: в Signal и Dry Irony начало слова «И» оценивается распознавателем на 0.36–0.40 с раньше; исходный звук сохранён, waveform всех 22 слов совпадает без измеримого сдвига. Отмечено для слуховой проверки 9.7–10.8 с. Низкая уверенность ASR у «я»/«тоже» перечислена в отчёте.</p><p><a href="../../docs/REFERENCE_EDIT_QC.md">Отчёт проверки</a> · <a href="http://localhost:3001/Reference-editorial">Remotion Studio</a></p></html>`);
console.log(`${folder}/comparison.png and index.html created from 12 actual MP4 stills.`);
