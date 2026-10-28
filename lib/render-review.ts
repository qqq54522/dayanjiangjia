/** Measure actual browser layout, including each content item's own frame. */
export function reviewReady(slides:readonly {id:string}[]|undefined,issues:Record<string,string[]>):boolean{
 return !!slides?.length&&slides.every(slide=>Object.hasOwn(issues,slide.id)&&issues[slide.id].length===0);
}

export function inspectScene(scene:HTMLElement):string[]{
 const result=new Set<string>(),canvas=scene.getBoundingClientRect();
 if(!canvas.width||!canvas.height)return ['页面尚未完成排版检查'];
 const tolerance=canvas.width/1280*5;
 // Subpixel media sizing can round scroll dimensions up by a few CSS pixels.
 const scrollTolerance=Math.max(4,tolerance);
 const frames='.relation-node,.relation-diagram,.inline-step-overview,.content-item,.content-image-cell,.content-image-stage,.content-split-media,.step-media-stage,.content-items,.content-main,.comic-title,.comic-opening,.cover-opening,.comic-board,.scene-media,.semantic-table-wrap,.semantic-table,.focus-matrix,.focus-matrix table,.focus-matrix th,.focus-matrix td,.matrix-products,.matrix-series,.matrix-footer,.semantic-chart,.semantic-chart-row,.scene';
 const targets='.relation-node,.relation-diagram,.relation-cycle-summary,h1,h2,.comic-title>span,.comic-text,.comic-board,.scene-brand,.chapter-ribbon,.content-body,.content-value,.content-summary,.content-lead,.content-item,.content-items,.content-main,.content-image-stage,.content-image-cell,.content-split-media,.step-media-stage,.content-crop,.scene-media,.scene-media img,.scene-media video,.semantic-table-wrap,.semantic-table,.semantic-table th,.semantic-table td,.focus-matrix,.focus-matrix table,.focus-matrix th,.focus-matrix td,.focus-matrix th button,.focus-matrix .matrix-line,.focus-matrix .matrix-product,.focus-matrix .matrix-series-card,.focus-matrix .matrix-footer,.focus-matrix .matrix-footer p,.cover-subtitle';
 for(const el of scene.querySelectorAll<HTMLElement>(targets)){
  if(el.closest('dialog,[hidden],[inert],[aria-hidden="true"]')||!el.getClientRects().length)continue;
  const r=el.getBoundingClientRect();if(!r.width&&!r.height)continue;
  // The chapter heading intentionally tilts beyond its layout wrapper; its frame is the slide.
  const parent=el.matches('.comic-opening h1')?null:el.parentElement?.closest<HTMLElement>(frames);
  const frame=parent?.getBoundingClientRect()||canvas;
  const mediaFrame=el.matches('.scene-media,.content-image-stage,.content-image-cell,.content-split-media,.step-media-stage')||/media|crop|image/.test(typeof el.className==='string'?el.className:'');
  const text=mediaFrame?'素材':el.matches('.content-main')?'页面内容':el.textContent?.trim().slice(0,22)||'内容';
  const edges=[r.top<frame.top-tolerance?'上':null,r.right>frame.right+tolerance?'右':null,r.bottom>frame.bottom+tolerance?'下':null,r.left<frame.left-tolerance?'左':null].filter(Boolean);
  if(edges.length)result.add(`「${text}」超出所属内容框的${edges.join('、')}边界`);
  const style=typeof getComputedStyle==='function'?getComputedStyle(el):null;
  const clippedY=el.scrollHeight>el.clientHeight+scrollTolerance&&(!style||style.overflowY!=='visible');
  const clippedX=el.scrollWidth>el.clientWidth+scrollTolerance&&(!style||style.overflowX!=='visible');
  const visibleOverflow=!!style&&(style.overflowY==='visible'&&r.top+el.scrollHeight>frame.bottom+scrollTolerance||style.overflowX==='visible'&&r.left+el.scrollWidth>frame.right+scrollTolerance);
  if(clippedY||clippedX||visibleOverflow)result.add(`「${text}」在所属内容框内被裁切或延伸越界`);
  if(el.matches('.content-crop')&&r.height<canvas.height*.1)result.add('人物/素材区域过小，请减少同卡片文字或调整布局');
 }
 for(const img of scene.querySelectorAll<HTMLImageElement>('.scene-media img,.content-crop image')){
  if(img.closest('dialog,[hidden],[inert],[aria-hidden="true"]')||!img.getClientRects().length)continue;
  if(img.tagName.toLowerCase()==='img'&&!img.complete)result.add('素材尚未加载完成，正在等待排版检查');
  if(img.tagName.toLowerCase()==='img'&&img.complete&&!img.naturalWidth)result.add('素材未能加载，不能直接采用');
 }
 return [...result];
}
