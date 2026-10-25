import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';
import {itemLayout,adaptiveColumns,validItemDesign} from '../lib/module-layout.ts';import {chapterPalette,chapterColor,nextChapterColor} from '../lib/chapters.ts';import {validChapter,updateChapter,validContent} from '../lib/content.ts';import {initial} from '../lib/deck.ts';import {DEFAULT_MASTER} from '../lib/masters.ts';
const item=(extra={})=>({id:'a',title:'一个观点',body:'',detail:'',...extra});const content=(items,kind='cards')=>({kind,goal:'解释同一件事',summary:'',items});
test('module decisions distinguish short messages, explanations, figures and portrait evidence',()=>{
 let i=item();assert.equal(itemLayout(i,content([i]),3).align,'center');
 i=item({body:'解释为什么要这样做。'.repeat(6)});assert.equal(itemLayout(i,content([i]),3).align,'left');assert.equal(itemLayout(i,content([i]),3).density,'reading');
 i=item({value:'66小时'});assert.equal(itemLayout(i,content([i]),3).emphasis,'value');assert.equal(itemLayout(i,content([i],'compare'),2).align,'left');
 i=item({body:'这是必要解释',media:'/media/x.png',mediaAspect:.6});assert.equal(itemLayout(i,content([i]),2).media,'beside');assert.equal(itemLayout(i,content([i]),4).media,'above');
 i.design={emphasis:'body',align:'left',highlight:'必要解释'};assert.equal(itemLayout(i,content([i]),2).emphasis,'body');assert.equal(itemLayout(i,content([i]),2).highlight,'必要解释');i.design.highlight='不存在';assert.equal(itemLayout(i,content([i]),2).highlight,'');
 const c=content(Array.from({length:4},(_,id)=>item({id:String(id),body:'长解释'.repeat(20)})));assert.equal(adaptiveColumns(c,4),2);c.presentation={columns:4};assert.equal(adaptiveColumns(c,4),4);assert.equal(validItemDesign({emphasis:'random'}),false);assert.equal(validContent({...c,items:[item({design:{align:'stretch'}})]}),false);
});
test('chapter identity preserves colour and group updates across non-contiguous slides',()=>{
 const c={id:'group',title:'同一主题',visible:true,color:'forest'};assert.ok(validChapter(c));assert.equal(validChapter({...c,color:'#ffd633'}),false);assert.equal(chapterColor(c),chapterPalette[0].hex);assert.equal(chapterColor({...c,color:undefined}),chapterColor({...c,color:undefined}));assert.equal(nextChapterColor([c]),'clay');
 const slides=[{chapter:c},{chapter:{...c,id:'other',color:'plum'}},{chapter:c}],next=updateChapter(slides,{...c,color:'clay'});assert.equal(next[0].chapter.color,'clay');assert.equal(next[2].chapter.color,'clay');assert.equal(next[1],slides[1]);assert.equal(slides[0].chapter.color,'forest');
});
test('adaptive renderer separates semantics, keeps source wording, and uses the current master for existing slides',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});try{const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const s={...initial.slides[0],master:DEFAULT_MASTER,chapter:{id:'one',title:'学习过程',visible:true,color:'clay'},content:content([item({body:'保留完整正文与必要解释',design:{emphasis:'body',highlight:'必要解释'}})])};const render=()=>renderToStaticMarkup(React.createElement(Scene,{s}));let h=render();assert.match(h,/master-v12/);assert.match(h,/data-emphasis="body"/);assert.match(h,/<mark>必要解释<\/mark>/);assert.match(h,/--chapter-color:#A34F40/);assert.match(h,/card-heading/);
 for(const kind of ['cards','compare','process']){s.content.kind=kind;h=render();assert.match(h,/adaptive-item/);assert.match(h,/保留完整正文与/);}
 s.master={id:'onion-comic',version:'1.1.0'};h=render();assert.match(h,/master-v12/);assert.match(h,/adaptive-item|--chapter-color/);
 }finally{await vite.close()}
});

test('Codex suggestions use the current master without rewriting original input',async()=>{
 const {proposalFrom}=await import('../lib/codex.mjs');const old={...initial.slides[0],master:{id:'onion-comic',version:'1.1.0'},content:content([item()])};const p={id:old.id,title:old.title,subtitle:'',points:[],note:'',layout:'statement',theme:'brand',designJson:null,contentJson:JSON.stringify(content([item({design:{emphasis:'title'}})]))};
 const result=proposalFrom({summary:'突出观点',slides:[p]},{revision:7,data:{slides:[old]}},[old.id]);assert.equal(result.slides[0].master.version,'1.2.0');assert.equal(result.summary,'突出观点');assert.equal(old.master.version,'1.1.0');
 const unchanged=proposalFrom({summary:'改文字',slides:[{...p,contentJson:JSON.stringify(old.content)}]},{revision:7,data:{slides:[old]}},[old.id]);assert.equal(unchanged.slides[0].master.version,'1.2.0');
});
