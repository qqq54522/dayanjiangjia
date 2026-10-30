import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {initial,validSlide} from '../lib/deck.ts';
import {validPresentation,preserveLockedItems} from '../lib/content.ts';
import {applyVariant} from '../lib/presentation-options.ts';
import {pack,unpack} from '../lib/transfer.mjs';
import {codexRules} from '../lib/codex.mjs';
import {conversionRules} from '../lib/conversion.mjs';

const slide=()=>({...structuredClone(initial.slides[0]),title:'A full title with two related ideas',subtitle:'',points:[],content:{kind:'cards',goal:'Present three related examples',summary:'',presentation:{layout:'cards',columns:3},items:[{id:'one',title:'First example',body:'First explanation',detail:''},{id:'two',title:'Second example',body:'Second explanation',detail:''},{id:'three',title:'Third example',body:'Third explanation',detail:''}]}});

test('per-page title width validates bounded numeric values and survives ZIP and layout changes',()=>{
 assert.ok(validPresentation({}));
 for(const titleWidth of [30,50,55.5,77])assert.ok(validPresentation({titleWidth}));
 for(const titleWidth of [29,78,NaN,Infinity,'50',null])assert.equal(validPresentation({titleWidth}),false);
 const s=slide();s.content.presentation.titleWidth=50;assert.ok(validSlide(s));
 const doc={...structuredClone(initial),slides:[s,slide()]};doc.slides[1].id='untouched';
 const restored=unpack(pack(doc,''),'');assert.deepEqual(restored,doc);
 assert.equal(applyVariant(s,'list').content.presentation.titleWidth,50);
 assert.equal(restored.slides[1].content.presentation.titleWidth,undefined);
 for(const rules of [codexRules,conversionRules])assert.ok(rules.includes('titleWidth'));
});

test('text-only AI revisions preserve the authors title width while explicit width edits are allowed',()=>{
 const before=slide().content;before.presentation.titleWidth=50;
 const after=structuredClone(before);delete after.presentation.titleWidth;after.items[0].body='Updated explanation';
 const preserved=preserveLockedItems(before,after);assert.equal(preserved.presentation.titleWidth,50);assert.equal(preserved.items[0].body,'Updated explanation');
 assert.equal(after.presentation.titleWidth,undefined);assert.equal(before.items[0].body,'First explanation');
 after.presentation.titleWidth=60;assert.equal(preserveLockedItems(before,after).presentation.titleWidth,60);
});

test('title width is opt-in in both interactive and exported rendering and leaves slide content intact',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx'),{default:ContentEditor}=await vite.ssrLoadModule('/app/ContentEditor.tsx');
  const s=slide(),before=structuredClone(s),render=(value,interactive)=>renderToStaticMarkup(React.createElement(Scene,{s:value,interactive}));
  const original=render(s,true);assert.match(original,/<h1 class="comic-title"><span>/);
  s.content.presentation.titleWidth=50;
  for(const interactive of [true,false]){
   const html=render(s,interactive);assert.match(html,/<h1 class="comic-title" style="width:50%"><span>/);
   assert.equal(html.replace(' style="width:50%"',''),render(before,interactive));
  }
  const editor=()=>renderToStaticMarkup(React.createElement(ContentEditor,{s,doc:{...initial,slides:[s]},change:()=>{throw Error('Rendering must not mutate the document')},tab:'media'}));
  assert.match(editor(),/aria-label="标题板宽度"/);assert.match(editor(),/恢复母版标题宽度/);
  const cover=applyVariant(s,'cover');assert.doesNotMatch(render(cover,true),/width:50%/);
  const chapter=applyVariant(s,'chapter');assert.doesNotMatch(render(chapter,true),/width:50%/);
  delete s.content.presentation.titleWidth;assert.equal(render(s,true),original);assert.deepEqual(s,before);
 }finally{await vite.close()}
});
