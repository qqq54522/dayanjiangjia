import type {Slide} from './deck.ts';
import type {PresentationSettings} from './content.ts';
export type QualityIssue={code:string;level:'review'|'warning';message:string;suggestion:string};
/** Heuristics surface review opportunities; they never claim to judge meaning. */
export function reviewSlide(s:Slide,settings:PresentationSettings={display:'screen'}):QualityIssue[]{
 const issues:QualityIssue[]=[],live=settings.display==='live',c=s.content;
 const add=(code:string,message:string,suggestion:string)=>issues.push({code,level:'review',message,suggestion});
 if(s.title.replace(/\s/g,'').length>(live?24:32))add('long-title','标题较长，缩小投屏后可能难以快速读懂','缩短标题，把限定条件保留在正文或讲述提示。');
 if(c){
  if(!c.goal.trim())add('goal','这一页还没有明确讲述目标','写下希望观众记住的一件事，再决定哪些内容进入主画面。');
  const main=c.items.filter(i=>i.placement!=='detail');
  const count=main.length,limit=c.kind==='point'?1:c.kind==='compare'?2:c.kind==='process'?5:live?3:4;
  if(count>limit&&c.kind!=='table')add('many-items',`主画面包含 ${count} 个模块`,'考虑保留简明总览，把详细内容拆页或放入点按详情；不要自动缩字。');
  const chars=main.reduce((n,i)=>n+i.title.length+i.body.length+(i.value?.length||0),0)+c.summary.length+s.subtitle.length;
  if(chars>(live?150:260))add('dense-copy','主画面文字较多','保留观点与必要证据，把补充解释移到讲述提示或详情。');
  if(main.some(i=>(i.value?.length||0)>(c.kind==='cards'?10:16)))add('long-value','强调数据包含较长说明，容易产生生硬换行','大数字只保留核心数值与单位；分母、年份和限定条件移到同一模块正文，不删去。');
  if(c.summary.length>(live?36:56))add('long-summary','总结条文字较长','用一句话收束；必要限定条件仍需保留。');
  if(c.table&&(c.table.headers.length>(live?3:5)||c.table.rows.length>(live?4:7)))add('dense-table','表格超出建议的主画面阅读密度','按一个比较维度提取摘要，完整证据保留在详情或补充页。');
  if(c.kind==='visual'&&!main.some(i=>i.media))add('missing-visual','大画面页还没有可展示的素材','添加图片或视频，或改用观点页。');
 }else if(s.subtitle.length+s.points.join('').length>(live?150:260))add('dense-copy','主画面文字较多','明确这一页的一个讲述目标，再精简或拆页。');
 return issues;
}
export const qualityGuide=`演讲质量约束：产品名称在新文案中始终使用“洋葱学园”，不用“洋葱”简称（原文引用可保留）。核对问题集中放在questions、note或审阅说明，主画面不反复添加“原稿数据待核实”等免责声明。原稿业务事实可按原范围表述，不声称独立核验；发现明确冲突、缺字或夸大措辞时解释并提议修改。每页围绕一个清楚目标。不同对象可共同支持一个目标，不机械按字数拆页。默认抛弃参考原配色、字体和装饰，用公司品牌母版。标题过长先改写、挪解释，不缩小字体硬塞。保留数字的单位、分母、时间和限定条件，不把参考事实当作已核验事实。页面删减须逐项说明去向：主画面、讲述提示、点按详情、补充页或待确认删除。主画面本身必须讲得清楚，互动只承载补充详情。禁止为了好看编造人物资历、课程、效果或证据。只改视觉时不得改写事实。手机直播需考虑演示页只占手机画面的一部分。输出原因和可核对的新页，由用户确认后使用。`;
