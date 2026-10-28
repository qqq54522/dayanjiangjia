import type {Slide} from './deck';
import {reviewReady} from './render-review.ts';
type Group={id:string;state:string;slides?:Slide[]};
export function supplementPreviewStatus(group:Group,issues:Record<string,string[]>,insertedIds:ReadonlySet<string>=new Set()){
 const pages=group.slides||[];
 if(pages.length&&pages.every(s=>insertedIds.has(s.id)))return {state:'inserted',messages:['这一组已插入稿件，可在编辑器中继续修改。']};
 if(group.state==='running')return {state:'running',messages:['这一组正在生成，请等待完成。']};
 if(group.state==='failed')return {state:'failed',messages:['上次生成未完成，原预览已保留，可以继续修改或重试。']};
 if(!pages.length)return {state:'pending',messages:['这一组还没有生成预览。']};
 if(pages.some(s=>!Object.hasOwn(issues,s.id)))return {state:'checking',messages:['正在等待字体、素材与排版检查。']};
 const messages=pages.flatMap((s,i)=>(issues[s.id]||[]).map(message=>`建议第 ${i+1} 页：${message}`));
 if(messages.length)return {state:'blocked',messages};
 return {state:group.state==='accepted'?'confirmed':'ready',messages:[]};
}
export function confirmedSupplementGroups<T extends Group>(groups:T[],issues:Record<string,string[]>,insertedIds:ReadonlySet<string>=new Set()):T[]{
 return groups.filter(g=>supplementPreviewStatus(g,issues,insertedIds).state==='confirmed'&&reviewReady(g.slides,issues));
}
