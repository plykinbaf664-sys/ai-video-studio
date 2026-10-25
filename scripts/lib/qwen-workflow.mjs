import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {root} from './media.mjs';
import {loadFreshRequest,writeJson,runFolder,validateDirection,digest,reviewResponse} from './director-workflow.mjs';
import {readQwenConfig,loadQwenEnvironment,qwenDiagnostics} from './qwen-config.mjs';
import {prepareQwenCall,invokeQwen,assertQwenCallAllowed} from './qwen-provider.mjs';
import {writeDirectorReviewPage} from './director-review-page.mjs';

export const qwenCheck=()=>{
  loadQwenEnvironment();return qwenDiagnostics(readQwenConfig());
};
export const reserveQwenAttempt=async(file,attempt)=>{
  try{await writeJson(file,attempt,true);}catch(caught){if(caught.code==='EEXIST')throw new Error('Qwen: ATTEMPT_ALREADY_RESERVED; no automatic retries. Use a new run after reviewing the previous attempt.');throw caught;}
};
export const qwenPreflight=async runId=>{
  loadQwenEnvironment();const config=readQwenConfig(),request=await loadFreshRequest(runId);
  const prepared=prepareQwenCall(request,config),folder=runFolder(runId);
  await writeJson(path.join(folder,'qwen.payload.json'),prepared.call);
  const report={...prepared.summary,payloadSha256:prepared.payloadSha256,readiness:qwenDiagnostics(config).status,
    next:`npm run director:generate -- --run ${runId} --approve-payload ${prepared.payloadSha256}`};
  await writeJson(path.join(folder,'qwen.preflight.json'),report);
  return report;
};

export const generateWithQwen=async(runId,approvedPayloadSha256)=>{
  loadQwenEnvironment();const config=readQwenConfig(),request=await loadFreshRequest(runId),prepared=prepareQwenCall(request,config),folder=runFolder(runId);
  assertQwenCallAllowed(prepared,config,approvedPayloadSha256);
  const attemptFile=path.join(folder,'qwen.attempt.json');
  const attempt={at:new Date().toISOString(),status:'started',payloadSha256:prepared.payloadSha256,contextSha256:request.contextSha256,endpoint:prepared.call.url,model:config.model,modalities:['text'],maximumAttempts:1};
  await reserveQwenAttempt(attemptFile,attempt);
  let result;
  try{
    result=await invokeQwen(prepared,config,{approvedPayloadSha256});
    await writeFile(path.join(folder,'qwen.content.txt'),result.content,{flag:'wx'});
    await writeJson(path.join(folder,'qwen.transport.json'),{...attempt,status:'response-received',contentSha256:digest(result.content),model:result.model,usage:result.usage,finishReason:result.finishReason,mediaAnalyzed:false},true);
    let response;
    try{response=JSON.parse(result.content);}catch{throw Object.assign(new Error('Qwen: INVALID_DIRECTOR_JSON'),{code:'INVALID_DIRECTOR_JSON'});}
    if(response.authorship?.kind!=='provider')throw Object.assign(new Error('Qwen: INVALID_AUTHORSHIP'),{code:'INVALID_AUTHORSHIP'});
    try{validateDirection(request,response);}catch(validationError){
      await writeJson(path.join(folder,'qwen.validation-failure.json'),{status:'rejected',contextSha256:request.contextSha256,responseSha256:digest(response),message:validationError.message});
      throw Object.assign(new Error('Qwen: DIRECTOR_PLAN_REJECTED'),{code:'DIRECTOR_PLAN_REJECTED'});
    }
    const responseFile=path.join(folder,'qwen.response.json');await writeJson(responseFile,response,true);
    await writeJson(path.join(folder,'qwen.receipt.json'),{...attempt,status:'validated-director-plan',provider:'alibaba-cloud-model-studio',responseSha256:digest(response),
      model:result.model,usage:result.usage,transport:'qwen-api',mediaAnalyzed:false});
    const reviewed=await reviewResponse(runId,path.relative(root,responseFile));
    await writeDirectorReviewPage(path.join(reviewed.folder,'index.html'),reviewed);
    await writeDirectorReviewPage(path.join(folder,'index.html'),reviewed);
    await writeJson(attemptFile,{...attempt,status:'completed',usage:result.usage});
    return {status:'plan-validated-media-unreviewed',provider:'alibaba-cloud-model-studio',response:path.relative(root,responseFile),review:path.relative(root,path.join(folder,'index.html')),usage:result.usage,automaticSelection:false,automaticRender:false};
  }catch(caught){
    if(caught.providerContent)await writeFile(path.join(folder,'qwen.rejected-content.txt'),caught.providerContent,{flag:'wx'});
    const code=caught.code??'DIRECTOR_VALIDATION_OR_LOCAL_FAILURE';
    await writeJson(attemptFile,{...attempt,status:'failed-no-retry',code,...(result?{usage:result.usage}:{})});
    // Never include server error bodies, headers, keys or model content in console errors.
    throw new Error(`Qwen: ${code}; inspect private run artifacts. No retry, selection or render performed.`);
  }
};
