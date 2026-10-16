import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import net from 'node:net';import {once} from 'node:events';
import {mp4,gif} from '../tests/fixtures.mjs';import {FONTS} from '../lib/fonts.mjs';import {unzipSync} from 'fflate';
async function start(){const dir=mkdtempSync(path.join(tmpdir(),'deck-http-'));mkdirSync(path.join(dir,'fonts'));for(const f of FONTS)writeFileSync(path.join(dir,'fonts',f.name),Buffer.from([0,1,0,0,0,0,0,0]));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DECK_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let output='';proc.stderr.on('data',x=>output+=x);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server start timeout '+output)),10000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve()});proc.once('exit',()=>{clearTimeout(timer);reject(Error(output))})});
 return {base:'http://127.0.0.1:'+port,async stop(){const ended=once(proc,'exit');proc.kill();await ended;rmSync(dir,{recursive:true,force:true})}}}
test('HTTP upload → save → ZIP → second workspace; byte ranges, isolation and stale writes',async()=>{
 const a=await start(),b=await start();
 try{const upload=async(bytes)=>{const r=await fetch(a.base+'/api/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});assert.equal(r.status,200);return (await r.json()).url};const video=await upload(mp4),image=await upload(gif);
 const config=await (await fetch(a.base+'/api/codex')).json();assert.equal(config.settings.model,'gpt-6-astra');assert.equal(config.settings.effort,'medium');
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
