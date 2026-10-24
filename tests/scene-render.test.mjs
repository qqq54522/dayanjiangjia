import test from'node:test';import assert from'node:assert/strict';import React from'react';import{renderToStaticMarkup}from'react-dom/server';import{createServer}from'vite';import{initial}from'../lib/deck.ts';
test('rendered presentation respects explicit visibility, meaningful interactions and classic opening',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const make=(kind='cards')=>({...initial.slides[0],title:'页面主张',subtitle:'这是隐藏的副标题',content:{kind,goal:'同一主题',summary:'',items:Array.from({length:5},(_,i)=>({id:String(i),title:'要点'+i,body:'清楚的解释',detail:'完整来源'}))}});const html=s=>renderToStaticMarkup(React.createElement(Scene,{s}));
 let s=make(),h=html(s);assert.equal((h.match(/class="content-number"/g)||[]).length,5);assert.ok(!h.includes('这是隐藏的副标题'));assert.ok(!h.includes('data-detail-open'));assert.ok(!h.includes('content-detail-sheet'));assert.ok(h.includes('要点4'));
 s.content.presentation={subtitle:'visible'};assert.ok(html(s).includes('这是隐藏的副标题'));
 s.content.items[0].interaction='detail';h=html(s);assert.ok(h.includes('data-detail-open="0"'));assert.ok(h.includes('完整来源'));
 s=make('point');s.content.presentation={layout:'cover'};h=html(s);assert.ok(h.includes('comic-opening'));assert.ok(!h.includes('content-main'));
 s=make('visual');s.content.items=[{id:'photo',title:'不占图片位置的说明',body:'不占图片位置的正文',detail:'',media:'/media/photo.png'}];h=html(s);assert.ok(h.includes('content-image-stage'));assert.ok(!h.includes('<h2>'));assert.ok(!h.includes('content-lead'));assert.ok(!h.includes('content-body'));
 }finally{await vite.close()}
});
