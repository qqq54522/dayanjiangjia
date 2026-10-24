import type {Slide} from './deck';
import {contentFromLegacy,contentLayout,type ContentKind,type ContentPresentation} from './content.ts';

/** One user-facing taxonomy shared by the gallery and editor; storage formats remain compatible. */
export const presentationCategories=[
 {id:'opening',label:'封面与章节',hint:'开场或引入新话题',variants:['cover','chapter']},
 {id:'point',label:'观点与重点',hint:'让听众记住一个主张',variants:['point','spotlight']},
 {id:'media',label:'图文与素材',hint:'围绕画面安排文字',variants:['image','balanced','text']},
 {id:'collection',label:'列表与卡片',hint:'同一主题的并列内容',variants:['list','cards']},
 {id:'process',label:'流程步骤',hint:'有先后顺序的行动路径',variants:['process']},
 {id:'comparison',label:'对比与数据',hint:'比较差异或对应关系',variants:['compare','chart','table']}
] as const;
export type CategoryId=typeof presentationCategories[number]['id'];
export type VariantId=typeof presentationCategories[number]['variants'][number];
export const presentationVariants:Record<VariantId,{label:string;hint:string;kind:ContentKind;layout:NonNullable<ContentPresentation['layout']>}>={
 cover:{label:'封面',hint:'整份演示的开场主张',kind:'point',layout:'cover'},
 chapter:{label:'章节开场',hint:'用醒目的倾斜大标题引入新话题',kind:'point',layout:'chapter'},
 point:{label:'观点与解释',hint:'一句主张，配必要的解释',kind:'point',layout:'auto'},
 spotlight:{label:'重点强调',hint:'用深色面板突出核心结论',kind:'point',layout:'spotlight'},
 image:{label:'大图展示',hint:'正文区域留给图片、GIF 或视频',kind:'visual',layout:'image'},
 balanced:{label:'图文并重',hint:'左侧约 1/3 讲解，右侧展示素材',kind:'visual',layout:'balanced'},
 text:{label:'突出文字',hint:'左侧约 3/5 讲解，素材辅助',kind:'visual',layout:'text'},
 list:{label:'纵向列表',hint:'从上到下讲述同一主题的要点',kind:'cards',layout:'list'},
 cards:{label:'横向卡片',hint:'总览并列的人物、功能或数字',kind:'cards',layout:'cards'},
 process:{label:'顺序步骤',hint:'按先后顺序展示，点按聚焦当前步骤',kind:'process',layout:'auto'},
 compare:{label:'两栏对比',hint:'按相同维度比较两种方案',kind:'compare',layout:'auto'},
 chart:{label:'数值条形图',hint:'用同一量程比较数值，不混用单位',kind:'compare',layout:'chart'},
 table:{label:'简明表格',hint:'说明范围、条件与对应关系',kind:'table',layout:'auto'}
};
export function slideVariant(s:Slide):VariantId{
 if(s.content){const c=s.content,l=contentLayout(c);if(l!=='auto')return l;
 return ({point:'point',visual:'image',cards:'cards',compare:'compare',process:'process',table:'table'} as const)[c.kind];}
 if(s.media||s.gallery?.length||s.layout==='media'){const i=s.composition?.intent;return i==='text'?'text':i==='balanced'||(i!=='visual'&&(s.subtitle||s.points.length))?'balanced':'image';}
 return ({hero:'chapter',statement:'list',steps:'cards',highlight:'spotlight',chart:'chart',media:'image'} as const)[s.layout];
}
export function slideCategory(s:Slide){const variant=slideVariant(s);return presentationCategories.find(c=>(c.variants as readonly string[]).includes(variant))!;}
export function applyVariant(s:Slide,variant:VariantId):Slide{
 const v=presentationVariants[variant];
 // Keep legacy compositions intact where they already have an exact equivalent.
 const legacyLayouts:Partial<Record<VariantId,Slide['layout']>>={chapter:'hero',list:'statement',cards:'steps',chart:'chart',image:'media',balanced:'media',text:'media'};
 const legacy=legacyLayouts[variant];
 if(!s.content&&legacy&&(!(s.media||s.gallery?.length)||v.kind==='visual'))return {...s,layout:legacy,design:undefined,...(v.kind==='visual'?{composition:{...s.composition,brief:s.composition?.brief||'',fit:s.composition?.fit||'contain',sequence:s.composition?.sequence||'carousel',intent:variant==='image'?'visual':variant as 'balanced'|'text'}}:{})};
 const content=s.content||contentFromLegacy(s,v.kind);
 const next={...content,kind:v.kind,presentation:{...content.presentation,layout:v.layout,...(variant==='compare'?{columns:2 as const}:{})}};
 if(variant==='table'&&!next.table)next.table={headers:['对象','说明'],rows:next.items.filter(i=>i.placement!=='detail').map(i=>[i.title,i.body])};
 return {...s,content:next,design:undefined};
}
