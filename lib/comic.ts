/** Fit titles and variable-length copy within their reserved regions, including offline export. */
export function initComic(scene:HTMLElement){
 if(!scene.classList.contains('comic-default')||scene.classList.contains('semantic-scene'))return;
 let active=true;
 const media=scene.querySelector<HTMLImageElement|HTMLVideoElement>('.scene-media img,.scene-media video');
 const orient=()=>{if(!active||!media)return;const w=media instanceof HTMLVideoElement?media.videoWidth:media.naturalWidth,h=media instanceof HTMLVideoElement?media.videoHeight:media.naturalHeight;if(w&&h)scene.dataset.orientation=h>w*1.15?'portrait':w>h*1.15?'landscape':'square'};
 media?.addEventListener('load',orient);media?.addEventListener('loadedmetadata',orient);orient();
 function fit(){if(!active||!scene.clientWidth)return;
  for(const selector of ['.comic-title','.comic-opening h1']){const box=scene.querySelector<HTMLElement>(selector);if(!box)continue;const text=box.querySelector<HTMLElement>('span');if(!text)continue;text.style.fontSize='';let size=parseFloat(getComputedStyle(text).fontSize);for(let i=0;i<100&&(box.scrollHeight>box.clientHeight+1||box.scrollWidth>box.clientWidth+1);i++){size*=.95;text.style.fontSize=size+'px'}}
  const copy=scene.querySelector<HTMLElement>('.comic-text');if(copy){copy.style.setProperty('--copy-scale','1');let scale=1;for(let i=0;i<100&&(copy.scrollHeight>copy.clientHeight+1||copy.scrollWidth>copy.clientWidth+1);i++){scale*=.95;copy.style.setProperty('--copy-scale',String(scale))}}
 }
 const observer=new ResizeObserver(fit);observer.observe(scene);document.fonts.ready.then(fit);fit();return()=>{active=false;observer.disconnect();media?.removeEventListener('load',orient);media?.removeEventListener('loadedmetadata',orient)};
}
