import {createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const error=code=>Object.assign(new Error(`Qwen: ${code}`),{code});

/** Explicit allowlist. The private request contains local files; they are not the API payload. */
export const prepareQwenCall=(request,config)=>{
  if(config.errors.length)throw error('CONFIGURATION_REQUIRED');
  const {packet,ctx,contextSha256}=request;
  const context={...packet.context};
  if(context.visualAssets)context.visualAssets=context.visualAssets.map(a=>({id:a.id,sha256:a.sha256,kind:a.kind,...(a.template?{template:a.template}:{}),domains:a.domains,intents:a.intents,styles:a.styles,rights:a.rights,...(a.aesthetic?{aesthetic:a.aesthetic}:{}),...(a.subjects?{subjects:a.subjects}:{}),...(a.castId?{castId:a.castId}:{}),...(a.photoSafety?{photoDimensions:{width:a.photoSafety.width,height:a.photoSafety.height}}:{})}));
  const user={contextSha256,context,
    transcription:{engine:ctx.prior.transcript.engine,model:ctx.prior.transcript.model,reviewStatus:ctx.prior.transcript.reviewStatus,
      confidence:ctx.prior.transcript.captions.map((w,i)=>({wordId:packet.context.words[i].id,confidence:w.confidence??null})),
      timingRefinements:ctx.job.refinements.map(r=>({text:r.text,sourceStartMs:r.sourceStartMs,correctedStartMs:r.correctedStartMs,correctedEndMs:r.correctedEndMs,evidenceAvailable:Boolean(r.evidence)}))},
    productionPolicy:{preset:packet.lockedProduction.preset,source:packet.lockedProduction.source,
      music:'Keep inherited constant-gain background and source-specific color; neither is editable by the model.',
      capabilities:packet.capabilities.implemented,unimplemented:packet.capabilities.unimplemented},
    brandbook:packet.library.brandbook?{id:packet.library.brandbook.id,palette:packet.library.brandbook.palette,restrictions:packet.library.brandbook.restrictions,fontAssetIds:packet.library.brandbook.fontAssetIds}:null,
    timingGuide:{timeline:'output',fps:30,sourceOrder:ctx.compiled.timeline.clips.map(c=>c.id),durationInFrames:ctx.compiled.timeline.durationInFrames,
      rule:'Reference only for this reviewed unit order. Output anchors are recomputed if units are omitted/reordered. Keep at least the declared minimumSceneFrames and minimumQuoteHoldFrames; do not reveal comparison before both quotes and subtitle tails.',
      unitStarts:ctx.compiled.timeline.clips.map(c=>({unitId:c.id,outputFrame:c.outputStartFrame})),
      wordAnchors:ctx.compiled.provenance.map(w=>({wordId:packet.context.words[w.sourceWordIndex].id,spokenStartFrame:Math.ceil(w.startMs*30/1000),afterWordFrame:Math.ceil((w.endMs+ctx.preset.captions.tailMs)*30/1000)}))},
    assets:packet.library.assets.map(a=>({id:a.id,kind:a.kind,usage:a.usage})),responseSchema:packet.responseSchema};
  const body={model:config.model,messages:[{role:'system',content:packet.systemPrompt+'\nReturn JSON only. Set authorship.kind to provider; do not claim image/audio/video analysis in this text-only call.'},{role:'user',content:JSON.stringify(user)}],
    response_format:{type:'json_object'},enable_thinking:false,stream:false,n:1,temperature:0.3,max_tokens:config.maxOutputTokens};
  const bodyText=JSON.stringify(body),inputBytes=Buffer.byteLength(bodyText);
  if(inputBytes>config.maxInputBytes)throw error('INPUT_SIZE_LIMIT');
  const call={url:`${config.baseUrl}/chat/completions`,region:config.region,model:config.model,body,timeoutMs:config.timeoutMs,maxInputBytes:config.maxInputBytes,maxResponseBytes:config.maxResponseBytes,maxRequestsPerRun:1};
  return {call,bodyText,payloadSha256:digest(call),summary:{provider:'alibaba-cloud-model-studio',endpoint:call.url,region:config.region,model:config.model,
    requestId:packet.context.requestId,contextSha256,inputBytes,maxOutputTokens:config.maxOutputTokens,timeoutMs:config.timeoutMs,maxResponseBytes:config.maxResponseBytes,
    sends:['transcript words and source timing','brief and editing constraints','reference beat notes','brandbook design rules and asset IDs','transcription uncertainties','response schema'],
    excludes:['video','audio','images','API key in prompt','local file paths','reference footage'],modalities:['text'],maxRequests:1,automaticRetries:0,dollarCost:'unknown; output/input size caps do not guarantee a dollar budget',networkRequests:0}};
};

const boundedText=async(response,limit)=>{
  const declared=Number(response.headers.get('content-length'));
  if(Number.isFinite(declared)&&declared>limit){await response.body?.cancel();throw error('RESPONSE_SIZE_LIMIT');}
  if(!response.body)throw error('EMPTY_RESPONSE');
  const reader=response.body.getReader(),chunks=[];let bytes=0;
  try{
    while(true){const next=await reader.read();if(next.done)break;bytes+=next.value.byteLength;if(bytes>limit)throw error('RESPONSE_SIZE_LIMIT');chunks.push(next.value);}
  }catch(caught){await reader.cancel().catch(()=>{});throw caught;}finally{reader.releaseLock();}
  return Buffer.concat(chunks).toString('utf8');
};

/** One transport attempt, no SDK retries, redirects, tools, streaming or repair calls. */
export const assertQwenCallAllowed=(prepared,config,approvedPayloadSha256)=>{
  if(config.errors.length)throw error('CONFIGURATION_REQUIRED');
  if(!config.enabled)throw error('PROVIDER_DISABLED');
  if(!config.apiKey)throw error('API_KEY_REQUIRED');
  if(!approvedPayloadSha256||approvedPayloadSha256!==prepared.payloadSha256||digest(prepared.call)!==prepared.payloadSha256||prepared.bodyText!==JSON.stringify(prepared.call.body))throw error('PAYLOAD_APPROVAL_REQUIRED');
  if(prepared.call.url!==`${config.baseUrl}/chat/completions`||prepared.call.model!==config.model||prepared.call.region!==config.region||prepared.call.timeoutMs!==config.timeoutMs||prepared.call.maxInputBytes!==config.maxInputBytes||prepared.call.maxResponseBytes!==config.maxResponseBytes||prepared.call.body.max_tokens!==config.maxOutputTokens||prepared.call.maxRequestsPerRun!==1||Buffer.byteLength(prepared.bodyText)>config.maxInputBytes)throw error('CONFIGURATION_CHANGED');
};

export const invokeQwen=async(prepared,config,{approvedPayloadSha256,signal,fetchImpl=fetch}={})=>{
  assertQwenCallAllowed(prepared,config,approvedPayloadSha256);
  const controller=new AbortController();
  const abort=()=>controller.abort();
  if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),config.timeoutMs);
  try{
    if(controller.signal.aborted)throw error('REQUEST_ABORTED');
    let response;
    try{response=await fetchImpl(prepared.call.url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.apiKey}`},
      body:prepared.bodyText,redirect:'manual',signal:controller.signal});}
    catch{throw error(controller.signal.aborted?'REQUEST_ABORTED_OR_TIMED_OUT':'NETWORK_FAILURE');}
    if(!response.ok){await response.body?.cancel();throw error(`HTTP_${response.status}`);}
    let text;
    try{text=await boundedText(response,config.maxResponseBytes);}catch(caught){if(controller.signal.aborted)throw error('REQUEST_ABORTED_OR_TIMED_OUT');throw caught;}
    let envelope;
    try{envelope=JSON.parse(text);}catch{throw error('INVALID_RESPONSE_ENVELOPE');}
    if(!Array.isArray(envelope.choices)||envelope.choices.length!==1)throw error('INVALID_CHOICES');
    const choice=envelope.choices[0];
    if(choice.finish_reason!=='stop')throw Object.assign(error(choice.finish_reason==='length'?'OUTPUT_TRUNCATED':'NON_STOP_FINISH'),{providerContent:typeof choice.message?.content==='string'?choice.message.content:undefined});
    if(choice.message?.refusal||choice.message?.role!=='assistant'||typeof choice.message?.content!=='string'||!choice.message.content.trim())throw error('EMPTY_OR_REFUSED_CONTENT');
    const usage={};
    for(const key of ['prompt_tokens','completion_tokens','total_tokens'])if(Number.isInteger(envelope.usage?.[key])&&envelope.usage[key]>=0)usage[key]=envelope.usage[key];
    if(usage.completion_tokens>config.maxOutputTokens)throw error('OUTPUT_TOKEN_LIMIT_EXCEEDED');
    return {content:choice.message.content,usage,model:typeof envelope.model==='string'?envelope.model:config.model,finishReason:choice.finish_reason};
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
};
