import {readFileSync,existsSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
export const FONTS=[[400,'55-Regular'],[500,'65-Medium'],[800,'105-Heavy'],[900,'115-Black']].map(([weight,suffix])=>({weight,name:`AlibabaPuHuiTi-2-${suffix}.ttf`}));
export const FONT_NOTICE='Alibaba PuHuiTi 2.0 — Copyright Alibaba (China) Co., Ltd. Original unmodified font files embedded for displaying this document. Official source and terms: https://www.alibabafonts.com/';
export function fontCSS(prefix='/fonts/') {return FONTS.map(f=>`@font-face{font-family:"Deck PuHuiTi";font-weight:${f.weight};font-style:normal;font-display:block;src:url("${prefix}${f.name}") format("truetype");}`).join('\n')}
export function readFonts(dir){return Object.fromEntries(FONTS.map(f=>{const b=readFileSync(path.join(dir,f.name));if(b.readUInt32BE(0)!==0x00010000)throw Error('字体文件损坏');return [f.name,b]}))}
export async function prepareFonts(dir){mkdirSync(dir,{recursive:true});for(const f of FONTS){const dst=path.join(dir,f.name);if(existsSync(dst))continue;const local=path.join(os.homedir(),'Library','Fonts',f.name);if(existsSync(local))copyFileSync(local,dst);else{const stem=f.name.replace('.ttf','');const url=`https://fonts.alibabadesign.com/AlibabaPuHuiTi-2/${stem}/${f.name}`;const r=await fetch(url,{headers:{Referer:'https://www.alibabafonts.com/'},signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('字体下载失败，请从 alibabafonts.com 安装阿里巴巴普惠体2.0后重试');const b=Buffer.from(await r.arrayBuffer());if(b.length<4||b.readUInt32BE(0)!==0x10000)throw Error('字体下载格式错误');writeFileSync(dst,b);}}
 readFonts(dir);
}
export function fontManifest(fonts){return FONTS.map(f=>({...f,path:'fonts/'+f.name,sha256:createHash('sha256').update(fonts[f.name]).digest('hex')}))}
