/** Resolve the background behind the reserved top-left logo area, in editor and offline HTML. */
export function initLogo(scene:HTMLElement){
 const logo=scene.querySelector<HTMLElement>('.scene-brand');if(!logo)return;
 const surface=scene.querySelector<HTMLElement>('.free-layout')||scene;
 const css=getComputedStyle(surface),canvas=document.createElement('canvas');canvas.width=canvas.height=1;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 // Gradient starts at the logo's reserved edge. CSS color functions are parsed by the browser.
 const stops=css.backgroundImage.match(/#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/gi);
 ctx.fillStyle='#fff9df';ctx.fillRect(0,0,1,1);ctx.fillStyle=css.backgroundColor;ctx.fillRect(0,0,1,1);
 if(stops?.length){ctx.fillStyle=stops[0];ctx.fillRect(0,0,1,1)}
 const [r,g,b]=ctx.getImageData(0,0,1,1).data;
 const linear=(v:number)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
 logo.dataset.tone=.2126*linear(r)+.7152*linear(g)+.0722*linear(b)<.3?'dark':'light';
}
