import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {masterCatalog,masterDefinition,DEFAULT_MASTER} from './masters.ts';
import {saveMedia,allSlides} from './transfer.mjs';
export const packageRoot=fileURLToPath(new URL('../masters/',import.meta.url));
export function masterAsset(def,root=packageRoot){const asset=def.assets.background;const file=path.join(root,def.id,def.version,asset.file);let bytes;try{bytes=readFileSync(file)}catch{throw Error(`母版 ${def.id}@${def.version} 缺少背景素材，请重新安装工作台。`)}if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error(`母版 ${def.id}@${def.version} 背景校验失败，请重新安装工作台。`);return bytes}
export function installMasters(mediaDir,root=packageRoot){const backgrounds=new Map();for(const def of masterCatalog)backgrounds.set(def.id+'@'+def.version,saveMedia(mediaDir,masterAsset(def,root)));return {
 background(ref=DEFAULT_MASTER){const m=masterDefinition(ref);return backgrounds.get(m.id+'@'+m.version)},
 hydrate(data){const next=structuredClone(data);for(const s of allSlides(next)){const def=masterDefinition(s.master);const ref={id:def.id,version:def.version};s.master={...ref};if(s.background===undefined)s.background=this.background(ref)}return next}
}}
export function masterCSS(root=packageRoot){return readFileSync(new URL('./presentation-base.css',import.meta.url),'utf8')+'\n'+masterCatalog.map(m=>checkedStyle(m,root)).join('\n')}

function checkedStyle(m,root){const css=readFileSync(path.join(root,m.id,m.version,m.stylesheet),'utf8');if(createHash('sha256').update(css).digest('hex')!==m.stylesheetSha256)throw Error('母版样式校验失败：'+m.id+'@'+m.version);return css}
