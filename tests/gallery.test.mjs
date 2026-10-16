import test from 'node:test';
import assert from 'node:assert/strict';
import {initGallery} from '../lib/gallery.ts';
function fixture(){
 const images=[{src:'one.gif'},{src:'two.png'},{src:'three.png'}],counts=[{},{}],large={};
 const dialog={open:false,classList:{toggle(){}},addEventListener(){},removeEventListener(){},querySelector:s=>s==='img'?large:null,showModal(){this.open=true},close(){this.open=false}};
 const listeners=new Map();
 const root={querySelectorAll:s=>s.includes('img')?images:counts,querySelector:()=>dialog,addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t)};
 const clean=initGallery(root);
 const fire=(type,extra={})=>{const e={stopPropagation(){this.stopped=true},preventDefault(){this.prevented=true},...extra};listeners.get(type)?.(e);return e};
 const tap=action=>fire('click',{target:{closest:s=>s==='[data-gallery]'&&action?{dataset:{gallery:action}}:null}});
 const swipe=(dx,dy=0)=>{fire('touchstart',{touches:[{clientX:150,clientY:100}]});return fire('touchend',{changedTouches:[{clientX:150+dx,clientY:100+dy}]})};
 return {images,counts,large,dialog,clean,listeners,fire,tap,swipe};
}
test('image tap opens and large-image tap closes; controls preserve modal and wrap',()=>{
 const f=fixture();f.tap('open');assert.equal(f.large.src,'one.gif');assert.ok(f.dialog.open);
 f.tap('next');assert.equal(f.large.src,'two.png');assert.ok(f.dialog.open);
 f.tap('prev');f.tap('prev');assert.equal(f.large.src,'three.png');
 f.tap();assert.equal(f.dialog.open,false);f.clean();assert.equal(f.listeners.size,0);
});
test('horizontal swipe changes only gallery and suppresses following synthetic click',()=>{
 const f=fixture();f.tap('open');const e=f.swipe(-90);
 assert.equal(f.large.src,'two.png');assert.equal(f.counts[0].textContent,'2 / 3');assert.ok(e.stopped);assert.ok(e.prevented);
 f.tap();assert.ok(f.dialog.open,'swipe must not immediately close enlarged image');f.clean();
});
test('vertical gestures and cancelled/multitouch gestures do not switch images',()=>{
 const f=fixture();f.swipe(-15,120);assert.equal(f.counts[0].textContent,'1 / 3');
 f.fire('touchstart',{touches:[{clientX:100,clientY:0}]});f.fire('touchcancel');f.fire('touchend',{changedTouches:[{clientX:0,clientY:0}]});
 f.fire('touchstart',{touches:[{clientX:100,clientY:0},{clientX:80,clientY:0}]});f.fire('touchend',{changedTouches:[{clientX:0,clientY:0}]});
 assert.equal(f.counts[0].textContent,'1 / 3');f.clean();
});
