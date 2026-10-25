/** One-time reversible archival; no deletion. Not a render/Studio hook. */
import {realpath,access,mkdir,rename,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root,fingerprint} from '../lib/media.mjs';
const base=await realpath(root),moves=[];
for(const [from,to] of [['scripts/audit-out.mjs','archives/project-audit-scripts/audit-out-before-rebuild.mjs'],['scripts/finish-project-organization.mjs','scripts/migrations/finish-project-organization.mjs']]){
 const a=path.resolve(base,from),b=path.resolve(base,to);
 if(!a.startsWith(base+path.sep)||!b.startsWith(base+path.sep))throw new Error('Outside workspace');
 try{await access(a);}catch(e){if(e.code==='ENOENT')continue;throw e;}
 if(!(await realpath(a)).startsWith(base+path.sep))throw new Error('Linked source outside workspace');
 try{await access(b);throw new Error('Destination already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
 const sha256=await fingerprint(a);await mkdir(path.dirname(b),{recursive:true});await rename(a,b);
 if(await fingerprint(b)!==sha256)throw new Error('Moved bytes changed');moves.push({from,to,sha256});
}
const file='scripts/migrations/finish-project-organization.mjs';
await writeFile(file,(await readFile(file,'utf8')).replaceAll("'./lib/","'../lib/"));
await writeFile('artifacts/project-audit/closing-moves.json',JSON.stringify({at:new Date().toISOString(),policy:'No deletion; obsolete audit archived and one-time migration separated from active scripts.',moves},null,2)+'\n');
console.log(`Archived ${moves.length} paths; no deletion.`);
