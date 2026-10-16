import test from 'node:test';import assert from 'node:assert/strict';
import {moveSlide,blankSlide} from '../lib/slide-order.ts';
import {initial,validSlide} from '../lib/deck.ts';
test('drag insertion gaps preserve slide identities and original array in both directions',()=>{
 const slides=['a','b','c','d'].map(id=>({...structuredClone(initial.slides[0]),id}));
 const ids=a=>a.map(s=>s.id).join('');
 assert.equal(ids(moveSlide(slides,'a',4)),'bcda');assert.equal(ids(moveSlide(slides,'c',0)),'cabd');assert.equal(ids(moveSlide(slides,'b',3)),'acbd');
 assert.equal(ids(moveSlide(slides,'b',1)),'abcd');assert.equal(ids(moveSlide(slides,'b',2)),'abcd');assert.equal(ids(slides),'abcd');assert.equal(moveSlide(slides,'a',4)[3],slides[0]);assert.equal(moveSlide(slides,'missing',0),slides);
});
test('new blank slide retains brand background but never inherits previous content or media',()=>{
 const source={...structuredClone(initial.slides[0]),background:'/media/bg.png',media:'/media/a.gif',gallery:['/media/v.mp4']};
 const blank=blankSlide(source,'fresh');assert.equal(validSlide(blank),true);assert.equal(blank.background,source.background);assert.equal(blank.media,'');assert.deepEqual(blank.gallery,[]);assert.deepEqual(blank.points,[]);assert.equal(blank.note,'');assert.equal(blank.id,'fresh');assert.equal(source.media,'/media/a.gif');
});
