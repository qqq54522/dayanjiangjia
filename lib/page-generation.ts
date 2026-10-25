import type {Slide,Workspace} from './deck';
/** Apply only to the original target; unrelated edits and saved versions survive. */
export function applyGeneratedPage(doc:Workspace,original:Slide,result:Slide):Workspace {
 const current=doc.slides.find(s=>s.id===original.id);
 if(!current)throw Error('目标页已删除，无法替换。');
 const next={...result,id:current.id,chapter:current.chapter,master:result.content?.items.some(i=>i.design)?result.master:current.master||result.master,background:current.background??result.background};
 if(JSON.stringify(current)===JSON.stringify(next))return doc;
 if(JSON.stringify(current)!==JSON.stringify(original))throw Error('当前页在生成期间有新修改，未覆盖。请换一份参考后重新生成。');
 return {...doc,slides:doc.slides.map(s=>s.id===current.id?next:s)};
}
