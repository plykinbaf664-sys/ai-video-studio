import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {loadJob} from './editorial-job.mjs';
import {root,fingerprint} from './media.mjs';
import {readQwenConfig,loadQwenEnvironment} from './qwen-config.mjs';
import {invokeQwen} from './qwen-provider.mjs';
import {authorVisualBaseline} from './visual-job-compiler.mjs';
import {compileEditorialJob} from '../../src/director/editorial-job.ts';

export const visualDigest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const json=async file=>JSON.parse(await readFile(path.join(root,file),'utf8'));
const id=value=>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value??''))throw Error('Invalid visual run id');return value;};
export const visualFolder=run=>`artifacts/visual/${id(run)}`;
export const visionConfig=()=>{loadQwenEnvironment();return {...readQwenConfig(),maxInputBytes:8*1024*1024};};
export const prepareVisualCall=async(run)=>{
 const folder=visualFolder(run),manifest=await json(`${folder}/frames.json`),ctx=await loadJob(manifest.jobId);
 if(await fingerprint('public/source.mp4')!==manifest.sourceSha256||ctx.job.sourceSha256!==manifest.sourceSha256||ctx.jobSha256!==manifest.jobSha256)throw Error('Stale visual source/job');
 const selected=manifest.frames.filter(f=>f.retainedUnitIds.length);
 if(selected.length>120||selected.length<2)throw Error('Image count outside reviewed limit');
 const policies=await json('style-presets/policies/visual-understanding.json'),style=manifest.style??'signal-dynamic';
 if(!Object.hasOwn(policies.styles,style))throw Error('Unsupported visual style');
 const selectedPresetFile=`style-presets/grammars/${style}.json`,selectedPreset=await json(selectedPresetFile);
 const baseline=authorVisualBaseline(ctx.job,run,style);
 compileEditorialJob(baseline,selectedPreset,ctx.prior);
 const words=ctx.compiled.transcript.captions.map((w,i)=>({id:`w${String(i).padStart(5,'0')}`,text:w.text.trim(),sourceStartMs:w.startMs,sourceEndMs:w.endMs}));
 const units=ctx.compiled.timeline.clips.map(c=>({id:c.id,sourceStartMs:c.sourceStartFrame*1000/30,sourceEndMs:c.sourceEndFrame*1000/30,outputStartFrame:c.outputStartFrame,durationInFrames:c.durationInFrames,wordIds:ctx.compiled.provenance.filter(w=>w.clipId===c.id).map(w=>words[w.sourceWordIndex].id)}));
 if(units.length>32||units.some(u=>selected.filter(f=>f.retainedUnitIds.includes(u.id)).length<2))throw Error('Each retained unit needs at least two actual image samples');
 if(new Set(selected.map(f=>f.id)).size!==selected.length||selected.some(f=>!Number.isFinite(f.sourceMs)||f.retainedUnitIds.some(id=>!units.some(u=>u.id===id&&f.sourceMs>=u.sourceStartMs-.01&&f.sourceMs<u.sourceEndMs))))throw Error('Source sample timestamps do not match retained units');
 const schema=await json('contracts/visual-analysis.schema.json');
 const bindings=[];
 for(const file of [`${folder}/frames.json`,ctx.jobFile,ctx.presetFile,selectedPresetFile,ctx.job.transcriptFile,'contracts/visual-analysis.schema.json','instructions/editing/visual-understanding.md','brandbooks/media/BRANDBOOK.md','style-presets/policies/visual-understanding.json','scripts/lib/visual-job-compiler.mjs','src/director/editorial-job.ts'])bindings.push({file,sha256:await fingerprint(file)});
 const context={version:1,runId:run,sourceSha256:manifest.sourceSha256,source:manifest.source,timeline:'source',fps:30,units,words:words.filter(w=>units.some(u=>u.wordIds.includes(w.id))),style,selectedPreset,stylePolicies:policies,
  locked:{cuts:ctx.job.cuts,color:ctx.job.color,music:'Original voice + current continuous constant-gain bed; unchanged',captions:'Retain exact words and output mapping'},
  frames:selected.map(({id,sourceMs,width,height,retainedUnitIds,metrics})=>({id,sourceMs,width,height,unitIds:retainedUnitIds,metrics})),
  baselineScenes:baseline.scenes,baselineViewports:baseline.viewports,bindings};
 const contextSha256=visualDigest(context),system=await readFile('instructions/editing/visual-understanding.md','utf8');
 const content=[{type:'text',text:JSON.stringify({contextSha256,context,brandbook:await readFile('brandbooks/media/BRANDBOOK.md','utf8'),responseSchema:schema})}];
 for(const f of selected){
  if(!f.file.startsWith(`${folder}/frames/`)||f.file.includes('..')||f.file.includes('\\')||await fingerprint(f.file)!==f.sha256)throw Error('Unsafe/changed source image');
  content.push({type:'text',text:`frameId=${f.id}; sourceMs=${f.sourceMs}; units=${f.retainedUnitIds.join(',')}`},{type:'image_url',image_url:{url:`data:image/jpeg;base64,${(await readFile(f.file)).toString('base64')}`}});
 }
 const config=visionConfig();if(config.errors.length)throw Error('Visual provider configuration required');
 if(config.model!=='qwen3.8-flash')throw Error('Visual model capability not reviewed; configure a separately verified adapter');
 const body={model:config.model,messages:[{role:'system',content:system},{role:'user',content}],response_format:{type:'json_object'},enable_thinking:false,stream:false,n:1,temperature:.2,max_tokens:config.maxOutputTokens};
 const call={url:`${config.baseUrl}/chat/completions`,region:config.region,model:config.model,body,timeoutMs:config.timeoutMs,maxInputBytes:config.maxInputBytes,maxResponseBytes:config.maxResponseBytes,maxRequestsPerRun:1};
 const bodyText=JSON.stringify(body);if(Buffer.byteLength(bodyText)>config.maxInputBytes)throw Error('Visual input exceeds8MiB cap');
 return {call,bodyText,payloadSha256:visualDigest(call),context,contextSha256,schema,manifest,selected,summary:{runId:run,model:config.model,region:config.region,endpoint:config.baseUrl,frames:selected.length,width:360,height:640,imageBytes:selected.reduce((n,f)=>n+f.bytes,0),inputBytes:Buffer.byteLength(bodyText),maxOutputTokens:config.maxOutputTokens,timeoutMs:config.timeoutMs,payloadSha256:visualDigest(call),contextSha256,sends:['source JPEG frames with face/person/background','retained transcript and explicit source/output timing','brandbook and selected style','visual response schema'],excludes:['raw video','audio','reference images/videos','API key in prompt','local file paths except binding labels'],requests:1,retries:0,networkRequests:0}};
};

