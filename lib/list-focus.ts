/** Presentation-only focus; no manuscript changes. Kept self-contained for offline HTML. */
export function initListFocus(scene:HTMLElement){
 const items=Array.from(scene.querySelectorAll<HTMLElement>('[data-focus-item]'));
 if(!items.length)return;
 let start:{x:number;y:number}|null=null,moved=false;
 const choose=(index:number)=>items.forEach((item,i)=>{item.dataset.active=String(i===index);item.setAttribute('aria-pressed',String(i===index))});
 const reset=()=>choose(0);reset();
 const handlers=items.map((item,index)=>{
  item.setAttribute('role','button');item.tabIndex=0;
  const down=(e:PointerEvent)=>{start={x:e.clientX,y:e.clientY};moved=false};
  const move=(e:PointerEvent)=>{if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>12)moved=true};
  const cancel=()=>{moved=true;start=null};
  const click=(e:MouseEvent)=>{e.stopPropagation();if(!moved)choose(index);moved=false;start=null};
  const key=(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();choose(index)}};
  item.addEventListener('pointerdown',down);item.addEventListener('pointermove',move);item.addEventListener('pointercancel',cancel);item.addEventListener('click',click);item.addEventListener('keydown',key);
  return()=>{item.removeEventListener('pointerdown',down);item.removeEventListener('pointermove',move);item.removeEventListener('pointercancel',cancel);item.removeEventListener('click',click);item.removeEventListener('keydown',key);item.removeAttribute('role');item.removeAttribute('tabindex')};
 });
 scene.addEventListener('presentation-reset',reset);
 return()=>{handlers.forEach(clean=>clean());scene.removeEventListener('presentation-reset',reset)};
}
