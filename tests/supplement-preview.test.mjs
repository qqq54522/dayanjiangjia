import test from 'node:test';
import assert from 'node:assert/strict';
import {supplementPreviewStatus,confirmedSupplementGroups} from '../lib/supplement-preview.ts';
const group=(id,state='review')=>({id,state,slides:[{id:id+'-page'}]});
test('each preview needs explicit confirmation, and an overflowing neighbour never blocks a confirmed subset',()=>{
 const good=group('good'),bad=group('bad'),issues={'good-page':[],'bad-page':['文字越界']};
 assert.equal(supplementPreviewStatus(good,issues).state,'ready');assert.deepEqual(confirmedSupplementGroups([good,bad],issues),[]);
 good.state='accepted';assert.deepEqual(confirmedSupplementGroups([good,bad],issues).map(g=>g.id),['good']);
 assert.equal(supplementPreviewStatus(bad,issues).state,'blocked');assert.match(supplementPreviewStatus(bad,issues).messages[0],/文字越界/);
 bad.state='failed';assert.deepEqual(confirmedSupplementGroups([good,bad],issues).map(g=>g.id),['good']);
 good.state='review';assert.deepEqual(confirmedSupplementGroups([good,bad],issues),[]);
});
test('unmeasured, running and already inserted groups have an explicit reason and cannot continue',()=>{
 const g=group('g','accepted');assert.equal(supplementPreviewStatus(g,{}).state,'checking');
 assert.equal(supplementPreviewStatus({...g,state:'running'},{'g-page':[]}).state,'running');
 assert.equal(supplementPreviewStatus(g,{'g-page':[]},new Set(['g-page'])).state,'inserted');
 assert.deepEqual(confirmedSupplementGroups([g],{'g-page':[]},new Set(['g-page'])),[]);
});
