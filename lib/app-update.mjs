import {execFile,execFileSync,spawn} from 'node:child_process';
import {promisify} from 'node:util';

const repository=/^(?:https:\/\/github\.com\/|ssh:\/\/git@github\.com\/|git@github\.com:|git@github-dayanjiangjia:)qqq54522\/dayanjiangjia(?:\.git)?\/?$/i;
const git=(root,...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}).trim();
const remoteHead=async(root,remote)=>{
 const {stdout}=await promisify(execFile)('git',['ls-remote',remote,'refs/heads/main'],{cwd:root,encoding:'utf8',timeout:15000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
 return stdout.trim().split(/\s+/)[0];
};

export function updateSource(root){
 for(const remote of git(root,'remote').split('\n').filter(Boolean)){
  if(repository.test(git(root,'remote','get-url',remote)))return remote;
 }
 throw Error('没有找到大演说家 GitHub 仓库，请从 github.com/qqq54522/dayanjiangjia 克隆项目');
}

export function localUpdateState(root){
 const remote=updateSource(root);
 const branch=git(root,'branch','--show-current');
 const current=git(root,'rev-parse','HEAD');
 const dirty=Boolean(git(root,'status','--porcelain'));
 return {remote,branch,current,dirty};
}

export function createAppUpdater({root,supervised=false,onRestart=()=>{},run=spawn,getRemoteHead=(remote)=>remoteHead(root,remote)}={}){
 let phase='idle',error='',target='',updated=false;
 const status=async()=>{
  let local;
  try{local=localUpdateState(root)}catch(e){return {phase:'unavailable',error:e.message,canUpdate:false}}
  if(phase==='checking'||phase==='updating'||phase==='restarting')return {phase,error,target,updated,...local,canUpdate:false};
  try{
   target=await getRemoteHead(local.remote);
   if(!/^[0-9a-f]{40}$/.test(target))throw Error('远端 main 不存在');
   if(phase!=='failed')error='';
  }catch(e){error='无法连接 GitHub，请检查网络和仓库地址';target='';}
  return {phase,error,target,updated:target!==local.current,...local,supervised,canUpdate:supervised&&local.branch==='main'&&!local.dirty&&!!target&&(target!==local.current||phase==='failed')};
 };
 const start=async()=>{
  if(phase==='updating'||phase==='restarting')throw Object.assign(Error('更新正在进行'),{status:409});
  if(!supervised)throw Object.assign(Error('请通过 npm start 或「启动工作台.command」运行工作台后再更新'),{status:409});
  const state=await status();
  if(state.branch!=='main')throw Object.assign(Error('请先切换到 main 分支；未改动当前代码'),{status:409});
  if(state.dirty)throw Object.assign(Error('代码目录有未提交改动；未覆盖这些改动'),{status:409});
  if(!state.target)throw Object.assign(Error(state.error||'无法连接 GitHub'),{status:503});
  if(!state.updated&&phase!=='failed')return {phase:'current',message:'已经是最新版'};
  phase='updating';error='';
  const child=run(process.execPath,['scripts/apply-update.mjs',state.remote,state.target],{cwd:root,env:{...process.env,DECK_UPDATE_CHILD:'1'},stdio:['ignore','pipe','pipe']});
  let details='';
  const collect=chunk=>{details=(details+String(chunk)).slice(-6000)};
  child.stdout?.on('data',collect);child.stderr?.on('data',collect);
  child.on('error',e=>{phase='failed';error='更新进程未能启动：'+e.message});
  child.on('exit',code=>{if(phase==='failed')return;if(code===0){phase='restarting';onRestart()}else{phase='failed';error=details.trim().split('\n').at(-1)||'更新失败，请检查终端日志'}});
  return {phase,target:state.target};
 };
 return {status,start};
}
