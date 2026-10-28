/** Shared DOM behaviour for the editor, player and self-contained HTML exports. */
export function initGallery(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement|HTMLVideoElement>('.gallery-frame img, .gallery-frame video'));
  const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
  const enlarged = dialog.querySelector<HTMLImageElement>('img')!;
  const enlargedVideo = dialog.querySelector<HTMLVideoElement>('video');
  const track=root.dataset?.carousel==='true'?root.querySelector<HTMLElement>('.gallery-track'):null;
  const playButton=root.querySelector<HTMLElement>('[data-gallery="play"]');
  const scene=root.closest?.<HTMLElement>('.scene');
  const doc=root.ownerDocument||(typeof document==='undefined'?undefined:document);
  const requestedSeconds=Number(root.dataset?.gallerySeconds);
  const seconds=Number.isFinite(requestedSeconds)&&requestedSeconds>=1&&requestedSeconds<=3600?requestedSeconds:6;
  let ticker:ReturnType<typeof setInterval>|undefined,visible=true,automatic=root.dataset?.galleryAutoplay==='true';
  const stopAuto=()=>{if(ticker)clearInterval(ticker);ticker=undefined;playButton?.setAttribute('aria-pressed','false');if(playButton)playButton.textContent='自动播放'};
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
  const show = (delta: number,manual=true) => {
    if(manual){automatic=false;stopAuto()}
    pause();enlargedVideo?.pause();
    index = (index + delta + images.length) % images.length;
    images.forEach((img, i) => {img.hidden = !track&&i !== index;const item=img.closest?.<HTMLElement>('.media-item');if(item){item.hidden=!track&&i!==index;item.inert=i!==index;item.setAttribute('aria-hidden',String(i!==index))}});
    if(track)track.style.transform=`translateX(-${index*100}%)`;
    root.querySelectorAll('.gallery-count').forEach(el => el.textContent = `${index + 1} / ${images.length}`);
    if (dialog.open) syncModal();
    if(isVideo(images[index]))stopAuto();
  };
  const startAuto=()=>{stopAuto();if(images.length<2||!visible||doc?.hidden||dialog.open||isVideo(images[index]))return;playButton?.setAttribute('aria-pressed','true');if(playButton)playButton.textContent='暂停播放';ticker=setInterval(()=>{if(!visible||doc?.hidden||dialog.open){stopAuto();return}show(1,false)},seconds*1000)};
  const click = (event: Event) => {
    event.stopPropagation();
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    const button = (event.target as Element).closest<HTMLElement>('[data-gallery]');
    if (!button) {
      if (dialog.open && !isVideo(images[index]) && !(event.target as Element).closest('.gallery-controls')) dialog.close();
      return;
    }
    const action = button.dataset.gallery;
    if (action === 'open') { automatic=false;stopAuto();pause();syncModal();dialog.showModal(); }
    if (action === 'replay'&&isVideo(images[index])) {const v=images[index] as HTMLVideoElement;v.currentTime=0;v.play().catch(()=>{});}
    if (action === 'close') {closeVideo();dialog.close();}
    if (action === 'prev') show(-1);
    if (action === 'next') show(1);
    if (action === 'play') {if(ticker){automatic=false;stopAuto()}else{automatic=true;startAuto()}}
  };
  let lastTap={time:0,x:0,y:0},lastToggle=0;
  const toggleVideo=(e:Event)=>{if(!(e.target as Element)?.closest?.('video'))return;e.stopPropagation();e.preventDefault();automatic=false;stopAuto();if(Date.now()-lastToggle<450)return;lastToggle=Date.now();if(dialog.open){closeVideo();dialog.close()}else{pause();syncModal();dialog.showModal()}};
  let touchDown:{x:number;y:number}|null=null;
  const videoDown=(e:PointerEvent)=>{if(e.pointerType==='touch'&&(e.target as Element)?.closest?.('video'))touchDown={x:e.clientX,y:e.clientY};else touchDown=null;};
  const videoUp=(e:PointerEvent)=>{if(!touchDown||e.pointerType!=='touch')return;const moved=Math.hypot(e.clientX-touchDown.x,e.clientY-touchDown.y);touchDown=null;if(moved>12){lastTap.time=0;return}const now=Date.now();if(now-lastTap.time<350&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<30){toggleVideo(e);lastTap.time=0}else lastTap={time:now,x:e.clientX,y:e.clientY};};
  const videoCancel=()=>{touchDown=null;lastTap.time=0};
  root.addEventListener('dblclick',toggleVideo,true);
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
  // Mouse/pen dragging and horizontal trackpad gestures share the touch behavior.
  // Keep touch pointers on the existing touch path so one swipe cannot advance twice.
  let drag:{id:number;x:number;y:number;moved:boolean}|null=null;
  const dragDown=(e:PointerEvent)=>{if(!track||images.length<2||e.pointerType==='touch'||e.button!==0||(e.target as Element)?.closest?.('video,[data-gallery="close"],.gallery-controls'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false}};
  const dragMove=(e:PointerEvent)=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>12)drag.moved=true;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.3){e.preventDefault();e.stopPropagation();if(!root.hasPointerCapture?.(e.pointerId))root.setPointerCapture?.(e.pointerId)}};
  const dragUp=(e:PointerEvent)=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(d.moved||Math.hypot(dx,dy)>12){suppressClickUntil=Date.now()+800;e.preventDefault();e.stopPropagation();if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)show(dx<0?1:-1)}if(root.hasPointerCapture?.(e.pointerId))root.releasePointerCapture?.(e.pointerId)};
  const dragCancel=()=>{if(drag?.moved)suppressClickUntil=Date.now()+800;drag=null};
  let wheelTime=0,wheelDistance=0,wheelSwitched=false;
  const wheel=(e:WheelEvent)=>{if(!track||images.length<2||e.ctrlKey||Math.abs(e.deltaX)<2||Math.abs(e.deltaX)<=Math.abs(e.deltaY)*1.3||(e.target as Element)?.closest?.('video'))return;e.preventDefault();e.stopPropagation();const now=Date.now();if(now-wheelTime>200){wheelDistance=0;wheelSwitched=false}wheelTime=now;wheelDistance+=e.deltaX*(e.deltaMode===1?16:e.deltaMode===2?root.clientWidth:1);if(!wheelSwitched&&Math.abs(wheelDistance)>45){wheelSwitched=true;suppressClickUntil=now+800;show(wheelDistance>0?1:-1)}};
  const preventDrag=(e:Event)=>{if(track)e.preventDefault()};
  if(track){root.addEventListener('pointerdown',dragDown);root.addEventListener('pointermove',dragMove);root.addEventListener('pointerup',dragUp);root.addEventListener('pointercancel',dragCancel);root.addEventListener('lostpointercapture',dragCancel);root.addEventListener('wheel',wheel,{passive:false});root.addEventListener('dragstart',preventDrag)}
  root.addEventListener('click', click);
  root.addEventListener('keydown', keys);
  root.addEventListener('touchstart', begin, {passive:true});
  root.addEventListener('touchmove', move, {passive:false});
  root.addEventListener('touchend', end, {passive:false});
  root.addEventListener('touchcancel', cancel);
  const closeVideo=()=>{if(enlargedVideo&&!enlargedVideo.hidden){const v=images[index] as HTMLVideoElement;v.currentTime=enlargedVideo.currentTime;v.muted=enlargedVideo.muted;enlargedVideo.pause();}};
  const onError=(e:Event)=>{const msg=(e.target as Element).parentElement?.querySelector<HTMLElement>('.video-error');if(msg)msg.hidden=false;};
  // Native controls may dispatch a queued play event after a fast tap on Close.
  const onPlay=(e:Event)=>{stopAuto();const v=e.target as HTMLVideoElement;const enclosing=v.closest?.<HTMLDialogElement>('dialog');if(enclosing&&!enclosing.open){v.pause();return;}if(v===enlargedVideo?!dialog.open:images[index]!==v)v.pause();};
  root.addEventListener('error',onError,true);
  root.addEventListener('play',onPlay,true);
  dialog.addEventListener('close',closeVideo);
  dialog.addEventListener('cancel',closeVideo);
  const visibility=()=>{if(doc?.hidden){automatic=false;stopAuto()}};
  const leave=()=>{automatic=false;stopAuto();pause()};
  const reset=()=>{show(-index,false);automatic=root.dataset?.galleryAutoplay==='true';if(automatic)startAuto()};
  let observer:IntersectionObserver|undefined;
  if(typeof IntersectionObserver!=='undefined'){visible=false;observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting||false;if(!visible)stopAuto();else if(automatic)startAuto()},{threshold:.1});observer.observe(root)}
  doc?.addEventListener('visibilitychange',visibility);scene?.addEventListener('presentation-leave',leave);scene?.addEventListener('presentation-reset',reset);
  show(0,false);if(automatic)startAuto();
  return () => { stopAuto();observer?.disconnect();dragCancel();root.removeEventListener('pointerdown',dragDown);root.removeEventListener('pointermove',dragMove);root.removeEventListener('pointerup',dragUp);root.removeEventListener('pointercancel',dragCancel);root.removeEventListener('lostpointercapture',dragCancel);root.removeEventListener('wheel',wheel);root.removeEventListener('dragstart',preventDrag);doc?.removeEventListener('visibilitychange',visibility);scene?.removeEventListener('presentation-leave',leave);scene?.removeEventListener('presentation-reset',reset);root.removeEventListener('dblclick',toggleVideo,true);root.removeEventListener('pointerdown',videoDown);root.removeEventListener('pointerup',videoUp);root.removeEventListener('pointercancel',videoCancel);pause();enlargedVideo?.pause();dialog.close();dialog.removeEventListener('close',closeVideo);dialog.removeEventListener('cancel',closeVideo);root.removeEventListener('play',onPlay,true);root.removeEventListener('error',onError,true);root.removeEventListener('click', click); root.removeEventListener('keydown', keys); root.removeEventListener('touchstart', begin); root.removeEventListener('touchmove', move); root.removeEventListener('touchend', end); root.removeEventListener('touchcancel', cancel); };
}
