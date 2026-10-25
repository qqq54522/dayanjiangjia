/** Non-destructive placement inside the template's existing media slot. */
export type MediaFrame={fit:'contain'|'cover';position:number};
export function validMediaFrame(v:unknown):v is MediaFrame{
 if(!v||typeof v!=='object')return false;
 const f=v as MediaFrame;
 return ['contain','cover'].includes(f.fit)&&Number.isInteger(f.position)&&f.position>=0&&f.position<=8;
}
export function frameStyle(f?:MediaFrame){return f?{objectFit:f.fit,objectPosition:`${f.position%3*50}% ${Math.floor(f.position/3)*50}%`}:undefined;}
export function frameAspect(f?:MediaFrame){return f?.fit==='cover'?`${['xMin','xMid','xMax'][f.position%3]}${['YMin','YMid','YMax'][Math.floor(f.position/3)]} slice`:'xMidYMid meet';}
