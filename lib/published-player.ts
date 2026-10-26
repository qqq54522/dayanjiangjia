// Included as source in the published HTML, so keep it self-contained.
export function wakePublishedPage(page:Element){
 page.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach(image=>{image.loading='eager'});
 page.querySelectorAll<HTMLVideoElement>('video').forEach(video=>{
  if(video.closest('dialog'))return;
  if(video.classList.contains('video-thumbnail')){
   const cue=()=>{if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=Math.min(.1,video.duration/2)};
   if(video.readyState>=1)cue();else video.addEventListener('loadedmetadata',cue,{once:true});
  }
  if(video.preload==='none'){video.preload='metadata';video.load()}
 });
}
