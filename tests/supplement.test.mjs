import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openStore} from '../lib/store.mjs';
import {initial} from '../lib/deck.ts';
import {createConversions} from '../lib/conversion.mjs';
import {createSupplements} from '../lib/supplement.mjs';
import {supplementContext,insertSupplement} from '../lib/supplement-context.ts';
import {EditorState} from '../lib/editor-state.ts';
import {validPresentation} from '../lib/content.ts';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9xkAAAAASUVORK5CYII=','base64');
function fakeCli(){const calls=[];return {calls,launch(_cmd,args,options){const proc=new EventEmitter();proc.stdin=new PassThrough();proc.stdout=new PassThrough();proc.stderr=new PassThrough();proc.kill=()=>true;let prompt='';proc.stdin.on('data',b=>prompt+=b);const call={args,options,proc,get prompt(){return prompt},complete(result,code=0){writeFileSync(args[args.indexOf('-o')+1],JSON.stringify(result));proc.emit('close',code)}};calls.push(call);return proc}}}
function fixture(){
 const dir=mkdtempSync(path.join(tmpdir(),'supplement-')),store=openStore(dir),projectId=store.create('隔离测试稿件').id,cli=fakeCli();
 const existing=Array.from({length:2},()=>structuredClone(initial.slides[0])).map((s,i)=>({...s,id:'existing-'+i,title:i?'范围说明':'一个观点',chapter:{id:'chapter-a',title:'同一主题',visible:true,color:'forest'}}));
 const data={...store.read(projectId).data,slides:existing,versions:[{id:'fixed',name:'已保存版本',time:new Date().toISOString(),slides:structuredClone(existing),comments:[]}]};store.save(data,0,projectId);
 const conversions=createConversions({dir,workspace:id=>store.read(id),launch:cli.launch});
 const d=conversions.upload(png,'new.png',{supplement:{projectId}}),groupId=d.groups[0].id;
 const reviewCli=fakeCli(),supplements=createSupplements({dir,store,conversions,launch:reviewCli.launch});
 const generated=()=>{const now=conversions.read(d.id),asset=now.pages[0].assets[0];return {reason:'补充一个证据',questions:[],slidesJson:JSON.stringify([{title:'新增证据',subtitle:'',note:'',content:{kind:'visual',goal:'提供证据',summary:'',items:[{id:'asset',title:'',body:'',detail:'',media:asset.url}]}}]),destinationsJson:JSON.stringify([{sourceId:asset.id,destination:'main',reason:'主图'}])}};
 function generate(){conversions.generate(d.id,groupId);cli.calls.at(-1).complete(generated())}
 const input=()=>({projectId,revision:store.read(projectId).revision,groupIds:[groupId],placement:{afterId:existing[0].id,chapterId:'chapter-a'}});
 function confirm(){const g=conversions.read(d.id).groups.find(g=>g.id===groupId);return conversions.patch(d.id,{groupId,decision:'accepted',previewIds:g.slides.map(s=>s.id)})}
 function review(findings=[]){confirm();const j=supplements.review(d.id,input());reviewCli.calls.at(-1).complete({summary:'已结合前后页检查',findings});return supplements.read(d.id)}
 return {dir,store,projectId,conversions,supplements,d,groupId,cli,reviewCli,generated,generate,confirm,input,review,existing,clean(){supplements.close();conversions.close();store.close();rmSync(dir,{recursive:true,force:true})}};
}

test('supplement generation sees the current deck but generates only selected source pages',()=>{
 const f=fixture();try{
  assert.equal(f.d.groups[0].keepOne,true);f.generate();const prompt=f.cli.calls[0].prompt;
  assert.match(prompt,/"purpose":"supplement"/);assert.match(prompt,/一个观点/);assert.match(prompt,/"representatives"/);assert.match(prompt,/当前已确认稿件/);
  assert.match(prompt,/"keepOne":true/);assert.equal(f.store.read(f.projectId).revision,1);
  const other=f.store.create('另一个项目').id;assert.throws(()=>f.supplements.review(f.d.id,{...f.input(),projectId:other}),/不属于/);
 }finally{f.clean()}
});

