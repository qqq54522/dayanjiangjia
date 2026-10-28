/** Shared preview/playback fitting. New pages never shrink; only later editor changes opt in. */
export function initCardTypography(root:HTMLElement){
 const group=root.querySelector<HTMLElement>('.content-items[data-card-fit]');
 if(!group||group.dataset.cardFit!=='after-edit')return;
 let active=true;
 const fit=()=>{
  if(!active||!root.clientWidth)return;
  group.style.setProperty('--card-copy-scale','1');
  const cards=[...group.querySelectorAll<HTMLElement>('.adaptive-item')];
  const overflow=()=>cards.some(card=>card.scrollHeight>card.clientHeight+2||card.scrollWidth>card.clientWidth+2||[...card.querySelectorAll<HTMLElement>('.card-heading,.content-body,.content-value')].some(el=>el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2));
  // Always start from the normal master sizes: fitting never compounds across edits/resizes.
  let scale=1;
  while(overflow()&&scale>.65){scale=Math.max(.65,scale-.025);group.style.setProperty('--card-copy-scale',String(scale));}
  group.dataset.copyOverflow=String(overflow());
 };
 const observer=new ResizeObserver(fit);observer.observe(root);
 root.addEventListener('presentation-reset',fit);document.fonts.ready.then(fit);fit();
 return()=>{active=false;observer.disconnect();root.removeEventListener('presentation-reset',fit)};
}
