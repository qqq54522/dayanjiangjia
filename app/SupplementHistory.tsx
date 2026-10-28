import React from 'react';
import type {Slide} from '../lib/deck';
import {Scene} from './Scene';

export type PreviewResult={id:string;label:string;time:string|null;parentId?:string|null;legacy?:boolean;request?:string;reason?:string;questions?:string[];slides:Slide[]};
export type SourcePreview={number:number;preview:string};

export function SupplementHistory({results,currentId,selectedId,sources,busy,onSelect,onRestore,onLarge,onSourceLarge}:{
 results:PreviewResult[];currentId?:string;selectedId?:string;sources:SourcePreview[];busy:boolean;
 onSelect:(id:string)=>void;onRestore:(id:string)=>void;onLarge:(s:Slide)=>void;onSourceLarge:(p:SourcePreview)=>void;
}){
 const source=selectedId==='source',selected=results.find(h=>h.id===(selectedId||currentId)),current=selected?.id===currentId;
 const parent=results.find(h=>h.id===selected?.parentId);
 return <div className="supplement-history">
  <h4>原稿与修改历史</h4>
  <div className="supplement-history-choices" role="group" aria-label="选择查看哪一轮结果">
   <button aria-pressed={source} onClick={()=>onSelect('source')}>原稿</button>
   {results.map(h=><button key={h.id} aria-pressed={!source&&h.id===(selectedId||currentId)} onClick={()=>onSelect(h.id)}>{h.label}{h.id===currentId&&<small>当前使用</small>}</button>)}
  </div>
  <div className="supplement-history-caption" role="status">
   <b>正在查看：{source?'原稿':selected?.label||'当前结果'}</b>
   {selected?.time&&<span>{new Date(selected.time).toLocaleString('zh-CN')}</span>}
   {parent&&<span>基于「{parent.label}」修改</span>}
  </div>
  {source?<>
   {sources.map(p=><div className="supplement-source-preview" key={p.number}><img src={p.preview} alt={'原稿第 '+p.number+' 页'}/><button onClick={()=>onSourceLarge(p)}>放大查看原稿第 {p.number} 页</button></div>)}
   <p className="source">原稿始终保留，可随时对照。选择某轮生成结果后，可恢复并继续修改。</p>
  </>:selected&&<>
   {selected.slides.map(s=><div className="supplement-preview" key={s.id}><Scene s={s} interactive={false}/><button onClick={()=>onLarge(s)}>放大检查排版</button></div>)}
   {selected.request&&<p><b>这一轮的要求：</b>{selected.request}</p>}
   {selected.reason&&<p>{selected.reason}</p>}
   {selected.questions?.map((q,i)=><p key={i}>待核对：{q}</p>)}
   {selected.legacy&&<p className="source">这是启用历史功能时保留的已有结果；更早未保存的画面无法从调整文字中还原。</p>}
   {!current&&<div className="supplement-history-restore"><p>现在只是在查看历史画面。恢复后可继续修改，其他轮次仍会保留；插入前需要重新确认。</p><button className="primary" disabled={busy} onClick={()=>onRestore(selected.id)}>恢复此结果并继续修改</button></div>}
  </>}
 </div>;
}
