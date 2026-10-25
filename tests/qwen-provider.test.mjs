import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {readQwenConfig,qwenDiagnostics} from '../scripts/lib/qwen-config.mjs';
import {prepareQwenCall,invokeQwen} from '../scripts/lib/qwen-provider.mjs';
import {reserveQwenAttempt} from '../scripts/lib/qwen-workflow.mjs';
import {buildDirectorRequest,validateDirection} from '../scripts/lib/director-workflow.mjs';
import {authorBaselineExample} from '../scripts/lib/director-baseline-example.mjs';

const settings={QWEN_ENABLED:'true',QWEN_REGION:'ap-southeast-1',QWEN_BASE_URL:'https://llm-test.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',QWEN_MODEL:'qwen-plus',QWEN_API_KEY:'unit-test-not-a-real-key'};
const config=readQwenConfig(settings);
const request=await buildDirectorRequest({runId:'qwen-protocol-test',jobId:'dry-irony-tight',brief:{objective:'Проверка протокола на локальном сервере',audience:'Не задана',preserveAllSpeech:true}});
const fixture=authorBaselineExample(request);fixture.authorship={kind:'provider',name:'Local protocol simulator — not a Qwen service result'};
const envelope=(changes={})=>({model:'qwen-plus',choices:[{finish_reason:'stop',message:{role:'assistant',content:JSON.stringify(fixture)},...changes}],usage:{prompt_tokens:500,completion_tokens:500,total_tokens:1000}});
const withServer=async(handler,body)=>{
  let calls=0;
  const server=createServer((req,res)=>{calls++;handler(req,res);});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const local=`http://127.0.0.1:${server.address().port}/v1/chat/completions`;
  // The production adapter still validates an Alibaba URL. Only test transport
  // delivery is mapped to loopback; these tests never contact Alibaba.
  const fetchImpl=(_url,options)=>fetch(local,options);
  try{return await body(fetchImpl,()=>calls);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
};
const jsonServer=(value)=>(req,res)=>{req.resume();res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};

test('cloud config checks regional endpoints, bounded settings and does not reveal keys',()=>{
  assert.deepEqual(config.errors,[]);
  assert.equal(qwenDiagnostics(config).networkRequests,0);
  assert.equal(qwenDiagnostics(config).serviceAvailability,'not-checked');
  assert.ok(!JSON.stringify(qwenDiagnostics(config)).includes(config.apiKey));
  for(const url of ['http://localhost:11434/v1','https://example.com/compatible-mode/v1','https://llm-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1','https://dashscope-intl.aliyuncs.com/compatible-mode/v1?key=private','https://u:private@dashscope-intl.aliyuncs.com/compatible-mode/v1']){
    const invalid=readQwenConfig({...settings,QWEN_BASE_URL:url});assert.ok(invalid.errors.length);assert.equal(qwenDiagnostics(invalid).endpoint,null);
  }
  assert.ok(readQwenConfig({...settings,QWEN_TIMEOUT_MS:'0'}).errors.length);
  assert.ok(readQwenConfig({...settings,QWEN_MAX_OUTPUT_TOKENS:'999999'}).errors.length);
  assert.equal(qwenDiagnostics(readQwenConfig({})).status,'configuration-required');
  assert.equal(qwenDiagnostics(readQwenConfig({...settings,QWEN_ENABLED:'false'})).status,'disabled');
});

test('console display names normalize without guessing a different region or model',()=>{
  const consoleValues=readQwenConfig({...settings,QWEN_REGION:'Singapore',QWEN_MODEL:' Qwen3.8-Flash '});
  assert.deepEqual(consoleValues.errors,[]);assert.equal(consoleValues.region,'ap-southeast-1');assert.equal(consoleValues.model,'qwen3.8-flash');
  assert.ok(readQwenConfig({...settings,QWEN_REGION:'Frankfurt'}).errors.length);
  assert.ok(readQwenConfig({...settings,QWEN_REGION:''}).errors.length);
});

test('payload allowlist carries real words/uncertainties and excludes media, keys and file metadata',()=>{
  const p=prepareQwenCall(request,config),text=p.bodyText;
  assert.ok(!text.includes(config.apiKey));
  for(const excluded of ['public/source.mp4','assets/library/','reference-library/media/','artifacts/director/','base64,','sourceFile','localEvidence'])assert.ok(!text.includes(excluded),excluded);
  const user=JSON.parse(p.call.body.messages[1].content);
  assert.equal(user.context.words.length,40);assert.equal(user.contextSha256,request.contextSha256);
  assert.ok(user.transcription.timingRefinements.length>0);
  assert.equal(user.transcription.reviewStatus,request.ctx.prior.transcript.reviewStatus);
  assert.equal(p.call.body.enable_thinking,false);assert.equal(p.call.body.response_format.type,'json_object');
  assert.equal(p.call.body.stream,false);assert.equal(p.summary.automaticRetries,0);
  assert.equal(p.summary.dollarCost.startsWith('unknown'),true);
});

test('no call without enable/key/exact payload approval; mutation cannot reuse approval',async()=>{
  let calls=0;const fetchImpl=()=>{calls++;throw new Error('must not fetch');};
  for(const c of [{...config,enabled:false},{...config,apiKey:''}]){
    const p=prepareQwenCall(request,c);await assert.rejects(()=>invokeQwen(p,c,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/DISABLED|KEY_REQUIRED/);
  }
  const p=prepareQwenCall(request,config);
  await assert.rejects(()=>invokeQwen(p,config,{fetchImpl}),/APPROVAL_REQUIRED/);
  await assert.rejects(()=>invokeQwen(p,config,{approvedPayloadSha256:'0'.repeat(64),fetchImpl}),/APPROVAL_REQUIRED/);
  const changed=structuredClone(p);changed.bodyText+=' ';
  await assert.rejects(()=>invokeQwen(changed,config,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/APPROVAL_REQUIRED/);
  await assert.rejects(()=>invokeQwen(p,{...config,model:'qwen-another'},{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/CONFIGURATION_CHANGED/);
  assert.equal(calls,0);
  assert.throws(()=>prepareQwenCall(request,{...config,maxInputBytes:1}),/INPUT_SIZE_LIMIT/);
});

test('local protocol simulator verifies auth/body and the full response-to-edit-plan path',async()=>{
  let seen;
  await withServer((req,res)=>{
    assert.equal(req.method,'POST');assert.equal(req.headers.authorization,`Bearer ${config.apiKey}`);
    let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{seen=JSON.parse(body);res.setHeader('Content-Type','application/json');res.end(JSON.stringify(envelope()));});
  },async(fetchImpl,count)=>{
    const p=prepareQwenCall(request,config),result=await invokeQwen(p,config,{approvedPayloadSha256:p.payloadSha256,fetchImpl});
    const compiled=validateDirection(request,JSON.parse(result.content));
    assert.equal(compiled.candidates[0].retainedWordCount,40);assert.equal(compiled.candidates[1].durationInFrames,548);
    assert.equal(result.usage.completion_tokens,500);assert.equal(count(),1);
  });
  assert.equal(seen.model,'qwen-plus');assert.equal(seen.max_tokens,8192);
});

test('HTTP failures and redirects do not retry, follow redirects or echo server bodies',async()=>{
  for(const status of [401,429,500,307])await withServer((req,res)=>{req.resume();res.statusCode=status;res.setHeader('Location','https://example.com/stolen');res.end(`secret=${config.apiKey}`);},async(fetchImpl,count)=>{
    const p=prepareQwenCall(request,config);
    await assert.rejects(()=>invokeQwen(p,config,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),caught=>caught.message===`Qwen: HTTP_${status}`&&!caught.message.includes(config.apiKey));
    assert.equal(count(),1);
  });
});

test('truncation, refusal, reasoning-only and invalid envelope cannot become successful plans',async()=>{
  for(const [value,code] of [
    [envelope({finish_reason:'length'}),'OUTPUT_TRUNCATED'],
    [envelope({message:{role:'assistant',content:'',reasoning_content:'Thinking only'}}),'EMPTY_OR_REFUSED_CONTENT'],
    [envelope({message:{role:'assistant',content:'{}',refusal:'refused'}}),'EMPTY_OR_REFUSED_CONTENT'],
    [{choices:[]},'INVALID_CHOICES'],
  ])await withServer(jsonServer(value),async(fetchImpl)=>{
    const p=prepareQwenCall(request,config);await assert.rejects(()=>invokeQwen(p,config,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),new RegExp(code));
  });
  await withServer((req,res)=>{req.resume();res.end('not JSON');},async(fetchImpl)=>{
    const p=prepareQwenCall(request,config);await assert.rejects(()=>invokeQwen(p,config,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/INVALID_RESPONSE_ENVELOPE/);
  });
});

test('response-size and provider-reported output-token overruns are rejected',async()=>{
  const small={...config,maxResponseBytes:4096};
  await withServer((req,res)=>{req.resume();res.write('x'.repeat(3000));res.end('x'.repeat(3000));},async(fetchImpl)=>{
    const p=prepareQwenCall(request,small);await assert.rejects(()=>invokeQwen(p,small,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/RESPONSE_SIZE_LIMIT/);
  });
  const value=envelope();value.usage.completion_tokens=99999;
  await withServer(jsonServer(value),async(fetchImpl)=>{
    const p=prepareQwenCall(request,config);await assert.rejects(()=>invokeQwen(p,config,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/OUTPUT_TOKEN_LIMIT_EXCEEDED/);
  });
});

test('timeout aborts an actual delayed loopback response without retry',async()=>{
  const short={...config,timeoutMs:1000};
  await withServer(req=>{req.resume();},async(fetchImpl,count)=>{
    const p=prepareQwenCall(request,short);await assert.rejects(()=>invokeQwen(p,short,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/ABORTED_OR_TIMED_OUT/);assert.equal(count(),1);
  });
});

test('a timeout remains enforced while reading a partially received body',async()=>{
  const short={...config,timeoutMs:1000};
  await withServer((req,res)=>{req.resume();res.writeHead(200,{'Content-Type':'application/json'});res.write('{"choices":');},async(fetchImpl)=>{
    const p=prepareQwenCall(request,short);await assert.rejects(()=>invokeQwen(p,short,{approvedPayloadSha256:p.payloadSha256,fetchImpl}),/ABORTED_OR_TIMED_OUT/);
  });
});

test('syntactically valid model output still faces the independent semantic guards',async()=>{
  const invalid=structuredClone(fixture);invalid.treatments[0].beats.splice(1,1);
  await withServer(jsonServer(envelope({message:{role:'assistant',content:JSON.stringify(invalid)}})),async(fetchImpl)=>{
    const p=prepareQwenCall(request,config),result=await invokeQwen(p,config,{approvedPayloadSha256:p.payloadSha256,fetchImpl});
    assert.throws(()=>validateDirection(request,JSON.parse(result.content)),/unaccounted source unit/);
  });
});

test('one attempt lock survives a failure and blocks repeat billing on the same run',async()=>{
  const file=`.cache/qwen-tests/${randomUUID()}/attempt.json`,attempt={status:'started',payloadSha256:'test'};
  await reserveQwenAttempt(file,attempt);
  await assert.rejects(()=>reserveQwenAttempt(file,attempt),/ATTEMPT_ALREADY_RESERVED/);
  assert.deepEqual(JSON.parse(await readFile(file,'utf8')),attempt);
});
