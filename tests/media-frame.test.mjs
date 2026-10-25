import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {validMediaFrame,frameStyle,frameAspect} from '../lib/media-frame.ts';
import {validContent} from '../lib/content.ts';
import {initial} from '../lib/deck.ts';
test('framing validates all nine anchors and rejects invalid input',()=>{
 for(let position=0;position<9;position++)for(const fit of ['contain','cover'])assert.ok(validMediaFrame({fit,position}));
 for(const v of [null,{}, {fit:'stretch',position:4},{fit:'cover',position:-1},{fit:'cover',position:9},{fit:'cover',position:1.5}])assert.equal(validMediaFrame(v),false);
 assert.deepEqual(frameStyle({fit:'cover',position:8}),{objectFit:'cover',objectPosition:'100% 100%'});
 assert.equal(frameAspect({fit:'cover',position:0}),'xMinYMin slice');
 const c={kind:'visual',goal:'',summary:'',items:[{id:'i',title:'',body:'',detail:'',media:'/media/a.gif',mediaFrame:{fit:'cover',position:4}}]};
 assert.ok(validContent(c));c.items[0].mediaFrame.position=NaN;assert.equal(validContent(c),false);
});
test('framing travels with each image in grid and carousel, without cropping the lightbox or changing GIF source',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');
 const s={...initial.slides[0],content:{kind:'visual',goal:'',summary:'',items:[{id:'a',title:'A',body:'',detail:'',media:'/media/a.gif',mediaFrame:{fit:'cover',position:2}},{id:'b',title:'B',body:'',detail:'',media:'/media/b.png',mediaFrame:{fit:'contain',position:4}}]},composition:{intent:'visual',fit:'contain',brief:'',sequence:'grid'}};
 const render=interactive=>renderToStaticMarkup(React.createElement(Scene,{s,interactive}));
 for(const sequence of ['grid','carousel']){s.composition.sequence=sequence;const h=render(true);assert.match(h,/object-fit:cover;object-position:100% 0%/);assert.match(h,/object-fit:contain;object-position:50% 50%/);assert.match(h,/src="\/media\/a.gif"/);assert.doesNotMatch(h,/<dialog[^>]*class="media-lightbox"[^>]*><img[^>]*style=/);assert.match(render(false),/object-fit:cover/);}
 s.composition.sequence='grid';Object.assign(s.content.items[0],{crop:{x:.1,y:.2,width:.4,height:.5},mediaAspect:2});assert.match(render(true),/preserveAspectRatio="xMaxYMin slice"/);
 }finally{await vite.close()}
});

test('ZIP preserves framing and exact animated GIF bytes',async()=>{
 const {mkdtempSync,readFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const path=await import('node:path');const {pack,unpack,saveMedia}=await import('../lib/transfer.mjs');const {gif}=await import('./fixtures.mjs');
 const a=mkdtempSync(path.join(tmpdir(),'frame-a-')),b=mkdtempSync(path.join(tmpdir(),'frame-b-'));
 try{const d=structuredClone(initial),url=saveMedia(a,gif);d.slides[0].content={kind:'visual',goal:'',summary:'',items:[{id:'gif',title:'',body:'',detail:'',media:url,mediaFrame:{fit:'cover',position:7}}]};const result=unpack(pack(d,a),b);assert.deepEqual(result,d);assert.deepEqual(readFileSync(path.join(b,path.basename(url))),gif);}finally{rmSync(a,{recursive:true,force:true});rmSync(b,{recursive:true,force:true})}
});
