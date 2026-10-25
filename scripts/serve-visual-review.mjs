import {createServer} from 'node:http';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {root} from './lib/media.mjs';
const run=process.argv[2],port=Number(process.argv[3]??3105);
if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(run??'')||!Number.isInteger(port)||port<1024||port>65535)throw Error('Use <run-id> [port]');
const isLibrary=run==='library',prefixes=isLibrary?['artifacts/visual-library/','artifacts/jobs/context-domestic-001/','artifacts/jobs/context-domestic-002/','artifacts/jobs/context-domestic-003/','assets/library/visuals/']:[`artifacts/visual/${run}/`,`artifacts/jobs/${run}-a/`,`artifacts/jobs/${run}-b/`];
const mime={'.html':'text/html; charset=utf-8','.md':'text/plain; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'};
createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\//,'');
  if(!name){res.writeHead(302,{Location:isLibrary?'/artifacts/visual-library/index.html':`/artifacts/visual/${run}/comparison.html`});res.end();return;}
  const delivered=isLibrary?['out/context-domestic-001.mp4','out/context-domestic-002.mp4','out/context-domestic-003.mp4'].includes(name):name===`out/${run}-a.mp4`||name===`out/${run}-b.mp4`;
  if(!['GET','HEAD'].includes(req.method)||name.includes('..')||name.includes('\\')||!(prefixes.some(p=>name.startsWith(p))||delivered)){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,name),info=await stat(file);
  if(!info.isFile()){res.writeHead(404);res.end();return;}
  let start=0,end=info.size-1,status=200;
  const headers={'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
  if(req.headers.range){
   const r=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
   if(!r||(!r[1]&&!r[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   if(!r[1])start=Math.max(0,info.size-Number(r[2]));else{start=Number(r[1]);if(r[2])end=Math.min(end,Number(r[2]));}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return;}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);
  if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }catch{if(!res.headersSent)res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Local read-only review: http://127.0.0.1:${port}/${isLibrary?'artifacts/visual-library/index.html':`artifacts/visual/${run}/comparison.html`}`));
