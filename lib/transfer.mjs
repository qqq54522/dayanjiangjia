import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {FONTS,FONT_NOTICE,readFonts,fontManifest} from './fonts.mjs';
import {validWorkspace} from './store.mjs';

export function imageType(b){if(b.subarray(0,6).toString().match(/^GIF8[79]a$/))return ['image/gif','gif'];if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['image/png','png'];if(b[0]===255&&b[1]===216&&b[2]===255)return ['image/jpeg','jpg'];if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return ['image/webp','webp'];throw Error('不支持的图片格式');}
export function mediaType(b){
 if(b.length>=24&&b.toString('ascii',4,8)==='ftyp'){
  const size=b.readUInt32BE(0);const brands=b.toString('ascii',8,Math.min(size,128));
  if(size>=16&&size<=b.length&&/(isom|iso[2-6]|mp4[12]|avc1|M4V )/.test(brands))return ['video/mp4','mp4'];
 }
 return imageType(b);
}
function validateMedia(b){return mediaType(b)}
export function allSlides(d){return [...d.slides,...d.versions.flatMap(v=>v.slides),...(d.proposals||[]).flatMap(p=>p.slides)];}
export function saveMedia(dir,b){const [,ext]=validateMedia(b);const name=createHash('sha256').update(b).digest('hex')+'.'+ext;mkdirSync(dir,{recursive:true});writeFileSync(path.join(dir,name),b);return '/media/'+name;}
export const saveImage=saveMedia;
export function pack(data,mediaDir,fontDir){
 if(!validWorkspace(data))throw Error('文稿格式不正确');
 const files={},assets={};
 for(const s of allSlides(data))for(const url of [s.media,...s.gallery||[]].filter(Boolean)){
  if(assets[url])continue;if(!/^\/media\/[\w.-]+$/.test(url))throw Error('请先将外部素材下载并上传到工作台，再导出 ZIP：'+url);
  const b=readFileSync(path.join(mediaDir,path.basename(url)));const [mime]=validateMedia(b);
  const name='assets/'+path.basename(url);files[name]=[b,{level:0}];assets[url]={path:name,mime,sha256:createHash('sha256').update(b).digest('hex')};
 }
 const fonts=fontDir?readFonts(fontDir):null;if(fonts){for(const [name,b] of Object.entries(fonts))files['fonts/'+name]=[b,{level:0}];files['FONT-NOTICE.txt']=strToU8(FONT_NOTICE)}
 const manifest=strToU8(JSON.stringify({format:'onion-deck-zip-v1',workspace:data,assets,fonts:fonts?fontManifest(fonts):[]}));
 files['manifest.json']=[manifest,{level:0}];const zip=Buffer.from(zipSync(files));
 return zip;
}
export function unpack(bytes,mediaDir,fontDir){
 if(!Buffer.isBuffer(bytes)||bytes.length<4||bytes.readUInt16LE(0)!==0x4b50)throw Error('请导入 .deck.zip 文稿包，不支持 JSON');
 let total=0,count=0;const names=new Set();
 const files=unzipSync(bytes,{filter:f=>{
  if(++count>2000||names.has(f.name)||! /^(manifest\.json|FONT-NOTICE\.txt|assets\/[\w.-]+|fonts\/[\w.-]+)$/.test(f.name)||f.name.includes('..'))throw Error('ZIP 内包含无效路径或重复文件');
  names.add(f.name);total+=f.originalSize;
  return true;
 }});
 if(!files['manifest.json'])throw Error('缺少 manifest.json');
 const bundle=JSON.parse(strFromU8(files['manifest.json']));
 if(bundle.format!=='onion-deck-zip-v1'||!validWorkspace(bundle.workspace))throw Error('文稿格式不正确');
 const fontFiles=[];if(bundle.fonts?.length){if(bundle.fonts.length!==4)throw Error('字体包不完整');for(const f of FONTS){const entry=bundle.fonts.find(x=>x.name===f.name&&x.weight===f.weight&&x.path==='fonts/'+f.name);const raw=entry&&files[entry.path];if(!raw)throw Error('缺少字体');const b=Buffer.from(raw);if(b.length<4||b.readUInt32BE(0)!==0x10000||createHash('sha256').update(b).digest('hex')!==entry.sha256)throw Error('字体校验失败');fontFiles.push([f.name,b]);}}
 const data=structuredClone(bundle.workspace),prepared=new Map();
 for(const s of allSlides(data))for(const url of [s.media,...s.gallery||[]].filter(Boolean)){
  if(prepared.has(url))continue;const a=bundle.assets?.[url];
  if(!a||!/^assets\/[\w.-]+$/.test(a.path)||!files[a.path])throw Error('文稿包缺少素材：'+url);
  const b=Buffer.from(files[a.path]);const [mime]=validateMedia(b);if(a.mime!==mime||createHash('sha256').update(b).digest('hex')!==a.sha256)throw Error('素材校验失败');prepared.set(url,b);
 }
 // Validate the complete bundle before writing any media; never extract archive paths.
 const mapped=new Map([...prepared].map(([u,b])=>[u,saveMedia(mediaDir,b)]));
 for(const s of allSlides(data)){s.media=mapped.get(s.media)||s.media;if(s.gallery)s.gallery=s.gallery.map(u=>mapped.get(u)||u)}
 if(fontDir&&fontFiles.length){mkdirSync(fontDir,{recursive:true});for(const [name,b] of fontFiles)writeFileSync(path.join(fontDir,name),b)}
 return data;
}
