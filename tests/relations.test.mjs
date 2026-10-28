import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {initial,validSlide} from '../lib/deck.ts';
import {validContent} from '../lib/content.ts';
import {styleExamples} from '../lib/templates.ts';
import {applyVariant,slideVariant,slideCategory} from '../lib/presentation-options.ts';
import {relationParts,relationPlan} from '../lib/relations.ts';
import {codexRules,proposalFrom} from '../lib/codex.mjs';
import {conversionRules,checkConversion} from '../lib/conversion.mjs';
import {initContent} from '../lib/content-interaction.ts';

const items=Array.from({length:6},(_,i)=>({id:'item-'+i,title:'模块 '+i,body:'说明 '+i,detail:'来源 '+i,...i===0?{media:'/media/one.png'}:{}}));
const source=()=>({...structuredClone(initial.slides[0]),id:'source',content:{kind:'process',goal:'讲清关系',summary:'持续改进',items:structuredClone(items)}});
test('five approved variants retain stable content, source fields and existing layouts when switching',()=>{
 const s=source();s.gallery=['/media/other.gif'];s.sourceLinks=[{documentId:'doc',page:1,label:'参考'}];const before=JSON.stringify(s);
 for(const variant of ['carousel','process-cards','induction','converge','cycle']){
  const next=applyVariant(s,variant);assert.ok(validSlide(next));assert.equal(slideVariant(next),variant);assert.deepEqual(next.content.items,s.content.items);assert.deepEqual(next.sourceLinks,s.sourceLinks);assert.deepEqual(next.gallery,s.gallery);assert.equal(next.id,s.id);
  const back=applyVariant(next,'cards');assert.deepEqual(back.content.items,s.content.items);assert.equal(back.content.summary,s.content.summary);
 }
 assert.equal(slideCategory(applyVariant(s,'cycle')).id,'relation');assert.equal(JSON.stringify(s),before);
 const examples=styleExamples([{...s,media:'/media/two.png'}]);assert.equal(examples.length,17);assert.ok(examples.every(validSlide));assert.equal(new Set(examples.map(slideVariant)).size,17);
});
test('relationship roles follow stable IDs after reordering; hidden details never become a visible node',()=>{
 const c=applyVariant(source(),'induction').content;c.presentation={...c.presentation,resultId:'item-1',bridgeId:'item-3'};c.items.push({id:'detail',title:'备稿',body:'参考',detail:'',placement:'detail'});
 c.items.reverse();let parts=relationParts(c);assert.equal(parts.result.id,'item-1');assert.equal(parts.bridge.id,'item-3');assert.equal(parts.premises.length,4);
 const plan=relationPlan(c);assert.equal(plan.nodes.length,6);assert.ok(!plan.nodes.some(n=>n.item.id==='detail'));assert.equal(plan.nodes.find(n=>n.role==='result').item.id,'item-1');assert.equal(plan.nodes.find(n=>n.role==='bridge').item.id,'item-3');
 c.presentation.bridgeId=null;assert.equal(relationParts(c).bridge,undefined);assert.equal(relationPlan(c).nodes.length,6);
 c.items=c.items.filter(i=>i.id!=='item-1');parts=relationParts(c);assert.ok(parts.result);assert.ok(parts.main.some(i=>i.id===parts.result.id));
});
test('confirmed six-node loop keeps the original geometry, four arcs and all six connections',()=>{
 const p=relationPlan(applyVariant(source(),'cycle').content);assert.equal(p.nodes.length,6);assert.equal(p.paths.length,6);assert.equal(p.paths.filter(d=>d.includes('Q')).length,4);assert.ok(!p.paths.some(d=>d.includes('C')));
 for(const n of p.nodes){assert.ok(n.x>=0&&n.y>=0);assert.ok(n.x+n.width<=100&&n.y+n.height<=100)}
 const center=applyVariant(source(),'converge').content;center.presentation.relationMode='center';assert.equal(relationPlan(center).nodes.length,6);assert.equal(relationPlan(center).nodes.filter(n=>n.role==='result').length,1);
 for(const count of [3,4,5,7,8]){const c=applyVariant(source(),'cycle').content;c.items=Array.from({length:count},(_,i)=>({...items[i%6],id:String(i)}));const loop=relationPlan(c);assert.equal(loop.paths.length,count);loop.paths.forEach((path,i)=>{const [x,y]=path.slice(1).split(/[ Q]/).map(Number),node=loop.nodes[i];assert.ok(Math.abs(x-(node.x+11)*10)<=125.01);assert.ok(Math.abs(y-(node.y+10)*5)<=58.01)})}
});
test('new presentation options validate strictly and are available to both local CLI paths',()=>{
 const c=applyVariant(source(),'carousel').content;
 assert.ok(validContent({...c,presentation:{layout:'carousel',autoplay:false,autoplaySeconds:8}}));
 for(const p of [{layout:'unknown'},{autoplay:'yes'},{autoplaySeconds:0},{autoplaySeconds:NaN},{relationMode:'random'},{resultId:2}])assert.equal(validContent({...c,presentation:p}),false);
 for(const rules of [codexRules,conversionRules])for(const name of ['carousel','process-cards','induction','converge','cycle','resultId','bridgeId'])assert.ok(rules.includes(name),name);
 const s=source(),next=applyVariant(s,'cycle');const output={summary:'保留事实，显示循环关系',slides:[{id:s.id,title:s.title,subtitle:s.subtitle,points:s.points,note:s.note,layout:s.layout,theme:'brand',designJson:null,compositionJson:null,contentJson:JSON.stringify(next.content)}]};
 assert.equal(proposalFrom(output,{revision:4,data:{slides:[s]}},'all').slides[0].content.presentation.layout,'cycle');
 const draft={id:'reference',name:'fixture',pages:[{number:1,preview:'/media/page.png',assets:[{id:'asset',url:'/media/one.png'}],elements:[]}],settings:{display:'screen'}};
 const converted=checkConversion({reason:'可编辑循环',questions:[],slidesJson:JSON.stringify([{title:'循环',content:next.content}]),destinationsJson:JSON.stringify([{sourceId:'asset',destination:'main',reason:'原图保留'}])},draft,{id:'group',pages:[1],keepOne:true});assert.equal(converted.slides[0].content.presentation.layout,'cycle');
});
test('rendered and exported markup preserves relation text, media, summaries and meaningful native controls',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const {Scene}=await vite.ssrLoadModule('/app/Scene.tsx'),{default:ContentEditor}=await vite.ssrLoadModule('/app/ContentEditor.tsx');
  for(const variant of ['induction','converge','cycle']){const s=applyVariant(source(),variant),html=renderToStaticMarkup(React.createElement(Scene,{s}));for(const item of items)assert.ok(html.includes(item.title));assert.ok(html.includes('one.png'));assert.equal((html.match(/data-relation-id=/g)||[]).length,6);assert.equal((html.match(/data-relation-focus=/g)||[]).length,6);assert.ok(html.includes('marker-end='));if(variant==='cycle'){assert.ok(html.includes('relation-cycle-summary'));assert.ok(!html.includes('class="content-summary"'))}
   if(variant==='induction'){const svg=html.match(/<svg class="relation-connections"[\s\S]*?<\/svg>/)[0],paths=(svg.match(/<path\b[^>]*>/g)||[]).slice(1);assert.ok(paths[0]);assert.ok(!paths[0].includes('marker-end='));assert.ok(paths[1].includes('marker-end='))}
   const editor=renderToStaticMarkup(React.createElement(ContentEditor,{s,doc:{...initial,slides:[s]},change:()=>{},tab:'media'}));assert.ok(editor.includes('关系与推导'));assert.ok(editor.includes('关系如何表达'));
  }
  const carousel=applyVariant(source(),'carousel');carousel.content.items.push({...items[1],media:'/media/two.png'});const h=renderToStaticMarkup(React.createElement(Scene,{s:carousel}));assert.ok(h.includes('gallery-track'));assert.ok(h.includes('data-gallery="play"'));assert.ok(!h.includes('data-gallery-autoplay="true"'));
  const stepSlide=applyVariant(source(),'process-cards');stepSlide.content.items[0].interaction='none';const steps=renderToStaticMarkup(React.createElement(Scene,{s:stepSlide}));assert.ok(steps.includes('inline-step-overview'));assert.equal((steps.match(/class="content-number"/g)||[]).length,6);assert.ok(!steps.includes('step-media-stage'));assert.equal((steps.match(/data-overview-focus=/g)||[]).length,5);
 }finally{await vite.close()}
});
test('relation focus toggles and resets without hiding nodes; serialized export uses the same behavior',()=>{
 for(const initialize of [initContent,new Function('return '+initContent.toString())()]){
  const root=new EventTarget(),buttons=['a','b'].map(id=>({dataset:{relationFocus:id},pressed:'false',getAttribute(){return this.pressed},setAttribute(_name,v){this.pressed=v},closest(selector){return selector==='[data-relation-focus]'?this:null}}));
  root.querySelectorAll=s=>s==='[data-relation-focus]'?buttons:[];root.querySelector=()=>null;
  const clean=initialize(root),tap=()=>{const e=new Event('click');Object.defineProperty(e,'target',{value:buttons[0]});root.dispatchEvent(e)};
  tap();assert.equal(buttons[0].pressed,'true');tap();assert.equal(buttons[0].pressed,'false');tap();root.dispatchEvent(new Event('presentation-reset'));assert.deepEqual(buttons.map(b=>b.pressed),['false','false']);assert.ok(buttons.every(b=>b.hidden===undefined));clean();
 }
});
