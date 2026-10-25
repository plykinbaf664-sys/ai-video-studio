import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
import path from 'node:path';
import {root} from './media.mjs';

export const loadQwenEnvironment=()=>{
  const file=path.join(root,'.env.qwen');
  if(existsSync(file))loadEnvFile(file);
};
const regions=['cn-beijing','ap-southeast-1','us-east-1','eu-central-1','ap-northeast-1','cn-hongkong'];
const regionAliases={'singapore':'ap-southeast-1','beijing':'cn-beijing','virginia':'us-east-1','frankfurt':'eu-central-1','tokyo':'ap-northeast-1','hong kong':'cn-hongkong'};
const legacy={'cn-beijing':'dashscope.aliyuncs.com','ap-southeast-1':'dashscope-intl.aliyuncs.com','cn-hongkong':'cn-hongkong.dashscope.aliyuncs.com'};
export const readQwenConfig=(env=process.env)=>{
  const errors=[];
  const enabled=env.QWEN_ENABLED==='true';
  if(env.QWEN_ENABLED&&!['true','false'].includes(env.QWEN_ENABLED))errors.push('QWEN_ENABLED must be true or false');
  const regionInput=(env.QWEN_REGION??'').trim().toLowerCase();
  const region=regionAliases[regionInput]??regionInput,model=(env.QWEN_MODEL??'').trim().toLowerCase(),apiKey=env.QWEN_API_KEY??'';
  if(/[\r\n]/.test(apiKey))errors.push('QWEN_API_KEY must not contain line breaks');
  if(!regions.includes(region))errors.push('Choose a supported QWEN_REGION');
  if(!/^qwen[a-z0-9._:-]{1,100}$/i.test(model))errors.push('Set the exact QWEN_MODEL id from your regional console');
  let baseUrl=null;
  try{
    const url=new URL(env.QWEN_BASE_URL??'');
    const workspace=new RegExp(`^[a-z0-9][a-z0-9-]*\\.${region.replaceAll('-','\\-')}\\.maas\\.aliyuncs\\.com$`);
    if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port||!/^\/compatible-mode\/v1\/?$/.test(url.pathname)||!(workspace.test(url.hostname)||url.hostname===legacy[region]))throw new Error();
    baseUrl=url.href.replace(/\/$/,'');
  }catch{errors.push('QWEN_BASE_URL must be an HTTPS Model Studio endpoint matching QWEN_REGION, with no credentials/query');}
  const bounded=(name,fallback,min,max)=>{
    const value=env[name]===undefined?fallback:Number(env[name]);
    if(!Number.isInteger(value)||value<min||value>max)errors.push(`${name} must be an integer in ${min}..${max}`);
    return value;
  };
  const timeoutMs=bounded('QWEN_TIMEOUT_MS',120000,1000,300000);
  const maxOutputTokens=bounded('QWEN_MAX_OUTPUT_TOKENS',8192,1024,16384);
  const maxInputBytes=bounded('QWEN_MAX_INPUT_BYTES',131072,4096,524288);
  const maxResponseBytes=bounded('QWEN_MAX_RESPONSE_BYTES',1048576,4096,2097152);
  return {enabled,region,model,baseUrl,apiKey,timeoutMs,maxOutputTokens,maxInputBytes,maxResponseBytes,maxRequestsPerRun:1,errors};
};

export const qwenDiagnostics=config=>({
  status:config.errors.length?'configuration-required':!config.enabled?'disabled':!config.apiKey?'key-required':'configured-not-connected',
  provider:'alibaba-cloud-model-studio',enabled:config.enabled,keyPresent:Boolean(config.apiKey),region:regions.includes(config.region)?config.region:null,
  // Invalid URLs and credentials must never be echoed by diagnostics.
  endpoint:config.baseUrl,model:/^qwen[a-z0-9._:-]{1,100}$/i.test(config.model)?config.model:null,errors:config.errors,
  limits:{timeoutMs:config.timeoutMs,maxOutputTokens:config.maxOutputTokens,maxInputBytes:config.maxInputBytes,maxResponseBytes:config.maxResponseBytes,requestsPerRun:1,automaticRetries:0},
  networkRequests:0,serviceAvailability:'not-checked',modelAvailability:'not-checked',dollarCost:'unknown; configure account billing limits separately',modalities:['text'],
});
