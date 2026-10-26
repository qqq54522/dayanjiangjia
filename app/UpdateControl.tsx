'use client';
import React,{useEffect,useRef,useState} from 'react';
import {RefreshCw,X} from 'lucide-react';

type UpdateState={phase:string;error?:string;current?:string;target?:string;updated?:boolean;canUpdate?:boolean;branch?:string;dirty?:boolean;supervised?:boolean};

export default function UpdateControl({blocked=false}:{blocked?:boolean}){
 const [open,setOpen]=useState(false),[state,setState]=useState<UpdateState|null>(null),[message,setMessage]=useState('');
 const expected=useRef('');
 async function check(){
  const response=await fetch('/api/update',{cache:'no-store'});
  const value=await response.json();
  if(!response.ok)throw Error(value.error||'检查更新失败');
  setState(value);
  if(expected.current&&value.current===expected.current&&value.phase==='idle')window.location.reload();
  return value as UpdateState;
 }
 useEffect(()=>{if(!open)return;let active=true;const poll=async()=>{
  try{const next=await check();if(active){if(next.phase==='failed')expected.current='';setMessage(next.phase==='failed'?next.error||'更新失败':'')}}catch(e){if(active)setMessage(expected.current?'正在等待工作台重启…':String(e))}
 };
 const timer=window.setInterval(()=>{if(expected.current)void poll()},1500);
 return()=>{active=false;window.clearInterval(timer)};
 },[open]);
 async function update(checked=state){
  if(blocked)return;
  setMessage('正在拉取并构建，页面会自动刷新…');
  try{
   const response=await fetch('/api/update',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
   const value=await response.json();
   if(!response.ok)throw Error(value.error||'更新失败');
   if(value.phase==='current'){setMessage('已经是最新版');await check();return}
   expected.current=value.target;
   setState({...checked,phase:'updating',target:value.target});
  }catch(e){setMessage(e instanceof Error?e.message:String(e));expected.current=''}
 }
 async function openAndUpdate(){
  setOpen(true);setMessage('');setState(null);expected.current='';
  try{const checked=await check();if(checked.canUpdate&&!blocked)await update(checked)}catch(e){setMessage(e instanceof Error?e.message:String(e))}
 }
 return <>
  <button type="button" className="tool-update-button" aria-label="更新工具" onClick={()=>void openAndUpdate()}><RefreshCw size={15}/>更新工具</button>
  {open&&<div className="tool-update-backdrop"><section className="tool-update-dialog" role="dialog" aria-modal="true" aria-label="更新工作台">
   <button className="tool-update-close" aria-label="关闭更新窗口" disabled={!!expected.current} onClick={()=>setOpen(false)}><X size={18}/></button>
   <h2>更新工作台</h2>
   <p>从 GitHub 获取最新工具代码，安装依赖并重新构建。更新完成后工作台会重启并刷新；本机项目、草稿和素材仍保存在原处。</p>
   {!state?<p role="status">正在检查更新…</p>:<div className="tool-update-details">
    <p>当前：{state.current?.slice(0,7)||'未知'} · GitHub：{state.target?.slice(0,7)||'未连接'}</p>
    {state.branch&&state.branch!=='main'&&<p role="alert">当前在 {state.branch} 分支，请先切换 main。</p>}
    {state.dirty&&<p role="alert">代码目录有未提交改动，更新不会覆盖。</p>}
    {state.supervised===false&&<p role="alert">请通过 npm start 或「启动工作台.command」启动后再更新。</p>}
    {state.error&&<p role="alert">{state.error}</p>}
    {state.phase==='updating'||state.phase==='restarting'?<p role="status">{state.phase==='restarting'?'正在重启…':'正在拉取、验证并构建…'}</p>:state.updated===false&&!state.error?<p role="status">已经是最新版</p>:null}
   </div>}
   {blocked&&<p role="alert">请先等待当前草稿自动保存完成，再更新工具。</p>}
   {message&&<p role="status">{message}</p>}
   <div className="tool-update-actions"><button disabled={!!expected.current} onClick={()=>void check().catch(e=>setMessage(String(e)))}>重新检查</button><button className="primary" disabled={!state?.canUpdate||blocked||!!expected.current} onClick={()=>void update()}>更新到最新版</button></div>
  </section></div>}
 </>;
}
