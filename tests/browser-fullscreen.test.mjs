import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initBrowserFullscreen} from '../lib/browser-fullscreen.ts';
function fixture(install=initBrowserFullscreen,webkit=false){
 const doc=new EventTarget(),button=new EventTarget(),notice={textContent:''};
 button.attrs={};button.setAttribute=(name,value)=>button.attrs[name]=value;
 const root={ownerDocument:doc,querySelector:selector=>selector==='[data-player-fullscreen]'?button:notice};
 let enters=0,exits=0;
 const enter=()=>{enters++;doc[webkit?'webkitFullscreenElement':'fullscreenElement']=root;doc.dispatchEvent(new Event(webkit?'webkitfullscreenchange':'fullscreenchange'));return webkit?undefined:Promise.resolve();};
 const exit=()=>{exits++;doc[webkit?'webkitFullscreenElement':'fullscreenElement']=null;doc.dispatchEvent(new Event(webkit?'webkitfullscreenchange':'fullscreenchange'));return webkit?undefined:Promise.resolve();};
 root[webkit?'webkitRequestFullscreen':'requestFullscreen']=enter;
 doc[webkit?'webkitExitFullscreen':'exitFullscreen']=exit;
 const cleanup=install(root);
 return {doc,root,button,notice,cleanup,counts:()=>({enters,exits}),click:()=>button.dispatchEvent(new Event('click'))};
}
const settled=()=>new Promise(resolve=>setImmediate(resolve));
test('fullscreen enters synchronously from the click, toggles exit and tracks native Escape',async()=>{
 const f=fixture();assert.equal(f.button.textContent,'全屏');f.click();assert.equal(f.doc.fullscreenElement,f.root,'request must use the original user activation');f.click();assert.deepEqual(f.counts(),{enters:1,exits:0},'ignore double taps while pending');await settled();assert.equal(f.button.textContent,'退出全屏');assert.equal(f.button.attrs['aria-pressed'],'true');
 f.click();await settled();assert.equal(f.doc.fullscreenElement,null);assert.equal(f.button.textContent,'全屏');
 f.click();await settled();f.doc.fullscreenElement=null;f.doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(f.button.textContent,'全屏');assert.equal(f.button.attrs['aria-pressed'],'false');f.cleanup();
});
test('legacy WebKit void-returning fullscreen methods work in a serialized export',async()=>{
 // Standalone HTML serializes this function: no module bindings may leak into it.
 const install=vm.runInNewContext('('+initBrowserFullscreen.toString()+')');const f=fixture(install,true);
 f.click();await settled();assert.equal(f.doc.webkitFullscreenElement,f.root);assert.equal(f.button.textContent,'退出全屏');f.click();await settled();assert.equal(f.doc.webkitFullscreenElement,null);f.cleanup();
});
test('fullscreen rejection or an unsupported browser gives a usable notice and allows retry',async()=>{
 const f=fixture();const enter=f.root.requestFullscreen;delete f.root.requestFullscreen;f.click();assert.match(f.notice.textContent,/浏览器.*全屏/);assert.deepEqual(f.counts(),{enters:0,exits:0});
 f.root.requestFullscreen=()=>Promise.reject(new Error('denied'));f.click();await settled();assert.match(f.notice.textContent,/浏览器.*全屏/);assert.equal(f.button.textContent,'全屏');
 f.root.requestFullscreen=()=>{throw new Error('denied')};f.click();assert.match(f.notice.textContent,/浏览器.*全屏/);
 f.root.requestFullscreen=enter;f.click();await settled();assert.equal(f.notice.textContent,'');assert.equal(f.button.textContent,'退出全屏');f.cleanup();
});
test('cleanup removes handlers and only exits fullscreen owned by this player',async()=>{
 const f=fixture();f.doc.fullscreenElement={};f.cleanup();f.click();assert.deepEqual(f.counts(),{enters:0,exits:0});
 const g=fixture();g.click();await settled();g.cleanup();assert.deepEqual(g.counts(),{enters:1,exits:1});g.click();assert.deepEqual(g.counts(),{enters:1,exits:1});
});
