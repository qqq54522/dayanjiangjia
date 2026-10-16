import type {Slide} from './deck';
export const pageTypes=[['hero','章节开场','倾斜大标题，适合开场与过渡'],['statement','文字讲解','白色阅读面板，承载观点与解释'],['steps','并列要点','分栏比较，展示步骤或三个观点'],['highlight','重点提示','深色面板，突出一句结论'],['chart','数据对比','横向条形图，直接标出数值'],['media','素材演示','配合素材与排版设置，展示图片或视频']] as const;
export function styleExamples(source:Slide[]):Slide[]{
 const background=source.find(s=>s.background)?.background,media=source.find(s=>s.media)?.media||'';
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
export function chartPoint(text:string){const [label,raw]=text.split('|');const number=Number(raw);return {label,value:raw!==undefined&&Number.isFinite(number)?Math.max(0,Math.min(100,number)):0}}
