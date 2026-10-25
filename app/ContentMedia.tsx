import {frameStyle,frameAspect,type MediaFrame} from '../lib/media-frame';
import React,{useId} from 'react';
import {ImagePlus,Plus,Trash2} from 'lucide-react';
import type {ContentItem} from '../lib/content';

export default function ContentMedia({items,upload,remove,add,update}:{update:(id:string,frame:MediaFrame)=>void;items:ContentItem[];upload:(id:string,file:File)=>Promise<void>;remove:(id:string)=>void;add:()=>void}){
 const prefix=useId();
 const thumbnail=(item:ContentItem,index:number)=>{const r=item.crop,a=item.mediaAspect;if(r&&a){const clip=prefix+'-media-'+index;return <svg className="module-media-crop" preserveAspectRatio={frameAspect(item.mediaFrame)} viewBox={`${r.x*a} ${r.y} ${r.width*a} ${r.height}`} role="img" aria-label={item.title}><defs><clipPath id={clip}><rect x={r.x*a} y={r.y} width={r.width*a} height={r.height}/></clipPath></defs><image clipPath={`url(#${clip})`} href={item.media} width={a} height={1}/></svg>}return <img style={frameStyle(item.mediaFrame)} src={item.media} alt={item.title||'素材'+(index+1)}/>};
 return <section className="module-media-section">
  <h3>本页素材</h3><p className="source">每项素材对应一个内容模块；拖入文件或点击选择。</p>
  <div className="module-media-grid">{items.map((item,i)=><section className="module-media-tile" key={item.id}>
   <label className="module-media-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)void upload(item.id,file)}}>
    {item.media?(/\.mp4$/i.test(item.media)?<video src={item.media} muted playsInline preload="metadata"/>:thumbnail(item,i)):<ImagePlus size={24}/>}
    <span>{item.media?'点击替换 / 拖入替换':'拖入 / 点击添加'}</span>
    <input aria-label={'为第'+(i+1)+'个模块选择素材'} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(item.id,file)}}/>
   </label>
   <b>{String(i+1).padStart(2,'0')} · {item.title||'未命名模块'}</b>
   {item.media&&!/\.mp4$/i.test(item.media)&&<div className="media-framing">
    <div className="frame-options" role="group" aria-label={'第'+(i+1)+'项素材的显示方式'}>
     <button aria-pressed={item.mediaFrame?.fit!=='cover'} onClick={()=>update(item.id,{fit:'contain',position:4})}>完整显示</button>
     <button aria-pressed={item.mediaFrame?.fit==='cover'} onClick={()=>update(item.id,{fit:'cover',position:item.mediaFrame?.position??4})}>裁剪铺满</button>
    </div>
    {item.mediaFrame?.fit==='cover'&&<div className="frame-position"><div><b>优先保留的位置</b><p>选择主体所在方向，左侧页面实时预览。超出边框的部分隐藏，不拉伸、不改原图。</p></div><div className="frame-grid" role="group" aria-label="裁剪位置">{['左上','上方','右上','左侧','居中','右侧','左下','下方','右下'].map((label,position)=><button key={label} title={label} aria-label={label} aria-pressed={item.mediaFrame?.position===position} onClick={()=>update(item.id,{fit:'cover',position})}>{['↖','↑','↗','←','●','→','↙','↓','↘'][position]}</button>)}</div></div>}
   </div>}
   {item.media&&<button className="module-media-remove" title="移除素材" aria-label={'移除第'+(i+1)+'项素材'} onClick={()=>remove(item.id)}><Trash2 size={16}/></button>}
  </section>)}</div>
  <button className="wide" onClick={add}><Plus size={16}/>再添加一项素材</button>
 </section>;
}
