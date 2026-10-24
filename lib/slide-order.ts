import {DEFAULT_MASTER,masterBackground} from './masters.ts';
import type {Slide} from './deck';
/** Drop into a gap in the original list; preserve stable IDs and slide data. */
export function moveSlide(slides:Slide[],id:string,gap:number){const from=slides.findIndex(s=>s.id===id);if(from<0)return slides;const next=[...slides];const [item]=next.splice(from,1);next.splice(Math.max(0,Math.min(next.length,gap-(from<gap?1:0))),0,item);return next}
export function blankSlide(source:Slide|undefined,id:string):Slide{return {id,master:source?.master||{...DEFAULT_MASTER},round:source?.round||1,background:source?.background??masterBackground(source?.master),layout:'statement',theme:'brand',title:'',subtitle:'',points:[],media:'',gallery:[],note:'',source:'',content:{kind:'point',goal:'',summary:'',items:[],presentation:{layout:'auto'}}}}
export function isBlankSlide(s:Slide){return !s.design&&!s.title.trim()&&!s.subtitle.trim()&&!s.points.some(x=>x.trim())&&!s.media&&!s.gallery?.length&&(!s.content||(!s.content.summary.trim()&&!s.content.table&&s.content.items.filter(i=>i.placement!=='detail').every(i=>!i.title.trim()&&!i.body.trim()&&!i.value&&!i.media)))}
