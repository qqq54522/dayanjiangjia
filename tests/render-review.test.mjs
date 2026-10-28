import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectScene,reviewReady} from '../lib/render-review.ts';

const rect=(left=0,top=0,right=100,bottom=100)=>({left,top,right,bottom,width:right-left,height:bottom-top});
const frame=bounds=>({getBoundingClientRect:()=>bounds});
const node=(overrides={})=>({
 closest:()=>null,parentElement:null,getClientRects:()=>[1],getBoundingClientRect:()=>rect(),
 textContent:'关键数字',className:'content-body',clientWidth:100,clientHeight:100,scrollWidth:100,scrollHeight:100,matches:()=>false,...overrides
});
const scene=(els,bounds=rect(0,0,1280,720))=>({getBoundingClientRect:()=>bounds,querySelectorAll:selector=>selector.startsWith('.scene-media img')?[]:els});

test('review blocks unmeasured pages and text clipped within its own box',()=>{
 assert.match(inspectScene(scene([],rect(0,0,0,0)))[0],/尚未完成/);
 assert.deepEqual(inspectScene(scene([node()])),[]);
 assert.match(inspectScene(scene([node({scrollHeight:150})]))[0],/被裁切/);
 assert.deepEqual(inspectScene(scene([node({closest:()=>({}),scrollHeight:150})])),[]);
});

test('visible content must stay inside its card on all four sides, even within the slide',()=>{
 const card=frame(rect(100,100,300,300));
 const item=bounds=>node({getBoundingClientRect:()=>bounds,parentElement:{closest:()=>card}});
 assert.deepEqual(inspectScene(scene([item(rect(110,110,290,290))])),[]);
 for(const [bounds,edge] of [[rect(94,110,290,290),'左'],[rect(110,94,290,290),'上'],[rect(110,110,306,290),'右'],[rect(110,110,290,306),'下']]){
  assert.match(inspectScene(scene([item(bounds)]))[0],new RegExp(`所属内容框的${edge}边界`));
 }
});

test('a content frame outside the 16:9 slide is rejected',()=>{
 const item=node({getBoundingClientRect:()=>rect(1000,600,1290,730)});
 assert.match(inspectScene(scene([item]))[0],/右、下边界/);
});

test('media frame must fit, while an intentionally cropped source image is not measured as overflow',()=>{
 const card=frame(rect(100,100,300,300));
 const media=node({textContent:'',className:'scene-media',getBoundingClientRect:()=>rect(120,120,320,250),parentElement:{closest:()=>card}});
 assert.match(inspectScene(scene([media]))[0],/素材.*右边界/);
 const image=node({tagName:'IMG',complete:false,naturalWidth:0});
 const pending=scene([]);pending.querySelectorAll=selector=>selector.startsWith('.scene-media img')?[image]:[];
 assert.match(inspectScene(pending)[0],/尚未加载完成/);
 image.complete=true;
 assert.match(inspectScene(pending)[0],/未能加载/);
});

test('small media previews ignore rounding gaps and never report hidden zoom controls as content',()=>{
 const previous=globalThis.getComputedStyle;
 globalThis.getComputedStyle=()=>({overflowX:'visible',overflowY:'visible'});
 try{
  const bounds=rect(0,0,300,169),media=node({className:'scene-media gallery',textContent:'退出放大',getBoundingClientRect:()=>bounds,clientWidth:300,scrollWidth:300,clientHeight:169,scrollHeight:172,matches:selector=>selector.includes('.scene-media')});
  assert.deepEqual(inspectScene(scene([media],bounds)),[]);
  media.scrollHeight=178;
  assert.match(inspectScene(scene([media],bounds))[0],/素材.*裁切或延伸越界/);
  assert.doesNotMatch(inspectScene(scene([media],bounds))[0],/退出放大/);
 }finally{if(previous)globalThis.getComputedStyle=previous;else delete globalThis.getComputedStyle}
});

test('a generated group cannot be accepted before every page has a clean measurement',()=>{
 const slides=[{id:'first'},{id:'second'}];
 assert.equal(reviewReady(slides,{}),false);
 assert.equal(reviewReady(slides,{first:[]}),false);
 assert.equal(reviewReady(slides,{first:[],second:['越界']}),false);
 assert.equal(reviewReady(slides,{first:[],second:[]}),true);
 assert.equal(reviewReady([],{}),false);
});
