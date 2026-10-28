import test from 'node:test';
import assert from 'node:assert/strict';
import {initGallery} from '../lib/gallery.ts';

function setup(initialize=initGallery,autoplay=false,video=false,options={}){
 const listeners=new Map(),doc=new EventTarget(),scene=new EventTarget();doc.hidden=false;
 const play={attrs:{},setAttribute(k,v){this.attrs[k]=v}},track={style:{}},counts=[{}],large={};
 const images=[0,1,2].map(i=>{const frame={setAttribute(){},hidden:false,inert:false};return {src:i+'.png',tagName:video&&i===1?'VIDEO':'IMG',pause(){this.paused=true},closest(){return frame},frame}});
 const dialog={open:false,classList:{toggle(){}},addEventListener(){},removeEventListener(){},querySelector:s=>s==='img'?large:null,showModal(){this.open=true},close(){this.open=false}};
 const root={dataset:{carousel:'true',gallerySeconds:String(options.seconds??4),galleryAutoplay:String(autoplay)},ownerDocument:doc,closest:()=>scene,querySelectorAll:s=>s.includes('img')?images:counts,querySelector:s=>s==='dialog'?dialog:s==='.gallery-track'?track:s==='[data-gallery="play"]'&&options.controls!==false?play:null,addEventListener:(t,f)=>{if(!listeners.has(t))listeners.set(t,new Set());listeners.get(t).add(f)},removeEventListener:(t,f)=>{listeners.get(t)?.delete(f);if(!listeners.get(t)?.size)listeners.delete(t)}};
 const fire=(type,extra={})=>{const e={stopPropagation(){this.stopped=true},preventDefault(){this.prevented=true},target:{closest:()=>null},...extra};for(const f of listeners.get(type)||[])f(e);return e};
 const clean=initialize(root),click=action=>fire('click',{target:{closest:s=>s==='[data-gallery]'?{dataset:{gallery:action}}:null}});
 return {clean,click,fire,listeners,doc,scene,play,track,counts,images,dialog,large};
}
test('carousel is manual by default; auto advance, user interruption and cleanup are shared with export',t=>{
 t.mock.timers.enable({apis:['setInterval']});
 for(const init of [initGallery,new Function('return '+initGallery.toString())()]){
  const f=setup(init);t.mock.timers.tick(4000);assert.equal(f.counts[0].textContent,'1 / 3');f.click('play');assert.equal(f.play.attrs['aria-pressed'],'true');t.mock.timers.tick(4000);assert.equal(f.counts[0].textContent,'2 / 3');assert.equal(f.track.style.transform,'translateX(-100%)');assert.equal(f.images[0].frame.inert,true);assert.equal(f.images[1].frame.inert,false);
  f.click('next');assert.equal(f.counts[0].textContent,'3 / 3');assert.equal(f.play.attrs['aria-pressed'],'false');t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'3 / 3');
  f.click('play');f.click('open');assert.equal(f.dialog.open,true);t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'3 / 3');f.clean();assert.equal(f.play.attrs['aria-pressed'],'false');
 }
});
test('button-free carousel honors a custom fractional interval and swipes in the main and enlarged view',t=>{
 t.mock.timers.enable({apis:['setInterval','Date'],now:1000});
 for(const init of [initGallery,new Function('return '+initGallery.toString())()]){
  const f=setup(init,true,false,{seconds:2.5,controls:false});t.mock.timers.tick(2499);assert.equal(f.counts[0].textContent,'1 / 3');t.mock.timers.tick(1);assert.equal(f.counts[0].textContent,'2 / 3');
  const drag=(from,to)=>{f.fire('pointerdown',{pointerType:'mouse',button:0,pointerId:1,clientX:from,clientY:100});f.fire('pointermove',{pointerId:1,clientX:to,clientY:100});return f.fire('pointerup',{pointerId:1,clientX:to,clientY:100})};
  assert.ok(drag(200,100).prevented);assert.equal(f.counts[0].textContent,'3 / 3');f.click('open');assert.equal(f.dialog.open,false,'a completed drag must not also open the image');t.mock.timers.tick(10000);assert.equal(f.counts[0].textContent,'3 / 3','manual drag pauses automatic advance');
  f.click('open');assert.equal(f.dialog.open,true);drag(100,200);assert.equal(f.large.src,'1.png');assert.equal(f.dialog.open,true);f.click('open');assert.equal(f.dialog.open,true);f.clean();assert.equal(f.listeners.size,0);
 }
});
test('touch pointers do not double-advance; horizontal wheel inertia switches once and vertical or cancelled gestures are ignored',t=>{
 t.mock.timers.enable({apis:['Date'],now:1000});const f=setup(initGallery,false,false,{controls:false});
 f.fire('pointerdown',{pointerType:'touch',button:0,pointerId:2,clientX:200,clientY:100});f.fire('touchstart',{touches:[{clientX:200,clientY:100}]});f.fire('pointerup',{pointerId:2,clientX:100,clientY:100});f.fire('touchend',{changedTouches:[{clientX:100,clientY:100}]});assert.equal(f.counts[0].textContent,'2 / 3');
 f.fire('pointerdown',{pointerType:'mouse',button:0,pointerId:3,clientX:200,clientY:100});f.fire('pointermove',{pointerId:3,clientX:100,clientY:100});f.fire('pointercancel');f.fire('pointerup',{pointerId:3,clientX:100,clientY:100});assert.equal(f.counts[0].textContent,'2 / 3');
 const first=f.fire('wheel',{deltaX:60,deltaY:0,deltaMode:0});assert.ok(first.prevented);f.fire('wheel',{deltaX:60,deltaY:0,deltaMode:0});assert.equal(f.counts[0].textContent,'3 / 3');t.mock.timers.tick(201);f.fire('wheel',{deltaX:-60,deltaY:0,deltaMode:0});assert.equal(f.counts[0].textContent,'2 / 3');
 assert.equal(f.fire('wheel',{deltaX:2,deltaY:80,deltaMode:0}).prevented,undefined);assert.equal(f.fire('wheel',{deltaX:80,deltaY:0,deltaMode:0,ctrlKey:true}).prevented,undefined);assert.equal(f.counts[0].textContent,'2 / 3');f.clean();
});
test('page leave, backgrounding and video frames pause the timer without playing video',t=>{
 t.mock.timers.enable({apis:['setInterval']});const f=setup(initGallery,true);t.mock.timers.tick(4000);assert.equal(f.counts[0].textContent,'2 / 3');f.scene.dispatchEvent(new Event('presentation-leave'));t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'2 / 3');f.scene.dispatchEvent(new Event('presentation-reset'));assert.equal(f.counts[0].textContent,'1 / 3');f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'1 / 3');f.clean();
 const v=setup(initGallery,true,true);t.mock.timers.tick(4000);assert.equal(v.counts[0].textContent,'2 / 3');assert.equal(v.play.attrs['aria-pressed'],'false');t.mock.timers.tick(8000);assert.equal(v.counts[0].textContent,'2 / 3');assert.equal(v.images[1].paused,true);v.clean();
});