test('position review checks neighbours, explicit insertion preserves every existing page and fixed version; undo works',async()=>{
 const f=fixture();try{
  f.generate();const before=f.store.read(f.projectId),job=f.review();
  assert.match(f.reviewCli.calls[0].prompt,/"previous"/);assert.match(f.reviewCli.calls[0].prompt,/"next"/);assert.match(f.reviewCli.calls[0].prompt,/新增证据/);
  assert.equal(f.store.read(f.projectId).revision,before.revision,'review never changes the manuscript');
  const result=f.supplements.insert(f.d.id,{projectId:f.projectId,revision:before.revision,jobId:job.id});
  assert.equal(result.data.slides.length,3);assert.deepEqual(result.data.slides[0],before.data.slides[0]);assert.deepEqual(result.data.slides[2],before.data.slides[1]);
  assert.equal(result.data.slides[1].chapter.id,'chapter-a');assert.equal(result.data.slides[1].sourceLinks[0].documentId,f.d.id);assert.deepEqual(result.data.versions,before.data.versions);
  assert.throws(()=>f.supplements.insert(f.d.id,{projectId:f.projectId,revision:before.revision,jobId:job.id}),/先完成/);
  const editor=new EditorState(before.data,before.revision,async(data,rev)=>f.store.save(data,rev,f.projectId).revision,()=>{});
  editor.acceptSaved(result.data,result.revision,before.revision);assert.equal(editor.dirty,false);editor.undo();await editor.flush();
  assert.deepEqual(f.store.read(f.projectId).data.slides,before.data.slides);assert.deepEqual(f.store.read(f.projectId).data.versions,before.data.versions);
 }finally{f.clean()}
});

test('stale deck edits and regenerated results invalidate insertion until reviewed again',()=>{
 const f=fixture();try{
  f.generate();let job=f.review();let current=f.store.read(f.projectId);current.data.slides[1].title='生成期间的新修改';f.store.save(current.data,current.revision,f.projectId);
  assert.throws(()=>f.supplements.insert(f.d.id,{projectId:f.projectId,revision:job.revision,jobId:job.id}),/已变化/);
  job=f.review();f.generate();assert.throws(()=>f.supplements.insert(f.d.id,{projectId:f.projectId,revision:job.revision,jobId:job.id}),/已变化/);
  job=f.review();const result=f.supplements.insert(f.d.id,{projectId:f.projectId,revision:job.revision,jobId:job.id});assert.equal(result.data.slides[2].title,'生成期间的新修改');
 }finally{f.clean()}
});

test('facts conflicts require explicit acknowledgement and never rewrite the old pages',()=>{
 const f=fixture();try{
  f.generate();const job=f.review([{severity:'conflict',message:'前后数字口径不同，请核对。'}]);const input={projectId:f.projectId,revision:job.revision,jobId:job.id};
  assert.throws(()=>f.supplements.insert(f.d.id,input),/冲突/);const before=f.store.read(f.projectId).data;
  const result=f.supplements.insert(f.d.id,{...input,acknowledge:true});assert.deepEqual(result.data.slides[0],before.slides[0]);assert.deepEqual(result.data.slides[2],before.slides[1]);
 }finally{f.clean()}
});

