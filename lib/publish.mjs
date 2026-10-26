import {createReadStream,createWriteStream,existsSync,mkdtempSync,readFileSync,renameSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

const contentType='text/html';

function httpsUrl(value,label){
 let url;
 try{url=new URL(value)}catch{throw Error(`${label}不是有效网址`)}
 if(url.protocol!=='https:'||url.username||url.password)throw Error(`${label}必须使用 HTTPS`);
 return url;
}

function projectSlug(title){
 return title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)||'deck';
}

export function createPublisher({dir,fetchImpl=fetch,clock=()=>new Date(),id=()=>randomUUID()}){
 const configFile=path.join(dir,'publish-config.json');
 const historyFile=path.join(dir,'publications.json');
 const config=()=>{
  let saved={};
  if(existsSync(configFile))saved=JSON.parse(readFileSync(configFile,'utf8'));
  const gatewayUrl=process.env.UPLOAD_GATEWAY_URL||saved.gatewayUrl;
  const apiKey=process.env.UPLOAD_API_KEY||saved.apiKey;
  if(!gatewayUrl||!apiKey)throw Error('发布服务尚未配置：请在本机 .local/publish-config.json 设置 gatewayUrl 和 apiKey');
  return {gatewayUrl:httpsUrl(gatewayUrl,'发布网关地址').href.replace(/\/$/,''),apiKey};
 };
 const history=()=>existsSync(historyFile)?JSON.parse(readFileSync(historyFile,'utf8')):[];
 const status=()=>({configured:!!((process.env.UPLOAD_GATEWAY_URL&&process.env.UPLOAD_API_KEY)||existsSync(configFile)),publications:history()});
 async function publish(input,{title,source='当前草稿'}){
  if(typeof title!=='string'||!title.trim()||title.length>200||typeof source!=='string'||source.length>200)throw Error('发布标题或来源不正确');
  const {gatewayUrl,apiKey}=config();
  const work=mkdtempSync(path.join(dir,'publish-'));
  const file=path.join(work,'index.html');
  try{
   await pipeline(input,createWriteStream(file,{mode:0o600}));
   const size=statSync(file).size;
   if(!size)throw Error('播放文件为空，无法发布');
   const stamp=clock().toISOString().replace(/[-:]/g,'').replace(/\..*/,'').replace('T','-');
   const requestedKey=`onion-deck-studio/${projectSlug(title)}/${stamp}-${id()}/index.html`;
   const presign=await fetchImpl(gatewayUrl+'/v1/presign',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({key:requestedKey,content_type:contentType,expires_in:3600}),signal:AbortSignal.timeout(30000)});
   if(!presign.ok)throw Error(`发布网关拒绝请求（HTTP ${presign.status}）`);
   const result=await presign.json();
   const uploadUrl=httpsUrl(result.upload_url,'上传地址');
   const publicUrl=httpsUrl(result.public_url,'访问地址');
   const key=typeof result.key==='string'&&result.key?result.key:requestedKey;
   const put=await fetchImpl(uploadUrl.href,{method:'PUT',headers:{'Content-Type':contentType,'Content-Length':String(size)},body:createReadStream(file),duplex:'half',redirect:'error',signal:AbortSignal.timeout(15*60*1000)});
   if(![200,204].includes(put.status))throw Error(`文件上传失败（HTTP ${put.status}）`);
   const item={id:id(),title:title.trim(),source,url:publicUrl.href,key,createdAt:clock().toISOString(),bytes:size,retentionDays:Number.isInteger(result.retention_days)?result.retention_days:null,retentionNotice:typeof result.retention_notice==='string'?result.retention_notice.slice(0,500):''};
   const temp=historyFile+'.tmp';
   writeFileSync(temp,JSON.stringify([item,...history()],null,2),{mode:0o600});
   renameSync(temp,historyFile);
   return item;
  }finally{rmSync(work,{recursive:true,force:true})}
 }
 return {status,publish};
}
