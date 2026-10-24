import type {Slide} from './deck';
import {presentationCategories,presentationVariants,slideVariant,applyVariant,type VariantId} from './presentation-options.ts';
export const pageTypes=[['hero','章节开场','倾斜大标题，适合开场与过渡'],['statement','文字讲解','白色阅读面板，承载观点与解释'],['steps','并列要点','分栏比较，展示步骤或三个观点'],['highlight','重点提示','深色面板，突出一句结论'],['chart','数据对比','横向条形图，直接标出数值'],['media','素材演示','配合素材与排版设置，展示图片或视频']] as const;
function classicExamples(source:Slide[]):Slide[]{
 const background=source.find(s=>s.background)?.background,media=source.find(s=>s.media)?.media||source.flatMap(s=>s.content?.items||[]).find(i=>i.media&&i.placement!=='detail')?.media||'';
 const content=[
 ['让一个好观点\n被清楚地看见','章节开场 · 适合引入一个新话题',['一个主题','一句主张']],
 ['把复杂的内容，讲得更清楚','文字讲解 · 用干净的阅读面板承载正文',['先提出问题，让听众知道为什么要听。','再解释原理，用简洁的语言搭建理解。','最后给出结论，留下一句能记住的话。']],
 ['从理解，到行动','并列要点 · 适合步骤、方法与对比',['看过程：把抽象变化讲清楚','找关系：连接已有的知识','讲原因：用自己的话说明白']],
 ['这一页，只强调一个重点','把空间留给最重要的一句话',['一页一个核心观点','装饰服务于理解']],
 ['让差异，一眼就能看见','排版示例数据，非业务结果；统一量程 0—100',['方案 A|40','方案 B|65','方案 C|80']],
 ['把最好的位置，留给画面','素材演示 · 可替换为自己的图片、GIF 或视频',[]]
 ] as [string,string,string[]][];
 return pageTypes.map(([layout,name],i)=>({id:crypto.randomUUID().slice(0,12),round:1,theme:'brand',layout,title:content[i][0],subtitle:content[i][1],points:content[i][2],media:layout==='media'?media:'',gallery:[],background,note:`样式示例：${name}。可复制本页，再替换标题、正文与素材。${layout==='chart'?'图表要点按“名称|数值”填写，数值范围 0—100。':''}`,source:'工作台样式示例',...(layout==='media'?{composition:{intent:'visual' as const,sequence:'carousel' as const,fit:'contain' as const,brief:''}}:{})}));
}

export function styleExamples(source:Slide[]):Slide[]{
 const background=source.find(s=>s.background)?.background,media=source.find(s=>s.media)?.media||source.flatMap(s=>s.content?.items||[]).find(i=>i.media)?.media||'';
 const item=(title:string,body='',detail='',extra={})=>({id:crypto.randomUUID(),title,body,detail,...extra});
 const examples:Pick<Slide,'title'|'subtitle'|'content'>[]=[
 {title:'让一个好观点，被清楚地看见',subtitle:'观点与章节',content:{kind:'point',goal:'一页只讲清一个观点',summary:'装饰服务于理解，细节留给讲述。',items:[item('一页，一件事','先让听众知道这页为什么值得听。')]}},
 {title:'把最好的位置，留给画面',subtitle:'',content:{kind:'visual',goal:'先看一个具体的例子',summary:'',items:[item('',media?'':'在素材与排版中添加图片、GIF 或视频。','',media?{media}:{})]}},
 {title:'三个要点，清楚地放在一起',subtitle:'',content:{kind:'cards',goal:'认识三个并列要点',summary:'先看清整体关系，再决定是否需要详页。',items:[item('人物','姓名与一句核心身份','在这里展示完整资历；只填写已核实的信息。'),item('功能','一句话说明解决的问题','可以补充使用场景和操作示例。'),item('数据','保留时间、范围与单位','可在详情中说明数据口径和来源；示例不代表业务结果。')]}},
 {title:'把差异放在一起说清楚',subtitle:'两栏使用相同的比较维度',content:{kind:'compare',goal:'让听众理解方案的不同',summary:'先统一比较口径，再给结论。',items:[item('方案 A','按相同维度填写特点','这里补充适用条件与例外。'),item('方案 B','按相同维度填写特点','这里补充适用条件与例外。')]}},
 {title:'沿着一条路径，逐步讲清',subtitle:'点按当前步骤，聚焦讲解',content:{kind:'process',goal:'说明从理解到行动的过程',summary:'',items:[item('先观察','找到具体的问题'),item('再理解','解释问题背后的原因'),item('去尝试','完成一个可执行的动作')]}},
 {title:'范围与对应关系，一眼看清',subtitle:'仅展示结构示例，不代表业务信息',content:{kind:'table',goal:'清楚说明各项的对应关系',summary:'完整明细可以放入点按详情。',items:[item('完整说明','','这里保留完整口径、补充条件与来源。')],table:{headers:['对象','主要用途','补充说明'],rows:[['类型 A','建立概念','先给一个例子'],['类型 B','解释过程','逐步展示'],['类型 C','比较差异','统一比较口径']]}}}
 ];
 const all=[...classicExamples(source),...examples.map((e,i):Slide=>({id:crypto.randomUUID(),round:1,theme:'brand',layout:'statement',...e,points:[],media:'',gallery:[],background,note:'母版结构示意。复制后替换内容；可在素材与排版中选择编号、列数与图文布局。',source:'工作台样式示例',chapter:{id:'example-chapter',title:'表达方式',visible:i===0}}))];
 const classic=(layout:Slide['layout'])=>all.find(s=>!s.content&&s.layout===layout)!;
 const semantic=(kind:NonNullable<Slide['content']>['kind'])=>all.find(s=>s.content?.kind===kind)!;
 const sources:Record<VariantId,Slide>={cover:classic('hero'),chapter:classic('hero'),point:semantic('point'),spotlight:classic('highlight'),image:classic('media'),balanced:classic('media'),text:classic('media'),list:classic('statement'),cards:semantic('cards'),process:semantic('process'),compare:semantic('compare'),chart:classic('chart'),table:semantic('table')};
 return presentationCategories.flatMap(group=>group.variants.map(id=>{
  let base={...sources[id],id:crypto.randomUUID()};
  if(id==='balanced'||id==='text')base={...base,subtitle:'先讲清主张，再用画面说明',points:['一个核心观点','必要的解释','具体的例子']};
  return applyVariant(base,id);
 }));
}
export function chartPoint(text:string){const [label,raw]=text.split('|');const number=Number(raw);return {label,value:raw!==undefined&&Number.isFinite(number)?Math.max(0,Math.min(100,number)):0}}

/** Resolve by the page's structure, never by a position in a separate catalog. */
export function styleExampleInfo(s:Slide){
 const definition=presentationVariants[slideVariant(s)];
 return {label:definition.label,hint:definition.hint};
}
