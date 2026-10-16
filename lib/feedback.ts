import type {Comment} from './deck.ts';
export function revisionRequest(text:string,comments:Comment[],selected:string[],target:string){
 const chosen=comments.filter(c=>c.slideId===target&&!c.done&&selected.includes(c.id));
 return [text.trim(),chosen.length?'选中的待处理反馈：\n'+chosen.map((c,i)=>`${i+1}. ${c.text}`).join('\n'):''].filter(Boolean).join('\n\n');
}
