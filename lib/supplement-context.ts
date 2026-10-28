import {validSlide,type Slide,type Workspace} from './deck.ts';

export type Placement={afterId:string|null;chapterId:string|null};
export type SupplementSnapshot={id:string;revision:number;data:Workspace};
export function insertionIndex(slides:Slide[],afterId:string|null){
 if(afterId===null)return 0;
 const index=slides.findIndex(s=>s.id===afterId);
 if(index<0)throw Error('插入位置的页面已删除，请重新选择位置。');
 return index+1;
}
export function placementChapter(slides:Slide[],afterId:string|null){
 const index=insertionIndex(slides,afterId);
 return slides[index-1]?.chapter||slides[index]?.chapter;
}
const brief=(s:Slide)=>({id:s.id,title:s.title,chapter:s.chapter,layout:s.layout,theme:s.theme,master:s.master,composition:s.composition,
 content:s.content?{kind:s.content.kind,goal:s.content.goal,summary:s.content.summary,presentation:s.content.presentation,items:s.content.items.filter(i=>i.placement!=='detail').slice(0,8).map(i=>({id:i.id,title:i.title,value:i.value,body:i.body.slice(0,500),design:i.design,interaction:i.interaction})),table:s.content.table?{headers:s.content.table.headers,rows:s.content.table.rows.slice(0,6),focus:s.content.table.focus}:undefined}:undefined,
 subtitle:s.subtitle,points:s.points});
/** The current editable deck supplies context; the newly uploaded pages supply source facts. */
export function supplementContext(snapshot:SupplementSnapshot,placement?:Placement){
 const {slides}=snapshot.data,index=placement?insertionIndex(slides,placement.afterId):undefined;
 const chapters=[...new Map(slides.filter(s=>s.chapter).map(s=>[s.chapter!.id,s.chapter!])).values()];
 if(placement?.chapterId&&!chapters.some(c=>c.id===placement.chapterId))throw Error('所选章节已变化，请重新选择。');
 const chapter=chapters.find(c=>c.id===placement?.chapterId);
 const candidates=placement?[slides[index!-1],slides[index!],...slides.filter(s=>s.chapter?.id===placement.chapterId)]:[...chapters.map(c=>slides.find(s=>s.chapter?.id===c.id&&s.content?.presentation?.layout!=='chapter')),slides[0],slides[Math.floor(slides.length/2)]];
 const representatives=[...new Map(candidates.filter((s):s is Slide=>!!s).map(s=>[s.id,s])).values()].slice(0,3).map(brief);
 return {projectId:snapshot.id,revision:snapshot.revision,title:snapshot.data.title,settings:snapshot.data.settings,chapters,
  outline:slides.map((s,i)=>({page:i+1,id:s.id,title:s.title,chapter:s.chapter,kind:s.content?.kind,goal:s.content?.goal,summary:s.content?.summary,
   claims:s.content?.items.filter(item=>item.placement!=='detail').map(item=>({title:item.title,value:item.value,body:item.body.slice(0,220)}))||s.points,
   table:s.content?.table?{headers:s.content.table.headers,rows:s.content.table.rows.slice(0,3)}:undefined})),representatives,
  ...(placement?{placement:{...placement,chapter,previous:slides[index!-1]?brief(slides[index!-1]):null,next:slides[index!]?brief(slides[index!]):null}}:{})};
}
/** Existing pages and saved versions survive byte-for-byte; only new stable IDs are inserted. */
export function insertSupplement(doc:Workspace,pages:Slide[],placement:Placement):Workspace{
 const index=insertionIndex(doc.slides,placement.afterId);
 if(!pages.length||doc.slides.length+pages.length>60)throw Error('插入后最多支持 60 页，请减少本次补页数量。');
 if(!pages.every(validSlide)||new Set(pages.map(s=>s.id)).size!==pages.length||pages.some(s=>doc.slides.some(old=>old.id===s.id)))throw Error('补页结果无效或已经插入，请重新检查。');
 const chapter=doc.slides.find(s=>s.chapter?.id===placement.chapterId)?.chapter;
 if(placement.chapterId&&!chapter)throw Error('所选章节已变化，请重新检查。');
 const added=pages.map(s=>({...s,chapter:chapter?{...chapter}:undefined}));
 return {...doc,slides:[...doc.slides.slice(0,index),...added,...doc.slides.slice(index)]};
}
