import React,{useRef} from 'react';
import {Plus,Trash2,ArrowUpRight,ImagePlus} from 'lucide-react';
import {contentEditingGroups,type ContentItem,type SlideContent} from '../lib/content';

export default function ReferenceMaterials({content,update,edit,upload,promote}:{content:SlideContent;update:(c:SlideContent)=>void;edit:(id:string,p:Partial<ContentItem>)=>void;upload:(id:string,file:File)=>Promise<void>;promote:(id:string)=>void}){
 const textFields=useRef(new Map<string,'body'|'detail'>());
 const groups=contentEditingGroups(content),count=groups.references.length+groups.retained.length;
 function entry(x:ContentItem,retained=false){if(!textFields.current.has(x.id))textFields.current.set(x.id,x.body?'body':'detail');const field=textFields.current.get(x.id)!;const locked=content.lockedItemIds?.includes(x.id);return <article className="reference-entry" key={x.id}>
  <header><b>{x.title||'文字参考'}</b><span>{retained?'当前版式未展示':'参考资料'}</span><button aria-label={`删除资料：${x.title||'文字参考'}`} title={locked?'此资料已锁定，请先解除锁定':'删除资料'} disabled={locked} onClick={()=>update({...content,items:content.items.filter(i=>i.id!==x.id)})}><Trash2 size={16}/></button></header>
  <label className="field">参考内容<textarea rows={4} placeholder="粘贴事实、原文或补充说明。想让 Codex 怎么使用这些内容，请写在上方的需求框里。" value={x[field]} onChange={e=>edit(x.id,{[field]:e.target.value})}/></label>
  {(x.title||x.value||(x.body&&x.detail))&&<details className="reference-original"><summary>保留的原始信息</summary><label className="field">原名称<input value={x.title} onChange={e=>edit(x.id,{title:e.target.value})}/></label>{x.value&&<label className="field">原数字<input value={x.value} onChange={e=>edit(x.id,{value:e.target.value})}/></label>}{x.body&&x.detail&&<label className="field">原补充说明<textarea value={x.detail} onChange={e=>edit(x.id,{detail:e.target.value})}/></label>}</details>}
  <label className="reference-upload" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)void upload(x.id,file)}}>
   {x.media?(/\.mp4$/i.test(x.media)?<video src={x.media} muted playsInline preload="metadata"/>:<img src={x.media} alt={x.title||'参考素材'}/>):<ImagePlus size={22}/>}
   <span>{x.media?'点击或拖入替换素材':'点击或拖入参考图片、GIF、视频'}</span><input aria-label={`参考素材：${x.title||'文字参考'}`} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void upload(x.id,f)}}/>
  </label>
  <div className="reference-actions">
   <button onClick={()=>promote(x.id)}><ArrowUpRight size={15}/>{groups.bodyVisible?'移到页面正文':'切换为卡片页并展示'}</button>
   {retained&&<button onClick={()=>edit(x.id,{placement:'detail'})}>仅作参考，不随版式上屏</button>}
   {x.media&&<button onClick={()=>edit(x.id,{media:undefined,crop:undefined,mediaAspect:undefined})}>移除素材</button>}
   {locked&&<button onClick={()=>update({...content,lockedItemIds:content.lockedItemIds?.filter(id=>id!==x.id)})}>解除 AI 修改锁定</button>}
  </div>
 </article>}
 return <details className="reference-materials">
  <summary>补充文字资料 <span>{count}</span></summary>
  <p>可选：保存不直接上屏的原文、事实和备稿笔记。改稿时自动附带。</p>
  {content.goal&&<details><summary>之前保存的讲述意图</summary><textarea aria-label="之前保存的讲述意图" rows={2} value={content.goal} onChange={e=>update({...content,goal:e.target.value})}/></details>}
  {groups.retained.length>0&&<section><h4>暂存的原文</h4><p className="reference-help">这些文字暂未放进当前画面。可以继续保留作参考，也可以移回正文。</p>{groups.retained.map(x=>entry(x,true))}</section>}
  <section>{groups.references.map(x=>entry(x))}<button className="reference-add" onClick={()=>update({...content,items:[...content.items,{id:crypto.randomUUID(),title:'',body:'',detail:'',placement:'detail'}]})}><Plus size={16}/>添加文字资料</button></section>
  {groups.references.length>0&&<label className="field">演示时的资料入口<select value={content.presentation?.evidence?'yes':'no'} onChange={e=>update({...content,presentation:{...content.presentation,evidence:e.target.value==='yes'}})}><option value="no">关闭 · 只供备稿和改稿</option><option value="yes">开启 · 点按查看补充资料</option></select></label>}
 </details>;
}
