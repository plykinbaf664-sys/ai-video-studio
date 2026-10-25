// Reversible, hash-recorded moves. No file deletion or source-media mutation.
import {mkdir,readFile,readdir,realpath,rename,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from '../lib/media.mjs';
const base=await realpath(root),moves=[];
const safe=relative=>{const p=path.resolve(base,relative);if(!p.startsWith(base+path.sep))throw new Error('Move outside workspace');return p;};
const move=async(from,to)=>{
 const a=safe(from),b=safe(to);try{await access(a);}catch{try{await access(b);moves.push({from,to,status:'already-moved'});}catch{}return;}
 const actual=await realpath(a);if(!actual.startsWith(base+path.sep))throw new Error('Linked move outside workspace');
 try{await access(b);throw new Error(`Destination already exists: ${to}`);}catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(path.dirname(b),{recursive:true});await rename(a,b);moves.push({from,to});
 await mkdir(safe('artifacts/project-audit'),{recursive:true});
 await writeFile(safe('artifacts/project-audit/file-moves.json'),JSON.stringify({at:new Date().toISOString(),policy:'No deletions; source media untouched',moves},null,2)+'\n');
};
await move('ai-video-studio-personal-design-kit-v1','archives/personal-design-kit-v1');
await move('artifacts/personal','artifacts/history/personal-v1');
for(const name of ['editorial-focus','signal-dynamic','dry-irony'])await move(`out/personal-${name}.mp4`,`artifacts/history/personal-v1/out/personal-${name}.mp4`);
try{const p=safe('artifacts/history/personal-v1/comparison.html');const old=await readFile(p,'utf8');await writeFile(p,old.replaceAll('../../out/personal-','out/personal-'));}catch(e){if(e.code!=='ENOENT')throw e;}
await move('src/design/personal','src/legacy/personal-v1');
for(const name of ['editorial-focus','signal-dynamic','dry-irony'])await move(`style-presets/runtime/personal-${name}.json`,`style-presets/archive/personal-v1/personal-${name}.json`);
await move('style-presets/personal','style-presets/archive/design-kit-specs');
for(const name of ['CODEX_HANDOFF.md','DESIGN_KIT_START_HERE.md','START_HERE.md','README_CONTEXT_ENGINEERING.md','README_CONTEXT_ENGINEERING.md'])await move(name,`docs/history/design-kit/${name}`);
for(const name of ['ARCHITECTURE','SYSTEM_MAP','VERIFICATION','PROJECT_CONTEXT','DECISIONS','STYLE_SYSTEM','DESIGN_SYSTEM_PLAN','DESIGN_LIBRARY_STATUS','PERSONAL_WORKFLOW','PERSONAL_DESIGN_SYSTEM','PERSONAL_DESIGN_QC','STAGE1_STATUS','STAGE2_STATUS','BASELINE_VISUAL_QC','SPEECH_SYNC_QC','STYLE_DIRECTION_BRIEF','OUT_CLEANUP_PLAN','AGENT_WORK_STYLE'])await move(`docs/${name}.md`,`docs/history/${name}.md`);
// Legacy out contains code, data and QC evidence. Preserve all of it outside delivery.
for(const item of await readdir(safe('out'),{withFileTypes:true})){
 if(item.isFile()&&item.name.toLowerCase().endsWith('.mp4'))continue;
 await move(`out/${item.name}`,`artifacts/legacy-out/${item.name}`);
}
await mkdir(safe('artifacts/reports'),{recursive:true});
for(const name of ['semantic-cut.verification.json','first-test.verification.json','source-metadata.json','edit-plan.validation.json','semantic-output-captions.json']){
 const from=`artifacts/legacy-out/${name}`;try{const text=await readFile(safe(from),'utf8');await writeFile(safe(`artifacts/reports/${name}`),text);}catch(e){if(e.code!=='ENOENT')throw e;}
}
await mkdir(safe('artifacts/project-audit'),{recursive:true});
await writeFile(safe('artifacts/project-audit/file-moves.json'),JSON.stringify({at:new Date().toISOString(),policy:'No deletions; original media untouched; archived evidence preserves original verification paths',moves},null,2)+'\n');
console.log(`Reorganized ${moves.length} paths without deletion`);
