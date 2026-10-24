import React,{useId} from 'react';
import {ImagePlus,Plus,Trash2} from 'lucide-react';
import type {ContentItem} from '../lib/content';

export default function ContentMedia({items,upload,remove,add}:{items:ContentItem[];upload:(id:string,file:File)=>Promise<void>;remove:(id:string)=>void;add:()=>void}){
 const prefix=useId();
 const thumbnail=(item:ContentItem,index:number)=>{const r=item.crop,a=item.mediaAspect;if(r&&a){const clip=prefix+'-media-'+index;return <svg className="module-media-crop" viewBox={`${r.x*a} ${r.y} ${r.width*a} ${r.height}`} role="img" aria-label={item.title}><defs><clipPath id={clip}><rect x={r.x*a} y={r.y} width={r.width*a} height={r.height}/></clipPath></defs><image clipPath={`url(#${clip})`} href={item.media} width={a} height={1}/></svg>}return <img src={item.media} alt={item.title||'素材'+(index+1)}/>};
 return <section className="module-media-section">
  <h3>本页素材</h3><p className="source">每项素材对应一个内容模块；拖入文件或点击选择。</p>
  <div className="module-media-grid">{items.map((item,i)=><section className="module-media-tile" key={item.id}>
   <label className="module-media-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)void upload(item.id,file)}}>
    {item.media?(/\.mp4$/i.test(item.media)?<video src={item.media} muted playsInline preload="metadata"/>:thumbnail(item,i)):<ImagePlus size={24}/>}
    <span>{item.media?'点击替换 / 拖入替换':'拖入 / 点击添加'}</span>
    <input aria-label={'为第'+(i+1)+'个模块选择素材'} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(item.id,file)}}/>
   </label>
   <b>{String(i+1).padStart(2,'0')} · {item.title||'未命名模块'}</b>
   {item.media&&<button className="module-media-remove" title="移除素材" aria-label={'移除第'+(i+1)+'项素材'} onClick={()=>remove(item.id)}><Trash2 size={16}/></button>}
  </section>)}</div>
  <button className="wide" onClick={add}><Plus size={16}/>再添加一项素材</button>
 </section>;
}
