/** Self-contained: the standalone export embeds this function as well. */
export function initBrowserFullscreen(root:HTMLElement){
 type FullscreenDocument=Document&{webkitFullscreenElement?:Element|null;webkitExitFullscreen?:()=>Promise<void>|void};
 type FullscreenRoot=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
 const doc=root.ownerDocument as FullscreenDocument,button=root.querySelector<HTMLButtonElement>('[data-player-fullscreen]');
 if(!button)return ()=>{};
 const target=root as FullscreenRoot,notice=root.querySelector<HTMLElement>('.play-notice');
 let disposed=false,pending=false;
 const active=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
 const update=()=>{const full=active()===root;button.textContent=full?'退出全屏':'全屏';button.setAttribute('aria-pressed',String(full));button.title=full?'退出浏览器全屏':'进入浏览器全屏，隐藏地址栏和标签栏';};
 const fail=()=>{if(!disposed&&notice)notice.textContent='浏览器未能进入或退出全屏。请使用支持全屏的浏览器，或使用浏览器菜单中的全屏功能。';};
 const exit=()=>doc.exitFullscreen?doc.exitFullscreen():doc.webkitExitFullscreen?.();
 const click=()=>{
  if(pending)return;
  const full=active()===root;
  if(!full&&!target.requestFullscreen&&!target.webkitRequestFullscreen){fail();return;}
  pending=true;
  // Invoke synchronously in the click handler: fullscreen requires user activation.
  try{
   const result=full?exit():target.requestFullscreen?target.requestFullscreen():target.webkitRequestFullscreen!();
   Promise.resolve(result).then(()=>{if(!disposed&&notice)notice.textContent='';},fail).finally(()=>{pending=false;if(!disposed)update();});
  }catch{pending=false;fail();}
 };
 button.addEventListener('click',click);doc.addEventListener('fullscreenchange',update);doc.addEventListener('webkitfullscreenchange',update);update();
 return ()=>{disposed=true;button.removeEventListener('click',click);doc.removeEventListener('fullscreenchange',update);doc.removeEventListener('webkitfullscreenchange',update);if(active()===root)try{void Promise.resolve(exit()).catch(()=>{});}catch{}};
}