test('position adjustment regenerates the selected group only and retains its previous preview as context',()=>{
 const f=fixture();try{
  f.generate();f.confirm();const d=f.conversions.read(f.d.id);d.groups.push({...structuredClone(d.groups[0]),id:'untouched',state:'accepted'});writeFileSync(path.join(f.dir,'imports',d.id,'draft.json'),JSON.stringify(d));
  const before=structuredClone(d.groups[1]);f.supplements.adjust(d.id,f.input());const call=f.cli.calls.at(-1);
  assert.match(call.prompt,/"placement"/);assert.match(call.prompt,/"previousSlides":\[/);call.complete(f.generated());
  assert.deepEqual(f.conversions.read(d.id).groups[1],before);assert.equal(f.store.read(f.projectId).data.slides.length,2);
 }finally{f.clean()}
});

test('cancelled and malformed review output cannot be used to insert pages',()=>{
 const f=fixture();try{
  f.generate();f.confirm();f.supplements.review(f.d.id,f.input());const call=f.reviewCli.calls.at(-1);f.supplements.cancel();call.complete({summary:'late',findings:[]});assert.equal(f.supplements.read(f.d.id).state,'cancelled');
  f.supplements.review(f.d.id,f.input());f.reviewCli.calls.at(-1).complete({summary:'bad',findings:[],state:'inserted'});assert.equal(f.supplements.read(f.d.id).state,'failed');
  assert.equal(f.store.read(f.projectId).data.slides.length,2);
 }finally{f.clean()}
});

test('position context validates anchors and chapters, and insertion supports empty decks and rejects duplicate IDs',()=>{
 const f=fixture();try{
  const snapshot=f.store.read(f.projectId);assert.throws(()=>supplementContext(snapshot,{afterId:'deleted',chapterId:null}),/已删除/);assert.throws(()=>supplementContext(snapshot,{afterId:null,chapterId:'missing'}),/章节/);
  assert.throws(()=>insertSupplement(snapshot.data,[snapshot.data.slides[0]],{afterId:null,chapterId:null}),/已经插入/);
  const page={...snapshot.data.slides[0],id:'new'};const empty={...snapshot.data,slides:[]};const next=insertSupplement(empty,[page],{afterId:null,chapterId:null});assert.equal(next.slides[0].chapter,undefined);assert.deepEqual(next.versions,empty.versions);
 }finally{f.clean()}
});

test('conversational revision includes source assets, current result, history and measured issues; failure preserves the preview',()=>{
 const f=fixture();try{
  f.generate();f.confirm();const before=f.conversions.read(f.d.id).groups[0].slides;
  f.conversions.revise(f.d.id,f.groupId,{request:'把视频框收窄，文字占六成，其他内容保留。',renderIssues:['正文下边界溢出'],allowPageCountChange:false});
  const call=f.cli.calls.at(-1),prompt=call.prompt;
  assert.match(prompt,/把视频框收窄/);assert.match(prompt,/正文下边界溢出/);assert.match(prompt,/"previousSlides"/);assert.match(prompt,/"revisionHistory"/);
  assert.ok(prompt.includes(before[0].content.items[0].media));assert.match(prompt,/新增证据/);
  call.complete({},1);let g=f.conversions.read(f.d.id).groups[0];assert.equal(g.state,'failed');assert.deepEqual(g.slides,before);
  f.conversions.revise(f.d.id,f.groupId,{request:'保留前一轮要求，再把素材放左边。'});
  assert.match(f.cli.calls.at(-1).prompt,/文字占六成/);
  const output=f.generated(),parsed=JSON.parse(output.slidesJson);parsed[0].content.presentation={layout:'balanced',textShare:60,mediaSide:'left'};
  f.cli.calls.at(-1).complete({...output,slidesJson:JSON.stringify(parsed)});g=f.conversions.read(f.d.id).groups[0];assert.equal(g.state,'review');assert.equal(g.confirmedAt,undefined);assert.equal(g.slides[0].content.presentation.textShare,60);
  assert.throws(()=>f.conversions.patch(f.d.id,{groupId:f.groupId,decision:'accepted',previewIds:before.map(s=>s.id)}),/预览已变化/);
  assert.throws(()=>f.supplements.review(f.d.id,f.input()),/确认这一组/);
 }finally{f.clean()}
});

test('text/media proportions are bounded numeric presentation settings',()=>{
 assert.equal(validPresentation({layout:'balanced',textShare:60,mediaSide:'left'}),true);
 for(const value of [0,19,76,NaN,Infinity,'60'])assert.equal(validPresentation({textShare:value}),false);
 assert.equal(validPresentation({mediaSide:'top'}),false);
});
