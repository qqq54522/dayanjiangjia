import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validPresentation} from '../lib/content.ts';
import {initial} from '../lib/deck.ts';
import {initGallery} from '../lib/gallery.ts';
import {pack,unpack,saveMedia} from '../lib/transfer.mjs';
import {mp4} from './fixtures.mjs';

test('modal video settings are explicit per-page settings and survive portable ZIP',()=>{
 assert.ok(validPresentation({videoPlayback:'modal'}));
 for(const p of [{videoPlayback:true},{videoPlayback:'auto'}])assert.equal(validPresentation(p),false);
 const dir=mkdtempSync(path.join(tmpdir(),'video-modal-'));
 try{const d=structuredClone(initial);d.slides[0].content={kind:'visual',goal:'说明',summary:'',presentation:{layout:'balanced',videoPlayback:'modal'},items:[{id:'one',title:'现有文字',body:'',detail:'',media:saveMedia(path.join(dir,'media'),mp4)}]};assert.deepEqual(unpack(pack(d,path.join(dir,'media')),path.join(dir,'restored')),d);}finally{rmSync(dir,{recursive:true,force:true})}
});

test('only opted-in pages replace the action row with a keyboard-accessible video preview',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const s={...initial.slides[0],content:{kind:'visual',goal:'逐项说明',summary:'',presentation:{layout:'balanced',videoPlayback:'modal'},items:Array.from({length:4},(_,i)=>({id:'copy-'+i,title:'要点'+i,body:'',detail:'',...(i===0?{media:'/media/example.mp4',interaction:'media'}:{})}))}};
 const render=()=>renderToStaticMarkup(React.createElement(Scene,{s}));let h=render();assert.match(h,/<button type="button" class="video-open" data-gallery="open" aria-label="播放视频">/);assert.doesNotMatch(h,/video-actions/);assert.doesNotMatch(h,/放大播放/);assert.match(h,/data-video-playback="modal"/);assert.equal((h.match(/class="content-item /g)||[]).length,4);assert.doesNotMatch(h,/data-content-step/);assert.match(h,/<dialog/);assert.match(h,/aria-label="放大视频"/);assert.doesNotMatch(h,/video-collapse/);assert.doesNotMatch(h,/退出放大/);
 delete s.content.presentation.videoPlayback;h=render();assert.match(h,/video-actions/);assert.match(h,/退出放大/);assert.match(h,/放大播放/);assert.doesNotMatch(h,/class="video-open"/);
 }finally{await vite.close()}
});

function gallery(mode){
 const handlers=new Map(),dialogHandlers=new Map();
 const video=()=>({tagName:'VIDEO',src:'example.mp4',currentTime:12,muted:false,paused:true,hidden:false,pause(){this.paused=true},play(){this.paused=false;return Promise.resolve()},closest(){return null}});
 const small=video(),big=video(),image={};
 const dialog={closest(){return null},open:false,classList:{toggle(){}},querySelector:s=>s==='video'?big:s==='img'?image:{},showModal(){this.open=true},close(){this.open=false},addEventListener:(n,f)=>dialogHandlers.set(n,f),removeEventListener:n=>dialogHandlers.delete(n)};
 const root={dataset:{videoPlayback:mode},querySelectorAll:s=>s.includes('img')?[small]:[],querySelector:s=>s==='dialog'?dialog:null,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n)};
 const cleanup=initGallery(root);const click=action=>handlers.get('click')({stopPropagation(){},target:{closest:s=>s==='[data-gallery]'&&action?{dataset:{gallery:action}}:null}});
 const clickTarget=target=>handlers.get('click')({stopPropagation(){},target});return {small,big,dialog,dialogHandlers,handlers,cleanup,click,clickTarget};
}
test('one click starts modal playback, preserves progress and mute, and close or Escape pauses it',()=>{
 const f=gallery('modal');f.click('open');assert.ok(f.dialog.open);assert.equal(f.big.paused,false);assert.equal(f.big.currentTime,12);assert.equal(f.big.muted,false);assert.ok(f.small.paused);f.big.currentTime=24;f.click('close');assert.ok(f.big.paused);assert.equal(f.small.currentTime,24);f.click('open');assert.equal(f.big.currentTime,24);f.dialogHandlers.get('cancel')();assert.ok(f.big.paused);f.cleanup();assert.equal(f.handlers.size,0);
 const old=gallery(undefined);old.click('open');assert.equal(old.big.paused,true);old.cleanup();
});

test('modal video dismisses only from empty surround, preserving progress and pausing immediately',()=>{
 const f=gallery('modal');f.click('open');f.big.currentTime=31;f.clickTarget(f.big);assert.ok(f.dialog.open);assert.equal(f.big.paused,false);f.clickTarget({closest(){return null}});assert.ok(f.dialog.open);f.clickTarget(f.dialog);assert.equal(f.dialog.open,false);assert.ok(f.big.paused);assert.equal(f.small.currentTime,31);f.click('open');assert.equal(f.big.currentTime,31);f.cleanup();
 const inline=gallery();inline.click('open');inline.clickTarget(inline.dialog);assert.ok(inline.dialog.open);inline.cleanup();
});
