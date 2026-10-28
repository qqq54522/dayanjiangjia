import test from 'node:test';
import assert from 'node:assert/strict';
import {initCardTypography} from '../lib/card-typography.ts';
import {afterContentEdit,validContent,preserveLockedItems} from '../lib/content.ts';
import {captureVersion,loadVersion} from '../lib/versions.ts';
import {initial} from '../lib/deck.ts';
const item=id=>({id,title:'学得懂',body:'听得懂原理',detail:''});
const content=()=>({kind:'cards',goal:'讲清学习关系',summary:'',items:[item('a'),item('b'),item('c')]});
test('only later growth in the editor opts into fitting; references, reorder, and removal do not shrink a new page',()=>{
 const before=content();assert.ok(validContent(before));
 assert.deepEqual(afterContentEdit(undefined,before),before);
 for(const next of [{...before,items:before.items.toReversed()},{...before,items:before.items.slice(0,2)},{...before,items:[...before.items,{...item('ref'),placement:'detail'}]}])assert.equal(afterContentEdit(before,next).presentation?.textFit,undefined);
 const edited=afterContentEdit(before,{...before,items:[...before.items,item('d')]});assert.equal(edited.presentation.textFit,'after-edit');assert.ok(validContent(edited));assert.equal(before.presentation,undefined);
 assert.equal(afterContentEdit(before,{...before,items:before.items.map((i,n)=>n?i:{...i,body:i.body+'新增解释'})}).presentation.textFit,'after-edit');
 const doc={...initial,slides:[{...initial.slides[0],content:edited}]};const version=captureVersion(doc,'编辑之后');assert.deepEqual(loadVersion({...doc,versions:[version]},version.id).slides[0].content,edited);
 const generated={...before,presentation:{layout:'cards',textFit:'after-edit'}};
 assert.equal(preserveLockedItems(undefined,generated).presentation.textFit,undefined);
 assert.equal(preserveLockedItems(edited,generated).presentation.textFit,'after-edit');
});
function mockRoot(mode,required=.8){let scale=1,disposed=false,resize;const group={dataset:{cardFit:mode},style:{setProperty(_name,value){scale=Number(value)}},querySelectorAll(){return [{clientWidth:300,clientHeight:200,get scrollWidth(){return 300},get scrollHeight(){return 200*scale/required},querySelectorAll(){return []}}]}};const root={clientWidth:960,querySelector(){return group},addEventListener(){},removeEventListener(){disposed=true}};return {root,group,get scale(){return scale},set required(value){required=value},get disposed(){return disposed},resize:()=>resize?.(),Observer:class{constructor(callback){resize=callback}observe(){}disconnect(){}}}}
test('first rendering never auto-shrinks; edited cards shrink only on measured overflow and reset from baseline',async()=>{
 const oldObserver=globalThis.ResizeObserver,oldDocument=globalThis.document;
 try{
  const fresh=mockRoot('initial',.5);globalThis.ResizeObserver=fresh.Observer;globalThis.document={fonts:{ready:Promise.resolve()}};
  assert.equal(initCardTypography(fresh.root),undefined);assert.equal(fresh.scale,1);
  const edited=mockRoot('after-edit',.8);globalThis.ResizeObserver=edited.Observer;const close=initCardTypography(edited.root);assert.ok(edited.scale<1&&edited.scale>=.65);const first=edited.scale;edited.resize();assert.equal(edited.scale,first,'must not compound the scale');edited.required=1.2;edited.resize();assert.equal(edited.scale,1,'removing content restores baseline');
  edited.required=.3;edited.resize();assert.equal(edited.scale,.65);assert.equal(edited.group.dataset.copyOverflow,'true');close();assert.equal(edited.disposed,true);await Promise.resolve();
 }finally{globalThis.ResizeObserver=oldObserver;globalThis.document=oldDocument}
});
