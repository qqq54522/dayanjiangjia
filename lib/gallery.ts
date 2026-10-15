/** Shared DOM behaviour for the editor, player and self-contained HTML exports. */
export function initGallery(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>('.gallery-frame img'));
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const enlarged = dialog.querySelector<HTMLImageElement>('img')!;
  let index = 0;
  let start: {x:number;y:number}|null = null;
  let suppressClickUntil = 0;
  const show = (delta: number) => {
    index = (index + delta + images.length) % images.length;
    images.forEach((img, i) => img.hidden = i !== index);
    root.querySelectorAll('.gallery-count').forEach(el => el.textContent = `${index + 1} / ${images.length}`);
    if (dialog.open) enlarged.src = images[index].src;
  };
  const click = (event: Event) => {
    event.stopPropagation();
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    const button = (event.target as Element).closest<HTMLElement>('[data-gallery]');
    if (!button) {
      if (dialog.open && !(event.target as Element).closest('.gallery-controls')) dialog.close();
      return;
    }
    const action = button.dataset.gallery;
    if (action === 'open') { enlarged.src = images[index].src; dialog.showModal(); }
    if (action === 'close') dialog.close();
    if (action === 'prev') show(-1);
    if (action === 'next') show(1);
  };
  const keys = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };
  const begin = (e: TouchEvent) => {
    e.stopPropagation();
    start = e.touches.length === 1 ? {x:e.touches[0].clientX,y:e.touches[0].clientY} : null;
    if(e.touches.length>1)suppressClickUntil=Date.now()+800;
  };
  const move = (e: TouchEvent) => {
    e.stopPropagation();
    if(e.touches.length!==1) { start=null; return; }
    if(start && Math.abs(e.touches[0].clientX-start.x)>12) e.preventDefault();
  };
  const end = (e: TouchEvent) => {
    e.stopPropagation();
    if(!start || !e.changedTouches.length)return;
    const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;
    start=null;
    if(Math.hypot(dx,dy)>12) {
      suppressClickUntil=Date.now()+800;
      if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3) {
        e.preventDefault();
        if(images.length>1)show(dx<0?1:-1);
      }
    }
  };
  const cancel = (e: Event) => { e.stopPropagation();start=null;suppressClickUntil=Date.now()+800; };
  root.addEventListener('click', click);
  root.addEventListener('keydown', keys);
  root.addEventListener('touchstart', begin, {passive:true});
  root.addEventListener('touchmove', move, {passive:false});
  root.addEventListener('touchend', end, {passive:false});
  root.addEventListener('touchcancel', cancel);
  show(0);
  return () => { dialog.close(); root.removeEventListener('click', click); root.removeEventListener('keydown', keys); root.removeEventListener('touchstart', begin); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', cancel); };
}
