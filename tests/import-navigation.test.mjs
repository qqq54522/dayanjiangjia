import test from 'node:test';import assert from 'node:assert/strict';import{resumeImport,hasImportResult,needsImportGeneration,readyImportGroups}from'../lib/import-navigation.ts';
const groups=[{id:'new',state:'pending'},{id:'done',state:'accepted',slides:[{}]},{id:'review',state:'review',slides:[{}]},{id:'running',state:'running'},{id:'failed',state:'failed'}];
test('reopen existing results goes straight to review without selecting ungenerated pages',()=>{assert.deepEqual(resumeImport(groups),{step:2,checked:['done','review','running','failed'],selected:'failed'})});
test('new uploads and reference attachment stay in selection',()=>{assert.equal(resumeImport([{id:'a',state:'pending'}]).step,1);assert.deepEqual(resumeImport(groups,true),{step:1,checked:['new'],selected:'new'})});
test('generating unfinished pages keeps healthy results and includes failed retries even with a retained preview',()=>{assert.deepEqual(groups.filter(needsImportGeneration).map(g=>g.id),['new','failed']);assert.equal(needsImportGeneration({id:'retry',state:'failed',slides:[{}]}),true);assert.deepEqual(groups.filter(hasImportResult).map(g=>g.id),['done','review'])});


test('resuming a selected batch retains failed and queued members without pulling in unrelated pages',()=>{
 assert.deepEqual(resumeImport(groups,false,['new','done','failed']),{step:2,checked:['new','done','failed'],selected:'failed'});
 assert.deepEqual(resumeImport([{id:'broken',state:'failed'}]),{step:2,checked:['broken'],selected:'broken'});
});
test('a measured accepted subset can apply while neighbours are pending, failed or not yet checked',()=>{
 const list=[{id:'ready',state:'accepted',slides:[{id:'a'}]},{id:'unchecked',state:'accepted',slides:[{id:'b'}]},{id:'bad',state:'accepted',slides:[{id:'c'}]},{id:'failed',state:'failed'},{id:'new',state:'pending'}];
 assert.deepEqual(readyImportGroups(list,{a:[],c:['越界']}).map(g=>g.id),['ready']);
 assert.deepEqual(readyImportGroups(list,{a:[],b:[],c:['越界']}).map(g=>g.id),['ready','unchecked']);
 assert.deepEqual(list.map(g=>g.state),['accepted','accepted','accepted','failed','pending']);
});
