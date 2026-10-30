import test from 'node:test';import assert from 'node:assert/strict';
import {playerFixture,Node} from './fixtures.mjs';
const emit=(host,type,fields={})=>{const e=new Event(type,{cancelable:true});for(const [k,v] of Object.entries(fields))Object.defineProperty(e,k,{value:v});host.dispatchEvent(e);return e;};
test('filmstrip starts closed, blank taps and the page counter toggle it without changing page',()=>{
 const f=playerFixture(),rail=f.controls['.play-thumbnails'],slot=f.controls['.play-stage-slot'],toggle=f.controls['[data-thumbnails-toggle]'];try{
 assert.equal(rail.hidden,true);slot.click();assert.equal(rail.hidden,false);assert.equal(toggle.attrs['aria-expanded'],'true');slot.click();assert.equal(rail.hidden,true);assert.equal(toggle.attrs['aria-expanded'],'false');toggle.click();assert.equal(rail.hidden,false);f.root.children['[data-play-page]'][1].click();assert.equal(f.controls['.play-count'].textContent,'2 / 2');assert.equal(rail.hidden,false);slot.click();assert.equal(rail.hidden,true);assert.equal(f.controls['.play-count'].textContent,'2 / 2');
 }finally{f.cleanup()}
});
test('card, media, popup, text and prevented clicks cannot change filmstrip visibility',()=>{
 const f=playerFixture(),rail=f.controls['.play-thumbnails'],slot=f.controls['.play-stage-slot'];try{
 for(const selector of ['button','img','video','[data-content-step]','[data-focus-item]','dialog','.free-node','.content-item','.play-clip-overlay','h1']){const target=new Node();target.closest=s=>s.split(',').includes(selector)?target:null;emit(slot,'click',{target});assert.equal(rail.hidden,true,selector);}
 const copy=new Node();copy.childNodes=[{nodeType:3,textContent:'Visible copy'}];emit(slot,'click',{target:copy});assert.equal(rail.hidden,true);
 const prevented=new Event('click',{cancelable:true});prevented.preventDefault();slot.dispatchEvent(prevented);assert.equal(rail.hidden,true);
 f.buttons[0].click();slot.click();assert.equal(rail.hidden,true,'playing clip keeps its own dismissal behaviour');assert.equal(f.overlay.hidden,false);f.controls['[data-clip-return]'].click();assert.equal(rail.hidden,true);slot.click();assert.equal(rail.hidden,false);
 }finally{f.cleanup()}
});
test('a tablet swipe changes page without the following synthetic click opening filmstrip',t=>{
 let now=1000;t.mock.method(Date,'now',()=>now);const f=playerFixture(),slot=f.controls['.play-stage-slot'],rail=f.controls['.play-thumbnails'];try{
 emit(slot,'touchstart',{touches:[{clientX:200,clientY:150}]});emit(slot,'touchend',{changedTouches:[{clientX:100,clientY:150}]});assert.equal(f.controls['.play-count'].textContent,'2 / 2');slot.click();assert.equal(rail.hidden,true);now+=401;slot.click();assert.equal(rail.hidden,false);
 }finally{f.cleanup()}
});

test('clicking or keyboard-selecting thumbnails keeps the horizontal position, even at a clipped edge',()=>{
 const f=playerFixture(67),rail=f.controls['.play-thumbnails'],thumbs=f.root.children['[data-play-page]'];try{
  f.controls['[data-thumbnails-toggle]'].click();rail.scrollLeft=500;
  thumbs[7].click();assert.equal(f.controls['.play-count'].textContent,'8 / 67');assert.equal(thumbs[7].attrs['aria-current'],'page');assert.equal(rail.scrollLeft,500);
  thumbs[3].click();assert.equal(f.controls['.play-count'].textContent,'4 / 67');assert.equal(rail.scrollLeft,500,'a partially clipped clicked thumbnail must not move');
  emit(thumbs[8],'keydown',{key:'Enter'});assert.equal(f.controls['.play-count'].textContent,'9 / 67');assert.equal(rail.scrollLeft,500);
  emit(thumbs[7],'keydown',{key:' '});assert.equal(f.controls['.play-count'].textContent,'8 / 67');assert.equal(rail.scrollLeft,500);
  f.buttons[0].click();rail.scrollLeft=1400;thumbs[11].click();assert.equal(f.overlay.hidden,true);assert.equal(f.controls['.play-count'].textContent,'12 / 67');assert.equal(rail.scrollLeft,1400,'selecting a page while a clip plays must preserve the current browsing position');
 }finally{f.cleanup()}
});
test('previous/next and reopening only reveal an offscreen active thumbnail by the minimum distance',()=>{
 const f=playerFixture(67),rail=f.controls['.play-thumbnails'],thumbs=f.root.children['[data-play-page]'];try{
  f.controls['[data-thumbnails-toggle]'].click();rail.scrollLeft=500;thumbs[7].click();
  f.controls['[data-player-next]'].click();assert.equal(rail.scrollLeft,500,'already visible next page stays in place');
  f.controls['[data-player-next]'].click();assert.equal(rail.scrollLeft,9*145+136-rail.clientWidth,'reveal at right edge without centering');
  thumbs[3].click();f.controls['[data-player-prev]'].click();assert.equal(rail.scrollLeft,2*145,'reveal at left edge without centering');
  f.controls['[data-thumbnails-toggle]'].click();const before=rail.scrollLeft;thumbs[30].click();assert.equal(rail.scrollLeft,before,'hidden rail does not scroll');
  f.controls['[data-thumbnails-toggle]'].click();assert.equal(rail.scrollLeft,30*145+136-rail.clientWidth);
 }finally{f.cleanup()}
});
