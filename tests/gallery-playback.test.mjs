import test from 'node:test';
import assert from 'node:assert/strict';
import {initGallery} from '../lib/gallery.ts';

function setup(initialize=initGallery,autoplay=false,video=false){
 const listeners=new Map(),doc=new EventTarget(),scene=new EventTarget();doc.hidden=false;
 const play={attrs:{},setAttribute(k,v){this.attrs[k]=v}},track={style:{}},counts=[{}],large={};
 const images=[0,1,2].map(i=>{const frame={setAttribute(){},hidden:false,inert:false};return {src:i+'.png',tagName:video&&i===1?'VIDEO':'IMG',pause(){this.paused=true},closest(){return frame},frame}});
 const dialog={open:false,classList:{toggle(){}},addEventListener(){},removeEventListener(){},querySelector:s=>s==='img'?large:null,showModal(){this.open=true},close(){this.open=false}};
 const root={dataset:{carousel:'true',gallerySeconds:'4',galleryAutoplay:String(autoplay)},ownerDocument:doc,closest:()=>scene,querySelectorAll:s=>s.includes('img')?images:counts,querySelector:s=>s==='dialog'?dialog:s==='.gallery-track'?track:s==='[data-gallery="play"]'?play:null,addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t)};
 const clean=initialize(root),click=action=>listeners.get('click')({stopPropagation(){},target:{closest:s=>s==='[data-gallery]'?{dataset:{gallery:action}}:null}});
 return {clean,click,doc,scene,play,track,counts,images,dialog};
}
test('carousel is manual by default; auto advance, user interruption and cleanup are shared with export',t=>{
 t.mock.timers.enable({apis:['setInterval']});
 for(const init of [initGallery,new Function('return '+initGallery.toString())()]){
  const f=setup(init);t.mock.timers.tick(4000);assert.equal(f.counts[0].textContent,'1 / 3');f.click('play');assert.equal(f.play.attrs['aria-pressed'],'true');t.mock.timers.tick(4000);assert.equal(f.counts[0].textContent,'2 / 3');assert.equal(f.track.style.transform,'translateX(-100%)');assert.equal(f.images[0].frame.inert,true);assert.equal(f.images[1].frame.inert,false);
  f.click('next');assert.equal(f.counts[0].textContent,'3 / 3');assert.equal(f.play.attrs['aria-pressed'],'false');t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'3 / 3');
  f.click('play');f.click('open');assert.equal(f.dialog.open,true);t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'3 / 3');f.clean();assert.equal(f.play.attrs['aria-pressed'],'false');
 }
});
test('page leave, backgrounding and video frames pause the timer without playing video',t=>{
 t.mock.timers.enable({apis:['setInterval']});const f=setup(initGallery,true);t.mock.timers.tick(4000);assert.equal(f.counts[0].textContent,'2 / 3');f.scene.dispatchEvent(new Event('presentation-leave'));t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'2 / 3');f.scene.dispatchEvent(new Event('presentation-reset'));assert.equal(f.counts[0].textContent,'1 / 3');f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));t.mock.timers.tick(8000);assert.equal(f.counts[0].textContent,'1 / 3');f.clean();
 const v=setup(initGallery,true,true);t.mock.timers.tick(4000);assert.equal(v.counts[0].textContent,'2 / 3');assert.equal(v.play.attrs['aria-pressed'],'false');t.mock.timers.tick(8000);assert.equal(v.counts[0].textContent,'2 / 3');assert.equal(v.images[1].paused,true);v.clean();
});
