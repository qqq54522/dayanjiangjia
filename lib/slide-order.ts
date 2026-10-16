import type {Slide} from './deck';
/** Drop into a gap in the original list; preserve stable IDs and slide data. */
export function moveSlide(slides:Slide[],id:string,gap:number){const from=slides.findIndex(s=>s.id===id);if(from<0)return slides;const next=[...slides];const [item]=next.splice(from,1);next.splice(Math.max(0,Math.min(next.length,gap-(from<gap?1:0))),0,item);return next}
export function blankSlide(source:Slide,id:string):Slide{return {id,round:source.round,background:source.background,layout:'statement',theme:'brand',title:'在这里写下关键观点',subtitle:'',points:[],media:'',gallery:[],note:'',source:''}}
