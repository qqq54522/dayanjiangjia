import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import net from 'node:net';import {once} from 'node:events';
import {mp4,gif} from '../tests/fixtures.mjs';import {FONTS} from '../lib/fonts.mjs';import {unzipSync} from 'fflate';
async function start(){const dir=mkdtempSync(path.join(tmpdir(),'deck-http-'));mkdirSync(path.join(dir,'fonts'));for(const f of FONTS)writeFileSync(path.join(dir,'fonts',f.name),Buffer.from([0,1,0,0,0,0,0,0]));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DECK_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let output='';proc.stderr.on('data',x=>output+=x);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server start timeout '+output)),10000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve()});proc.once('exit',()=>{clearTimeout(timer);reject(Error(output))})});
 return {base:'http://127.0.0.1:'+port,dir,async stop(){const ended=once(proc,'exit');proc.kill();await ended;rmSync(dir,{recursive:true,force:true})}}}
test('HTTP upload → save → ZIP → second workspace; byte ranges, isolation and stale writes',async()=>{
 const a=await start(),b=await start();
 try{const upload=async(bytes)=>{const r=await fetch(a.base+'/api/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});assert.equal(r.status,200);return (await r.json()).url};const video=await upload(mp4),image=await upload(gif);
 const config=await (await fetch(a.base+'/api/codex')).json();assert.equal(config.settings.model,'gpt-6-astra');assert.equal(config.settings.effort,'medium');
 const publication=await (await fetch(a.base+'/api/publish')).json();assert.deepEqual(publication.publications,[]);
 assert.equal((await fetch(a.base+'/api/publish?title=Test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,415);
 assert.equal((await fetch(a.base+'/api/publish?title=Test',{method:'POST',headers:{'Content-Type':'text/html',Origin:'https://untrusted.example'},body:'<html></html>'})).status,403);
 const set=await fetch(a.base+'/api/codex/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-6-luna',effort:'high'})});assert.equal(set.status,200);assert.equal((await set.json()).settings.effort,'high');
 assert.equal((await fetch(a.base+'/api/codex/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'x;bad',effort:'high'})})).status,400);
 assert.equal((await fetch(a.base+'/api/codex/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:-1,scope:'all',request:'test'})})).status,409);
 assert.equal((await fetch(a.base+'/api/codex/start',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{}'})).status,403);
 const w=await (await fetch(a.base+'/api/workspace')).json();w.data.slides[0].background=image;w.data.slides[0].media=video;w.data.slides[0].gallery=[image];
 w.data.versions=[{id:'fixed-version',name:'同事演讲 A版',time:new Date().toISOString(),slides:structuredClone(w.data.slides)}];w.data.slides[0].title='保存版本后改过的草稿';
 const save=await fetch(a.base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:w.data,revision:w.revision})});assert.equal(save.status,200);
 for(const [range,start,end] of [['bytes=0-23',0,23],['bytes=24-',24,mp4.length-1],['bytes=-8',mp4.length-8,mp4.length-1]]){const r=await fetch(a.base+video,{headers:{Range:range}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),mp4.subarray(start,end+1));}
 assert.equal((await fetch(a.base+video,{headers:{Range:'bytes=9999999-'}})).status,416);assert.equal((await fetch(a.base+video,{method:'HEAD'})).headers.get('content-type'),'video/mp4');
 const exported=await fetch(a.base+'/api/export');assert.equal(exported.headers.get('content-type'),'application/zip');const zip=Buffer.from(await exported.arrayBuffer());assert.equal(Object.keys(unzipSync(zip)).filter(x=>x.startsWith('fonts/')).length,4);
 const imported=await fetch(b.base+'/api/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:zip});assert.equal(imported.status,200);const data=(await imported.json()).data;assert.deepEqual(data,w.data);assert.deepEqual(Buffer.from(await (await fetch(b.base+data.slides[0].media)).arrayBuffer()),mp4);
 const fixed=await fetch(a.base+'/api/export?version=fixed-version');assert.equal(fixed.status,200);
 const restored=await fetch(b.base+'/api/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:await fixed.arrayBuffer()});const frozen=(await restored.json()).data;assert.equal(frozen.title,w.data.title);assert.deepEqual(frozen.slides,w.data.versions[0].slides);assert.notEqual(frozen.slides[0].title,w.data.slides[0].title);assert.deepEqual(frozen.comments,[]);assert.equal(frozen.versions.length,1);assert.equal((await fetch(a.base+'/api/export?version=missing')).status,404);assert.deepEqual((await (await fetch(a.base+'/api/workspace')).json()).data,w.data);
 assert.equal((await fetch(a.base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:w.data,revision:0})})).status,409);
 assert.equal((await fetch(a.base+'/api/media',{method:'POST',headers:{'Content-Type':'application/octet-stream',Origin:'https://untrusted.example'},body:gif})).status,403);
 assert.equal((await fetch(a.base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
 assert.equal((await fetch(a.base+'/fonts.css')).status,200);assert.equal((await fetch(a.base+'/')).status,200);
 }finally{await a.stop();await b.stop()}
});

test('project library creates, opens and autosaves separate drafts',async()=>{
 const a=await start();
 try{
  const library=await (await fetch(a.base+'/api/projects')).json();assert.equal(library.projects.length,1);
  const original=library.projects[0];
  const created=await fetch(a.base+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'客户培训'})});assert.equal(created.status,201);
  const project=await created.json();assert.equal(project.slideCount,0);
  writeFileSync(path.join(a.dir,'publications.json'),JSON.stringify([{id:'second',projectId:project.id,url:'https://public.example.test/v2/index.html',createdAt:'2026-10-26T12:00:00Z'},{id:'first',projectId:project.id,url:'https://public.example.test/v1/index.html',createdAt:'2026-10-26T11:00:00Z'}]));
  const published=(await (await fetch(a.base+'/api/publish?project='+project.id)).json()).publications;
  assert.deepEqual(published.map(item=>item.versionNumber),[2,1]);
  assert.equal((await (await fetch(a.base+'/api/projects')).json()).projects.find(item=>item.id===project.id).latestPublication.versionNumber,2);
  assert.equal((await (await fetch(a.base+'/api/projects')).json()).projects.find(item=>item.id===original.id).latestPublication,null);
  const opened=await (await fetch(a.base+'/api/projects/'+project.id+'/open',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  assert.equal(opened.data.title,'客户培训');assert.deepEqual(opened.data.slides,[]);assert.equal(opened.revision,0);
  opened.data.slides=[structuredClone((await (await fetch(a.base+'/api/projects/'+original.id+'/workspace')).json()).data.slides[0])];
  opened.data.slides[0].title='培训第一页';
  const saved=await fetch(a.base+'/api/projects/'+project.id+'/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:opened.data,revision:0})});assert.equal(saved.status,200);
  assert.equal((await saved.json()).revision,1);
  assert.equal((await (await fetch(a.base+'/api/projects/'+project.id+'/workspace')).json()).data.slides[0].title,'培训第一页');
  assert.notEqual((await (await fetch(a.base+'/api/projects/'+original.id+'/workspace')).json()).data.slides[0].title,'培训第一页');
  const history=(await (await fetch(a.base+'/api/projects')).json()).projects;assert.equal(history.length,2);assert.equal(history[0].title,'客户培训');
  assert.equal((await fetch(a.base+'/api/projects/'+project.id+'/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:opened.data,revision:0})})).status,409);
 }finally{await a.stop()}
});

test('reference import and review stay separate from the current draft and fixed versions',async()=>{
 const a=await start();try{const before=await (await fetch(a.base+'/api/workspace')).json();const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9xkAAAAASUVORK5CYII=','base64');
 const r=await fetch(a.base+'/api/references?name=reference.png',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:png});assert.equal(r.status,202);const d=await r.json();assert.equal(d.state,'ready');assert.equal(d.pages.length,1);assert.equal((await fetch(a.base+d.pages[0].preview)).status,200);
 const list=await (await fetch(a.base+'/api/references')).json();assert.equal(list[0].id,d.id);
 assert.equal((await fetch(a.base+'/api/references/'+d.id+'/version',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"unreviewed"}'})).status,400);
 assert.equal((await fetch(a.base+'/api/references/'+d.id+'/generate',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'})).status,405);
 const rejected=await fetch(a.base+'/api/references/'+d.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupId:d.groups[0].id,decision:'rejected'})});assert.equal(rejected.status,200);
 assert.deepEqual(await (await fetch(a.base+'/api/workspace')).json(),before);
 assert.equal((await fetch(a.base+'/api/references?name=old.ppt',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:png})).status,400);
 assert.equal((await fetch(a.base+'/api/references?name=reference.png',{method:'POST',headers:{'Content-Type':'application/octet-stream',Origin:'https://elsewhere.example'},body:png})).status,403);
 }finally{await a.stop()}
});
