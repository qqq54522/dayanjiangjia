/** Shared by React preview and standalone HTML. No dependencies: serialized into exports. */
export function initContent(root:HTMLElement){
 const pauseDialog=(d:HTMLDialogElement)=>d.querySelectorAll('video').forEach(v=>v.pause());
 const closeDialog=(d:HTMLDialogElement|null)=>{if(d){pauseDialog(d);d.close()}};
 const closed=(e:Event)=>pauseDialog(e.currentTarget as HTMLDialogElement);
 const matrixFocus=(matrix:HTMLElement,axis:string,index:string)=>{
  matrix.dataset.focusAxis=axis;matrix.dataset.focusIndex=index;
  matrix.querySelectorAll<HTMLElement>('[data-matrix-axis]').forEach(b=>b.setAttribute('aria-pressed',String(axis!==''&&b.dataset.matrixAxis===axis&&b.dataset.matrixIndex===index)));
  matrix.querySelectorAll<HTMLElement>('[data-matrix-col]').forEach(cell=>cell.dataset.focused=String(axis==='col'&&cell.dataset.matrixCol===index||axis==='row'&&cell.closest<HTMLElement>('[data-matrix-row]')?.dataset.matrixRow===index));
  matrix.querySelectorAll<HTMLElement>('[data-matrix-row]').forEach(row=>row.dataset.focused=String(axis==='row'&&row.dataset.matrixRow===index));
 };
 const click=(e:Event)=>{const t=e.target as HTMLElement;
  const matrixButton=t.closest<HTMLElement>('[data-matrix-axis]');if(matrixButton){e.stopPropagation();const matrix=matrixButton.closest<HTMLElement>('[data-matrix]');if(matrix){const axis=matrixButton.dataset.matrixAxis||'',index=matrixButton.dataset.matrixIndex||'';matrixFocus(matrix,axis==='all'||matrix.dataset.focusAxis===axis&&matrix.dataset.focusIndex===index?'':axis,index)}return;}
  const close=t.closest<HTMLElement>('[data-detail-close]');if(close){e.stopPropagation();closeDialog(close.closest<HTMLDialogElement>('dialog'));return;}
  const opener=t.closest<HTMLElement>('[data-detail-open]');if(opener){e.stopPropagation();root.querySelector<HTMLDialogElement>(`dialog[data-detail="${opener.dataset.detailOpen}"]`)?.showModal();return;}
  const step=t.closest<HTMLElement>('[data-content-step]');if(step){e.stopPropagation();root.querySelectorAll<HTMLElement>('[data-content-step]').forEach(el=>{el.dataset.active=String(el===step);el.setAttribute('aria-pressed',String(el===step));});const index=step.dataset.contentStep;root.querySelectorAll<HTMLElement>('[data-step-media]').forEach(el=>{if(el.dataset.stepMedia!==index){el.querySelectorAll('video').forEach(v=>v.pause());el.hidden=true}else el.hidden=false});}
 };
 const double=(e:Event)=>{const t=(e.target as HTMLElement).closest<HTMLElement>('[data-step-detail]');if(t){e.stopPropagation();root.querySelector<HTMLDialogElement>(`dialog[data-detail="${t.dataset.stepDetail}"]`)?.showModal();}};
 const key=(e:KeyboardEvent)=>{const target=e.target as HTMLElement;if(target.closest('dialog[open]')){e.stopPropagation();return}const opener=target.closest<HTMLElement>('[data-detail-open]');if(opener&&opener.tagName!=='BUTTON'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();root.querySelector<HTMLDialogElement>(`dialog[data-detail="${opener.dataset.detailOpen}"]`)?.showModal()}};
 const touch=(e:Event)=>{if((e.target as HTMLElement).closest('[data-content-step],[data-detail-open],[data-matrix-axis],dialog'))e.stopPropagation()};
 const dialogs=[...root.querySelectorAll<HTMLDialogElement>('dialog.content-detail')];
 const dismiss=(e:Event)=>{const d=e.currentTarget as HTMLDialogElement;if(e.target===d)closeDialog(d)};
 const reset=()=>{root.querySelectorAll<HTMLElement>('[data-matrix]').forEach(m=>matrixFocus(m,'','')); root.querySelectorAll<HTMLElement>('[data-content-step]').forEach((el,i)=>{const active=!el.classList?.contains('content-focus-hit')&&i===0;el.dataset.active=String(active);el.setAttribute('aria-pressed',String(active))});root.querySelectorAll<HTMLElement>('[data-step-media]').forEach((el,i)=>{el.hidden=i!==0;el.querySelectorAll('video').forEach(v=>v.pause())});dialogs.forEach(d=>{if(d.open)closeDialog(d)});};
 const stop=(e:Event)=>e.stopPropagation();
 dialogs.forEach(d=>{d.addEventListener('click',dismiss);d.addEventListener('cancel',stop);d.addEventListener('close',closed);});
 root.addEventListener('presentation-reset',reset);root.addEventListener('click',click);root.addEventListener('dblclick',double);root.addEventListener('keydown',key);root.addEventListener('touchstart',touch);root.addEventListener('touchend',touch);
 return()=>{root.removeEventListener('presentation-reset',reset);root.removeEventListener('click',click);root.removeEventListener('dblclick',double);root.removeEventListener('keydown',key);root.removeEventListener('touchstart',touch);root.removeEventListener('touchend',touch);dialogs.forEach(d=>{d.removeEventListener('click',dismiss);d.removeEventListener('cancel',stop);d.removeEventListener('close',closed);if(d.open)closeDialog(d)});};
}
