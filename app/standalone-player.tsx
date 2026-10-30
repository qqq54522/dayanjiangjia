import {initBrowserFullscreen} from '../lib/browser-fullscreen';
import {isGifClip} from '../lib/project-clips';
import React from 'react';
import type {Workspace} from '../lib/deck';
import {PlaybackSurface} from './PlaybackSurface';
import {offlineAssets,hydrateOfflineAssets} from '../lib/offline';
import {initDeckPlayer} from '../lib/deck-player';
import {wakePublishedPage} from '../lib/published-player';
import {initLogo} from '../lib/logo';import {initGallery} from '../lib/gallery';import {initComic} from '../lib/comic';import {initListFocus} from '../lib/list-focus';import {initContent} from '../lib/content-interaction';import {initCardTypography} from '../lib/card-typography';
export function scriptJSON(value:unknown){return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));}
export async function standalonePlayerHTML(doc:Workspace,forPublishing=false,relayUrl='',io?:{readAsset:(url:string)=>Promise<string>;readText:(url:string)=>Promise<string>}){
 const {renderToStaticMarkup}=await import('react-dom/server');
 async function readAsset(url:string){if(io)return io.readAsset(url);const r=await fetch(url);if(!r.ok)throw Error('素材下载失败');const blob=await r.blob();return await new Promise<string>((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result as string);fr.onerror=()=>reject(Error('素材读取失败'));fr.readAsDataURL(blob)});}
 const readText=async(url:string)=>{if(io)return io.readText(url);const r=await fetch(url);if(!r.ok)throw Error('播放样式加载失败');return r.text();};
 const slides=structuredClone(doc.slides),clips=structuredClone(doc.clips||[]),assets=offlineAssets(readAsset),gifTokens=new Set<string>();
 const embed=async(url:string)=>{const token=await assets.embed(url);if(/\.gif(?:[?#]|$)|^data:image\/gif[;,]/i.test(url))gifTokens.add(token);return token;};
 for(const s of slides){if(s.background)s.background=await embed(s.background);if(s.media)s.media=await embed(s.media);if(s.gallery)s.gallery=await Promise.all(s.gallery.map(embed));if(s.content)for(const item of s.content.items)if(item.media)item.media=await embed(item.media);}
 for(const clip of clips){clip.kind=isGifClip(clip)?'gif':'video';clip.url=await embed(clip.url);}
 const css=await readText('/deck.css');let fonts=await readText('/fonts.css');for(const match of [...fonts.matchAll(/url\("([^"]+)"\)/g)])fonts=fonts.replaceAll(match[1],await embed(match[1]));if(forPublishing)fonts=fonts.replaceAll('font-display:block','font-display:swap');
 let surface=renderToStaticMarkup(<PlaybackSurface slides={slides} clips={clips}/>);
 surface=surface.replace(/<img\b[^>]*>/g,tag=>Array.from(gifTokens).some(token=>tag.includes('src=\"'+token+'\"'))?tag.replace('<img','<img data-restart-gif=\"true\"'):tag);
 surface=surface.replace(/<link rel="preload" as="image"[^>]*>/g,'').replace(/<img(?![^>]*\bloading=)/g,'<img loading="lazy"').replace(/<video\b[^>]*>/g,tag=>tag.replace(/preload="[^"]*"/,'preload="none"'));
 const initializers:Array<[string,Function]>=[['.play-pages .scene',initLogo],['.play-pages .gallery',initGallery],['.play-pages .comic-default',initComic],['.play-pages .comic-default',initListFocus],['.play-pages .semantic-scene',initContent],['.play-pages .semantic-scene',initCardTypography]];
 const install=initializers.map(([selector,fn])=>'mount('+scriptJSON(selector)+',('+fn.toString()+'));').join('');
 const bootstrap=`(()=>{const root=document.querySelector('[data-deck-player]');try{(${hydrateOfflineAssets.toString()})();const wake=(${wakePublishedPage.toString()});(${initBrowserFullscreen.toString()})(root);(${initDeckPlayer.toString()})(root,{clips:${scriptJSON(clips)},relayUrl:${scriptJSON(relayUrl)},wake});function mount(selector,install){document.querySelectorAll(selector).forEach(node=>{try{install(node)}catch(error){console.error('页面交互初始化失败',error);const notice=root.querySelector('.play-notice');if(notice)notice.textContent='部分页面的交互未能加载，翻页仍可使用。';}})}${install}}catch(error){console.error('播放器初始化失败',error);const notice=root?.querySelector('.play-notice');if(notice)notice.textContent='播放器加载失败，请重新发布或联系维护人员。';}})();`;

 const fontReady=forPublishing?'':`Promise.all([400,500,800,900].map(w=>document.fonts.load(w+' 16px "Deck PuHuiTi"'))).then(r=>{if(r.some(x=>!x.length))throw Error('font');document.body.style.visibility='visible'}).catch(()=>{document.body.style.visibility='visible'});`;
 return [`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>洋葱学园 · 演示播放</title><script>if(new URLSearchParams(location.hash.slice(1)).get("audience")==="1")document.documentElement.classList.add("audience-document");</script><style>${fonts}\n${css}\nbody{margin:0;background:#000;visibility:${forPublishing?'visible':'hidden'}}</style></head><body>${surface}`,...assets.parts(),`<script>${bootstrap}${fontReady}</script></body></html>`] as BlobPart[];
}
