import React,{useEffect,useRef,useId} from 'react';
import type {ContentItem} from '../lib/content';
import type {Slide} from '../lib/deck';
import {initContent} from '../lib/content-interaction';
import {brandLogo,brandLogoWhite} from '../lib/brand';
import {initLogo} from '../lib/logo';
import {Gallery} from './Scene';

export default function ContentScene({s,interactive=true}:{s:Slide;interactive?:boolean}){
 const clipId=useId();
 const ref=useRef<HTMLElement>(null),c=s.content!,mainItems=c.items.filter(i=>i.placement!=='detail'),evidenceItems=c.kind==='table'?c.items:c.items.filter(i=>i.placement==='detail');
 const opening=c.kind==='point'&&!evidenceItems.length&&mainItems.every(i=>!i.title&&!i.body&&!i.media&&!i.value&&!i.detail);
 useEffect(()=>{if(!ref.current)return;initLogo(ref.current);const events=interactive?initContent(ref.current):undefined;return()=>{events?.()}},[JSON.stringify(s),interactive]);
 const media=(item:ContentItem,scope='main')=>{if(item.crop&&item.mediaAspect&&item.media){const a=item.mediaAspect,r=item.crop;return <svg className="content-crop" viewBox={`${r.x*a} ${r.y} ${r.width*a} ${r.height}`} role="img" aria-label={item.title} style={{aspectRatio:String(r.width*a/r.height)}}><defs><clipPath id={clipId+scope+c.items.indexOf(item)}><rect x={r.x*a} y={r.y} width={r.width*a} height={r.height}/></clipPath></defs><image clipPath={`url(#${clipId+scope+c.items.indexOf(item)})`} href={item.media} width={a} height={1}/></svg>}return <Gallery s={{...s,media:item.media||'',gallery:[],subtitle:item.title}} interactive={interactive}/>};
 return <article ref={ref} className={`scene comic-default semantic-scene content-${c.kind} ${opening?'content-opening':''} ${c.summary?'has-summary':''} ${c.kind==='process'&&mainItems.some(i=>i.media)?'has-step-media':''} ${s.chapter?.visible?'has-chapter':''}`} data-content-count={mainItems.length}>
  <div className="comic-backdrop" aria-hidden="true">{s.background&&<img src={s.background} alt=""/>}</div><div className="comic-dots" aria-hidden="true"/>
  <div className="scene-brand"><img className="logo-light" src={brandLogo} alt="洋葱学园"/><img className="logo-dark" src={brandLogoWhite} alt="洋葱学园"/></div>
  {s.chapter?.visible&&<div className="chapter-ribbon"><span>{s.chapter.title}</span></div>}
  <h1 className="comic-title"><span>{s.title}</span></h1>
  <div className="content-main">
   {s.subtitle&&<p className="content-lead">{s.subtitle}</p>}
   {c.kind==='table'&&c.table?<div className="semantic-table-wrap"><table className="semantic-table"><thead><tr>{c.table.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{c.table.rows.map((r,i)=><tr key={i}>{r.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>:
    <div className="content-items" style={{'--content-columns':c.kind==='compare'?2:Math.min(mainItems.length||1,c.kind==='process'?5:3)} as React.CSSProperties}>
    {mainItems.map((item,i)=><section className="content-item" key={item.id}>
     {c.kind==='process'?<button className="content-step" data-content-step={i} data-step-detail={item.detail?c.items.indexOf(item):undefined} data-active={i===0?'true':'false'} aria-pressed={i===0}><b>{String(i+1).padStart(2,'0')}</b><strong>{item.title}</strong></button>:
     <>{item.value&&<div className="content-value">{item.value}</div>}<h2>{item.title}</h2></>}
     {item.media&&c.kind!=='process'&&media(item)}
     {item.body&&<p className="content-body">{item.body}</p>}
     {interactive&&c.kind!=='process'&&(item.detail||item.crop)&&<button className="content-detail-hit" data-detail-open={c.items.indexOf(item)} aria-label={`查看${item.title||'本项'}详情`}/>}
     {(item.detail||item.crop)&&<dialog className="content-detail" data-detail={c.items.indexOf(item)} aria-label={`${item.title||'证据'}详情`}><div className="content-detail-sheet"><button className="detail-return" data-detail-close aria-label="返回页面">↩</button><h2>{item.title}</h2>{item.value&&<strong className="content-value">{item.value}</strong>}{item.media&&media(item,'detail')}<p>{item.body}</p><div className="content-detail-text">{item.detail}</div></div></dialog>}
    </section>)}
   </div>}
   {evidenceItems.length>0&&<div className="evidence-items">{evidenceItems.length>4?<><button data-detail-open="evidence-index">补充资料（{evidenceItems.length}）</button><dialog className="content-detail" data-detail="evidence-index" aria-label="补充资料"><div className="content-detail-sheet"><button className="detail-return" data-detail-close aria-label="返回页面">↩</button><h2>补充资料</h2><div className="evidence-index">{evidenceItems.map(item=><button key={item.id} data-detail-open={c.items.indexOf(item)}>{item.title||'查看完整证据'}</button>)}</div></div></dialog></>:evidenceItems.map(item=><button key={item.id} data-detail-open={c.items.indexOf(item)}>{item.title||'查看完整证据'}</button>)}{evidenceItems.map((item,i)=><React.Fragment key={item.id}><dialog className="content-detail" data-detail={c.items.indexOf(item)} aria-label={item.title||'完整证据'}><div className="content-detail-sheet"><button className="detail-return" data-detail-close aria-label="返回页面">↩</button><h2>{item.title}</h2>{item.media&&media(item,'detail')}<p>{item.body}</p><div className="content-detail-text">{item.detail}</div></div></dialog></React.Fragment>)}</div>}
   {c.kind==='process'&&mainItems.some(i=>i.media)&&<div className="step-media-stage">{mainItems.map((item,i)=><div key={item.id} data-step-media={i} hidden={i!==0}>{item.media?media(item):<p>{item.body}</p>}</div>)}</div>}
  </div>
  {c.summary&&<div className="content-summary">{c.summary}</div>}
 </article>;
}
