/** Measure the actual scene, not text length. Used only by editing/review UI. */
export function inspectScene(scene:HTMLElement):string[]{
 const result=new Set<string>(),canvas=scene.getBoundingClientRect();
 if(!canvas.width||!canvas.height)return [];
 const tolerance=canvas.width/1280*5;
 for(const el of scene.querySelectorAll<HTMLElement>('h1,h2,.content-body,.content-value,.content-summary,.content-lead,.content-item,.content-crop')){
  if(el.closest('dialog,[hidden]')||!el.getClientRects().length)continue;
  const r=el.getBoundingClientRect();if(!r.width&&!r.height)continue;
  const text=el.textContent?.trim().slice(0,22)||'图片';
  if(r.bottom>canvas.bottom+tolerance||r.right>canvas.right+tolerance||el.scrollHeight>el.clientHeight+5||el.scrollWidth>el.clientWidth+5)result.add(`「${text}」超出可见区域`);
  if(el.matches('.content-crop')&&r.height<canvas.height*.1)result.add('人物/素材区域过小，请减少同卡片文字或调整布局');
 }
 for(const img of scene.querySelectorAll<HTMLImageElement>('.scene-media img,.content-crop image')){
  if(img.closest('dialog,[hidden]')||!img.getClientRects().length)continue;
  if(img.tagName.toLowerCase()==='img'&&img.complete&&!img.naturalWidth)result.add('素材未能加载，不能直接采用');
 }
 return [...result];
}
