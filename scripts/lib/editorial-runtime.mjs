import {mkdir,statfs,symlink,lstat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root} from './media.mjs';

/** Throwaway local bundle: point at real public assets rather than copy every
 * historical movie/WAV. Never use this local junction bundle for deployment. */
export const editorialRuntime=async(id)=>{
 const disk=await statfs(root);let scratch=process.env.AI_VIDEO_SCRATCH;
 if(!scratch&&disk.bavail*disk.bsize<1024**3&&process.platform==='win32'){
  try{const d=await statfs('D:/');if(d.bavail*d.bsize>2*1024**3)scratch='D:/AI-Video-Studio-Cache/ai-video-studio';}catch{/* Keep project-local fallback. */}
 }
 scratch=path.resolve(scratch??path.join(root,'.cache/runtime'));
 const runtime=path.join(scratch,'jobs',id),temp=path.join(runtime,'tmp');await mkdir(temp,{recursive:true});
 process.env.TEMP=temp;process.env.TMP=temp;
 const outDir=path.join(runtime,'bundle'),publicLink=path.join(outDir,'public');
 const existing=await lstat(publicLink).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(existing&&(await realpath(publicLink)).toLowerCase()!==path.join(root,'public').toLowerCase())throw new Error('Local runtime public target is unexpected; preserve it for review');
 return {runtime,outDir,temp,bundle:async()=>{
  // nonexistent publicDir deliberately skips bundler's Windows copy operation.
  // Release webpack's compilation heap by ending the worker before Chrome /
  // FFmpeg start. This machine also runs the user's other applications.
  const worker=spawnSync(process.execPath,[path.join(root,'scripts/bundle-editorial-worker.mjs'),outDir],{cwd:root,stdio:'inherit',env:process.env});
  if(worker.error)throw worker.error;if(worker.status!==0)throw new Error('Local bundle worker failed');
  if(!existing)await symlink(path.join(root,'public'),publicLink,process.platform==='win32'?'junction':'dir');
  return outDir;
 }};
};
