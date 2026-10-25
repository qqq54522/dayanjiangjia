import type {Slide} from './deck.ts';
import type {PresentationSettings} from './content.ts';
import {contentLayout,contentColumns} from './content.ts';
export type QualityIssue={code:string;level:'review'|'warning';message:string;suggestion:string};
/** Heuristics surface review opportunities; they never claim to judge meaning. */
export function reviewSlide(s:Slide,settings:PresentationSettings={display:'screen'}):QualityIssue[]{
 const issues:QualityIssue[]=[],live=settings.display==='live',c=s.content;
 const add=(code:string,message:string,suggestion:string)=>issues.push({code,level:'review',message,suggestion});
 if(s.title.replace(/\s/g,'').length>(live?18:24))add('long-title','标题较长，缩小投屏后可能难以快速读懂','缩短标题，把限定条件保留在正文或讲述提示。');
 if(c){
  if(!c.goal.trim())add('goal','这一页还没有明确讲述目标','写下希望观众记住的一件事，再决定哪些内容进入主画面。');
  const main=c.items.filter(i=>i.placement!=='detail');
  const count=main.length,limit=c.kind==='point'?1:c.kind==='compare'?2:6;
  if(count>limit&&c.kind!=='table')add('many-items',`主画面包含 ${count} 个模块`,'先判断是否共同表达一套体系；可保留全貌并增加详页，不按数量机械拆分。');
  const chars=main.reduce((n,i)=>n+i.title.length+i.body.length+(i.value?.length||0),0)+c.summary.length+(c.presentation?.subtitle==='visible'?s.subtitle.length:0);
  if(chars>(live?150:260))add('dense-copy','主画面文字较多','保留观点与必要证据，把补充解释移到讲述提示或详情。');
  if(main.some(i=>(i.value?.length||0)>(c.kind==='cards'?10:16)))add('long-value','强调数据包含较长说明，容易产生生硬换行','大数字只保留核心数值与单位；分母、年份和限定条件移到同一模块正文，不删去。');
  if(main.some(i=>i.body.split('\n').length>5))add('many-lines','单个模块正文超过五行，可能挤占素材或超出卡片','保留体系总览，将具体清单用匹配的简表或相邻详页呈现。');
  if(c.summary.length>(live?36:56))add('long-summary','总结条文字较长','用一句话收束；必要限定条件仍需保留。');
  if(c.table&&(c.table.headers.length>(live?3:5)||c.table.rows.length>(live?4:7)))add('dense-table','表格超出建议的主画面阅读密度','按一个比较维度提取摘要，完整证据保留在详情或补充页。');
  if(c.kind==='visual'&&!main.some(i=>i.media))add('missing-visual','大画面页还没有可展示的素材','添加图片或视频，或改用观点页。');
  if(c.items.some(i=>i.importance==='key'&&i.placement==='detail'))add('key-in-detail','关键内容被放入补充详情','让关键主张或数字回到主画面；如确需移出，应逐项说明并确认。');
  if(['cover','chapter','image'].includes(contentLayout(c))&&main.some(i=>i.importance==='key'&&(i.title||i.body||i.value)))add('key-layout','当前版式不会展示关键模块文字','选择图文或卡片版式，或把关键主张明确放到大标题。');
  if(count>=4&&contentColumns(c)>=4&&main.some(i=>i.title.length+i.body.length>45))add('dense-cards','多栏中的解释较长','保留总览关系，精简重复文字或改为双行布局；必要时另加详页。');
 }else if(s.subtitle.length+s.points.join('').length>(live?150:260))add('dense-copy','主画面文字较多','明确这一页的一个讲述目标，再精简或拆页。');
 return issues;
}
