/** Semantic content stays editable independently of the visual template. */
export type ContentKind='point'|'visual'|'cards'|'compare'|'process'|'table';
export type ContentItem={importance?:'key'|'support';interaction?:'none'|'detail'|'media'|'focus';placement?:'main'|'detail';id:string;title:string;body:string;detail:string;media?:string;mediaAspect?:number;crop?:{x:number;y:number;width:number;height:number};value?:string;sourceIds?:string[]};
export type ContentPresentation={layout?:'auto'|'cover'|'chapter'|'image'|'balanced'|'text'|'cards'|'list'|'chart'|'spotlight';subtitle?:'hidden'|'visible';marker?:'auto'|'number'|'none';columns?:2|3|4|5;evidence?:boolean};
export type SlideContent={kind:ContentKind;goal:string;summary:string;items:ContentItem[];presentation?:ContentPresentation;table?:{headers:string[];rows:string[][]};lockedItemIds?:string[]};
export type Chapter={id:string;title:string;visible:boolean};
export type SourceLink={purpose?:'content'|'structure';documentId:string;page:number;preview?:string;label:string;extractedText?:string;notes?:string};
export type PresentationSettings={display:'screen'|'live';minutes?:number};
export const contentKinds:readonly [ContentKind,string,string][]=[
 ['point','观点','先让听众记住一句话'],['visual','素材讲解','围绕图片或视频讲述'],
 ['cards','卡片组','人物、功能与关键数据'],['compare','对比','把差异放在一起说清楚'],
 ['process','步骤','按讲述顺序逐步聚焦'],['table','简明表格','清楚表达范围与对应关系']
];
export const localAsset=(s:unknown):s is string=>typeof s==='string'&&/^\/media\/[\w.-]+$/.test(s);
const text=(s:unknown,n:number):s is string=>typeof s==='string'&&s.length<=n;
export function validPresentation(x:unknown):x is ContentPresentation{const p=x as ContentPresentation;return !!p&&(p.layout===undefined||['auto','cover','chapter','image','balanced','text','cards','list','chart','spotlight'].includes(p.layout))&&(p.subtitle===undefined||['hidden','visible'].includes(p.subtitle))&&(p.marker===undefined||['auto','number','none'].includes(p.marker))&&(p.columns===undefined||[2,3,4,5].includes(p.columns))&&(p.evidence===undefined||typeof p.evidence==='boolean')}
export function contentLayout(c:SlideContent){if(c.presentation?.layout&&c.presentation.layout!=='auto')return c.presentation.layout;if(c.kind==='visual')return 'image';if(c.kind==='point'&&c.presentation?.layout!=='auto'&&c.items.every(i=>!i.title&&!i.body&&!i.media&&!i.value))return 'chapter';return 'auto'}
export function contentColumns(c:SlideContent){const n=c.items.filter(i=>i.placement!=='detail').length;if(c.presentation?.columns)return c.presentation.columns;if(c.kind==='compare')return 2;return n<=5?Math.max(1,n):3}
export function hasDetail(i:ContentItem){return i.interaction==='detail'&&!!i.detail.trim()}
export function numberedItems(c:SlideContent){return c.presentation?.marker==='number'||(c.presentation?.marker!=='none'&&!c.items.filter(i=>i.placement!=='detail').some(i=>i.media||i.value)&&(c.kind==='cards'||c.kind==='compare'))}
export function validContent(x:unknown):x is SlideContent{
 const c=x as SlideContent;
 return !!c&&contentKinds.some(([k])=>k===c.kind)&&text(c.goal,1000)&&text(c.summary,1600)&&(c.presentation===undefined||validPresentation(c.presentation))&&Array.isArray(c.items)&&c.items.length<=100&&
 c.items.every(i=>i&&(i.importance===undefined||['key','support'].includes(i.importance))&&(i.interaction===undefined||['none','detail','media','focus'].includes(i.interaction))&&(i.placement===undefined||['main','detail'].includes(i.placement))&&text(i.id,100)&&!!i.id&&text(i.title,500)&&text(i.body,4000)&&text(i.detail,20000)&&(i.media===undefined||i.media===''||localAsset(i.media))&&(i.mediaAspect===undefined||Number.isFinite(i.mediaAspect)&&i.mediaAspect>0&&i.mediaAspect<=30)&&(i.crop===undefined||[i.crop.x,i.crop.y,i.crop.width,i.crop.height].every(v=>Number.isFinite(v)&&v>=0&&v<=1)&&i.crop.width>0&&i.crop.height>0&&i.crop.x+i.crop.width<=1.00001&&i.crop.y+i.crop.height<=1.00001)&&(i.value===undefined||text(i.value,500))&&(i.sourceIds===undefined||Array.isArray(i.sourceIds)&&i.sourceIds.every(s=>text(s,200))))&&
 new Set(c.items.map(i=>i.id)).size===c.items.length&&
 (c.lockedItemIds===undefined||Array.isArray(c.lockedItemIds)&&c.lockedItemIds.every(id=>c.items.some(i=>i.id===id)))&&
 (c.table===undefined||Array.isArray(c.table.headers)&&c.table.headers.length>0&&c.table.headers.length<=30&&c.table.headers.every(h=>text(h,1000))&&Array.isArray(c.table.rows)&&c.table.rows.length<=300&&c.table.rows.every(r=>Array.isArray(r)&&r.length===c.table!.headers.length&&r.every(cell=>text(cell,4000))));
}
export function validChapter(x:unknown):x is Chapter{const c=x as Chapter;return !!c&&text(c.id,100)&&!!c.id&&text(c.title,100)&&!!c.title.trim()&&typeof c.visible==='boolean'}
export function validSourceLink(x:unknown):x is SourceLink{const s=x as SourceLink;return !!s&&(s.purpose===undefined||['content','structure'].includes(s.purpose))&&text(s.documentId,100)&&Number.isInteger(s.page)&&s.page>0&&text(s.label,500)&&(s.extractedText===undefined||text(s.extractedText,100000))&&(s.notes===undefined||text(s.notes,20000))&&(s.preview===undefined||localAsset(s.preview))}
export function validSettings(x:unknown):x is PresentationSettings{const s=x as PresentationSettings;return !!s&&['screen','live'].includes(s.display)&&(s.minutes===undefined||Number.isFinite(s.minutes)&&s.minutes>0&&s.minutes<=1440)}
export function contentAssets(s:{content?:SlideContent;sourceLinks?:SourceLink[]}){return [...(s.content?.items.map(i=>i.media).filter(Boolean)||[]),...(s.sourceLinks?.map(i=>i.preview).filter(Boolean)||[])] as string[]}
export function contentFromLegacy(s:{title:string;subtitle:string;points:string[];media:string;gallery?:string[]},kind:ContentKind):SlideContent{
 const urls=[s.media,...s.gallery||[]].filter(Boolean),n=Math.max(s.points.length,urls.length,s.subtitle?1:0);
 return {kind,goal:s.title,summary:'',items:Array.from({length:n},(_,i)=>({id:crypto.randomUUID(),title:s.points[i]||'',body:i===0?s.subtitle:'',detail:'',...(urls[i]?{media:urls[i]}:{})}))};
}
export function updateChapter<T extends {chapter?:Chapter}>(slides:T[],chapter:Chapter):T[]{return slides.map(s=>s.chapter?.id===chapter.id?{...s,chapter:{...chapter}}:s)}
export function preserveLockedItems(before:SlideContent|undefined,after:SlideContent|undefined){
 if(!before?.lockedItemIds?.length)return after;
 if(!after)throw Error('不能删除包含锁定内容的页面结构');
 for(const id of before.lockedItemIds){if(JSON.stringify(before.items.find(i=>i.id===id))!==JSON.stringify(after.items.find(i=>i.id===id)))throw Error('修改涉及锁定模块，请先解除锁定');}
 return {...after,lockedItemIds:[...before.lockedItemIds]};
}
export function moveContentItem(items:ContentItem[],id:string,beforeId:string){const from=items.findIndex(i=>i.id===id),to=items.findIndex(i=>i.id===beforeId);if(from<0||to<0||from===to)return items;const next=[...items];const [item]=next.splice(from,1);next.splice(next.findIndex(i=>i.id===beforeId),0,item);return next}
