import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {initial} from '../lib/deck.ts';
import {validContent,contentEditingGroups} from '../lib/content.ts';
import {reviewSlide} from '../lib/quality.ts';
import {codexRules} from '../lib/codex.mjs';
import {conversionRules} from '../lib/conversion.mjs';

const slide=()=>({...structuredClone(initial.slides[0]),title:'Explore examples',subtitle:'Hidden subtitle',content:{kind:'visual',goal:'Explain each example',summary:'',presentation:{layout:'carousel',carouselText:true,subtitle:'hidden'},items:[
 {id:'first',title:'First case',body:'First explanation',detail:'',media:'/media/first.png',importance:'key'},
 {id:'second',title:'Second case',body:'Second explanation',detail:'',media:'/media/second.gif'},
 {id:'notes',title:'Presenter note',body:'Keep off screen',detail:''}
]}});

test('linked carousel copy validates, remains editable and is available to both AI workflows',()=>{
 const s=slide(),c=s.content,before=structuredClone(c);assert.ok(validContent(c));
 for(const carouselText of ['true',1,null])assert.equal(validContent({...c,presentation:{layout:'carousel',carouselText}}),false);
 const groups=contentEditingGroups(c);assert.equal(groups.bodyVisible,true);assert.deepEqual(groups.body.map(i=>i.id),['first','second']);assert.deepEqual(groups.retained.map(i=>i.id),['notes']);assert.equal(groups.summaryVisible,false);assert.deepEqual(c,before);
 assert.ok(!reviewSlide(s).some(i=>i.code==='key-layout'));
 s.content.items[0].value='42';assert.ok(reviewSlide(s).some(i=>i.code==='key-layout'),'values are not silently treated as visible captions');
 assert.equal(contentEditingGroups({...c,presentation:{layout:'carousel'}}).bodyVisible,false);
 for(const rules of [codexRules,conversionRules])assert.ok(rules.includes('carouselText'));
});

test('carousel frames keep editable copy with its image in live and static rendering without changing plain carousels',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx'),{default:ContentEditor}=await vite.ssrLoadModule('/app/ContentEditor.tsx');
  const s=slide(),render=interactive=>renderToStaticMarkup(React.createElement(Scene,{s,interactive}));
  const live=render(true),frames=live.match(/<div class="media-item with-caption"[\s\S]*?(?=<div class="media-item|<\/div><\/div><dialog)/g);
  assert.ok(live.includes('gallery-track'));assert.equal(frames.length,2);assert.ok(frames[0].includes('First case'));assert.ok(frames[0].includes('/media/first.png'));assert.ok(!frames[0].includes('/media/second.gif'));assert.ok(frames[1].includes('Second explanation'));assert.ok(frames[1].includes('/media/second.gif'));
  assert.ok(!live.includes('Keep off screen'));assert.ok(!live.includes('Hidden subtitle'));assert.ok(!live.includes('gallery-controls'));assert.ok(!live.includes('gallery-count'));assert.ok(live.includes('data-gallery-caption-title'));
  const still=render(false);assert.ok(still.includes('First case'));assert.ok(still.includes('First explanation'));assert.ok(!still.includes('Second case'));assert.ok(!still.includes('<dialog'));
  const props={s,doc:{...initial,slides:[s]},change:()=>{throw Error('Rendering must not write data')}};
  const text=renderToStaticMarkup(React.createElement(ContentEditor,{...props,tab:'text'}));assert.ok(text.includes('value="First case"'));assert.ok(text.includes('First explanation'));assert.ok(!text.includes('value="Presenter note"'));
  const media=renderToStaticMarkup(React.createElement(ContentEditor,{...props,tab:'media'}));assert.ok(media.includes('图片与对应文字一起切换'));assert.ok(media.includes('checked=""'));
  s.content.presentation.carouselText=false;const plain=render(true);assert.ok(!plain.includes('gallery-caption-title'));assert.ok(!plain.includes('First explanation'));
  s.content.presentation.carouselText=true;s.content.items=s.content.items.slice(0,1);assert.ok(render(true).includes('First explanation'),'a single frame still displays its paired copy');
 }finally{await vite.close()}
});
