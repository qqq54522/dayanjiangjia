import React,{useEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import type {Slide} from '../lib/deck';
import {DEFAULT_MASTER} from '../lib/masters';
import {chapterPalette,chapterColor,nextChapterColor,type ChapterColor} from '../lib/chapters';
export default function ChapterManager({slides,selected,onChange,onClose}:{slides:Slide[];selected:string;onChange:(s:Slide[])=>void;onClose:()=>void}){
 const current=slides.find(s=>s.id===selected)?.chapter,ref=useRef<HTMLDialogElement>(null);
 const [name,setName]=useState(current?.title||''),[visible,setVisible]=useState(current?.visible??true),[targets,setTargets]=useState(current?slides.filter(s=>s.chapter?.id===current.id).map(s=>s.id):[selected]);
 const [color,setColor]=useState<ChapterColor>(current?.color|| (current?chapterPalette.find(c=>c.hex===chapterColor(current))!.id:nextChapterColor([...new Map(slides.filter(s=>s.chapter).map(s=>[s.chapter!.id,s.chapter!])).values()])));
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close()},[]);
 function save(){const chapter={id:current?.id||crypto.randomUUID(),title:name.trim(),visible,color};onChange(slides.map(s=>targets.includes(s.id)?{...s,chapter,master:{...DEFAULT_MASTER}}:current&&s.chapter?.id===current.id?{...s,chapter:undefined}:s));onClose()}
 return <dialog ref={ref} className="chapter-manager" onCancel={e=>{e.preventDefault();onClose()}} aria-labelledby="chapter-manager-title"><header><div><h2 id="chapter-manager-title">{current?'编辑分组':'创建分组'}</h2><p>一组页面，共用一个主题与颜色。</p></div><button aria-label="关闭分组设置" onClick={onClose}><X size={20}/></button></header>
 <label className="field">分组名称<input value={name} maxLength={24} placeholder="例如：学得懂" onChange={e=>setName(e.target.value)}/></label>
 <div className="chapter-palette" role="group" aria-label="分组颜色">{chapterPalette.map(c=><button key={c.id} aria-pressed={color===c.id} onClick={()=>setColor(c.id)}><i style={{background:c.hex}}/>{c.name}</button>)}</div>
 <div className="chapter-label-preview" style={{'--chapter-color':chapterPalette.find(c=>c.id===color)!.hex} as React.CSSProperties}><span>{name||'分组名称'}</span></div>
 <label className="chapter-visible"><input type="checkbox" checked={visible} onChange={e=>setVisible(e.target.checked)}/>在演示画面显示分组标签</label>
 <fieldset><legend>包含哪些页面</legend><div className="chapter-select-pages">{slides.map((s,i)=><label key={s.id}><input type="checkbox" checked={targets.includes(s.id)} onChange={e=>setTargets(t=>e.target.checked?[...t,s.id]:t.filter(id=>id!==s.id))}/><span>{String(i+1).padStart(2,'0')} · {s.title||'空白页'}{s.chapter&&s.chapter.id!==current?.id&&<small>当前属于「{s.chapter.title}」，勾选后移入此组</small>}</span></label>)}</div></fieldset>
 <p className="source">应用到当前编辑稿；同组页面使用统一的标签与颜色。</p><footer>{current&&<button onClick={()=>{onChange(slides.map(s=>s.chapter?.id===current.id?{...s,chapter:undefined}:s));onClose()}}>取消此分组</button>}<button onClick={onClose}>取消</button><button className="primary" disabled={!name.trim()||!targets.length} onClick={save}>应用到 {targets.length} 页</button></footer></dialog>
}
