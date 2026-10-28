import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{presentationRules,harnessVersion}from'../lib/harness.mjs';import{codexRules}from'../lib/codex.mjs';import{conversionRules}from'../lib/conversion.mjs';
import{validContent,contentColumns,numberedItems,hasDetail,prepareGeneratedInteractions}from'../lib/content.ts';import{reviewSlide}from'../lib/quality.ts';import{initial}from'../lib/deck.ts';import{captureVersion,loadVersion}from'../lib/versions.ts';
const item=n=>({id:String(n),title:'功能'+n,body:'一句解释',detail:'完整资料'});
const content=()=>({kind:'cards',goal:'展示完整体系',summary:'',items:Array.from({length:5},(_,i)=>item(i))});
test('import and edit prompts load the same checked-in harness document',()=>{assert.equal(presentationRules,readFileSync(new URL('../docs/presentation-harness.md',import.meta.url),'utf8'));assert.match(presentationRules,/所属的内容框内/);for(const rules of[codexRules,conversionRules])assert.ok(rules.includes(presentationRules));assert.match(harnessVersion,/^[a-f0-9]{12}$/)});
test('five concise functions stay together, with numbering independent of supplementary media',()=>{const c=content();assert.equal(contentColumns(c),5);assert.ok(numberedItems({...c,items:[...c.items,{...item('extra'),placement:'detail',media:'/media/test.png'}]}));assert.deepEqual(reviewSlide({...initial.slides[0],title:'完整体系',subtitle:'',content:c},{display:'live'}),[]);assert.equal(contentColumns({...c,items:[...c.items,item(6)]}),3)});
test('key numbers hidden in details or a media-only layout prompt review without deleting source content',()=>{const key={...item('key'),importance:'key',value:'66小时',placement:'detail'};let s={...initial.slides[0],content:{...content(),items:[key]}};assert.ok(reviewSlide(s).some(x=>x.code==='key-in-detail'));s.content.items=[{...key,placement:'main'}];s.content.presentation={layout:'image'};assert.ok(reviewSlide(s).some(x=>x.code==='key-layout'));assert.equal(s.content.items[0].value,'66小时')});
test('plain text details require explicit interaction; visual preferences survive a version round trip',()=>{assert.equal(hasDetail(item(1)),false);assert.equal(hasDetail({...item(1),interaction:'detail'}),true);const c={...content(),presentation:{layout:'cards',subtitle:'hidden',marker:'number',columns:5,evidence:false}};assert.ok(validContent(c));assert.ok(!validContent({...c,presentation:{columns:8}}));const d={...initial,slides:[{...initial.slides[0],content:c}]},v=captureVersion(d,'样式');assert.deepEqual(loadVersion({...d,versions:[v]},v.id).slides[0].content,c)});
test('new parallel cards and tables gain guided focus while explicit static and source data stay intact',()=>{
 const c={...content(),items:[{...item(0),interaction:'none',value:'42'}, {...item(1),interaction:'media',media:'/media/example.gif'}, {...item(2),interaction:'detail'}]};
 const before=structuredClone(c),guided=prepareGeneratedInteractions(c);
 assert.deepEqual(guided.items.map(i=>i.interaction),['focus','focus','detail']);assert.equal(guided.presentation.interaction,'guided');assert.deepEqual(c,before);assert.ok(validContent(guided));
 assert.deepEqual(prepareGeneratedInteractions({...c,presentation:{interaction:'static'}}).items,c.items);
 const matrix={kind:'table',goal:'范围',summary:'',items:[],table:{headers:['类别','方案'],rows:[['一','甲'],['二','乙']],focus:false}};
 assert.equal(prepareGeneratedInteractions(matrix).table.focus,true);assert.equal(matrix.table.focus,false);
 assert.equal(prepareGeneratedInteractions({...matrix,presentation:{interaction:'static'}}).table.focus,false);
 assert.equal(prepareGeneratedInteractions({...c,items:[c.items[0]]}).items[0].interaction,'none');
 assert.equal(prepareGeneratedInteractions({...c,presentation:{layout:'cover'}}).items[0].interaction,'none');
});

test('shared design rules distinguish initial large typography from proportional fitting after user edits',()=>{
 for(const rules of [codexRules,conversionRules]){
  assert.match(rules,/首次生成使用正常大字号基准/);
  assert.match(rules,/用户确认后的手动编辑才进入二次适配/);
  assert.match(rules,/不在上一次缩小的结果上累计缩小/);
  assert.match(rules,/内部编辑适配标记由编辑器管理/);
 }
});
