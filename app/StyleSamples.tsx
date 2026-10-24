import React,{useMemo} from 'react';
import type {Slide} from '../lib/deck';
import {styleExamples,styleExampleInfo} from '../lib/templates';
import {presentationCategories,slideCategory} from '../lib/presentation-options';
import {Scene} from './Scene';

export default function StyleSamples({slides,disabled=false,onAdd}:{slides:Slide[];disabled?:boolean;onAdd:(examples:Slide[])=>void}){
 const examples=useMemo(()=>styleExamples(slides),[slides]);
 const exceedsLimit=slides.length+examples.length>60;
 return <>
  <h2>品牌样式示例</h2>
  <p>{presentationCategories.length} 类用途，{examples.length} 个版式。先想清楚这一页要表达什么，再选择合适的布局。</p>
  <nav className="sample-categories" aria-label="示例用途">{presentationCategories.map((group,i)=><a key={group.id} href={`#sample-${group.id}`}>{String(i+1).padStart(2,'0')} {group.label}</a>)}</nav>
  {presentationCategories.map((group,i)=><section className="sample-category" id={`sample-${group.id}`} key={group.id}>
   <header><span>{String(i+1).padStart(2,'0')}</span><div><h3>{group.label}</h3><p>{group.hint}</p></div></header>
   <div className="sample-grid">{examples.filter(p=>slideCategory(p).id===group.id).map(p=>{const info=styleExampleInfo(p);return <section className="sample-example" key={p.id}><Scene s={p} interactive={false}/><div className="sample-caption"><div><b>{info.label}</b><small>{info.hint}</small></div><button disabled={disabled||slides.length>=60} onClick={()=>{if(!disabled&&slides.length<60)onAdd([{...p,id:crypto.randomUUID()}])}}>添加此页</button></div></section>})}</div>
  </section>)}
  <p>示例追加到当前稿件末尾，现有页面保持不变。随后可以复制、编辑或删除。</p>
  {exceedsLimit&&<p role="status">当前 {slides.length} 页，添加全部示例将超过 60 页上限。可以单独添加所需的版式。</p>}
  <button className="primary wide" disabled={disabled||exceedsLimit} onClick={()=>{if(!disabled&&!exceedsLimit)onAdd(examples)}}>添加全部 {examples.length} 页示例</button>
 </>;
}
