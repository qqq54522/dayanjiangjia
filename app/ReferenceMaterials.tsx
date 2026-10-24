import React from 'react';
import {Plus,Trash2,ArrowUpRight,ImagePlus} from 'lucide-react';
import {contentEditingGroups,type ContentItem,type SlideContent} from '../lib/content';

export default function ReferenceMaterials({content,update,edit,upload,promote}:{content:SlideContent;update:(c:SlideContent)=>void;edit:(id:string,p:Partial<ContentItem>)=>void;upload:(id:string,file:File)=>Promise<void>;promote:(id:string)=>void}){
 const groups=contentEditingGroups(content),count=groups.references.length+groups.retained.length;
 function entry(x:ContentItem,retained=false){const locked=content.lockedItemIds?.includes(x.id);return <article className="reference-entry" key={x.id}>
  <header><b>{x.title||'未命名资料'}</b><span>{retained?'当前版式未展示':'参考资料'}</span><button aria-label={`删除资料：${x.title||'未命名资料'}`} title={locked?'此资料已锁定，请先解除锁定':'删除资料'} disabled={locked} onClick={()=>update({...content,items:content.items.filter(i=>i.id!==x.id)})}><Trash2 size={16}/></button></header>
  <label className="field">资料名称<input value={x.title} onChange={e=>edit(x.id,{title:e.target.value})}/></label>
  <label className="field">摘要 / 原正文<textarea rows={2} value={x.body} onChange={e=>edit(x.id,{body:e.target.value})}/></label>
  {x.value&&<label className="field">保留的数字<input value={x.value} onChange={e=>edit(x.id,{value:e.target.value})}/></label>}
  <label className="field">参考说明<textarea rows={3} value={x.detail} onChange={e=>edit(x.id,{detail:e.target.value})}/></label>
  <label className="reference-upload" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)void upload(x.id,file)}}>
   {x.media?(/\.mp4$/i.test(x.media)?<video src={x.media} muted playsInline preload="metadata"/>:<img src={x.media} alt={x.title||'参考素材'}/>):<ImagePlus size={22}/>}
   <span>{x.media?'点击或拖入替换素材':'点击或拖入参考图片、GIF、视频'}</span><input aria-label={`参考素材：${x.title||'未命名资料'}`} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void upload(x.id,f)}}/>
  </label>
  <div className="reference-actions">
   <button onClick={()=>promote(x.id)}><ArrowUpRight size={15}/>{groups.bodyVisible?'移到页面正文':'切换为卡片页并展示'}</button>
   {retained&&<button onClick={()=>edit(x.id,{placement:'detail'})}>仅作参考，不随版式上屏</button>}
   {x.media&&<button onClick={()=>edit(x.id,{media:undefined,crop:undefined,mediaAspect:undefined})}>移除素材</button>}
   {locked&&<button onClick={()=>update({...content,lockedItemIds:content.lockedItemIds?.filter(id=>id!==x.id)})}>解除 AI 修改锁定</button>}
  </div>
 </article>}
 return <details className="reference-materials">
  <summary>备稿与参考资料 <span>{count}</span></summary>
  <p>供你备稿和 Codex 理解需求；改稿时自动附带，不要求观众在页面上看到。</p>
  <label className="field">本页讲述意图（仅编辑端）<textarea rows={2} value={content.goal} onChange={e=>update({...content,goal:e.target.value})}/></label>
  {groups.retained.length>0&&<section><h4>当前版式暂不展示的正文</h4><p className="reference-help">保留原内容以便切换版式。若只用于备稿，可设为“仅作参考”。大图页的素材仍可在画面中展示。</p>{groups.retained.map(x=>entry(x,true))}</section>}
  <section><h4>参考文字与素材</h4>{groups.references.map(x=>entry(x))}<button className="reference-add" onClick={()=>update({...content,items:[...content.items,{id:crypto.randomUUID(),title:'新的参考资料',body:'',detail:'',placement:'detail'}]})}><Plus size={16}/>添加参考资料</button></section>
  {groups.references.length>0&&<label className="field">演示时的资料入口<select value={content.presentation?.evidence?'yes':'no'} onChange={e=>update({...content,presentation:{...content.presentation,evidence:e.target.value==='yes'}})}><option value="no">关闭 · 只供备稿和改稿</option><option value="yes">开启 · 点按查看补充资料</option></select></label>}
 </details>;
}
