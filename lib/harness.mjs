import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Resolve relative to this module so startup cwd and the CLI job temp directory do not matter.
export const presentationRules=readFileSync(new URL('../docs/presentation-harness.md',import.meta.url),'utf8');
export const harnessVersion=createHash('sha256').update(presentationRules).digest('hex').slice(0,12);
export const contentContract=`正文采用 content={kind,goal,summary,items,table?,lockedItemIds?,presentation?}。
presentation={layout?:auto|cover|chapter|image|balanced|text|cards|list|chart|spotlight,subtitle?:hidden|visible,marker?:auto|number|none,columns?:2|3|4|5,evidence?:boolean,interaction?:guided|static}。
模块={id,title,body,detail,placement?:main|detail,importance?:key|support,interaction?:none|detail|media|focus,media?,mediaAspect?,crop?,mediaFrame?,design?:{emphasis?:auto|title|body|value|media,align?:auto|left|center,mediaLayout?:auto|above|beside,highlight?:正文原句},value?,sourceIds?}。
表格 table={headers:string[],rows:string[][],focus?:boolean,tagColumns?:number[],seriesColumns?:number[],rowAccents?:boolean,footer?:{label,text}}；focus 开启点按表头聚焦整列、行标题聚焦整行；footer 表示不属于列分类的独立范围。tagColumns 指定用独立产品标签展示的列（从0计数，不能是首列），以间隔点或换行分项。seriesColumns 用系列卡呈现（与 tagColumns 不重叠），冒号前为范围标签；rowAccents 按行区分侧边色。单元格可换行，保持实际分类对应，不能编造科目或把未知范围填成已包含。
版式只控制展示，切换时保留全部内容字段。新建并列卡片组默认逐项点按聚焦，新建多行多列表格默认行列聚焦；用户明确要求静态时设置 presentation.interaction:static。卡片 interaction:focus 不妨碍内层图片/GIF/视频独立放大；detail 需有独立的补充内容才显式启用。已有页面的小幅修改沿用交互设置。主画面不自动输出补充资料入口。`;
