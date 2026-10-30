import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as tick} from 'node:timers/promises';
import {initGallery} from '../lib/gallery.ts';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';import {initial} from '../lib/deck.ts';

function fixture(src='https://example.test/animation.gif',marked=false){
 const handlers=new Map(),events=new Map();
 const images=[{tagName:'IMG',src,dataset:marked?{restartGif:'true'}:{},closest(){return null}},{tagName:'IMG',src:'https://example.test/still.png',closest(){return null}}];
 const large={src:'',removeAttribute(key){if(key==='src')this.src=''}};
 const dialog={open:false,classList:{toggle(){}},querySelector:s=>s==='img'?large:null,showModal(){this.open=true},close(){this.open=false;events.get('close')?.()},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
 const root={querySelectorAll:s=>s.includes('img')?images:[],querySelector:s=>s==='dialog'?dialog:null,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n)};
 const cleanup=initGallery(root);const click=action=>handlers.get('click')({stopPropagation(){},target:{closest:s=>s==='[data-gallery]'&&action?{dataset:{gallery:action}}:null}});
 return {images,large,dialog,events,cleanup,click};
}

test('every GIF opening uses a fresh decoder URL while sharing cached bytes and releasing closed URLs',async t=>{
 const blob=new Blob(['GIF89a'],{type:'image/gif'});let downloads=0;const revoked=[];const revoke=URL.revokeObjectURL;
 t.mock.method(globalThis,'fetch',async()=>{downloads++;return {ok:true,blob:async()=>blob}});
 t.mock.method(URL,'revokeObjectURL',src=>{revoked.push(src);revoke(src)});
 const f=fixture();f.click('open');await tick();const first=f.large.src;assert.match(first,/^blob:/);assert.equal(downloads,1);
 f.dialog.close();assert.deepEqual(revoked,[first]);f.click('open');await tick();const second=f.large.src;assert.match(second,/^blob:/);assert.notEqual(second,first);assert.equal(downloads,1);
 f.cleanup();assert.deepEqual(revoked,[first,second]);
});

test('portable blob and embedded data GIFs retain restart behaviour without a filename extension',async t=>{
 const requested=[];t.mock.method(globalThis,'fetch',async src=>{requested.push(src);return {ok:true,blob:async()=>new Blob(['GIF89a'],{type:'image/gif'})}});
 for(const [src,marked] of [['blob:https://example.test/portable-asset',true],['data:image/gif;base64,R0lGODlh',false]]){
  const f=fixture(src,marked);f.click('open');await tick();assert.match(f.large.src,/^blob:/);assert.notEqual(f.large.src,src);f.cleanup();
 }
 assert.equal(requested.length,2);
});

test('late GIF downloads cannot reopen closed media or replace a newly selected still image',async t=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve});t.mock.method(globalThis,'fetch',()=>pending);
 const f=fixture();f.click('open');f.click('next');assert.equal(f.large.src,f.images[1].src);finish({ok:true,blob:async()=>new Blob(['GIF89a'],{type:'image/gif'})});await tick();assert.equal(f.large.src,f.images[1].src);f.cleanup();
 let finishClosed;const closedPending=new Promise(resolve=>{finishClosed=resolve});t.mock.method(globalThis,'fetch',()=>closedPending);
 const closed=fixture();closed.click('open');closed.cleanup();finishClosed({ok:true,blob:async()=>new Blob(['GIF89a'],{type:'image/gif'})});await tick();assert.equal(closed.large.src,'');
});

test('GIF load failure keeps the existing image accessible and retries on the next opening',async t=>{
 let downloads=0;t.mock.method(globalThis,'fetch',async()=>{downloads++;throw Error('offline')});const f=fixture();f.click('open');await tick();assert.equal(f.large.src,f.images[0].src);f.dialog.close();f.click('open');await tick();assert.equal(downloads,2);f.cleanup();
});

test('rendered GIF thumbnails keep their animation type when export replaces asset URLs',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const {Gallery}=await vite.ssrLoadModule('/app/Scene.tsx');const h=renderToStaticMarkup(React.createElement(Gallery,{interactive:true,s:{...initial.slides[0],media:'/media/animation.gif'}}));assert.match(h,/<img data-restart-gif="true"[^>]*src="\/media\/animation.gif"/);}finally{await vite.close()}
});
