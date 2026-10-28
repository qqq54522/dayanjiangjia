import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {initial} from '../lib/deck.ts';

test('HTTP supplement generation → placement review → insertion; project isolation, stale checks and undo', {skip:process.platform==='win32'},async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'supplement-http-')),bin=path.join(dir,'bin');mkdirSync(bin);
 writeFileSync(path.join(bin,'codex'),`#!${process.execPath}
const fs=require('fs');let text='';process.stdin.on('data',b=>text+=b);process.stdin.on('end',()=>{const j=JSON.parse(text.slice(text.indexOf('{"harnessVersion"')));let result;if(j.newPages){result={summary:'补页承接前页，保留后页的展开顺序。',findings:[]}}else{const asset=j.pages[0].assets[0];result={reason:'新增一页证据，沿用当前稿件。',questions:[],slidesJson:JSON.stringify([{title:'新增证据',subtitle:'',note:'',content:{kind:'visual',goal:'补充证据',summary:'',items:[{id:'image',title:'',body:'',detail:'',media:asset.url}]}}]),destinationsJson:JSON.stringify([{sourceId:asset.id,destination:'main',reason:'新页主图'}])}}fs.writeFileSync(process.argv[process.argv.indexOf('-o')+1],JSON.stringify(result))});`,{mode:0o755});
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DECK_DATA_DIR:dir,PATH:bin+path.delimiter+process.env.PATH},stdio:['ignore','pipe','pipe']});let stderr='';proc.stderr.on('data',b=>stderr+=b);
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(stderr||'start timeout')),10000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve()});proc.once('exit',()=>{clearTimeout(timer);reject(Error(stderr))})});
  const base='http://127.0.0.1:'+port;
  const api=async(url,method='GET',data)=>{const r=await fetch(base+url,{method,...data===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}});const j=await r.json();assert.ok(r.ok,JSON.stringify(j));return j};
  const wait=async(url,predicate)=>{for(let i=0;i<100;i++){const j=await api(url);if(predicate(j))return j;await new Promise(r=>setTimeout(r,30))}throw Error('mock CLI timeout')};
  const a=await api('/api/projects','POST',{title:'隔离补页验收'}),b=await api('/api/projects','POST',{title:'另一个项目'});
  let snapshot=await api('/api/projects/'+a.id+'/workspace');const old=Array.from({length:2},(_,i)=>({...structuredClone(initial.slides[0]),id:'old-'+i,title:'已有页面 '+i,chapter:{id:'topic',title:'既有主题',visible:true}}));
  const doc={...snapshot.data,slides:old,versions:[{id:'fixed',name:'已保存',time:new Date().toISOString(),slides:structuredClone(old)}]};await api('/api/projects/'+a.id+'/workspace','PUT',{data:doc,revision:snapshot.revision});snapshot=await api('/api/projects/'+a.id+'/workspace');
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9xkAAAAASUVORK5CYII=','base64');
  const uploaded=await fetch(base+'/api/references?purpose=supplement&project='+a.id+'&name=new.png',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:png});assert.equal(uploaded.status,202);const draft=await uploaded.json(),groupIds=[draft.groups[0].id];
  await api('/api/references/'+draft.id+'/generate-all','POST',{groupIds});const generated=await wait('/api/references/'+draft.id,d=>d.groups[0].state!=='running');assert.equal(generated.groups[0].state,'review');
  const input={projectId:a.id,revision:snapshot.revision,groupIds,placement:{afterId:old[0].id,chapterId:'topic'}};
  const wrong=await fetch(base+'/api/supplements/'+draft.id+'/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,projectId:b.id})});assert.equal(wrong.status,400);
  await api('/api/supplements/'+draft.id+'/review','POST',input);let reviewed=await wait('/api/supplements/'+draft.id,j=>j.state!=='running');assert.equal(reviewed.state,'completed');
  const concurrent={...snapshot.data,title:'期间改了标题'};await api('/api/projects/'+a.id+'/workspace','PUT',{data:concurrent,revision:snapshot.revision});
  const stale=await fetch(base+'/api/supplements/'+draft.id+'/insert',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:a.id,revision:input.revision,jobId:reviewed.id})});assert.equal(stale.status,409);
  snapshot=await api('/api/projects/'+a.id+'/workspace');await api('/api/supplements/'+draft.id+'/review','POST',{...input,revision:snapshot.revision});reviewed=await wait('/api/supplements/'+draft.id,j=>j.state!=='running');
  const result=await api('/api/supplements/'+draft.id+'/insert','POST',{projectId:a.id,revision:snapshot.revision,jobId:reviewed.id});assert.equal(result.data.slides.length,3);assert.deepEqual(result.data.slides[0],snapshot.data.slides[0]);assert.deepEqual(result.data.slides[2],snapshot.data.slides[1]);assert.deepEqual(result.data.versions,snapshot.data.versions);
  assert.equal((await api('/api/projects/'+b.id+'/workspace')).data.slides.length,0);
  await api('/api/projects/'+a.id+'/workspace','PUT',{data:snapshot.data,revision:result.revision});assert.deepEqual((await api('/api/projects/'+a.id+'/workspace')).data.slides,snapshot.data.slides);
 }finally{const ended=once(proc,'exit');proc.kill();await ended;rmSync(dir,{recursive:true,force:true})}
});
