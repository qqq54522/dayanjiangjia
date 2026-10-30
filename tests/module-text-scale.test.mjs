import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {initial,validSlide} from '../lib/deck.ts';
import {validItemDesign,supportsTextScale} from '../lib/module-layout.ts';
import {afterContentEdit,preserveLockedItems} from '../lib/content.ts';
import {applyVariant} from '../lib/presentation-options.ts';
import {pack,unpack} from '../lib/transfer.mjs';
import {captureVersion,loadVersion} from '../lib/versions.ts';
import {codexRules} from '../lib/codex.mjs';
import {conversionRules} from '../lib/conversion.mjs';
const slide=()=>({...structuredClone(initial.slides[0]),title:'Three related ideas',subtitle:'',points:[],content:{kind:'cards',goal:'Present ideas',summary:'',presentation:{layout:'cards',columns:3,marker:'number'},items:['First','Middle','Last'].map((title,i)=>({id:String(i),title,body:title+' explanation',detail:'',interaction:'focus',design:{emphasis:'title',align:'center'}}))}});

test('module enlargement accepts bounded numeric values and only applies to supported card layouts',()=>{
 for(const textScale of [1,1.2,1.5])assert.ok(validItemDesign({textScale}));
 for(const textScale of [.9,1.51,NaN,Infinity,'1.2',null])assert.equal(validItemDesign({textScale}),false);
 const s=slide();assert.ok(supportsTextScale(s.content));assert.ok(supportsTextScale({...s.content,kind:'compare',presentation:{}}));
 for(const layout of ['list','balanced','text','media-feature','cover','chapter'])assert.equal(supportsTextScale({...s.content,presentation:{layout}}),false);
 assert.equal(supportsTextScale({...s.content,kind:'process'}),false);
 s.content.items[1].design.textScale=1.2;assert.ok(validSlide(s));
 assert.equal(afterContentEdit(slide().content,s.content).presentation.textFit,undefined,'enlarging one module must not trigger group-wide shrinking');
});

test('per-module enlargement survives ZIP, versions, layout changes and later AI text edits',()=>{
 const s=slide();s.content.items[1].design.textScale=1.2;
 const doc={...structuredClone(initial),slides:[s]},zip=unpack(pack(doc,''),'');assert.deepEqual(zip,doc);
 const version=captureVersion(doc,'Typography');assert.deepEqual(loadVersion({...doc,versions:[version]},version.id).slides,[s]);
 const switched=applyVariant(applyVariant(s,'list'),'cards');assert.equal(switched.content.items[1].design.textScale,1.2);
 const after=structuredClone(s.content);delete after.items[1].design.textScale;after.items[1].body='Revised explanation';
 assert.equal(preserveLockedItems(s.content,after).items[1].design.textScale,1.2);assert.equal(after.items[1].design.textScale,undefined);
 after.items[1].design.textScale=1.3;assert.equal(preserveLockedItems(s.content,after).items[1].design.textScale,1.3);
 for(const rules of [codexRules,conversionRules])assert.ok(rules.includes('textScale'));
});

test('interactive and exported scenes enlarge only the selected module while preserving content and controls',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx'),{default:ContentEditor}=await vite.ssrLoadModule('/app/ContentEditor.tsx');
  const original=slide(),s=structuredClone(original);s.content.items[1].design.textScale=1.2;
  const render=(s,interactive)=>renderToStaticMarkup(React.createElement(Scene,{s,interactive}));
  for(const interactive of [true,false]){
   const html=render(s,interactive);assert.equal((html.match(/--module-text-scale:1.2/g)||[]).length,1);
   assert.equal(html.replace(' style="--module-text-scale:1.2"',''),render(original,interactive));
  }
  const editor=renderToStaticMarkup(React.createElement(ContentEditor,{s,doc:{...initial,slides:[s]},tab:'text',change:()=>{throw Error('Rendering must not mutate data')}}));
  assert.match(editor,/模块2文字大小/);assert.match(editor,/value="1.2"/);
  assert.doesNotMatch(render(applyVariant(s,'list'),true),/--module-text-scale/);
  assert.equal(s.content.items[0].design.textScale,undefined);assert.equal(s.content.items[2].design.textScale,undefined);
 }finally{await vite.close()}
});
