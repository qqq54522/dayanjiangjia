import test from'node:test';import assert from'node:assert/strict';import React from'react';import{renderToStaticMarkup}from'react-dom/server';import{createServer}from'vite';import{initial}from'../lib/deck.ts';
test('rendered presentation respects explicit visibility, meaningful interactions and classic opening',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const make=(kind='cards')=>({...initial.slides[0],title:'页面主张',subtitle:'这是隐藏的副标题',content:{kind,goal:'同一主题',summary:'',items:Array.from({length:5},(_,i)=>({id:String(i),title:'要点'+i,body:'清楚的解释',detail:'完整来源'}))}});const html=s=>renderToStaticMarkup(React.createElement(Scene,{s}));
 let s=make(),h=html(s);assert.equal((h.match(/class="content-number"/g)||[]).length,5);assert.ok(!h.includes('这是隐藏的副标题'));assert.ok(!h.includes('data-detail-open'));assert.ok(!h.includes('content-detail-sheet'));assert.ok(h.includes('要点4'));
 s.content.presentation={subtitle:'visible'};assert.ok(html(s).includes('这是隐藏的副标题'));
 s.content.items[0].interaction='detail';h=html(s);assert.ok(h.includes('data-detail-open="0"'));assert.ok(h.includes('完整来源'));
 s=make('point');s.content.presentation={layout:'cover'};h=html(s);assert.ok(h.includes('comic-opening'));assert.ok(!h.includes('content-main'));
 s=make('visual');s.content.items=[{id:'photo',title:'不占图片位置的说明',body:'不占图片位置的正文',detail:'',media:'/media/photo.png'}];h=html(s);assert.ok(h.includes('content-image-stage'));assert.ok(!h.includes('<h2>'));assert.ok(!h.includes('content-lead'));assert.ok(!h.includes('content-body'));
 s.content.presentation={layout:'balanced'};s.content.items[0].crop={x:0,y:0,width:.5,height:.5};s.content.items[0].mediaAspect=1;assert.ok(html(s).includes('content-crop'));
 s.content.items[0].media='/media/photo2.png';s.content.items.push({id:'next',title:'第二张',body:'',detail:'',media:'/media/next.png'});s.composition={intent:'visual',sequence:'grid',fit:'contain',brief:''};assert.ok(html(s).includes('content-image-stage multi'));
 s.composition.sequence='carousel';assert.ok(html(s).includes('gallery-frame'));
 }finally{await vite.close()}
});

test('style gallery renders every classic and semantic example and enforces actual capacity',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const{default:StyleSamples}=await vite.ssrLoadModule('/app/StyleSamples.tsx');const{styleExamples,styleExampleInfo}=await vite.ssrLoadModule('/lib/templates.ts');const source=initial.slides.slice(0,1),examples=styleExamples(source),count=examples.length;
 const render=n=>renderToStaticMarkup(React.createElement(StyleSamples,{slides:Array.from({length:n},(_,i)=>({...source[0],id:String(i)})),onAdd:()=>{throw Error('Rendering must not alter the manuscript')}}));
 const html=render(1);assert.equal((html.match(/class="sample-category"/g)||[]).length,6);assert.equal((html.match(/class="sample-example"/g)||[]).length,count);for(const s of examples)assert.ok(html.includes(styleExampleInfo(s).label));assert.ok(html.includes(`添加全部 ${count} 页示例`));assert.ok(html.includes('章节开场'));assert.ok(html.includes('简明表格'));assert.ok(!render(60-count).includes('disabled=""'));assert.ok(render(61-count).includes('disabled=""'));assert.ok(render(61-count).includes('超过 60 页上限'));
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

test('cover editor explains hidden modules and optional evidence exposes its saved detail text',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{
  const{Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const{default:ContentEditor}=await vite.ssrLoadModule('/app/ContentEditor.tsx');
  const s={...initial.slides[0],content:{kind:'point',goal:'定位',summary:'',presentation:{layout:'cover',evidence:false},items:[{id:'main',title:'主张',body:'解释',detail:'',placement:'main'},{id:'ref',title:'备稿参考',body:'',detail:'仅用于备稿的完整资料正文',placement:'detail'}]}};
  const editor=renderToStaticMarkup(React.createElement(ContentEditor,{s,doc:{...initial,slides:[s]},change:()=>{throw Error('Rendering must not change data')},tab:'text'}));
  assert.ok(editor.includes('下方正文模块暂不上屏'));assert.ok(editor.includes('不进入主画面'));assert.ok(editor.includes('补充资料入口'));
  const render=()=>renderToStaticMarkup(React.createElement(Scene,{s}));
  assert.ok(!render().includes('仅用于备稿的完整资料正文'));assert.ok(!render().includes('evidence-launch'));
  s.content.presentation.evidence=true;const visible=render();assert.ok(visible.includes('evidence-launch'));assert.ok(visible.includes('仅用于备稿的完整资料正文'));
 }finally{await vite.close()}
});
