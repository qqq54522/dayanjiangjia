import React,{useEffect,useState}from'react';
export type ProgressTask={state:string;startedAt?:string;finishedAt?:string;model?:string;effort?:string;progress?:{stage:string;label:string;lastEventAt:string;events:{at:string;label:string}[]}};
export function TaskProgress({task,title='Codex 任务'}:{task:ProgressTask;title?:string}){
 const [now,setNow]=useState(Date.now());const running=task.state==='running';
 useEffect(()=>{setNow(Date.now());if(!running)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[running,task.startedAt]);
 if(!task.startedAt&&!task.progress)return null;
 const duration=Math.max(0,Math.floor(((running?now:Date.parse(task.finishedAt||task.progress?.lastEventAt||task.startedAt!))-Date.parse(task.startedAt||task.progress!.events[0].at))/1000));
 const elapsed=`${Math.floor(duration/60)}分${duration%60}秒`,quiet=running&&now-Date.parse(task.progress?.lastEventAt||task.startedAt!)>45000;
 const label=running?task.progress?.label||'任务正在运行，等待新的进度记录':['review','accepted','rejected','completed'].includes(task.state)?'建议已生成，等待你审阅':task.state==='cancelled'?'任务已取消':'本次任务已结束';
 return <section className="task-progress" aria-label={title+'进度'}><header><b>{title}</b><span>{running?'已用':'用时'} {elapsed}</span></header><p role="status"><i className={running?'task-pulse':''}/>{label}</p>{task.model&&<small>{task.model} · {task.effort}</small>}{quiet&&<p className="task-quiet">暂未收到新的进度事件，仍在等待结果。复杂页面可能需要数分钟；目前无法提供准确剩余时间。</p>}<details><summary>查看过程记录（{task.progress?.events.length||0}）</summary><p className="task-disclosure">展示实际任务状态，不展示内部思维链。没有新事件时不会编造进度。</p><ol>{task.progress?.events.map((e,i)=><li key={i}><time>{new Date(e.at).toLocaleTimeString('zh-CN',{hour12:false})}</time><span>{e.label}</span></li>)}</ol></details></section>;
}
