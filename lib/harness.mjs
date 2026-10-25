import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Resolve relative to this module so startup cwd and the CLI job temp directory do not matter.
export const presentationRules=readFileSync(new URL('../docs/presentation-harness.md',import.meta.url),'utf8');
export const harnessVersion=createHash('sha256').update(presentationRules).digest('hex').slice(0,12);
export const contentContract=`正文采用 content={kind,goal,summary,items,table?,lockedItemIds?,presentation?}。
presentation={layout?:auto|cover|chapter|image|balanced|text|cards|list|chart|spotlight,subtitle?:hidden|visible,marker?:auto|number|none,columns?:2|3|4|5,evidence?:boolean}。
模块={id,title,body,detail,placement?:main|detail,importance?:key|support,interaction?:none|detail|media|focus,media?,mediaAspect?,crop?,mediaFrame?,design?:{emphasis?:auto|title|body|value|media,align?:auto|left|center,mediaLayout?:auto|above|beside,highlight?:正文原句},value?,sourceIds?}。
表格 table={headers:string[],rows:string[][],focus?:boolean,footer?:{label,text}}；focus 开启点按表头聚焦整列、行标题聚焦整行；footer 表示不属于列分类的独立范围。单元格可换行，保持实际分类对应，不能编造科目或把未知范围填成已包含。
版式只控制展示，切换时保留全部内容字段。未指定 interaction 时纯文字静态、素材可放大；detail 需有独立的补充内容才显式启用。主画面不自动输出补充资料入口。`;
