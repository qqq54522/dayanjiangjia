import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {validWorkspace} from './store.mjs';
export function imageType(b){if(b.subarray(0,6).toString().match(/^GIF8[79]a$/))return ['image/gif','gif'];if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['image/png','png'];if(b[0]===255&&b[1]===216&&b[2]===255)return ['image/jpeg','jpg'];if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return ['image/webp','webp'];throw Error('仅支持 PNG、JPG、GIF、WebP 图片');}
export function allSlides(d){return [...d.slides,...d.versions.flatMap(v=>v.slides),...(d.proposals||[]).flatMap(p=>p.slides)];}
export function saveImage(dir,b){if(!b.length||b.length>20*1024*1024)throw Error('每张图片限 20 MB');const [,ext]=imageType(b);const name=createHash('sha256').update(b).digest('hex')+'.'+ext;mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,name),b);return '/media/'+name;}
export function pack(data,mediaDir){
 const assets={};for(const s of allSlides(data))for(const url of [s.media,...s.gallery||[]].filter(Boolean)){
  if(assets[url])continue;if(!/^\/media\/[\w.-]+$/.test(url))throw Error('请先将外部图片下载并上传到工作台，再导出便携包：'+url);
  const b=readFileSync(path.join(mediaDir,path.basename(url)));const [mime]=imageType(b);assets[url]={mime,base64:b.toString('base64')};
 }
 return {format:'onion-deck-package-v1',workspace:data,assets};
}
export function unpack(bundle,mediaDir){
 const portable=bundle?.format==='onion-deck-package-v1';const data=structuredClone(portable?bundle.workspace:bundle);
 if(!validWorkspace(data))throw Error('文稿格式不正确');const prepared=new Map();
 for(const s of allSlides(data))for(const url of [s.media,...s.gallery||[]].filter(Boolean)){
  if(prepared.has(url))continue;
  if(portable){const a=bundle.assets?.[url];if(!a||typeof a.base64!=='string'||a.base64.length>28*1024*1024)throw Error('便携包缺少或损坏图片：'+url);const b=Buffer.from(a.base64,'base64');imageType(b);prepared.set(url,b)}
  else if(url.startsWith('/media/')){try{readFileSync(path.join(mediaDir,path.basename(url)))}catch{throw Error('旧版备份不包含素材，请让发送方导出含素材的便携包')}}
 }
 const mapped=new Map([...prepared].map(([u,b])=>[u,saveImage(mediaDir,b)]));
 for(const s of allSlides(data)){s.media=mapped.get(s.media)||s.media;if(s.gallery)s.gallery=s.gallery.map(u=>mapped.get(u)||u)}
 return data;
}
