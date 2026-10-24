import test from 'node:test';import assert from 'node:assert/strict';
import {applyGeneratedPage} from '../lib/page-generation.ts';
import {initial} from '../lib/deck.ts';
import {blankSlide} from '../lib/slide-order.ts';
import {createServer} from 'vite';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
test('single page generation replaces stable target and preserves versions, neighbors and chapter',()=>{
 const original={...blankSlide(undefined,'target'),chapter:{id:'chapter',title:'主题',visible:true}};
 const neighbor=blankSlide(undefined,'neighbor');const doc={...initial,slides:[neighbor,original],versions:[{id:'saved'}]};
 const result={...blankSlide(undefined,'generated'),title:'生成结果'};
 const next=applyGeneratedPage(doc,original,result);
 assert.equal(next.slides[1].id,'target');assert.equal(next.slides[1].title,'生成结果');assert.equal(next.slides[1].chapter,original.chapter);assert.equal(next.slides[0],neighbor);assert.equal(next.versions,doc.versions);assert.equal(doc.slides[1],original);
 assert.equal(applyGeneratedPage(next,original,result),next);
 assert.throws(()=>applyGeneratedPage({...doc,slides:[neighbor]},original,result),/已删除/);
 assert.throws(()=>applyGeneratedPage({...doc,slides:[{...original,title:'新修改'}]},original,result),/有新修改/);
});
test('page reference entry offers upload and direct replacement, without version creation controls',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const {default:PageReference}=await vite.ssrLoadModule('/app/PageReference.tsx');const html=renderToStaticMarkup(React.createElement(PageReference,{slide:blankSlide(undefined,'test'),onApply:()=>{}}));assert.ok(html.includes('生成当前页'));assert.ok(html.includes('选择文件'));assert.ok(html.includes('不会创建版本'));assert.ok(!html.includes('保存为新版本'));}finally{await vite.close()}
});
