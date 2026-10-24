import React,{useMemo} from 'react';
import type {Slide} from '../lib/deck';
import {styleExamples,styleExampleInfo} from '../lib/templates';
import {Scene} from './Scene';

export default function StyleSamples({slides,disabled=false,onAdd}:{slides:Slide[];disabled?:boolean;onAdd:(examples:Slide[])=>void}){
 const examples=useMemo(()=>styleExamples(slides),[slides]);
 const exceedsLimit=slides.length+examples.length>60;
 return <>
  <h2>品牌样式示例 · {examples.length} 种表达</h2>
  <p>示例会追加在当前稿件末尾，现有页面保持不变。随后可以复制、编辑或删除。</p>
  <div className="sample-grid">{examples.map(p=>{const info=styleExampleInfo(p);return <section key={p.id}><Scene s={p} interactive={false}/><b>{info.label}</b><small>{info.hint}</small></section>})}</div>
  {exceedsLimit&&<p role="status">当前 {slides.length} 页，添加后将超过 60 页上限。请先整理页面，再添加示例。</p>}
  <button className="primary wide" disabled={disabled||exceedsLimit} onClick={()=>{if(!disabled&&!exceedsLimit)onAdd(examples)}}>添加全部 {examples.length} 页示例</button>
 </>;
}
