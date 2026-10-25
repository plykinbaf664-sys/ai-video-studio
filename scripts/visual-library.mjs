import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {visualLibrary,retrieveVisuals,searchOpenverse,searchCommons,registerVisual,visualSnapshot} from './lib/visual-library.mjs';
const [command,...args]=process.argv.slice(2);
const flag=(name,fallback)=>{const i=args.indexOf(`--${name}`);return i<0?fallback:args[i+1];};
if(command==='list'||command==='find'){
 const entries=await visualLibrary();
 const items=command==='find'?retrieveVisuals(entries,{domain:flag('domain','ai'),intent:flag('intent','explain-process'),style:flag('style','signal-dynamic'),query:flag('query',''),subject:flag('subject'),aesthetic:flag('aesthetic')}).map(r=>({...visualSnapshot(r.asset),score:r.score})):entries.map(a=>({...visualSnapshot(a),tags:a.visual.tags}));
 console.log(JSON.stringify(items,null,2));
}else if(command==='search'){
 const provider=flag('provider','commons');if(!['commons','openverse'].includes(provider))throw Error('Use --provider commons or openverse');
 await mkdir('artifacts/visual-library/search',{recursive:true});const file=`artifacts/visual-library/search/${provider}-${Date.now()}.json`;
 let result;try{result=await(provider==='commons'?searchCommons:searchOpenverse)(flag('query',''));}catch(e){result={provider,query:flag('query',''),at:new Date().toISOString(),status:'unavailable',error:e.name==='TimeoutError'?'Network timeout':e.message,results:[]};}
 await writeFile(file,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({file,...result},null,2));if(result.status==='unavailable')process.exitCode=1;
}else if(command==='register'){
 const record=JSON.parse(await readFile(flag('record',''),'utf8'));console.log(JSON.stringify(await registerVisual(record,flag('file','')),null,2));
}else if(command==='brief'){
 const {loadJob}=await import('./lib/editorial-job.mjs'),{planDomesticStory}=await import('../src/director/domestic-storyboard.ts');const {compiled,job}=await loadJob(flag('job','dry-irony-tight')),library=await visualLibrary(),briefFile=flag('brief');
 if(briefFile&&(!briefFile.startsWith('edits/briefs/')||briefFile.includes('..')||briefFile.includes('\\')))throw Error('Use a local edits/briefs JSON');
 const brief=briefFile?JSON.parse(await readFile(briefFile,'utf8')):{domain:flag('domain','general'),genre:'neutral',relationship:'literal',illustrateExamples:false,contextReason:''};
 const units=compiled.timeline.clips.map(c=>({id:c.id,from:c.outputStartFrame,until:c.outputStartFrame+c.durationInFrames,words:compiled.provenance.filter(w=>w.clipId===c.id)})),policy=JSON.parse(await readFile('style-presets/policies/domestic-counterpoint.json','utf8'));
 console.log(JSON.stringify({jobId:job.id,...planDomesticStory({units,assets:library.map(visualSnapshot),style:job.presetId,brief,policy,duration:compiled.timeline.durationInFrames}),limitation:'Local rules require explicit editorial context; no model-level inference or new private-media upload. AI explainers use the diagram contract, not this household grammar.'},null,2));
}else throw Error('Use list | find --domain ai --intent explain-process --style signal-dynamic | brief --job ID --domain domestic | search --query "generic public words" | register --record FILE --file IMAGE');
