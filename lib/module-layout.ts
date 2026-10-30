import type {ContentItem,SlideContent} from './content.ts';
export type ItemDesign={emphasis?:'auto'|'title'|'body'|'value'|'media';align?:'auto'|'left'|'center';mediaLayout?:'auto'|'above'|'beside';highlight?:string;textScale?:number};
export function validItemDesign(x:unknown):x is ItemDesign{const d=x as ItemDesign;return !!d&&typeof d==='object'&&(d.emphasis===undefined||['auto','title','body','value','media'].includes(d.emphasis))&&(d.align===undefined||['auto','left','center'].includes(d.align))&&(d.mediaLayout===undefined||['auto','above','beside'].includes(d.mediaLayout))&&(d.textScale===undefined||Number.isFinite(d.textScale)&&d.textScale>=1&&d.textScale<=1.5)&&(d.highlight===undefined||typeof d.highlight==='string'&&d.highlight.length<=80)}
/** Layout inference only: semantic priority is supplied by the author / Codex, never guessed from keywords. */
export function itemLayout(i:ContentItem,c:SlideContent,columns:number){
 const d=i.design||{},body=i.body.trim(),long=body.length>40||body.split('\n').length>2;
 let emphasis=d.emphasis||'auto';
 if(emphasis==='auto')emphasis=i.value?'value':i.media?'media':!i.title&&body?'body':'title';
 if(emphasis==='value'&&!i.value||emphasis==='media'&&!i.media||emphasis==='body'&&!body)emphasis='title';
 const short=!long&&body.length<=24&&i.title.length<=18;
 const align=d.align&&d.align!=='auto'?d.align:c.kind==='compare'||c.kind==='process'||!short?'left':i.media||emphasis==='value'||!body?'center':'left';
 const aspect=i.crop&&i.mediaAspect?i.crop.width*i.mediaAspect/i.crop.height:i.mediaAspect;
 const beside=!!i.media&&(d.mediaLayout==='beside'&&columns<=3||(!d.mediaLayout||d.mediaLayout==='auto')&&columns<=2&&!!aspect&&aspect<.85&&body.length>0);
 return {emphasis,align,media:beside?'beside':'above',density:long?'reading':'brief',highlight:d.highlight&&body.includes(d.highlight)?d.highlight:''};
}

export function adaptiveColumns(c:SlideContent,base:number){const main=c.items.filter(i=>i.placement!=='detail');return !c.presentation?.columns&&c.kind==='cards'&&base>=4&&main.some(i=>i.title.length+i.body.length>48)?Math.ceil(main.length/2):base;}

/** Only ordinary cards expose per-module enlargement; other layouts retain it for switching back. */
export function supportsTextScale(c:SlideContent){return ['cards','compare'].includes(c.kind)&&(!c.presentation?.layout||['auto','cards'].includes(c.presentation.layout));}
