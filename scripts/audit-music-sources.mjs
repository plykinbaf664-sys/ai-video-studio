import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const directory='artifacts/reference-audit';await mkdir(directory,{recursive:true});
const licenseUrl='https://mixkit.co/license/modal/musicFree/';
const response=await fetch(licenseUrl);if(!response.ok)throw new Error('License page unavailable');
await writeFile(`${directory}/mixkit-music-license.html`,await response.text());
const names=['mixkit-feedback-dreams-588.mp3','mixkit-hip-hop-02-738.mp3','mixkit-relax-beat-292.mp3','mixkit-vastness-184.mp3'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const results=await Promise.allSettled(names.map(async name=>{
 const file=`assets/library/music/${name}`,local=await readFile(file),url=`https://assets.mixkit.co/music/preview/${name}`;
 const r=await fetch(url);if(!r.ok)throw new Error(`${name}: official CDN ${r.status}`);
 const official=Buffer.from(await r.arrayBuffer());
 return {file,url,bytes:local.length,localSha256:sha(local),officialSha256:sha(official),officialBytesMatch:sha(local)===sha(official),licenseUrl,checkedAt:new Date().toISOString(),usage:'Local audiovisual montage with user-provided files; see official saved license; no standalone redistribution'};
}));
await writeFile(`${directory}/music-sources.json`,JSON.stringify(results.map((r,i)=>r.status==='fulfilled'?r.value:{file:names[i],error:String(r.reason)}),null,2)+'\n');
results.forEach(r=>console.log(r.status==='fulfilled'?`${r.value.file}: official bytes match=${r.value.officialBytesMatch}`:String(r.reason)));
