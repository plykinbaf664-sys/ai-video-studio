/** Read-only inventory. Unknown files are reported, never deleted or moved. */
import {readFile,readdir,lstat,mkdir,writeFile,access,copyFile,constants} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from './lib/media.mjs';
const entries=[];
for(const name of (await readdir(path.join(root,'out'))).sort()){
 const file=path.join(root,'out',name),s=await lstat(file);
 if(s.isSymbolicLink()||!s.isFile()||!name.toLowerCase().endsWith('.mp4')||/pending/i.test(name))throw new Error(`Unexpected delivery entry, preserve for review: ${name}`);
 let evidence;
 const jobId=name.slice(0,-4);let registeredJob=false;
 if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(jobId))try{await access(path.join(root,'edits',`${jobId}.json`));registeredJob=true;}catch(error){if(error.code!=='ENOENT')throw error;}
 if(registeredJob){
  const report=JSON.parse(await readFile(path.join(root,`artifacts/jobs/${jobId}/validation.json`),'utf8'));
  evidence={reportSha256:report.technical.sha256,technicalDecode:report.technical.fullDecode,speechStatus:report.speech.status};
 }
 if(name==='dry-irony-v3-steady.mp4'){
  const report=JSON.parse(await readFile(path.join(root,'artifacts/dry-irony-v3/validation.json'),'utf8'));
  evidence={reportSha256:report.technical.sha256,technicalDecode:report.technical.fullDecode,speechStatus:report.speech.status};
 }
 if(name==='dry-irony-v3.mp4'){
  const report=JSON.parse(await readFile(path.join(root,'artifacts/dry-irony-v3/music-before-steady/validation.json'),'utf8'));
  evidence={reportSha256:report.technical.sha256,technicalDecode:report.technical.fullDecode,speechStatus:report.speech.status,note:'Preserved previous music treatment'};
 }
 if(name.startsWith('reference-')){
  const report=JSON.parse(await readFile(path.join(root,`artifacts/reference-edit/${name.slice(10,-4)}.validation.json`),'utf8'));
  evidence={reportSha256:report.technical.sha256,technicalDecode:report.technical.fullDecode,speechStatus:report.speech.status};
 }
 const sha256=await fingerprint(file);if(evidence&&evidence.reportSha256!==sha256)throw new Error('Stale delivery report');
 entries.push({file:`out/${name}`,bytes:s.size,sha256,classification:'finished-video',...(evidence?{evidence}:{note:'Historical technical export; retained, not a current style preview.'})});
}
const protectedFiles=[];
for(const file of ['public/source.mp4','public/generated/edit-plan.json','public/generated/transcript.json','public/generated/reference-edit/edit.json','assets/catalog.json','brandbooks/catalog.json','reference-library/catalog.json']){await access(path.join(root,file));protectedFiles.push({file,sha256:await fingerprint(path.join(root,file))});}
const retainedHistory=[];
for(const slug of ['editorial-focus','signal-dynamic','dry-irony']){
 const file=`artifacts/history/personal-v1/out/personal-${slug}.mp4`,old=JSON.parse(await readFile(`artifacts/history/personal-v1/${slug}.validation.json`,'utf8'));
 const sha256=await fingerprint(path.join(root,file));if(sha256!==old.technical.sha256)throw new Error(`Historical video changed ${slug}`);
 retainedHistory.push({file,sha256,originalReportHashMatches:true});
}
const source=protectedFiles.find(x=>x.file==='public/source.mp4');
if(source.sha256!=='7db3f25c076c82732d8481c37233ac0d017c0ab70923ae233e1f198cecac471c')throw new Error('Original source changed');
const semantic=entries.find(x=>x.file==='out/semantic-cut-synced.mp4');
if(semantic&&semantic.sha256!=='60f78ec2fa728e02f40a528080c7073477bcbe5b59fdaa08fd15092196052d3e')throw new Error('Preserved semantic export changed');
// User confirmed removing the old deliveries on 2026-10-23. Preserve the dated
// inventory as evidence; absent exports are not dependencies of the renderer.
const baselineFile='artifacts/project-audit/out.before-user-cleanup-2026-10-23.json';
try{await copyFile(path.join(root,'artifacts/project-audit/out.inventory.json'),path.join(root,baselineFile),constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}
const baseline=JSON.parse(await readFile(path.join(root,baselineFile),'utf8'));
const absentHistoricalExports=baseline.entries.filter(old=>!entries.some(current=>current.file===old.file)).map(old=>({file:old.file,lastRecordedSha256:old.sha256,present:false,note:'User confirmed removing previous exports on 2026-10-23; not reverified or restored.'}));
const report={at:new Date().toISOString(),status:'passed',policy:'Inventory only. No deletion. Pending/cache/reports never target out/. Historical exports may be removed by the user; verify evidence and protected hashes for files that are present. Source, editing data and archived originals remain required.',entries,protectedFiles,retainedHistory,historicalBaseline:baselineFile,absentHistoricalExports};
await mkdir(path.join(root,'artifacts/project-audit'),{recursive:true});
await writeFile(path.join(root,'artifacts/project-audit/out.inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,finishedVideos:entries.length,historicalVideosVerified:retainedHistory.length,sourceUnchanged:true,report:'artifacts/project-audit/out.inventory.json'},null,2));
