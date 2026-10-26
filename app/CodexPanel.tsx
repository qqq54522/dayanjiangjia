import {TaskProgress,type ProgressTask} from './TaskProgress';
import React,{useEffect,useRef,useState} from 'react';
type Settings={model:string;effort:string};
type Job=ProgressTask&{id:string;projectId?:string;state:string;message:string;model:string;effort:string};
type State={settings:Settings;models:{id:string;efforts:string[]}[];job:Job|null};
async function api(url:string,method='GET',body?:unknown){const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const d=await r.json();if(!r.ok)throw Error(d.error||'请求失败');return d as State;}
export default function CodexPanel({disabled,prepare,onComplete,projectId}:{disabled:boolean;prepare:()=>Promise<{revision:number;scope:string|string[];request:string}|null>;onComplete:(autoPreview:boolean)=>void;projectId:string}){
 const [state,setState]=useState<State|null>(null),[settings,setSettings]=useState<Settings>({model:'',effort:''}),[customMode,setCustomMode]=useState(false),[error,setError]=useState(''),[sending,setSending]=useState(false),[pending,setPending]=useState(false);
 const seen=useRef(''),complete=useRef(onComplete),alive=useRef(true);complete.current=onComplete;
 useEffect(()=>{alive.current=true;let timer:ReturnType<typeof setTimeout>;let first=true;async function poll(){try{const d=await api('/api/codex');if(!alive.current)return;const initialPoll=first;setState(d);if(first){setSettings(d.settings);setCustomMode(Boolean(d.settings.model)&&!d.models.some(m=>m.id===d.settings.model));first=false;}if(d.job?.projectId===projectId&&d.job.state==='completed'&&seen.current!==d.job.id){seen.current=d.job.id;complete.current(!initialPoll);}}catch(e){if(alive.current)setError(String(e));}if(alive.current)timer=setTimeout(poll,1500);}void poll();return()=>{alive.current=false;clearTimeout(timer)};},[projectId]);
 const currentJob=state?.job&&(state.job.projectId===projectId||!state.job.projectId)?state.job:null;
 const running=state?.job?.state==='running';
 async function start(){setSending(true);setError('');try{if(customMode&&!settings.model)throw Error('请填写自定义模型 ID');const input=await prepare();if(!input)return;const d=await api('/api/codex/start','POST',{...input,settings,projectId});setState(d);setPending(false);seen.current='';}catch(e){setError(String(e));}finally{setSending(false);}}
 async function saveSettings(){setSending(true);setError('');try{if(customMode&&!settings.model)throw Error('请填写自定义模型 ID');setState(await api('/api/codex/settings','PUT',settings));setPending(false);}catch(e){setError(String(e));}finally{setSending(false);}}
 const options=state?.models||[];
 const levels=options.find(m=>m.id===settings.model)?.efforts||['low','medium','high','xhigh','max'];
 const modelChoice=customMode?'custom':settings.model||'local';
 const summary=settings.model?`${settings.model}${settings.effort?' / '+settings.effort:''}`:'跟随本机 Codex 设置';
 return <section className="codex-panel" aria-label="Codex 改稿设置"><button className="primary wide" onClick={start} disabled={disabled||running||sending||!state}>{running?'Codex 正在修改…':sending?'正在提交…':'让 Codex 修改'}</button><small>先生成建议供你预览，确认后才应用。</small><details className="codex-advanced"><summary>高级设置 · {summary}</summary>
 <label className="field">模型<select aria-label="Codex 模型" disabled={running||sending} value={modelChoice} onChange={e=>{const choice=e.target.value;setCustomMode(choice==='custom');setSettings({model:choice==='local'||choice==='custom'?'':choice,effort:''});setPending(true)}}><option value="local">跟随本机 Codex 设置（推荐）</option>{options.map(m=><option key={m.id} value={m.id}>{m.id==='gpt-6-astra'?'Astra · GPT-6':m.id}</option>)}<option value="custom">自定义模型 ID</option></select></label>
 {customMode&&<label className="field">模型 ID<input aria-label="自定义模型 ID" value={settings.model} disabled={running||sending} placeholder="填写本机 Codex 可用的模型 ID" onChange={e=>{setSettings({...settings,model:e.target.value});setPending(true)}}/></label>}
 {Boolean(settings.model)&&<label className="field">推理强度<select aria-label="推理强度" disabled={running||sending} value={settings.effort} onChange={e=>{setSettings({...settings,effort:e.target.value});setPending(true)}}><option value="">跟随本机 Codex 设置</option>{levels.map(x=><option key={x} value={x}>{x}{x==='medium'?' · 均衡':x==='low'?' · 更快':x==='high'?' · 深入':''}</option>)}</select></label>}
 {pending&&<button disabled={sending||running} onClick={saveSettings}>保存模型设置</button>}
 <small>沿用本机 Codex CLI 的服务商、登录或 API Key；第三方模型也可使用。所选服务须支持本任务需要的结构化输出和图片输入。</small></details>
 {currentJob&&<TaskProgress task={currentJob} title="Codex 改稿"/>}
 {currentJob&&<div className="codex-job">{!running&&<><b>{({running:'正在处理',completed:'改稿任务已完成',failed:'本次未完成',cancelled:'已取消',needs_attention:'需要补充说明'} as Record<string,string>)[currentJob.state]}</b><small>{currentJob.model||'本机模型'} / {currentJob.effort||'本机强度'}</small><p>{currentJob.state==='completed'?'生成时摘要：':''}{currentJob.message}</p></>}{running&&<button onClick={async()=>{try{setState(await api('/api/codex/cancel','POST',{}));}catch(e){setError(String(e));}}}>取消本次改稿</button>}{['failed','cancelled','needs_attention'].includes(currentJob.state)&&<small>在上方保留或重新填写需求，再点“让 Codex 修改”重试。</small>}</div>}
 {error&&<p role="alert" className="codex-error">{error}</p>}
 </section>;
}