export const validateVisualAnalysis=(prepared,response)=>{
 const validate=new Ajv2020({allErrors:true,strict:true,allowUnionTypes:true}).compile(prepared.schema);
 if(!validate(response))throw Error(`Visual schema: ${JSON.stringify(validate.errors)}`);
 if(response.contextSha256!==prepared.contextSha256||response.sourceSha256!==prepared.context.sourceSha256)throw Error('Visual analysis hash mismatch');
 const seen=new Set();
 for(const obs of response.observations){
  const unit=prepared.context.units.find(u=>u.id===obs.unitId);
  if(!unit||seen.has(obs.unitId))throw Error('Unknown/duplicate observation unit');seen.add(obs.unitId);
  if(obs.frameIds.some(fid=>!prepared.selected.some(f=>f.id===fid&&f.retainedUnitIds.includes(obs.unitId))))throw Error('Observation cites an absent frame or removed unit');
  if(obs.decision.thoughtWordIds.some(w=>!unit.wordIds.includes(w)))throw Error('Visual decision invents/borrows speech');
  const boxes=[obs.face,obs.person,...obs.freeAreas,...obs.importantObjects.map(o=>o.box)].filter(Boolean);
  if(boxes.some(b=>b.x+b.width>1.00001||b.y+b.height>1.00001))throw Error('Visual box outside source');
  if(obs.freeAreas.some(b=>[obs.face,...obs.importantObjects.map(o=>o.box)].filter(Boolean).some(p=>intersects(b,p))))throw Error('Free area overlaps observed face/gesture/object');
 }
 if(seen.size!==prepared.context.units.length)throw Error('Incomplete visual unit coverage');
 return response;
};
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
export const visualPreflight=async run=>{
 const prepared=await prepareVisualCall(run),folder=visualFolder(run);await mkdir(folder,{recursive:true});
 try{await readFile(`${folder}/attempt.json`);throw Error('Preserve attempted run; use a new run id');}catch(e){if(e.code!=='ENOENT')throw e;}
 await writeFile(`${folder}/request.json`,JSON.stringify({context:prepared.context,contextSha256:prepared.contextSha256,payloadSha256:prepared.payloadSha256},null,2)+'\n');
 await writeFile(`${folder}/payload.json`,prepared.bodyText+'\n');
 await writeFile(`${folder}/preflight.json`,JSON.stringify(prepared.summary,null,2)+'\n');return prepared;
};
export const generateVisualAnalysis=async(run,approvedPayloadSha256)=>{
 const prepared=await prepareVisualCall(run),folder=visualFolder(run),saved=await json(`${folder}/preflight.json`);
 if(saved.payloadSha256!==prepared.payloadSha256||approvedPayloadSha256!==prepared.payloadSha256)throw Error('Separate exact image payload approval required');
 const config=visionConfig();
 // Reserve the paid attempt before any transport; never overwrite or silently retry.
 await writeFile(`${folder}/attempt.json`,JSON.stringify({at:new Date().toISOString(),payloadSha256:prepared.payloadSha256,status:'reserved-no-retry',modalities:['text','image']},null,2)+'\n',{flag:'wx'});
 try{
  const result=await invokeQwen(prepared,config,{approvedPayloadSha256});
  await writeFile(`${folder}/response.txt`,result.content,{flag:'wx'});
  await writeFile(`${folder}/transport.json`,JSON.stringify({status:'response-received',model:result.model,usage:result.usage,payloadSha256:prepared.payloadSha256,contextSha256:prepared.contextSha256,contentSha256:createHash('sha256').update(result.content).digest('hex')},null,2)+'\n',{flag:'wx'});
  const response=JSON.parse(result.content);validateVisualAnalysis(prepared,response);
  await writeFile(`${folder}/analysis.json`,JSON.stringify(response,null,2)+'\n',{flag:'wx'});
  await writeFile(`${folder}/receipt.json`,JSON.stringify({status:'validated-image-analysis',model:result.model,contextSha256:prepared.contextSha256,payloadSha256:prepared.payloadSha256,analysisSha256:await fingerprint(`${folder}/analysis.json`),sourceSha256:prepared.context.sourceSha256,frameIds:prepared.selected.map(f=>f.id),usage:result.usage,humanAudition:false},null,2)+'\n',{flag:'wx'});
  return {status:'validated-image-analysis',frames:prepared.selected.length,units:response.observations.length,usage:result.usage};
 }catch(error){await writeFile(`${folder}/failure.json`,JSON.stringify({status:'failed-no-retry',code:error.code??'LOCAL_VALIDATION_FAILURE',message:error.message},null,2)+'\n');throw error;}
};
