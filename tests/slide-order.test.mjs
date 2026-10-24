import test from 'node:test';import assert from 'node:assert/strict';
import {moveSlide,blankSlide,isBlankSlide} from '../lib/slide-order.ts';
import {initial,validSlide} from '../lib/deck.ts';
test('drag insertion gaps preserve slide identities and original array in both directions',()=>{
 const slides=['a','b','c','d'].map(id=>({...structuredClone(initial.slides[0]),id}));
 const ids=a=>a.map(s=>s.id).join('');
 assert.equal(ids(moveSlide(slides,'a',4)),'bcda');assert.equal(ids(moveSlide(slides,'c',0)),'cabd');assert.equal(ids(moveSlide(slides,'b',3)),'acbd');
 assert.equal(ids(moveSlide(slides,'b',1)),'abcd');assert.equal(ids(moveSlide(slides,'b',2)),'abcd');assert.equal(ids(slides),'abcd');assert.equal(moveSlide(slides,'a',4)[3],slides[0]);assert.equal(moveSlide(slides,'missing',0),slides);
});
test('new blank slide retains brand background but never inherits previous content or media',()=>{
 const source={...structuredClone(initial.slides[0]),background:'/media/bg.png',media:'/media/a.gif',gallery:['/media/v.mp4']};
 const blank=blankSlide(source,'fresh');assert.equal(validSlide(blank),true);assert.equal(blank.background,source.background);assert.equal(blank.media,'');assert.deepEqual(blank.gallery,[]);assert.deepEqual(blank.points,[]);assert.equal(blank.note,'');assert.equal(blank.id,'fresh');assert.equal(source.media,'/media/a.gif');
});

test('new page is empty with no opening layout or hidden placeholder modules',()=>{
 const s=blankSlide(undefined,'new');assert.equal(s.title,'');assert.deepEqual(s.content.items,[]);assert.equal(s.content.presentation.layout,'auto');assert.ok(isBlankSlide(s));assert.ok(validSlide(s));
 s.content.items.push({id:'r',title:'原稿',body:'参考',detail:'',placement:'detail'});assert.ok(isBlankSlide(s));s.title='一个观点';assert.equal(isBlankSlide(s),false);
});
test('blank presentation does not leak editor instructions or trigger a cover renderer',async()=>{const {createServer}=await import('vite');const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});try{const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx');const html=renderToStaticMarkup(React.createElement(Scene,{s:blankSlide(undefined,'blank'),presenting:true}));assert.ok(html.includes('empty-slide'));assert.ok(html.includes('background:#fff')); assert.ok(!html.includes('Codex'));assert.ok(!html.includes('comic-opening'));}finally{await vite.close()}});
