import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {ensurePreviewHistory,savePreviewResult,restorePreviewResult} from '../lib/conversion-history.mjs';
import {createConversions} from '../lib/conversion.mjs';
import {initial} from '../lib/deck.ts';

test('restoring a complete preview preserves alternatives and branches future edits from the selection',()=>{
 const g={state:'review',request:'initial',reason:'one',questions:['check'],destinations:[{sourceId:'a'}],issues:[],slides:[{id:'one',content:{items:[{id:'a',media:'/media/original.png'}]},sourceLinks:[{page:1}]}]};
 savePreviewResult(g);const first=structuredClone(g.previewHistory[0]);
 g.request='second';g.slides[0].id='two';g.slides[0].content.items[0].media='/media/another.png';savePreviewResult(g);const second=structuredClone(g.previewHistory[1]);
 g.state='accepted';g.confirmedAt='confirmed';g.renderIssues=['old issues'];
 restorePreviewResult(g,first.id,second.id);
 assert.deepEqual(g.slides,first.slides);assert.equal(g.state,'review');assert.equal(g.confirmedAt,undefined);assert.equal(g.renderIssues,undefined);assert.deepEqual(g.revisionHistory,[]);
 g.slides[0].id='three';g.request='new branch';savePreviewResult(g);
 assert.deepEqual(g.previewHistory.slice(0,2),[first,second]);assert.equal(g.previewHistory[2].parentId,first.id);assert.equal(g.previewHistory[2].label,'第 2 次修改');
 const before=structuredClone(g);assert.throws(()=>restorePreviewResult(g,second.id,first.id),/已变化/);assert.deepEqual(g,before);
 assert.throws(()=>restorePreviewResult(g,'other-group',g.activePreviewId),/找不到/);
});

test('legacy previews get one stable starting snapshot without fabricating prior generations',()=>{
 const g={state:'accepted',confirmedAt:'kept',slides:[{id:'existing'}],revisionHistory:[{request:'older text'}]};
 ensurePreviewHistory(g);const first=structuredClone(g);ensurePreviewHistory(g);assert.deepEqual(g,first);
 assert.equal(g.previewHistory.length,1);assert.equal(g.previewHistory[0].label,'已有结果');assert.equal(g.previewHistory[0].time,null);assert.equal(g.state,'accepted');
 const copy={slides:[{id:'existing'}]};ensurePreviewHistory(copy);assert.equal(copy.activePreviewId,g.activePreviewId);
});

test('conversion history survives restart and failed edits; restore changes only the selected pending supplement',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'preview-history-'));let proc,args,prompt='',workspace={id:'fixture',data:{...structuredClone(initial),slides:[]},revision:1};
 const launch=(_cmd,a)=>{args=a;prompt='';proc=new EventEmitter();proc.stdin=new PassThrough();proc.stdin.on('data',b=>prompt+=b);proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.kill=()=>true;return proc};
 let api=createConversions({dir,launch,workspace:()=>workspace});
 try{
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9xkAAAAASUVORK5CYII=','base64');
  // Upload a normal source fixture, then attach the minimal isolated project context.
  let d=api.upload(png,'fixture.png');const file=path.join(dir,'imports',d.id,'draft.json'),groupId=d.groups[0].id;d.supplement={projectId:'fixture'};writeFileSync(file,JSON.stringify(d));
  const finish=title=>{const asset=d.pages[0].assets[0];writeFileSync(args[args.indexOf('-o')+1],JSON.stringify({reason:title,questions:[],slidesJson:JSON.stringify([{title,content:{kind:'visual',goal:'证据',summary:'',items:[{id:'a',title:'',body:'',detail:'',media:asset.url}]}}]),destinationsJson:JSON.stringify([{sourceId:asset.id,destination:'main',reason:'主图'}])}));proc.emit('close',0);return api.read(d.id)};
  api.generate(d.id,groupId);d=finish('first');
  const first=structuredClone(d.groups[0].previewHistory[0]);d.supplement={projectId:'fixture'};const neighbour={id:'neighbour',pages:[2],state:'pending'};d.groups.push(neighbour);writeFileSync(file,JSON.stringify(d));
  api.revise(d.id,groupId,{request:'second edit'});d=finish('second');const second=structuredClone(d.groups[0].previewHistory[1]);
  api.patch(d.id,{groupId,decision:'accepted',previewIds:d.groups[0].slides.map(s=>s.id)});
  d=api.restore(d.id,groupId,{previewId:first.id,expectedPreviewId:second.id});assert.equal(d.groups[0].state,'review');assert.deepEqual(d.groups[1],neighbour);
  api.revise(d.id,groupId,{request:'branch from first'});assert.ok(prompt.includes('first'));assert.ok(!prompt.includes('second edit'));d=finish('third');
  assert.equal(d.groups[0].previewHistory[2].parentId,first.id);const history=structuredClone(d.groups[0].previewHistory);const current=structuredClone(d.groups[0].slides);
  api.close();api=createConversions({dir,launch,workspace:()=>workspace});d=api.read(d.id);assert.deepEqual(d.groups[0].previewHistory,history);
  // Failed launch or invalid output must never destroy the saved result.
  api.revise(d.id,groupId,{request:'failed edit'});writeFileSync(args[args.indexOf('-o')+1],'invalid');proc.emit('close',0);
  d=api.read(d.id);assert.equal(d.groups[0].state,'failed');assert.deepEqual(d.groups[0].slides,current);assert.deepEqual(d.groups[0].previewHistory,history);
  d.supplement={projectId:'fixture'};writeFileSync(file,JSON.stringify(d));workspace.data.slides=first.slides;
  assert.throws(()=>api.restore(d.id,groupId,{previewId:first.id,expectedPreviewId:d.groups[0].activePreviewId}),/已经插入/);
 }finally{api.close();rmSync(dir,{recursive:true,force:true})}
});
