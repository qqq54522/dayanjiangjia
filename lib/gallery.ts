/** Shared DOM behaviour for the editor, player and self-contained HTML exports. */
export function initGallery(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement|HTMLVideoElement>('.gallery-frame img, .gallery-frame video'));
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const enlarged = dialog.querySelector<HTMLImageElement>('img')!;
  const enlargedVideo = dialog.querySelector<HTMLVideoElement>('video');
  const isVideo = (el: Element) => el.tagName === 'VIDEO';
  const pause = () => images.forEach(el=>{if(isVideo(el))(el as HTMLVideoElement).pause()});
  const syncModal = () => {
    const current=images[index],video=isVideo(current);
    enlarged.hidden=video;
    if(enlargedVideo){enlargedVideo.pause();enlargedVideo.hidden=!video;}
    dialog.classList.toggle('showing-video',video);
    const collapse=dialog.querySelector<HTMLElement>('.video-collapse');if(collapse)collapse.hidden=!video;
    if(video&&enlargedVideo){const v=current as HTMLVideoElement;enlargedVideo.src=v.src;enlargedVideo.currentTime=v.currentTime;enlargedVideo.muted=v.muted;}
    else enlarged.src=current.src;
  };
  let index = 0;
  let start: {x:number;y:number}|null = null;
  let suppressClickUntil = 0;
  const show = (delta: number) => {
    pause();enlargedVideo?.pause();
    index = (index + delta + images.length) % images.length;
    images.forEach((img, i) => {img.hidden = i !== index;const item=img.closest?.<HTMLElement>('.media-item');if(item)item.hidden=i!==index});
    root.querySelectorAll('.gallery-count').forEach(el => el.textContent = `${index + 1} / ${images.length}`);
    if (dialog.open) syncModal();
  };
  const click = (event: Event) => {
    event.stopPropagation();
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    const button = (event.target as Element).closest<HTMLElement>('[data-gallery]');
    if (!button) {
      if (dialog.open && !isVideo(images[index]) && !(event.target as Element).closest('.gallery-controls')) dialog.close();
      return;
    }
    const action = button.dataset.gallery;
    if (action === 'open') { pause();syncModal();dialog.showModal(); }
    if (action === 'replay'&&isVideo(images[index])) {const v=images[index] as HTMLVideoElement;v.currentTime=0;v.play().catch(()=>{});}
    if (action === 'close') {closeVideo();dialog.close();}
    if (action === 'prev') show(-1);
    if (action === 'next') show(1);
  };
  let lastTap={time:0,x:0,y:0},lastToggle=0;
  const toggleVideo=(e:Event)=>{if(!(e.target as Element)?.closest?.('video'))return;e.stopPropagation();e.preventDefault();if(Date.now()-lastToggle<450)return;lastToggle=Date.now();if(dialog.open){closeVideo();dialog.close()}else{pause();syncModal();dialog.showModal()}};
  let touchDown:{x:number;y:number}|null=null;
  const videoDown=(e:PointerEvent)=>{if(e.pointerType==='touch'&&(e.target as Element)?.closest?.('video'))touchDown={x:e.clientX,y:e.clientY};else touchDown=null;};
  const videoUp=(e:PointerEvent)=>{if(!touchDown||e.pointerType!=='touch')return;const moved=Math.hypot(e.clientX-touchDown.x,e.clientY-touchDown.y);touchDown=null;if(moved>12){lastTap.time=0;return}const now=Date.now();if(now-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){toggleVideo(e);lastTap.time=0}else lastTap={time:now,x:e.clientX,y:e.clientY};};
  const videoCancel=()=>{touchDown=null;lastTap.time=0};
  root.addEventListener('dblclick',toggleVideo);
  root.addEventListener('pointerdown',videoDown);
  root.addEventListener('pointerup',videoUp);
  root.addEventListener('pointercancel',videoCancel);
  const keys = (event: KeyboardEvent) => {
    event.stopPropagation();
    if((event.target as Element)?.closest?.('video'))return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); show(event.key === 'ArrowLeft' ? -1 : 1);
    }
  };
  const begin = (e: TouchEvent) => {
    e.stopPropagation();
    if((e.target as Element)?.closest?.('video')){start=null;return;}
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
  const closeVideo=()=>{if(enlargedVideo&&!enlargedVideo.hidden){const v=images[index] as HTMLVideoElement;v.currentTime=enlargedVideo.currentTime;v.muted=enlargedVideo.muted;enlargedVideo.pause();}};
  const onError=(e:Event)=>{const msg=(e.target as Element).parentElement?.querySelector<HTMLElement>('.video-error');if(msg)msg.hidden=false;};
  // Native controls may dispatch a queued play event after a fast tap on Close.
  const onPlay=(e:Event)=>{const v=e.target as HTMLVideoElement;if(v===enlargedVideo?!dialog.open:!!v.closest<HTMLElement>('.media-item')?.hidden)v.pause();};
  root.addEventListener('error',onError,true);
  root.addEventListener('play',onPlay,true);
  dialog.addEventListener('close',closeVideo);
  dialog.addEventListener('cancel',closeVideo);
  show(0);
  return () => { root.removeEventListener('dblclick',toggleVideo);root.removeEventListener('pointerdown',videoDown);root.removeEventListener('pointerup',videoUp);root.removeEventListener('pointercancel',videoCancel);pause();enlargedVideo?.pause();dialog.close();dialog.removeEventListener('close',closeVideo);dialog.removeEventListener('cancel',closeVideo);root.removeEventListener('play',onPlay,true);root.removeEventListener('error',onError,true);root.removeEventListener('click', click); root.removeEventListener('keydown', keys); root.removeEventListener('touchstart', begin); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', cancel); };
}
