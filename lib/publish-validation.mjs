import {readFile} from 'node:fs/promises';
import {parse} from 'parse5';
import {PLAYER_VERSION} from './player-version.ts';
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const classIs=(node,name)=>(attr(node,'class')||'').split(/\s+/).includes(name);
function descendants(root){const all=[],queue=[root];while(queue.length){const node=queue.pop();all.push(node);const children=node.childNodes||[];for(let i=children.length-1;i>=0;i--)queue.push(children[i])}return all;}
const invalid=(message,code)=>Object.assign(Error(message),{status:409,code});
/** Validate the browser-parsed tree before requesting upload URLs or writing history. */
export async function validatePublishedPlayer(file){
 const html=await readFile(file,'utf8');
 if(!html.includes('data-deck-player'))return {};
 const nodes=descendants(parse(html)),roots=nodes.filter(n=>attr(n,'data-deck-player')!==undefined);
 if(roots.length!==1)throw invalid('播放文件结构不完整，未上传。请点击浏览器的刷新按钮，重新加载工作台后再发布。','PLAYER_EXPORT_INVALID');
 const root=roots[0],inside=descendants(root);
 if(attr(root,'data-player-version')!==PLAYER_VERSION)throw invalid('当前工作台仍在使用旧版播放器，未上传任何文件。请点击浏览器的刷新按钮，重新加载工作台后再发布。','PLAYER_EXPORT_STALE');
 const pages=inside.filter(n=>attr(n,'data-play-index')!==undefined),thumbs=inside.filter(n=>attr(n,'data-play-page')!==undefined);
 const pageIds=pages.map(n=>attr(n,'data-play-index')),thumbIds=thumbs.map(n=>attr(n,'data-play-page'));
 const requiredAttrs=['data-player-next','data-player-prev','data-player-fullscreen','data-player-connect','data-connect-close','data-clip-return','data-library-toggle','data-thumbnails-toggle'];
 const requiredClasses=['play-clip-overlay','play-clip-video','play-clip-gif','play-sidebar','play-thumbnails','play-pages'];
 const stage=inside.find(n=>classIs(n,'play-pages')),overlay=inside.find(n=>classIs(n,'play-clip-overlay'));
 const stageOverlay=stage&&overlay&&overlay.tagName==='div'&&descendants(stage).includes(overlay)&&['play-clip-video','play-clip-gif'].every(name=>descendants(overlay).some(n=>classIs(n,name)))&&descendants(overlay).some(n=>attr(n,'data-clip-return')!==undefined);
 if(!stageOverlay||!pages.length||pages.length!==thumbs.length||new Set(pageIds).size!==pages.length||pageIds.some((id,i)=>id!==String(i)||thumbIds[i]!==id)||requiredAttrs.some(name=>inside.filter(n=>attr(n,name)!==undefined).length!==1)||requiredClasses.some(name=>inside.filter(n=>classIs(n,name)).length!==1))throw invalid('播放文件的页面、缩略图或片段控件不完整，未上传。请点击浏览器的刷新按钮，重新加载工作台后再发布。','PLAYER_EXPORT_INVALID');
 return {playerVersion:PLAYER_VERSION,pageCount:pages.length};
}
