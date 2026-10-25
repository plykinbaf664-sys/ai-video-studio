import {readFile,writeFile,mkdir,copyFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {root,fingerprint,probe} from './media.mjs';
const read=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const visualSnapshot=a=>({id:a.id,sha256:a.sha256,...Object.fromEntries(['kind','template','domains','intents','styles','rights','provenanceFile','aesthetic','subjects','castId','photoSafety'].filter(k=>a.visual[k]!==undefined).map(k=>[k,a.visual[k]])),...(a.runtimeFile?{runtimeFile:a.runtimeFile}:{})});
export const visualLibrary=async()=>{
 const catalog=await read('assets/catalog.json'),entries=catalog.items.filter(a=>a.visual);
 for(const a of entries){
  if(!a.path.startsWith('assets/')||a.path.includes('..')||/[\\:]/.test(a.path)||!a.visual.provenanceFile.startsWith('assets/')||a.visual.provenanceFile.includes('..')||/[\\:]/.test(a.visual.provenanceFile)||a.visual.provenanceFile!==a.license.file||await fingerprint(path.join(root,a.path))!==a.sha256)throw Error(`Visual library: stale/unsafe asset ${a.id}`);
  const provenance=await read(a.visual.provenanceFile);
  if(provenance.assetSha256!==a.sha256||provenance.id!==a.id||!['project-original','generated','licensed'].includes(a.visual.rights)||!provenance.origin||!provenance.review?.usable)throw Error(`Visual library: missing rights/origin review ${a.id}`);
  if(a.visual.rights==='licensed'&&(!provenance.licenseUrl||!provenance.sourcePage||!provenance.author||!provenance.attribution||!provenance.review.originVerifiedAt))throw Error(`Visual library: unverified third-party rights ${a.id}`);
  if(a.visual.kind==='template'){const descriptor=await read(a.path);if(descriptor.version!==1||descriptor.template!==a.visual.template||descriptor.renderer!=='src/design/scenes/VisualComponents.tsx')throw Error(`Visual library: unsupported template implementation ${a.id}`);}
 }
 return entries;
};
export const retrieveVisuals=(entries,{domain,intent,style,query='',subject,aesthetic})=>entries.filter(a=>a.visual.domains.includes(domain)&&a.visual.intents.includes(intent)&&a.visual.styles.includes(style)&&(!subject||a.visual.subjects?.includes(subject))&&(!aesthetic||a.visual.aesthetic===aesthetic)).map(a=>({asset:a,score:a.visual.tags.reduce((score,t)=>score+(query.toLocaleLowerCase().includes(t.toLocaleLowerCase())?1:0),0)})).sort((a,b)=>b.score-a.score||a.asset.id.localeCompare(b.asset.id));
export const bindVisualAssets=async(job,{stage=false}={})=>{
 if(!job.visualPlan)return [];
 const entries=await visualLibrary(),bound=[];
 for(const snapshot of job.visualPlan.assets){
  const asset=entries.find(a=>a.id===snapshot.id);
  if(!asset||JSON.stringify(visualSnapshot(asset))!==JSON.stringify(snapshot))throw Error(`Visual library: changed/unregistered asset snapshot ${snapshot.id}`);
  if(stage&&asset.runtimeFile){const target=path.join(root,'public',asset.runtimeFile);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(root,asset.path),target);}
  if(asset.runtimeFile&&!stage&&await fingerprint(path.join(root,'public',asset.runtimeFile))!==asset.sha256)throw Error(`Visual library: stale staged file ${asset.id}`);
  bound.push({id:asset.id,sha256:asset.sha256,provenanceFile:asset.visual.provenanceFile,provenanceSha256:await fingerprint(path.join(root,asset.visual.provenanceFile))});
 }
 return bound;
};
/** Keyword discovery receives a generic public query, never source frames/transcripts. Results are not cleared assets. */
export const searchOpenverse=async query=>{
 if(typeof query!=='string'||query.length<3||query.length>120)throw Error('Use a short generic public asset query');
 const url=new URL('https://api.openverse.org/v1/images/');url.search=new URLSearchParams({q:query,page_size:'8',license:'cc0,by',license_type:'commercial,modification',mature:'false'}).toString();
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error(`Openverse ${response.status}; no retries or fallback uploads`);
 const data=await response.json();
 return {provider:'Openverse',query,at:new Date().toISOString(),status:'discovered-not-cleared',notice:'Verify the original page and license, identifiable people, brands and context before registration. No download or render yet.',results:data.results.map(a=>({id:a.id,title:a.title,author:a.creator,sourcePage:a.foreign_landing_url,url:a.url,license:a.license,licenseUrl:a.license_url,attribution:a.attribution,provider:a.provider,width:a.width,height:a.height}))};
};
export const searchCommons=async(query,{fetchImpl=fetch}={})=>{
 if(typeof query!=='string'||query.length<3||query.length>120)throw Error('Use a short generic public asset query');
 const url=new URL('https://commons.wikimedia.org/w/api.php');url.search=new URLSearchParams({action:'query',generator:'search',gsrsearch:query,gsrnamespace:'6',gsrlimit:'8',prop:'imageinfo',iiprop:'url|extmetadata|size',iiurlwidth:'640',format:'json'}).toString();
 const response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),redirect:'error',headers:{Accept:'application/json'}});if(!response.ok)throw Error(`Wikimedia Commons ${response.status}`);
 const data=await response.json();if(data.error)throw Error('Wikimedia Commons search failed');
 const plain=value=>String(value??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"');
 return {provider:'Wikimedia Commons',query,at:new Date().toISOString(),status:'discovered-not-cleared',notice:'Metadata only. Verify the original page and exact license, attribution/share-alike, identifiable people and intended context before registration.',results:Object.values(data.query?.pages??{}).map(page=>{const image=page.imageinfo?.[0],m=image?.extmetadata??{};return {id:String(page.pageid),title:page.title,author:plain(m.Artist?.value),sourcePage:image?.descriptionurl,url:image?.url,previewUrl:image?.thumburl,license:plain(m.LicenseShortName?.value),licenseUrl:plain(m.LicenseUrl?.value),attribution:plain(m.Credit?.value),restrictions:plain(m.Restrictions?.value),width:image?.width,height:image?.height};}).filter(a=>a.url&&a.sourcePage)};
};
/** Register a local selected image + explicit origin review, never arbitrary remote render URLs. */
export const registerVisual=async(record,sourceFile)=>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id??'')||!['.png','.jpg','.webp'].includes(path.extname(sourceFile).toLowerCase()))throw Error('Use a versioned id and local PNG/JPEG/WebP');
 const catalog=await read('assets/catalog.json');if(catalog.items.some(a=>a.id===record.id))throw Error('Asset ids are immutable: register a new version');
 if(!record.review?.usable||!record.origin||!record.tags?.length||!record.domains?.length||!record.intents?.length||!record.styles?.length||!record.width||!record.height||!['generated','project-original','licensed'].includes(record.rights))throw Error('Incomplete visual record');
 if(record.rights==='licensed'&&(!record.licenseUrl||!record.sourcePage||!record.author||!record.attribution||!record.review.originVerifiedAt))throw Error('Third-party asset needs original-page/license review and attribution');
 const source=await realpath(sourceFile),folder=`assets/library/visuals/${record.id}`,assetPath=`${folder}/illustration${path.extname(sourceFile).toLowerCase()}`,provenanceFile=`${folder}/provenance.json`,sha256=await fingerprint(source);
 const entry={id:record.id,kind:'graphic',path:assetPath,sha256,usage:'candidate',runtimeFile:`generated/assets/visuals/${record.id}${path.extname(sourceFile).toLowerCase()}`,license:{label:record.rights==='generated'?'AI-generated fictional artwork; provenance and terms review':record.rights==='project-original'?'Original project artwork':record.licenseUrl,file:provenanceFile,source:record.sourcePage??record.origin},visual:{version:1,kind:'illustration',domains:record.domains,intents:record.intents,styles:record.styles,tags:record.tags,rights:record.rights,provenanceFile,width:record.width,height:record.height,...Object.fromEntries(['aesthetic','subjects','castId','photoSafety'].filter(k=>record[k]!==undefined).map(k=>[k,record[k]]))}};
 const schema=await read('contracts/design-library.schema.json'),ajv=new Ajv2020({allErrors:true}).addSchema(schema),validate=ajv.getSchema(`${schema.$id}#/$defs/asset`);
 if(!validate(entry))throw Error(`Visual registration schema: ${JSON.stringify(validate.errors)}`);
 const media=probe(source),image=media.streams.find(s=>s.codec_type==='video');
 if(!image||!['png','mjpeg','webp'].includes(image.codec_name)||image.width!==record.width||image.height!==record.height)throw Error('Visual registration: actual image format/dimensions differ from record');
 await mkdir(path.join(root,folder),{recursive:true});
 await writeFile(path.join(root,provenanceFile),JSON.stringify({...record,assetSha256:sha256,registeredAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
 await copyFile(source,path.join(root,assetPath));
 catalog.items.push(entry);await writeFile(path.join(root,'assets/catalog.json'),JSON.stringify(catalog,null,2)+'\n');return entry;
};
export const writeUsage=async(job,bindings)=>{
 const folder=path.join(root,'artifacts/visual-library/usage');await mkdir(folder,{recursive:true});
 await writeFile(path.join(folder,`${job.id}.json`),JSON.stringify({jobId:job.id,planSha256:digest(JSON.stringify(job.visualPlan)),bindings,beats:job.visualPlan.beats.map(b=>({id:b.id,assetId:b.assetId,from:b.from,until:b.until,why:b.why})),at:new Date().toISOString()},null,2)+'\n');
};
