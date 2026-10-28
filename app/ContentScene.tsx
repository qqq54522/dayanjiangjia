import {RelationDiagram} from './RelationDiagram';
import {CoverOpening} from './CoverOpening';
import {FocusTable} from './FocusTable';
import {itemLayout,adaptiveColumns} from '../lib/module-layout';
import {chapterColor} from '../lib/chapters';
import {frameAspect} from '../lib/media-frame';
import React,{useEffect,useRef,useId} from 'react';
import {contentLayout,contentColumns,hasDetail,numberedItems,type ContentItem} from '../lib/content';
import type {Slide} from '../lib/deck';
import {initCardTypography} from '../lib/card-typography';
import {initContent} from '../lib/content-interaction';
import {brandLogo,brandLogoWhite} from '../lib/brand';
import {initLogo} from '../lib/logo';
import {Gallery} from './Scene';

export default function ContentScene({s,interactive=true}:{s:Slide;interactive?:boolean}){
 const adaptive=true;
 const clipId=useId(),ref=useRef<HTMLElement>(null),c=s.content!;
 const main=c.items.filter(i=>i.placement!=='detail'),extra=c.items.filter(i=>i.placement==='detail');
 const layout=contentLayout(c),opening=layout==='cover'||layout==='chapter',image=['image','carousel'].includes(layout),relation=['induction','converge','cycle'].includes(layout),inlineSteps=layout==='process-cards',split=layout==='balanced'||layout==='text';
 const splitShare=c.presentation?.textShare??(layout==='text'?57:31),mediaLeft=c.presentation?.mediaSide==='left';
 const showSubtitle=c.presentation?.subtitle==='visible',numbered=numberedItems(c),columns=adaptive?adaptiveColumns(c,contentColumns(c)):contentColumns(c);
 const stepMedia=!opening&&!image&&!split&&!relation&&!inlineSteps&&c.kind==='process'&&main.some(i=>i.media);
 const evidence=c.presentation?.evidence?extra:[],summary=!opening&&!image&&layout!=='cycle'?c.summary:'';
 useEffect(()=>{if(!ref.current)return;initLogo(ref.current);const typography=initCardTypography(ref.current);const events=interactive?initContent(ref.current):undefined;return()=>{typography?.();events?.()}},[JSON.stringify(s),interactive]);
 function media(item:ContentItem,scope='main'){
  if(item.crop&&item.mediaAspect&&item.media){const a=item.mediaAspect,r=item.crop,open=scope==='main'&&interactive&&item.interaction==='focus';return <svg className="content-crop" preserveAspectRatio={frameAspect(scope==='main'?item.mediaFrame:undefined)} viewBox={`${r.x*a} ${r.y} ${r.width*a} ${r.height}`} role={open?'button':'img'} tabIndex={open?0:undefined} data-detail-open={open?c.items.indexOf(item):undefined} aria-label={open?`放大${item.title||'图片'}`:item.title} style={{aspectRatio:String(r.width*a/r.height),...(scope==='main'&&item.mediaFrame?.fit==='cover'?{height:'100%',width:'100%',maxWidth:'100%'}:{})}}><defs><clipPath id={clipId+scope+c.items.indexOf(item)}><rect x={r.x*a} y={r.y} width={r.width*a} height={r.height}/></clipPath></defs><image clipPath={`url(#${clipId+scope+c.items.indexOf(item)})`} href={item.media} width={a} height={1}/></svg>}
  return <Gallery frames={[scope==='main'?item.mediaFrame:undefined]} s={{...s,media:item.media||'',gallery:[],subtitle:item.title}} interactive={interactive&&item.interaction!=='none'}/>;
 }
 const dialogItems=c.items.filter(i=>hasDetail(i)||(i.crop&&i.media&&i.interaction!=='none')||evidence.includes(i));
 function detailDialog(item:ContentItem){return <dialog key={'dialog-'+item.id} className="content-detail" data-detail={c.items.indexOf(item)} aria-label={`${item.title||'素材'}详情`}><div className="content-detail-sheet"><button className="detail-return" data-detail-close aria-label="返回页面">↩</button><h2>{item.title}</h2>{item.value&&<strong className="content-value">{item.value}</strong>}{item.media&&media(item,'detail')}<p>{item.body}</p>{(item.interaction==='detail'||evidence.includes(item))&&item.detail&&<div className="content-detail-text">{item.detail}</div>}</div></dialog>}
 function card(item:ContentItem,i:number){
  const details=hasDetail(item)||!!(item.crop&&item.media&&item.interaction!=='none'),focus=item.interaction==='focus',step=c.kind==='process'&&!split&&!inlineSteps;
  if(adaptive&&!split&&['cards','compare','process'].includes(c.kind)){
   const plan=itemLayout(item,c,columns),h=plan.highlight,at=h?item.body.indexOf(h):-1;
   return <section key={item.id} className={`content-item adaptive-item ${item.media&&!step?'with-media':''} ${item.value?'with-value':''} ${focus||inlineSteps?'focus-card':''}`} data-emphasis={plan.emphasis} data-align={plan.align} data-media-layout={plan.media} data-density={plan.density}>
    {step?<button className="content-step card-heading" data-content-step={i} data-step-detail={hasDetail(item)?c.items.indexOf(item):undefined} data-active={i===0?'true':'false'} aria-pressed={i===0}><b>{String(i+1).padStart(2,'0')}</b><strong>{item.title}</strong></button>:<div className="card-heading">{(numbered||inlineSteps)&&<b className="content-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</b>}{item.title&&<h2>{item.title}</h2>}</div>}
    {item.value&&<div className="content-value">{item.value}</div>}
    {item.media&&!step&&media(item)}
    {item.body&&<p className="content-body">{at<0?item.body:<>{item.body.slice(0,at)}<mark>{h}</mark>{item.body.slice(at+h.length)}</>}</p>}
    {interactive&&(focus||inlineSteps)&&item.interaction!=='none'&&c.presentation?.interaction!=='static'&&<button className="content-focus-hit" data-content-step={i} data-overview-focus={inlineSteps?'true':undefined} data-active="false" aria-pressed={false} aria-label={`聚焦${item.title}`}/>}
    {interactive&&!step&&!focus&&details&&<button className="content-detail-hit" data-detail-open={c.items.indexOf(item)} aria-label={`查看${item.title||'本项'}详情`}/>}
   </section>;
  }
  return <section className={`content-item ${item.media&&!split?'with-media':''} ${item.value?'with-value':''} ${focus||inlineSteps?'focus-card':''}`} key={item.id}>
   {step?<button className="content-step" data-content-step={i} data-step-detail={hasDetail(item)?c.items.indexOf(item):undefined} data-active={i===0?'true':'false'} aria-pressed={i===0}><b>{String(i+1).padStart(2,'0')}</b><strong>{item.title}</strong></button>:<>
    {numbered&&<b className="content-number" aria-hidden="true">{String(i+1).padStart(2,'0')}</b>}
    {item.value&&<div className="content-value">{item.value}</div>}{item.title&&<h2>{item.title}</h2>}
   </>}
   {item.media&&!step&&!split&&media(item)}
   {item.body&&<p className="content-body">{item.body}</p>}
   {interactive&&(focus||inlineSteps)&&item.interaction!=='none'&&c.presentation?.interaction!=='static'&&<button className="content-focus-hit" data-content-step={i} data-overview-focus={inlineSteps?'true':undefined} data-active="false" aria-pressed={false} aria-label={`聚焦${item.title}`}/>}
   {interactive&&!step&&!focus&&details&&<button className="content-detail-hit" data-detail-open={c.items.indexOf(item)} aria-label={`查看${item.title||'本项'}详情`}/>}
  </section>;
 }
 const visuals=main.filter(i=>i.media);
 const carousel=layout==='carousel'||(s.composition?.sequence?s.composition.sequence==='carousel':split);
 const captioned=layout==='carousel'&&!!c.presentation?.carouselText;
 const mediaGroup=()=>carousel&&visuals.length===1&&!captioned?media(visuals[0]):carousel?<Gallery frames={visuals.map(i=>i.mediaFrame)} captions={captioned?visuals.map(i=>({title:i.title,body:i.body})):undefined} s={{...s,media:visuals[0]?.media||'',gallery:visuals.slice(1).map(i=>i.media!),subtitle:s.title}} interactive={interactive}/>:<div className={`content-image-stage ${visuals.length>1?'multi':''}`} style={{'--content-columns':Math.min(visuals.length||1,3)} as React.CSSProperties}>{visuals.map(i=><div className="content-image-cell" key={i.id}>{media(i)}{interactive&&i.crop&&i.interaction!=='none'&&<button className="content-detail-hit" data-detail-open={c.items.indexOf(i)} aria-label={`放大${i.title||'图片'}`}/>}</div>)}</div>;
 const ordinalChart=c.kind==='process'&&layout==='chart';
 const chartValues=main.map(i=>i.value?.trim()&&Number.isFinite(Number(i.value))?Number(i.value):null),chartMax=Math.max(1,...chartValues.filter((v):v is number=>v!==null).map(Math.abs));
 return <article ref={ref} className={`scene comic-default semantic-scene master-v12 ${s.title.replace(/\s/g,'').length>16?'long-heading':''} content-${c.kind} content-layout-${layout} ${opening?'comic-chapter':''} ${split&&mediaLeft?'split-media-left':''} ${layout==='chapter'&&c.presentation?.chapterAlign==='center'?'chapter-title-centered':''} ${c.table?.focus||c.table?.footer?'has-focus-matrix':''} ${summary?'has-summary':''} ${stepMedia?'has-step-media':''} ${s.chapter?.visible?'has-chapter':''} ${numbered?'numbered-cards':''} ${main.some(i=>i.value)?'metric-cards':''}`} data-content-count={main.length} data-content-columns={columns}>
  <div className="comic-backdrop" aria-hidden="true">{s.background&&<img src={s.background} alt=""/>}</div><div className="comic-dots" aria-hidden="true"/>
  <div className="scene-brand"><img className="logo-light" src={brandLogo} alt="洋葱学园"/><img className="logo-dark" src={brandLogoWhite} alt="洋葱学园"/></div>
  {s.chapter?.visible&&<div className="chapter-ribbon" style={adaptive?{'--chapter-color':chapterColor(s.chapter)} as React.CSSProperties:undefined}><span>{s.chapter.title}</span></div>}
  {layout==='cover'?<CoverOpening title={s.title} subtitle={showSubtitle?s.subtitle:undefined}/>:opening?<div className="comic-opening"><h1><span>{s.title}</span></h1>{showSubtitle&&s.subtitle&&<div className="comic-text"><p>{s.subtitle}</p></div>}</div>:<>
   <h1 className="comic-title"><span>{s.title}</span></h1>
   <div className={`content-main ${image&&carousel?'content-carousel-stage':''}`} style={split&&(c.presentation?.textShare!==undefined||mediaLeft)?{gridTemplateColumns:`minmax(0,${mediaLeft?100-splitShare:splitShare}fr) minmax(0,${mediaLeft?splitShare:100-splitShare}fr)`}:undefined}>
    {showSubtitle&&s.subtitle&&!image&&!split&&<p className="content-lead">{s.subtitle}</p>}
    {relation?<RelationDiagram content={c} interactive={interactive} media={item=>media(item)}/>:image?mediaGroup():
     layout==='chart'?<div className="semantic-chart">{main.map((item,i)=><section className="semantic-chart-row" key={item.id}><h2>{item.title}</h2><div className="semantic-chart-track"><i style={ordinalChart?{width:(i+1)/main.length*100+'%',marginLeft:'0%'}:{width:chartValues[i]===null?'0%':Math.abs(chartValues[i]!)/chartMax*50+'%',marginLeft:chartValues[i]!==null&&chartValues[i]!<0?(50-Math.abs(chartValues[i]!)/chartMax*50)+'%':'50%'}}/></div><strong>{ordinalChart?i+1:item.value||'—'}</strong>{item.body&&<p>{item.body}</p>}</section>)}</div>:
     c.kind==='table'&&c.table&&(c.table.focus||c.table.footer)?<FocusTable table={c.table} interactive={interactive&&!!c.table.focus}/>:c.kind==='table'&&c.table?<div className="semantic-table-wrap"><table className="semantic-table"><thead><tr>{c.table.headers.map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{c.table.rows.map((r,i)=><tr key={i}>{r.map((cell,j)=><td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>:
     inlineSteps?<div className="inline-step-overview"><div className="content-items" style={{gridTemplateColumns:`repeat(${Math.max(1,main.length)},minmax(0,1fr))`}}>{main.map(card)}</div><div className="step-arrow-layer" aria-hidden="true">{main.slice(1).map((item,i)=><i key={item.id} style={{left:(i+1)*100/main.length+'%'}}/>)}</div></div>:
     <div className="content-items" data-card-fit={c.presentation?.textFit||'initial'} style={{'--content-columns':columns} as React.CSSProperties}>{showSubtitle&&s.subtitle&&split&&<p className="content-lead">{s.subtitle}</p>}{main.map(card)}</div>}
    {split&&<div className="content-split-media">{mediaGroup()}</div>}
    {stepMedia&&<div className="step-media-stage">{main.map((item,i)=><div key={item.id} data-step-media={i} hidden={i!==0}>{item.media?media(item):<p>{item.body}</p>}</div>)}</div>}
   </div>
   {summary&&<div className="content-summary">{summary}</div>}
  </>}
  {evidence.length>0&&<button className="evidence-launch" data-detail-open="evidence-index" aria-label={`查看补充资料（${evidence.length}）`}>资料 <span>{evidence.length}</span></button>}
  {evidence.length>0&&<dialog className="content-detail" data-detail="evidence-index" aria-label="补充资料"><div className="content-detail-sheet"><button className="detail-return" data-detail-close aria-label="返回页面">↩</button><h2>补充资料</h2><div className="evidence-index">{evidence.map(i=><button key={i.id} data-detail-open={c.items.indexOf(i)}>{i.title||'查看资料'}</button>)}</div></div></dialog>}
  {dialogItems.map(detailDialog)}
 </article>;
}
