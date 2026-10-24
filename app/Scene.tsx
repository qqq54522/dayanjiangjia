import {isBlankSlide} from '../lib/slide-order';
import React,{useEffect,useRef} from 'react';
import type {Slide} from '../lib/deck';
import type {DesignNode} from '../lib/design';
import {presentation,mediaUrls} from '../lib/composition';
import {brandLogo,brandLogoWhite} from '../lib/brand';
import {initComic} from '../lib/comic';
import {initLogo} from '../lib/logo';
import {initGallery} from '../lib/gallery';
import {initListFocus} from '../lib/list-focus';
import {chartPoint} from '../lib/templates';
import ContentScene from './ContentScene';
export function Gallery({s,interactive}:{s:Slide;interactive:boolean}) {
 const urls=[s.media,...(s.gallery||[])].filter(Boolean);
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(interactive&&ref.current&&urls.length)return initGallery(ref.current)},[interactive,JSON.stringify(urls)]);
 if(!urls.length)return null;
 const video=(u:string)=>/\.mp4(?:[?#]|$)/i.test(u)||u.startsWith('data:video/');
 if(!interactive)return <div className="scene-media">{video(urls[0])?<video className="video-thumbnail" src={urls[0]} muted playsInline preload="auto" onLoadedMetadata={e=>{e.currentTarget.currentTime=Math.min(.1,e.currentTarget.duration/2||0)}}/>:<img src={urls[0]} alt={s.subtitle}/>}</div>;
 return <div className="scene-media gallery" ref={ref}>
 <div className="gallery-frame">{urls.map((u,i)=><div className="media-item" key={i} hidden={i!==0}>{video(u)?<><video src={u} controls controlsList="nofullscreen nodownload noremoteplayback" disablePictureInPicture playsInline muted preload="metadata" aria-label={s.subtitle+' 视频'}/><span className="video-error" hidden>视频无法播放，请使用 H.264 / AAC 编码的 MP4。</span></>:<button className="image-open" data-gallery="open" aria-label="放大查看图片或动画"><img src={u} alt={s.subtitle+' · '+(i+1)}/></button>}</div>)}</div>
 {urls.length>1&&<div className="gallery-controls"><button data-gallery="prev" aria-label="上一张图片">‹ 上一张</button><span className="gallery-count">1 / {urls.length}</span><button data-gallery="next" aria-label="下一张图片">下一张 ›</button></div>}
 <dialog className="media-lightbox" aria-label="放大查看"><img alt={s.subtitle}/><video hidden controls controlsList="nofullscreen nodownload noremoteplayback" disablePictureInPicture playsInline muted preload="metadata" aria-label="放大视频"/><div className="lightbox-brand"><img src={brandLogoWhite} alt="洋葱学园"/></div>{urls.length>1&&<div className="gallery-controls"><button data-gallery="prev">‹ 上一张</button><span className="gallery-count">1 / {urls.length}</span><button data-gallery="next">下一张 ›</button></div>}</dialog>
 </div>;
}
function MediaStage({s,interactive}:{s:Slide;interactive:boolean}){const urls=mediaUrls(s),c=presentation(s);if(c.sequence!=='grid'||urls.length<2)return <Gallery s={s} interactive={interactive}/>;return <div className="scene-media media-mosaic" style={{'--asset-cols':urls.length<=4?2:3} as React.CSSProperties}>{urls.map((url,i)=><div className="mosaic-cell" key={url+i}><Gallery s={{...s,media:url,gallery:[]}} interactive={interactive}/></div>)}</div>}
function FreeLayout({s,interactive}:{s:Slide;interactive:boolean}){
 function node(n:DesignNode,key:string):React.ReactNode{const style=n.style as React.CSSProperties;let content:React.ReactNode=null;
 if(n.type==='text'){content=n.bind==='title'?s.title:n.bind==='subtitle'?s.subtitle:n.bind==='points'?s.points.map((p,i)=><div key={i}>{p}</div>):s.points[Number(n.bind?.split('.')[1])];}
 if(n.type==='media'){const urls=[s.media,...(s.gallery||[])].filter(Boolean);const mediaSlide=n.mediaIndex===undefined?s:{...s,media:urls[n.mediaIndex]||'',gallery:[]};content=<Gallery s={mediaSlide} interactive={interactive}/>;}
 if(n.type==='group')content=n.children?.map((c,i)=>node(c,key+'.'+i));
 return <div key={key} className={'free-node free-'+n.type} style={style}>{content}</div>;
 }
 return <div className="free-layout" style={s.design?.style as React.CSSProperties}>{s.design?.nodes.map((n,i)=>node(n,String(i)))}</div>;
}
function LegacyScene({s,interactive=true,presenting=false}:{s:Slide;interactive?:boolean;presenting?:boolean}){const ref=useRef<HTMLElement>(null);useEffect(()=>{if(ref.current){initLogo(ref.current);const comic=initComic(ref.current),focus=presenting?initListFocus(ref.current):undefined;return()=>{comic?.();focus?.()}}},[s,presenting]);const marker=s.chapter?.visible?<div className="chapter-ribbon"><span>{s.chapter.title}</span></div>:null;const logo=<div className="scene-brand"><img className="logo-light" src={brandLogo} alt="洋葱学园"/><img className="logo-dark" src={brandLogoWhite} alt="洋葱学园"/></div>;if(s.design)return <article ref={ref} className="scene free-scene"><FreeLayout s={s} interactive={interactive}/>{logo}{marker}<div className="scene-footer"><span>洋葱学园</span><span>{s.id}</span></div></article>;if(!s.theme||s.theme==='brand'){const hasMedia=!!(s.media||s.gallery?.length),composition=presentation(s),chapter=!hasMedia&&(s.layout==='hero'||(!s.subtitle&&!s.points.length));return <article ref={ref} data-point-count={s.points.filter(p=>p.trim()).length} data-media-count={mediaUrls(s).length} className={`scene comic-default tags-${s.tagStyle||'dark'} intent-${composition.intent} crop-${composition.fit} ${chapter?'comic-chapter':hasMedia?'comic-media':'comic-words'} ${s.layout==='steps'?'comic-steps':''} comic-kind-${s.layout} ${s.chapter?.visible?'has-chapter':''}`}>
<div className="comic-backdrop" aria-hidden="true">{s.background&&<img src={s.background} alt=""/>}</div><div className="comic-dots" aria-hidden="true"/>{logo}{marker}
{chapter?<div className="comic-opening"><h1><span>{s.title}</span></h1><div className="comic-text"><p>{s.subtitle}</p><div className="comic-tags">{s.points.map((p,i)=><span key={i}>{p}</span>)}</div></div></div>:<><h1 className="comic-title"><span>{s.title}</span></h1>{hasMedia?<><MediaStage s={s} interactive={interactive}/>{composition.intent!=='visual'&&(s.subtitle||s.points.length>0)&&<div className={`comic-caption comic-text ${s.points.length>0&&s.points.length<=3&&s.points.every(p=>p.length<=12)&&s.subtitle.length<=32?'caption-keywords':''}`}><p>{s.subtitle}</p><div className="comic-tags">{s.points.map((p,i)=><span key={i}>{p}</span>)}</div></div>}</>:<div className="comic-board"><div className="comic-text"><p className="comic-subtitle">{s.subtitle}</p><div className="comic-items">{s.points.map((p,i)=><div className="comic-item" data-focus-item={s.layout==='steps'||s.layout==='statement'?'':undefined} data-active={i===0?'true':'false'} key={i}>{s.layout==='chart'?<><span>{chartPoint(p).label}</span><div className="chart-track"><i style={{width:chartPoint(p).value+'%'}}/></div><strong>{chartPoint(p).value}</strong></>:<><b>{String(i+1).padStart(2,'0')}</b><p>{p}</p></>}</div>)}</div></div></div>}</>}
</article>}return <article ref={ref} className={`scene ${s.layout} theme-${s.theme||'brand'} ${s.points.length>4?'dense':''}`}>{logo}{marker}<div className="scene-copy"><div className="eyebrow">{s.subtitle?'洋葱学园':'演示分享'}</div><h1>{s.title}</h1><p>{s.subtitle}</p>{s.layout!=='steps'&&<div className="scene-points">{s.points.map((p,i)=><span key={i}>{p}</span>)}</div>}</div><Gallery key={s.id} s={s} interactive={interactive}/>{s.layout==='steps'&&<div className="step-grid">{s.points.map((p,i)=><div key={i}><b>0{i+1}</b><h2>{p}</h2><span>{['先迈出第一步','让思路清楚一点','把方法留下来'][i]}</span></div>)}</div>}<div className="scene-footer"><span>洋葱学园</span><span>{s.id}</span></div></article>}

export function Scene(props:{s:Slide;interactive?:boolean;presenting?:boolean}){if(isBlankSlide(props.s))return <div className="scene empty-slide" style={{background:'#fff'}} aria-label="空白页"/>;return props.s.content&&!props.s.design?<ContentScene {...props}/>:<LegacyScene {...props}/>;}
