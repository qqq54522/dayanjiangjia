import {validatePublishedPlayer} from './publish-validation.mjs';
import {PLAYER_VERSION} from './player-version.ts';
import {createReadStream,createWriteStream,existsSync,mkdtempSync,readFileSync,renameSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {extractPublishAssets,rewritePublishAssets} from './publish-assets.mjs';

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
 const history=()=>{
  const rows=existsSync(historyFile)?JSON.parse(readFileSync(historyFile,'utf8')):[];
  const latest=new Map();
  return rows.toReversed().map(item=>{
   const project=item.projectId||'';
   const previous=latest.get(project)||0;
   const versionNumber=Number.isInteger(item.versionNumber)&&item.versionNumber>previous?item.versionNumber:previous+1;
   latest.set(project,versionNumber);
   return {...item,versionNumber};
  }).reverse();
 };
 const status=(projectId)=>({playerVersion:PLAYER_VERSION,configured:!!((process.env.UPLOAD_GATEWAY_URL&&process.env.UPLOAD_API_KEY)||existsSync(configFile)),publications:history().filter(item=>!projectId||item.projectId===projectId)});
 let publishing=false;
 async function publish(input,{title,source='当前草稿',projectId=''}){
  if(typeof title!=='string'||!title.trim()||title.length>200||typeof source!=='string'||source.length>200)throw Error('发布标题或来源不正确');
  if(publishing)throw Object.assign(Error('已有发布进行中，请稍后重试'),{status:409});
  publishing=true;
  let work;
  try{
   const {gatewayUrl,apiKey}=config();
   work=mkdtempSync(path.join(dir,'publish-'));
   const file=path.join(work,'index.html');
   await pipeline(input,createWriteStream(file,{mode:0o600}));
   if(!statSync(file).size)throw Error('播放文件为空，无法发布');
   const stamp=clock().toISOString().replace(/[-:]/g,'').replace(/\..*/,'').replace('T','-');
   const requestedKey=`onion-deck-studio/${projectSlug(title)}/${stamp}-${id()}/index.html`;
   const upload=async(assetFile,requestedAssetKey,type)=>{
    const size=statSync(assetFile).size;
    const presign=await fetchImpl(gatewayUrl+'/v1/presign',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({key:requestedAssetKey,content_type:type,expires_in:3600}),signal:AbortSignal.timeout(30000)});
    if(!presign.ok)throw Error(`发布网关拒绝请求（HTTP ${presign.status}）`);
    const result=await presign.json();
    const uploadUrl=httpsUrl(result.upload_url,'上传地址');
    const publicUrl=httpsUrl(result.public_url,'访问地址');
    const put=await fetchImpl(uploadUrl.href,{method:'PUT',headers:{'Content-Type':type,'Content-Length':String(size)},body:createReadStream(assetFile),duplex:'half',redirect:'error',signal:AbortSignal.timeout(15*60*1000)});
    if(![200,204].includes(put.status))throw Error(`文件上传失败（HTTP ${put.status}）`);
    return {result,url:publicUrl.href,key:typeof result.key==='string'&&result.key?result.key:requestedAssetKey,size};
   };
   const stripped=path.join(work,'stripped.html');
   const assets=await extractPublishAssets(createReadStream(file),stripped,work);
   const validation=await validatePublishedPlayer(stripped);
   const urls=new Map();let assetBytes=0;
   for(const asset of assets){
    const uploaded=await upload(asset.file,requestedKey.replace(/index\.html$/,`assets/${asset.token}`),asset.mime);
    assetBytes+=uploaded.size;
    urls.set(asset.token,uploaded.url);
   }
   await rewritePublishAssets(createReadStream(stripped),file,urls);
   const {result,url,key,size}=await upload(file,requestedKey,contentType);
   let verifiedAt;
   if(validation.playerVersion){
    const expected=createHash('sha256');for await(const chunk of createReadStream(file))expected.update(chunk);
    const response=await fetchImpl(url,{method:'GET',headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(30000)});
    if(!response.ok||!response.body)throw Error('发布链接回读失败，未记录成功。请检查发布站点后重试。');
    const actual=createHash('sha256');for await(const chunk of response.body)actual.update(chunk);
    if(actual.digest('hex')!==expected.digest('hex'))throw Error('发布链接内容与本机生成文件不一致，未记录成功。请重新发布。');
    verifiedAt=clock().toISOString();
   }
   const previous=history();
   const versionNumber=Math.max(0,...previous.filter(item=>item.projectId===projectId).map(item=>item.versionNumber))+1;
   const item={...validation,...(verifiedAt?{verifiedAt}:{}),id:id(),projectId,versionNumber,title:title.trim(),source,url,key,createdAt:clock().toISOString(),bytes:size+assetBytes,entryBytes:size,retentionDays:Number.isInteger(result.retention_days)?result.retention_days:null,retentionNotice:typeof result.retention_notice==='string'?result.retention_notice.slice(0,500):''};
   const temp=historyFile+'.tmp';
   writeFileSync(temp,JSON.stringify([item,...previous],null,2),{mode:0o600});
   renameSync(temp,historyFile);
   return item;
  }finally{if(work)rmSync(work,{recursive:true,force:true});publishing=false}
 }
 return {status,publish};
}
