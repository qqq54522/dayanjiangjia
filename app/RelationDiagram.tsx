import React,{useId} from 'react';
import type {SlideContent,ContentItem} from '../lib/content';
import {contentLayout} from '../lib/content';
import {relationPlan} from '../lib/relations';

export function RelationDiagram({content,interactive,media}:{content:SlideContent;interactive:boolean;media:(item:ContentItem)=>React.ReactNode}){
 const plan=relationPlan(content),layout=contentLayout(content),marker=useId(),guided=interactive&&content.presentation?.interaction!=='static';
 const hasInductionBar=layout==='induction'&&plan.nodes.filter(n=>n.role==='premise').length>1;
 return <div className={`relation-diagram relation-${layout} ${content.presentation?.relationMode==='center'?'relation-center':''}`}>
  <svg className="relation-connections" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={marker} viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="9" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z"/></marker></defs>{plan.paths.map((d,i)=><path key={i} d={d} markerEnd={(hasInductionBar&&i===0)||(layout==='converge'&&content.presentation?.relationMode!=='center'&&i<plan.paths.length-1)?undefined:`url(#${marker})`}/>)}</svg>
  {layout==='cycle'&&content.summary&&<div className="relation-cycle-summary">{content.summary}</div>}
  {plan.nodes.map(({item,role,x,y,width,height})=><section key={item.id} className={`relation-node relation-${role} ${item.media?'with-media':''}`} style={{left:x+'%',top:y+'%',width:width+'%',height:height+'%'}} data-relation-id={item.id}>
   <div className="relation-copy">{item.value&&<div className="content-value">{item.value}</div>}{item.title&&<h2>{item.title}</h2>}{item.body&&<p className="content-body">{item.body}</p>}</div>
   {item.media&&media(item)}
   {guided&&item.interaction!=='none'&&<button type="button" className="relation-focus-hit" data-relation-focus={item.id} aria-pressed="false" aria-label={'聚焦'+(item.title||item.body||'本项')}/>}
   {interactive&&item.interaction==='detail'&&item.detail&&<button type="button" className="relation-detail-open" data-detail-open={content.items.indexOf(item)} aria-label={'查看'+(item.title||'本项')+'详情'}>详情</button>}
  </section>)}
 </div>;
}
