import {spawn,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,renameSync,mkdirSync,chmodSync} from 'node:fs';
import {homedir} from 'node:os';
import path from 'node:path';

const provider='deck_workbench';
const keyName='DECK_CODEX_PROVIDER_KEY';
const empty={mode:'local',baseUrl:'',model:'',apiKey:''};
const toml=value=>JSON.stringify(value);
const command=(args,timeout=4000)=>spawnSync('codex',args,{encoding:'utf8',timeout,env:process.env,maxBuffer:65536});

export function validateConnection(input,old=empty){
 if(!input||!['local','custom'].includes(input.mode))throw Error('请选择本机 Codex 或第三方连接');
 if(input.mode==='local')return {...empty};
 const raw=String(input.baseUrl||'').trim();let url;
 try{url=new URL(raw)}catch{throw Error('服务 URL 格式不正确')}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||raw.length>500)throw Error('服务 URL 不正确；不要在网址中附带密钥或参数');
 if(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('带密钥的第三方连接需要 HTTPS；本机地址可以使用 HTTP');
 const model=String(input.model||'').trim();if(!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(model))throw Error('请填写第三方服务支持的模型 ID');
 const apiKey=input.apiKey===undefined||input.apiKey===''?old.apiKey:input.apiKey;
 if(typeof apiKey!=='string'||!apiKey||apiKey.length>4096||/[\r\n]/.test(apiKey))throw Error('请填写有效的 API Key');
 return {mode:'custom',baseUrl:url.href.replace(/\/$/,''),model,apiKey};
}

