import path from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
import {Resvg} from '@resvg/resvg-js';
import {saveMedia} from './transfer.mjs';

export function videoConversionPlan(ext,streams){
 const video=streams?.find(s=>s.codec_type==='video');
 const audio=streams?.filter(s=>s.codec_type==='audio')||[];
 const videoPlayable=video?.codec_name==='h264'&&['yuv420p','yuvj420p'].includes(video.pix_fmt);
 if(!videoPlayable)return 'transcode';
 if(audio.some(s=>s.codec_name!=='aac'))return 'audio-transcode';
 return ext==='.mp4'?'original':'remux';
}

/** Convert the visible crop, never expose hidden bitmap margins to the model. */
export async function prepareInstance({url,instance,mediaDir,jobDir,index,native,width,height}) {
 if(instance?.masked)throw Error('异形图片使用原页可见形状，避免泄漏遮罩外内容');
 const crop=instance?.crop||{},l=crop.l||0,t=crop.t||0,r=crop.r||0,b=crop.b||0;
 const filters=[];
 if([l,t,r,b].some(Boolean)){
  if(!width||!height||[l,t,r,b].some(v=>v<0)||l+r>=1||t+b>=1)throw Error('裁剪范围不能可靠还原');
  const x=Math.round(width*l),y=Math.round(height*t),w=Math.max(1,Math.floor(width*(1-r))-x),h=Math.max(1,Math.floor(height*(1-b))-y);
  filters.push(`crop=${w}:${h}:${x}:${y}`);width=w;height=h;
 }
 if(instance?.flipH)filters.push('hflip');if(instance?.flipV)filters.push('vflip');
 if(instance?.rotation){const angle=instance.rotation*Math.PI/180;filters.push(`rotate=${angle}:ow=rotw(${angle}):oh=roth(${angle}):c=none`);const w=width; width=Math.ceil(Math.abs(width*Math.cos(angle))+Math.abs(height*Math.sin(angle)));height=Math.ceil(Math.abs(w*Math.sin(angle))+Math.abs(height*Math.cos(angle)));}
 const ext=path.extname(url),animated=ext==='.gif',video=ext==='.mp4';
 if(filters.length){
  const output=path.join(jobDir,`visible-${index}${['.jpg','.jpeg'].includes(ext)?'.png':ext}`);
  const input=path.join(mediaDir,path.basename(url));
  const palette=`[0:v]${filters.join(',')},split[frames][colors];[colors]palettegen=stats_mode=full[palette];[frames][palette]paletteuse=dither=sierra2_4a`;
  await native('ffmpeg',['-y','-i',input,...(animated?['-filter_complex',palette,'-loop','0']:['-vf',filters.join(','),...(video?['-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-c:a','copy']:['-frames:v','1'])]),output]);
  url=saveMedia(mediaDir,readFileSync(output));
 }
 let previews=[];
 if(animated||video){
  // A poster and sampled frames help identify material; they are not full viewing.
  for(const [i,seconds] of (video?[0,2,5]:[0]).entries()){
   const output=path.join(jobDir,`frame-${index}-${i}.png`);
   try{await native('ffmpeg',['-y','-i',path.join(mediaDir,path.basename(url)),'-ss',String(seconds),'-frames:v','1',output]);previews.push(saveMedia(mediaDir,readFileSync(output)))}catch{if(i===0)throw Error('无法生成动画/视频预览');}
  }
 }
 return {url,width,height,preview:previews[0],sampleFrames:previews,animated,video};
}

/** Every material is represented, including files beyond the old 12-image cap. */
export async function buildVisualSheets(pages,{mediaDir,jobDir,native,onProgress=()=>{}}){
 for(const page of pages){
  onProgress(page.number,pages.length);
  const entries=page.assets.flatMap(a=>(a.sampleFrames?.length?a.sampleFrames:[a.preview||a.url]).map((url,i)=>({url,id:a.id+(i?' frame '+(i+1):'')}))).filter(e=>/\.(png|jpe?g|webp)$/i.test(e.url));
  page.visualSheets=[];
  for(let start=0;start<entries.length;start+=6){
   const tiles=[];
   for(const [i,entry] of entries.slice(start,start+6).entries()){
    const output=path.join(jobDir,`tile-${page.number}-${start+i}.png`);
    await native('ffmpeg',['-y','-i',path.join(mediaDir,path.basename(entry.url)),'-vf','scale=760:420:force_original_aspect_ratio=decrease','-frames:v','1',output]);
    const x=(i%2)*800,y=Math.floor(i/2)*480;
    tiles.push(`<rect x="${x}" y="${y}" width="800" height="480" fill="white" stroke="#bbb"/><text x="${x+20}" y="${y+28}" font-size="22">${entry.id}</text><image x="${x+20}" y="${y+42}" width="760" height="420" href="data:image/png;base64,${readFileSync(output).toString('base64')}"/>`);
   }
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${Math.ceil(tiles.length/2)*480}">${tiles.join('')}</svg>`;
   const url=saveMedia(mediaDir,new Resvg(svg).render().asPng());page.visualSheets.push(url);
  }
 }
}

/** Honest static fallback for formats/effects that cannot be isolated safely. */
export async function previewRegion({page,instance,mediaDir,jobDir,index,native}){
 const size=page.slideSize,box=instance?.bounds;if(!size?.width||!size?.height||!box)throw Error('没有可靠的页面位置');
 const input=path.join(mediaDir,path.basename(page.preview));
 const probe=await native('ffprobe',['-v','error','-show_entries','stream=width,height','-of','json',input]);
 const {width,height}=JSON.parse(probe.stdout).streams[0];
 const x=Math.max(0,Math.floor(box.x/size.width*width)),y=Math.max(0,Math.floor(box.y/size.height*height));
 const w=Math.min(width-x,Math.ceil(box.width/size.width*width)),h=Math.min(height-y,Math.ceil(box.height/size.height*height));
 if(w<1||h<1)throw Error('区域不可见');
 const output=path.join(jobDir,`fallback-${index}.png`);
 await native('ffmpeg',['-y','-i',input,'-vf',`crop=${w}:${h}:${x}:${y}`,'-frames:v','1',output]);
 return {url:saveMedia(mediaDir,readFileSync(output)),width:w,height:h};
}
