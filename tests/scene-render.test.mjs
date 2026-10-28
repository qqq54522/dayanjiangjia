import {MAX_SLIDES} from '../lib/limits.ts';
import test from'node:test';import assert from'node:assert/strict';import React from'react';import{renderToStaticMarkup}from'react-dom/server';import{createServer}from'vite';import{initial}from'../lib/deck.ts';
test('rendered presentation respects explicit visibility, meaningful interactions and classic opening',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const make=(kind='cards')=>({...initial.slides[0],title:'页面主张',subtitle:'这是隐藏的副标题',content:{kind,goal:'同一主题',summary:'',items:Array.from({length:5},(_,i)=>({id:String(i),title:'要点'+i,body:'清楚的解释',detail:'完整来源'}))}});const html=s=>renderToStaticMarkup(React.createElement(Scene,{s}));
 let s=make(),h=html(s);assert.equal((h.match(/class="content-number"/g)||[]).length,5);assert.ok(!h.includes('这是隐藏的副标题'));assert.ok(!h.includes('data-detail-open'));assert.ok(!h.includes('content-detail-sheet'));assert.ok(h.includes('要点4'));
 s.content.presentation={subtitle:'visible'};assert.ok(html(s).includes('这是隐藏的副标题'));
 s.content.items[0].interaction='detail';h=html(s);assert.ok(h.includes('data-detail-open="0"'));assert.ok(h.includes('完整来源'));
 s=make('point');s.content.presentation={layout:'cover'};h=html(s);assert.ok(h.includes('cover-opening'));assert.ok(!h.includes('content-main'));
 s=make('visual');s.content.items=[{id:'photo',title:'不占图片位置的说明',body:'不占图片位置的正文',detail:'',media:'/media/photo.png'}];h=html(s);assert.ok(h.includes('content-image-stage'));assert.ok(!h.includes('<h2>'));assert.ok(!h.includes('content-lead'));assert.ok(!h.includes('content-body'));
 s.content.presentation={layout:'balanced'};s.content.items[0].crop={x:0,y:0,width:.5,height:.5};s.content.items[0].mediaAspect=1;assert.ok(html(s).includes('content-crop'));
 s.content.items[0].media='/media/photo2.png';s.content.items.push({id:'next',title:'第二张',body:'',detail:'',media:'/media/next.png'});s.composition={intent:'visual',sequence:'grid',fit:'contain',brief:''};assert.ok(html(s).includes('content-image-stage multi'));
 s.composition.sequence='carousel';assert.ok(html(s).includes('gallery-frame'));
 }finally{await vite.close()}
});
test('focused media cards expose separate card and media controls in the standalone scene',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const s={...initial.slides[0],content:{kind:'cards',goal:'逐项讲解',summary:'',items:[{id:'picture',title:'图片',body:'',detail:'',interaction:'focus',media:'/media/demo.gif'},{id:'film',title:'视频',body:'',detail:'',interaction:'focus',media:'/media/film.mp4'}]}};const h=renderToStaticMarkup(React.createElement(Scene,{s}));assert.equal((h.match(/class="content-focus-hit"/g)||[]).length,2);assert.match(h,/aria-label="聚焦图片"[^>]*data-active="false"|data-active="false"[^>]*aria-label="聚焦图片"/);assert.match(h,/aria-label="放大查看图片或动画"/);assert.match(h,/aria-label="放大播放视频"/);assert.match(h,/data-gallery="close" hidden=""/);
  s.content.items[0].crop={x:0,y:0,width:.5,height:.5};s.content.items[0].mediaAspect=1;const cropped=renderToStaticMarkup(React.createElement(Scene,{s}));assert.match(cropped,/class="content-crop"[^>]*data-detail-open="0"/);assert.match(cropped,/dialog class="content-detail" data-detail="0"/);
 }finally{await vite.close()}
});

test('mixed metric and media cards do not add a lone sequence number',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const s={...initial.slides[0],content:{kind:'cards',goal:'覆盖情况',summary:'',presentation:{layout:'cards',columns:2},items:[{id:'a',title:'学校使用',body:'',detail:'',value:'23万+'},{id:'b',title:'学生选择',body:'',detail:'',value:'1.3亿+'},{id:'c',title:'教师推荐',body:'',detail:'',value:'460万+'},{id:'d',title:'央视报道画面',body:'',detail:'',media:'/media/news.png'}]}};const html=()=>renderToStaticMarkup(React.createElement(Scene,{s}));assert.ok(!html().includes('class="content-number"'));s.content.presentation.marker='number';assert.equal((html().match(/class="content-number"/g)||[]).length,4);
 }finally{await vite.close()}
});

