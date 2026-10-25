import {StringDecoder} from 'node:string_decoder';
export function progressStart(label){const now=new Date().toISOString();return {stage:'starting',label,lastEventAt:now,events:[{at:now,label}]};}
export function progressStep(progress,stage,label){const at=new Date().toISOString(),old=progress||progressStart('任务已提交');return {...old,stage,label,lastEventAt:at,events:old.label===label?old.events:[...old.events,{at,label}].slice(-40)};}
// Only allowlisted event metadata is exposed. Never forward reasoning, output JSON,
// command arguments, file paths, credentials, or raw protocol payloads to the UI.
export function progressEvent(progress,event){
 const type=event?.type,item=event?.item;let step;
 if(type==='thread.started')step=['connected','已连接本机 Codex 会话'];
 else if(type==='turn.started')step=['working','Codex 已开始处理本次需求'];
 else if(type==='item.started'&&item?.type==='reasoning')step=['working','正在分析内容与排版'];
 else if(type==='item.completed'&&item?.type==='reasoning')step=['working','已完成一轮分析，继续组织建议'];
 else if((type==='item.started'||type==='item.completed')&&item?.type==='agent_message')step=['output','正在返回改编结果'];
 else if(type==='turn.completed')step=['validating','结果已返回，正在校验页面结构与素材'];
 return step?progressStep(progress,...step):progress;
}
export function eventStream(onEvent){const decoder=new StringDecoder('utf8');let pending='';const parse=line=>{try{onEvent(JSON.parse(line))}catch{}};return {push(chunk){pending+=decoder.write(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));if(pending.length>2000000){pending='';return}let end;while((end=pending.indexOf('\n'))>=0){parse(pending.slice(0,end));pending=pending.slice(end+1)}},end(){pending+=decoder.end();if(pending.trim())parse(pending);pending=''}};}
