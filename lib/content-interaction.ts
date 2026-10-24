/** Shared by React preview and standalone HTML. No dependencies: serialized into exports. */
export function initContent(root:HTMLElement){
 const pauseDialog=(d:HTMLDialogElement)=>d.querySelectorAll('video').forEach(v=>v.pause());
 const closeDialog=(d:HTMLDialogElement|null)=>{if(d){pauseDialog(d);d.close()}};
 const closed=(e:Event)=>pauseDialog(e.currentTarget as HTMLDialogElement);
 const click=(e:Event)=>{const t=e.target as HTMLElement;
  const close=t.closest<HTMLElement>('[data-detail-close]');if(close){e.stopPropagation();closeDialog(close.closest<HTMLDialogElement>('dialog'));return;}
  const opener=t.closest<HTMLElement>('[data-detail-open]');if(opener){e.stopPropagation();root.querySelector<HTMLDialogElement>(`dialog[data-detail="${opener.dataset.detailOpen}"]`)?.showModal();return;}
  const step=t.closest<HTMLElement>('[data-content-step]');if(step){e.stopPropagation();root.querySelectorAll<HTMLElement>('[data-content-step]').forEach(el=>{el.dataset.active=String(el===step);el.setAttribute('aria-pressed',String(el===step));});const index=step.dataset.contentStep;root.querySelectorAll<HTMLElement>('[data-step-media]').forEach(el=>{if(el.dataset.stepMedia!==index){el.querySelectorAll('video').forEach(v=>v.pause());el.hidden=true}else el.hidden=false});}
 };
 const double=(e:Event)=>{const t=(e.target as HTMLElement).closest<HTMLElement>('[data-step-detail]');if(t){e.stopPropagation();root.querySelector<HTMLDialogElement>(`dialog[data-detail="${t.dataset.stepDetail}"]`)?.showModal();}};
 const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('dialog[open]')){e.stopPropagation();}};
 const touch=(e:Event)=>{if((e.target as HTMLElement).closest('[data-content-step],[data-detail-open],dialog'))e.stopPropagation()};
 const dialogs=[...root.querySelectorAll<HTMLDialogElement>('dialog.content-detail')];
 const dismiss=(e:Event)=>{const d=e.currentTarget as HTMLDialogElement;if(e.target===d)closeDialog(d)};
 const reset=()=>{root.querySelectorAll<HTMLElement>('[data-content-step]').forEach((el,i)=>{el.dataset.active=String(i===0);el.setAttribute('aria-pressed',String(i===0))});root.querySelectorAll<HTMLElement>('[data-step-media]').forEach((el,i)=>{el.hidden=i!==0;el.querySelectorAll('video').forEach(v=>v.pause())});dialogs.forEach(d=>{if(d.open)closeDialog(d)});};
 const stop=(e:Event)=>e.stopPropagation();
 dialogs.forEach(d=>{d.addEventListener('click',dismiss);d.addEventListener('cancel',stop);d.addEventListener('close',closed);});
 root.addEventListener('presentation-reset',reset);root.addEventListener('click',click);root.addEventListener('dblclick',double);root.addEventListener('keydown',key);root.addEventListener('touchstart',touch);root.addEventListener('touchend',touch);
 return()=>{root.removeEventListener('presentation-reset',reset);root.removeEventListener('click',click);root.removeEventListener('dblclick',double);root.removeEventListener('keydown',key);root.removeEventListener('touchstart',touch);root.removeEventListener('touchend',touch);dialogs.forEach(d=>{d.removeEventListener('click',dismiss);d.removeEventListener('cancel',stop);d.removeEventListener('close',closed);if(d.open)closeDialog(d)});};
}