test('style gallery renders every classic and semantic example and enforces actual capacity',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{default:StyleSamples}=await vite.ssrLoadModule('/app/StyleSamples.tsx');const{styleExamples,styleExampleInfo}=await vite.ssrLoadModule('/lib/templates.ts');const source=initial.slides.slice(0,1),examples=styleExamples(source),count=examples.length;
 const render=n=>renderToStaticMarkup(React.createElement(StyleSamples,{slides:Array.from({length:n},(_,i)=>({...source[0],id:String(i)})),onAdd:()=>{throw Error('Rendering must not alter the manuscript')}}));
 const html=render(1);assert.equal((html.match(/class="sample-category"/g)||[]).length,8);assert.equal((html.match(/class="sample-example"/g)||[]).length,count);for(const s of examples)assert.ok(html.includes(styleExampleInfo(s).label));assert.ok(html.includes(`添加全部 ${count} 页示例`));assert.ok(html.includes('章节开场'));assert.ok(html.includes('简明表格'));assert.ok(!render(MAX_SLIDES-count).includes('disabled=""'));assert.ok(render(MAX_SLIDES+1-count).includes('disabled=""'));assert.ok(render(MAX_SLIDES+1-count).includes(`超过 ${MAX_SLIDES} 页上限`));
 }finally{await vite.close()}
});

test('structured list, spotlight and chart variants render distinctly without losing source fields',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const{applyVariant}=await vite.ssrLoadModule('/lib/presentation-options.ts');
 const source={...initial.slides[0],content:{kind:'cards',goal:'比较',summary:'',items:[{id:'a',title:'示例 A',body:'小时',value:'66',detail:''},{id:'b',title:'示例 B',body:'小时',value:'-44',detail:''}]}};
 const render=id=>renderToStaticMarkup(React.createElement(Scene,{s:applyVariant(source,id)}));
 assert.ok(render('list').includes('content-layout-list'));assert.ok(renderToStaticMarkup(React.createElement(Scene,{s:{...source,content:{...source.content,presentation:{layout:'spotlight'}}}})).includes('content-layout-spotlight'));
 const chart=render('chart');assert.ok(chart.includes('semantic-chart-track'));assert.ok(chart.includes('66'));assert.ok(chart.includes('-44'));assert.ok(!chart.includes('NaN'));
 }finally{await vite.close()}
});

test('editor separates on-screen content from reference material and preserves optional evidence',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const{default:ContentEditor}=await vite.ssrLoadModule('/app/ContentEditor.tsx');
  const s={...initial.slides[0],content:{kind:'point',goal:'定位',summary:'',presentation:{layout:'cover',evidence:false},items:[{id:'main',title:'主张',body:'解释',detail:'',placement:'main'},{id:'ref',title:'备稿参考',body:'',detail:'仅用于备稿的完整资料正文',placement:'detail'}]}};
  const editor=renderToStaticMarkup(React.createElement(ContentEditor,{s,doc:{...initial,slides:[s]},change:()=>{throw Error('Rendering must not change data')},tab:'text'}));
  assert.ok(editor.includes('查看补充文字资料（2）'));assert.ok(!editor.includes('class="module-row"'));assert.ok(!editor.includes('仅用于备稿的完整资料正文'));assert.ok(!editor.includes('展示位置'));
  const renderEditor=(slide,tab)=>renderToStaticMarkup(React.createElement(ContentEditor,{s:slide,doc:{...initial,slides:[slide]},change:()=>{throw Error('Rendering must not change data')},tab}));
  const reference=renderEditor(s,'reference');assert.ok(reference.includes('暂存的原文'));assert.ok(reference.includes('仅用于备稿的完整资料正文'));assert.ok(reference.includes('value="主张"'));assert.ok(reference.includes('切换为卡片页并展示'));assert.ok(!reference.includes('模块 01'));
  const cards={...s,content:{...s.content,kind:'cards',presentation:{layout:'cards'}}};const text=renderEditor(cards,'text');assert.equal((text.match(/class="module-row"/g)||[]).length,1);assert.ok(text.includes('value="主张"'));assert.ok(!text.includes('value="备稿参考"'));assert.ok(!text.includes('仅用于备稿的完整资料正文'));assert.ok(renderEditor(cards,'reference').includes('移到页面正文'));

  const render=()=>renderToStaticMarkup(React.createElement(Scene,{s}));
  assert.ok(!render().includes('仅用于备稿的完整资料正文'));assert.ok(!render().includes('evidence-launch'));
  s.content.presentation.evidence=true;const visible=render();assert.ok(visible.includes('evidence-launch'));assert.ok(visible.includes('仅用于备稿的完整资料正文'));
 }finally{await vite.close()}
});

test('split proportions and media side survive HTML rendering while the source video remains playable',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const s={...initial.slides[0],content:{kind:'visual',goal:'解释画面',summary:'',presentation:{layout:'balanced',textShare:60,mediaSide:'left'},items:[{id:'copy',title:'说明',body:'保留完整解释',detail:''},{id:'video',title:'',body:'',detail:'',media:'/media/sample.mp4'}]}};
 const html=renderToStaticMarkup(React.createElement(Scene,{s}));assert.match(html,/split-media-left/);assert.match(html,/grid-template-columns:minmax\(0,40fr\) minmax\(0,60fr\)/);assert.match(html,/<video/);assert.match(html,/sample\.mp4/);assert.match(html,/保留完整解释/);
 }finally{await vite.close()}
});
