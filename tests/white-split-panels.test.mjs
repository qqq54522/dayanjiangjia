import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createServer} from 'vite';import {initial} from '../lib/deck.ts';import {validPresentation} from '../lib/content.ts';
test('white split panels keep two or three text modules, their focus controls, and a narrow portrait GIF frame',async()=>{
 assert.ok(validPresentation({splitCards:'white'}));
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');for(const n of [2,3]){
 const s={...initial.slides[0],content:{kind:'cards',goal:'说明产品',summary:'',presentation:{layout:'balanced',splitCards:'white',interaction:'guided',marker:'none',mediaSide:'right'},items:[...Array.from({length:n},(_,i)=>({id:'point-'+i,title:'说明'+i,body:'完整正文',detail:'',interaction:'focus'})),{id:'phone',title:'',body:'',detail:'',media:'/media/phone.gif',mediaAspect:.46,interaction:'media'}]}};
 const render=()=>renderToStaticMarkup(React.createElement(Scene,{s}));let h=render();assert.match(h,/split-white-cards/);assert.match(h,/grid-template-columns:minmax\(0,1fr\) auto/);assert.match(h,/split-portrait-media/);assert.match(h,/--split-media-aspect:0.46/);assert.equal((h.match(/class="content-item /g)||[]).length,n);assert.equal((h.match(/class="content-focus-hit"/g)||[]).length,n);assert.match(h,/phone\.gif/);assert.match(h,/aria-label="放大查看图片或动画"/);assert.doesNotMatch(h,/split-dark-cards/);
 s.content.presentation.mediaSide='left';assert.match(render(),/grid-template-columns:auto minmax\(0,1fr\)/);
 s.content.items[n].title='素材的必要说明';assert.equal((render().match(/class="content-item /g)||[]).length,n+1);
 delete s.content.presentation.splitCards;h=render();assert.doesNotMatch(h,/split-portrait-media/);assert.doesNotMatch(h,/split-white-cards/);
 }}finally{await vite.close()}
});
