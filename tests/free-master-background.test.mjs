import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {validDesign} from '../lib/design.ts';
import {initial} from '../lib/deck.ts';
import {pack,unpack} from '../lib/transfer.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('free designs opt into the shared master backdrop without a media frame or duplicated branding',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');
  const s={...structuredClone(initial.slides[0]),background:'/media/background.png',points:['First','Second'],design:{background:'master',style:{background:'#fff',zIndex:'6'},nodes:[{type:'text',bind:'title'},{type:'text',bind:'points.0'}]}};
  assert.ok(validDesign(s.design));
  const html=renderToStaticMarkup(React.createElement(Scene,{s}));
  assert.match(html,/free-scene comic-default master-v12/);
  assert.match(html,/<div class="comic-backdrop" aria-hidden="true"><img src="\/media\/background.png" alt=""\/><\/div>/);
  assert.match(html,/class="comic-dots"/);
  assert.match(html,/class="free-layout" style="background:transparent;z-index:0"/);
  assert.ok(!html.includes('class="scene-media'));
  assert.ok(!html.includes('class="scene-footer'));
  assert.equal((html.match(/class="scene-brand"/g)||[]).length,1);
  assert.ok(html.includes('First'));
  s.chapter={id:'chapter',title:'Section',visible:true,color:'plum'};
  assert.match(renderToStaticMarkup(React.createElement(Scene,{s})),/class="chapter-ribbon"/);
  s.chapter.visible=false;
  assert.ok(!renderToStaticMarkup(React.createElement(Scene,{s})).includes('class="chapter-ribbon"'));
  delete s.design.background;
  const legacy=renderToStaticMarkup(React.createElement(Scene,{s}));
  assert.ok(!legacy.includes('class="comic-backdrop"'));
  assert.ok(legacy.includes('class="scene-footer"'));
  assert.match(legacy,/background:#fff;z-index:6/);
 }finally{await vite.close()}
});

test('master background selection is validated and survives portable ZIP exchange',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'free-master-'));
 try{
  const doc=structuredClone(initial);doc.slides[0].design={background:'master',nodes:[{type:'text',bind:'title'}]};
  assert.equal(validDesign({...doc.slides[0].design,background:'remote'}),false);
  assert.deepEqual(unpack(pack(doc,dir),dir).slides[0].design,doc.slides[0].design);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
