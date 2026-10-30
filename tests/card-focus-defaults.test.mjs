import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {initial} from '../lib/deck.ts';

test('ordinary and split cards focus consistently without AI-specific item flags; explicit static remains static',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');
  for(const kind of ['cards','compare','process'])for(const layout of ['cards','balanced','text','list','process-cards']){
   const s={...initial.slides[0],content:{kind,goal:'讲解',summary:'',presentation:{layout,marker:'none'},items:[{id:'a',title:'要点一',body:'说明',detail:''},{id:'b',title:'要点二',body:'说明',detail:''}]}};
   const before=structuredClone(s),render=interactive=>renderToStaticMarkup(React.createElement(Scene,{s,interactive}));
   const h=render(true);assert.equal((h.match(/class="content-focus-hit"/g)||[]).length,2,kind+'/'+layout);assert.equal((h.match(/data-overview-focus="true"/g)||[]).length,2);
   assert.deepEqual(s,before);assert.ok(!render(false).includes('content-focus-hit'));
   s.content.presentation.interaction='static';assert.ok(!render(true).includes('content-focus-hit'));assert.ok(!render(true).includes('data-content-step'));
   delete s.content.presentation.interaction;s.content.items[0].interaction='none';assert.equal((render(true).match(/class="content-focus-hit"/g)||[]).length,1);
  }
 }finally{await vite.close()}
});

test('card emphasis leaves image, cropped image, video and explicit detail controls independently reachable',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');
  const s={...initial.slides[0],content:{kind:'cards',goal:'讲解',summary:'',items:[
   {id:'a',title:'图片',body:'说明',detail:'额外解释',interaction:'detail',media:'/media/example.png'},
   {id:'b',title:'视频',body:'说明',detail:'',interaction:'media',media:'/media/example.mp4'},
   {id:'c',title:'裁剪图',body:'说明',detail:'',interaction:'media',media:'/media/crop.png',mediaAspect:1,crop:{x:0,y:0,width:.5,height:.5}}
  ]}};
  const h=renderToStaticMarkup(React.createElement(Scene,{s}));assert.equal((h.match(/class="content-focus-hit"/g)||[]).length,3);
  assert.match(h,/aria-label="放大查看图片或动画"/);assert.match(h,/aria-label="放大播放视频"/);assert.match(h,/class="content-crop"[^>]*data-detail-open="2"/);
  assert.match(h,/class="card-detail-open" data-detail-open="0"/);assert.match(h,/额外解释/);assert.ok(!h.includes('class="content-detail-hit"'));
 }finally{await vite.close()}
});