function configFields(source){
 const sections=new Map([['',{}]]);let section='';
 for(const line of source.split(/\r?\n/)){
  const heading=line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
  if(heading){section=heading[1].replace(/\.(["'])(.*?)\1/g,'.$2');if(!sections.has(section))sections.set(section,{});continue}
  const field=line.match(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*("(?:\\.|[^"\\])*"|'[^']*'|true|false)\s*(?:#.*)?$/);
  if(!field)continue;
  try{sections.get(section)[field[1]]=field[2]==='true'||field[2]==='false'?field[2]==='true':field[2][0]==='"'?JSON.parse(field[2]):field[2].slice(1,-1)}catch{}
 }
 return sections;
}

export function inspectLocalCodexConfig(home,env=process.env){
 let source='';try{source=readFileSync(path.join(home,'config.toml'),'utf8')}catch{}
 const fields=configFields(source),top=fields.get('')||{};
 const id=typeof top.model_provider==='string'&&top.model_provider?top.model_provider:'openai';
 const definition=fields.get(`model_providers.${id}`)||{};
 const configuredUrl=definition.base_url||(id==='openai'?top.openai_base_url:'')||'';
 let baseUrl='';try{const u=new URL(configuredUrl);if(['http:','https:'].includes(u.protocol))baseUrl=u.origin}catch{}
 const envName=typeof definition.env_key==='string'&&/^[A-Za-z_][A-Za-z_0-9]*$/.test(definition.env_key)?definition.env_key:'';
 const model=typeof top.model==='string'?top.model:'';
 const authentication=id==='openai'?'认证由本机 Codex 管理':definition.requires_openai_auth===true?'此服务商使用 OpenAI 认证':'第三方服务认证，无需 OpenAI 登录';
 return {provider:baseUrl&&id==='openai'?'openai（自定义地址）':id,baseUrl,model,authentication,credential:envName?(env[envName]?'已检测到本机密钥环境变量':'密钥环境变量未传入工作台'):(fields.has(`model_providers.${id}.auth`)?'由本机 Codex 动态获取凭证':env.OPENAI_API_KEY&&id==='openai'?'已检测到本机 API Key 环境变量':'凭证由本机 Codex 管理')};
}

export function createCliConnection({dir,launch=spawn,run=command,timeoutMs=60000,env=process.env}){
 mkdirSync(dir,{recursive:true});const file=path.join(dir,'cli-connection.json'),testFile=path.join(dir,'cli-connection-test.json');let config={...empty},lastTest=null;
 try{const saved=JSON.parse(readFileSync(file,'utf8'));if(saved.mode==='custom'&&saved.apiKey)config=validateConnection(saved,empty)}catch{}
 try{const saved=JSON.parse(readFileSync(testFile,'utf8'));if(saved&&typeof saved.ok==='boolean'&&typeof saved.time==='string')lastTest=saved}catch{}
 const modelOverride=()=>{try{const saved=JSON.parse(readFileSync(path.join(dir,'codex-settings.json'),'utf8'));return typeof saved.model==='string'?saved.model:''}catch{return ''}};
 const status=()=>{
  const version=run(['--version']);const installed=version.status===0;
  const local=config.mode==='local'?inspectLocalCodexConfig(env.CODEX_HOME||path.join(homedir(),'.codex'),env):null;
  return {mode:config.mode,installed,version:installed?String(version.stdout).trim():'',baseUrl:config.mode==='custom'?config.baseUrl:local.baseUrl,model:config.mode==='custom'?config.model:local.model,modelOverride:config.mode==='local'?modelOverride():'',provider:config.mode==='custom'?'工作台专用第三方连接':local.provider,credential:config.mode==='custom'?(config.apiKey?'已配置 API Key':'未配置 API Key'):local.credential,authentication:config.mode==='custom'?'第三方服务认证，无需 OpenAI 登录':local.authentication,keyConfigured:config.mode==='custom'?!!config.apiKey:false,lastTest};
 };
 const save=input=>{config=validateConnection(input,config);const temp=file+'.tmp';writeFileSync(temp,JSON.stringify(config),{mode:0o600});chmodSync(temp,0o600);renameSync(temp,file);lastTest=null;writeFileSync(testFile,'null',{mode:0o600});return status()};
 const launchOptions=(settings={model:'',effort:''})=>{
  if(config.mode!=='custom')return {args:[],env:{...env},model:settings.model||''};
  const args=['-c',`model_provider=${toml(provider)}`,'-c',`model_providers.${provider}.name=${toml('工作台第三方连接')}`,'-c',`model_providers.${provider}.base_url=${toml(config.baseUrl)}`,'-c',`model_providers.${provider}.env_key=${toml(keyName)}`,'-c',`model_providers.${provider}.requires_openai_auth=false`,'-c',`model_providers.${provider}.wire_api=${toml('responses')}`];
  return {args,env:{...env,[keyName]:config.apiKey},model:config.model,custom:true};
 };
 let probing=false;
 const probe=async()=>{
  if(probing)throw Object.assign(Error('连接测试正在进行，请稍候'),{status:409});probing=true;
  try{
   const record=(ok,message)=>{lastTest={ok,message,time:new Date().toISOString()};writeFileSync(testFile,JSON.stringify(lastTest),{mode:0o600})};
   const installed=run(['--version']);if(installed.status!==0){record(false,'未找到 Codex CLI，请先安装并重新启动工作台');return status()}
   const choice=launchOptions({model:modelOverride()});const args=['exec','--ephemeral','--skip-git-repo-check','--sandbox','read-only','--json',...choice.args,...choice.model?['--model',choice.model]:[],'只回复 OK'];
   const result=await new Promise(resolve=>{let output='',done=false,timer;let child;const finish=(code,error)=>{if(done)return;done=true;clearTimeout(timer);resolve({code,error,output})};try{child=launch('codex',args,{cwd:dir,env:choice.env,stdio:['ignore','pipe','pipe']})}catch(e){finish(null,e.message);return}timer=setTimeout(()=>{child.kill();finish(null,'连接超时，请检查服务地址、网络或模型')},timeoutMs);child.stdout?.on('data',b=>output=(output+b.toString()).slice(-6000));child.stderr?.on('data',b=>output=(output+b.toString()).slice(-6000));child.on('error',e=>finish(null,e.code==='ENOENT'?'未找到 Codex CLI':e.message));child.on('close',code=>finish(code,''))});
   let safe=String(result.error||result.output||'').replaceAll(config.apiKey||'\0','[凭证已隐藏]');for(const [name,value] of Object.entries(choice.env)){if(/(?:KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)/i.test(name)&&typeof value==='string'&&value.length>=8)safe=safe.replaceAll(value,'[凭证已隐藏]')}safe=safe.replace(/(?:sk-|ghp_|glpat-)[A-Za-z0-9_-]{12,}/g,'[凭证已隐藏]');
   record(result.code===0,result.code===0?'连接成功：Codex CLI 已完成一次实际请求':safe.slice(-900)||'连接失败，请检查地址、密钥、模型及网络');return status();
  }finally{probing=false}
 };
 return {status,save,probe,launchOptions,selection:()=>({mode:config.mode,model:config.mode==='custom'?config.model:''})};
}
