import {PLAYER_VERSION} from '../lib/player-version.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,mkdirSync,writeFileSync,rmSync,statSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import net from 'node:net';import {once} from 'node:events';
import {mp4,gif} from '../tests/fixtures.mjs';import {FONTS} from '../lib/fonts.mjs';import {unzipSync} from 'fflate';
import {initial} from '../lib/deck.ts';import {MAX_SLIDES,MAX_WORKSPACE_BYTES} from '../lib/limits.ts';
async function start(){const dir=mkdtempSync(path.join(tmpdir(),'deck-http-'));mkdirSync(path.join(dir,'fonts'));for(const f of FONTS)writeFileSync(path.join(dir,'fonts',f.name),Buffer.from([0,1,0,0,0,0,0,0]));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DECK_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let output='';proc.stderr.on('data',x=>output+=x);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server start timeout '+output)),10000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve()});proc.once('exit',()=>{clearTimeout(timer);reject(Error(output))})});
 return {base:'http://127.0.0.1:'+port,dir,async stop(){const ended=once(proc,'exit');proc.kill();await ended;rmSync(dir,{recursive:true,force:true})}}}
test('100-page drafts and versions above 10 MiB save over both workspace endpoints without losing pages',async()=>{
 const a=await start();try{
  const project=await (await fetch(a.base+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'100-page isolated test'})})).json();
  const snapshot=await (await fetch(a.base+'/api/projects/'+project.id+'/open',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  const make=i=>({...structuredClone(initial.slides[0]),id:'capacity-'+i,title:'Page '+(i+1),media:'',gallery:[],content:{kind:'point',goal:'',summary:'',items:Array.from({length:8},(_,j)=>({id:'detail-'+j,title:'',body:'',detail:'x'.repeat(14000),placement:'detail'}))}});
  const data={...snapshot.data,slides:Array.from({length:100},(_,i)=>make(i))};
  const save=async(url,revision)=>{const body=JSON.stringify({data,revision});assert.ok(Buffer.byteLength(body)>10*1024*1024);assert.ok(Buffer.byteLength(body)<MAX_WORKSPACE_BYTES);const r=await fetch(a.base+url,{method:'PUT',headers:{'Content-Type':'application/json'},body});assert.equal(r.status,200,await r.text())};
  await save('/api/projects/'+project.id+'/workspace',0);
  data.versions=[{id:'large-fixed',name:'100-page fixed version',time:new Date().toISOString(),slides:structuredClone(data.slides),comments:[]}];await save('/api/workspace',1);
  const saved=await (await fetch(a.base+'/api/projects/'+project.id+'/workspace')).json();assert.equal(saved.data.slides.length,100);assert.equal(saved.data.slides[99].title,'Page 100');assert.equal(saved.data.versions[0].slides.length,100);
  const proposed=data.slides.map(s=>({...s,content:{kind:'point',goal:'',summary:'',items:[]}}));const proposal=await fetch(a.base+'/api/proposals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:2,summary:'isolated proposal',slides:proposed})});assert.equal(proposal.status,200);
  const invalid={...data,slides:Array.from({length:MAX_SLIDES+1},(_,i)=>({...make(i),content:{kind:'point',goal:'',summary:'',items:[]}})),versions:[]};assert.equal((await fetch(a.base+'/api/projects/'+project.id+'/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:invalid,revision:3})})).status,400);
  const summary=(await (await fetch(a.base+'/api/projects')).json()).projects.find(p=>p.id===project.id);assert.equal(summary.revision,3);assert.equal(summary.slideCount,100);assert.equal(summary.versionCount,1);
 }finally{await a.stop()}
});
test('HTTP upload → save → ZIP → second workspace; byte ranges, isolation and stale writes',async()=>{
 const a=await start(),b=await start();
 try{const upload=async(bytes)=>{const r=await fetch(a.base+'/api/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});assert.equal(r.status,200);return (await r.json()).url};const video=await upload(mp4),image=await upload(gif);
 const config=await (await fetch(a.base+'/api/codex')).json();assert.equal(config.settings.model,'');assert.equal(config.settings.effort,'');
 const publication=await (await fetch(a.base+'/api/publish')).json();assert.deepEqual(publication.publications,[]);
 assert.equal((await fetch(a.base+'/api/update',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,409);
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


test('CLI connection settings remain private across HTTP and reject cross-origin changes',async()=>{
 const a=await start(),secret='test-only-http-key-12345';try{
  const set=await fetch(a.base+'/api/cli-connection',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'custom',baseUrl:'https://relay.example/v1',model:'vendor/model',apiKey:secret})});assert.equal(set.status,200);assert.ok(!(await set.text()).includes(secret));
  const result=await fetch(a.base+'/api/cli-connection');const text=await result.text();assert.equal(result.status,200);assert.ok(!text.includes(secret));assert.equal(JSON.parse(text).keyConfigured,true);
  assert.equal(statSync(path.join(a.dir,'cli-connection.json')).mode&0o777,0o600);
  assert.equal((await fetch(a.base+'/api/cli-connection',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://elsewhere.example'},body:'{"mode":"local"}'})).status,403);
 }finally{await a.stop()}
});


test('project clips persist in isolation and travel with ZIP; relay viewers are read-only',async()=>{
 const a=await start();try{
 const api=async(url,method='GET',value)=>{const r=await fetch(a.base+url,{method,...value===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}});const v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;};
 const one=await api('/api/projects','POST',{title:'Clip project one'}),two=await api('/api/projects','POST',{title:'Clip project two'});
 const upload=await fetch(a.base+'/api/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:mp4});assert.equal(upload.status,200);const {url}=await upload.json();
 const w=await api('/api/projects/'+one.id+'/workspace');w.data.clips=[{id:'sample',title:'Sample clip',url,grade:'Junior',subject:'Math'}];
 await api('/api/projects/'+one.id+'/workspace','PUT',{revision:w.revision,data:w.data});assert.deepEqual((await api('/api/projects/'+one.id+'/workspace')).data.clips,w.data.clips);assert.equal((await api('/api/projects/'+two.id+'/workspace')).data.clips,undefined);
 const exported=await fetch(a.base+'/api/export?project='+one.id);const zip=unzipSync(new Uint8Array(await exported.arrayBuffer()));assert.deepEqual(Buffer.from(zip['assets/'+url.split('/').pop()]),mp4);
 assert.deepEqual(await api('/api/playback-config'),{relayUrl:''});await api('/api/playback-config','PUT',{relayUrl:'https://relay.example.test/'});assert.deepEqual(await api('/api/playback-config'),{relayUrl:'https://relay.example.test'});assert.equal((await fetch(a.base+'/api/playback-config',{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:'{"relayUrl":""}'})).status,403);
 const room=await api('/api/presentation/rooms','POST',{}),state={page:1,clipId:'sample',playing:true,presenting:true,time:0,actions:[]};
 const put=token=>fetch(a.base+'/api/presentation/rooms/'+room.id+'/state',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(state)});assert.equal((await put(room.viewToken)).status,403);assert.equal((await put(room.controlToken)).status,200);
 const received=await fetch(a.base+'/api/presentation/rooms/'+room.id+'/state',{headers:{Authorization:'Bearer '+room.viewToken}});assert.deepEqual((await received.json()).state,state);
 }finally{await a.stop()}
});

test('GIF project clip upload preserves bytes, survives ZIP, and rejects mismatched files',async()=>{const a=await start();try{const result=await fetch(a.base+'/api/project-clips/media?name=sample.GIF',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:gif});assert.equal(result.status,200);const clip=await result.json();assert.equal(clip.kind,'gif');assert.deepEqual(Buffer.from(await (await fetch(a.base+clip.url)).arrayBuffer()),gif);const w=await (await fetch(a.base+'/api/workspace')).json();w.data.clips=[{...clip,id:'animated',title:'Animated clip'}];assert.equal((await fetch(a.base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:w.data,revision:w.revision})})).status,200);const zip=unzipSync(new Uint8Array(await (await fetch(a.base+'/api/export')).arrayBuffer()));assert.deepEqual(Buffer.from(zip['assets/'+clip.url.split('/').pop()]),gif);assert.equal((await fetch(a.base+'/api/project-clips/media?name=fake.gif',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:mp4})).status,400);assert.equal((await fetch(a.base+'/api/project-clips/media?name=sample.gif',{method:'POST',headers:{'Content-Type':'application/octet-stream',Origin:'https://untrusted.example'},body:gif})).status,403);}finally{await a.stop()}});

test('publishing rejects a stale loaded workbench before attempting external upload',async()=>{const a=await start();try{writeFileSync(path.join(a.dir,'publish-config.json'),JSON.stringify({gatewayUrl:'https://never-contact.example.test',apiKey:'test-only-key'}));for(const version of [undefined,'old','3',PLAYER_VERSION]){const r=await fetch(a.base+'/api/publish?title=Draft',{method:'POST',headers:{'Content-Type':'text/html',...(version?{'X-Deck-Player-Version':version}:{})},body:'<!doctype html><div data-deck-player><section data-play-index="0"></section></div>'});assert.equal(r.status,409);assert.match((await r.json()).error,/浏览器的刷新按钮/);}const status=await (await fetch(a.base+'/api/publish')).json();assert.equal(status.playerVersion,PLAYER_VERSION);assert.deepEqual(status.publications,[]);}finally{await a.stop()}});
