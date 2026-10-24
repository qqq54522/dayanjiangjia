import test from 'node:test';
import assert from 'node:assert/strict';
import {presentationCategories,presentationVariants,slideCategory,slideVariant,applyVariant} from '../lib/presentation-options.ts';
import {initial,validSlide} from '../lib/deck.ts';
import {styleExamples} from '../lib/templates.ts';
const variants=Object.keys(presentationVariants);
test('one taxonomy covers every example and every selectable variant exactly once',()=>{
 assert.equal(presentationCategories.length,6);
 assert.deepEqual(presentationCategories.flatMap(c=>c.variants),variants);
 const examples=styleExamples(initial.slides);
 assert.deepEqual(examples.map(slideVariant),variants);
 for(const s of examples){assert.ok(validSlide(s));assert.ok(slideCategory(s));}
});
test('changing purpose and layout preserves semantic contents, locks, assets and provenance',()=>{
 const original={...initial.slides[0],content:{kind:'cards',goal:'原主张',summary:'总结',items:[{id:'a',title:'时长',body:'小时',value:'66',detail:'说明',media:'/media/sample.png',sourceIds:['ref1']},{id:'b',title:'补充',body:'保留',detail:'完整原文',placement:'detail'}],lockedItemIds:['a'],table:{headers:['栏目'],rows:[['原数据']]},presentation:{subtitle:'visible',marker:'number',evidence:true}},sourceLinks:[{purpose:'content',documentId:'ref1',page:1,label:'来源'}]};
 const before=JSON.stringify(original);
 let current=original;
 for(const id of variants){current=applyVariant(current,id);assert.equal(slideVariant(current),id);assert.ok(validSlide(current));assert.deepEqual(current.content.items,original.content.items);assert.deepEqual(current.content.lockedItemIds,['a']);assert.deepEqual(current.content.table,original.content.table);assert.deepEqual(current.sourceLinks,original.sourceLinks);assert.equal(current.content.summary,'总结');assert.equal(current.content.presentation.subtitle,'visible');}
 assert.equal(JSON.stringify(original),before);
});
test('legacy variants resolve correctly with or without media and preserve original fields',()=>{
 for(const media of ['', '/media/sample.mp4'])for(const id of variants){
 const original={...initial.slides[0],layout:'statement',subtitle:'解释',points:['要点一','要点二'],media,gallery:media?['/media/another.gif']:[]};
 const next=applyVariant(original,id);assert.equal(slideVariant(next),id,`${id} ${media}`);assert.ok(validSlide(next));for(const key of ['id','title','subtitle','points','media','gallery','source','note'])assert.deepEqual(next[key],original[key]);
 }
});
test('an empty page can intentionally select a point without being classified as an opening',()=>{
 const s={...initial.slides[0],content:{kind:'point',goal:'',summary:'',items:[]}};
 assert.equal(slideVariant(applyVariant(s,'point')),'point');
});
