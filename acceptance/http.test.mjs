import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import net from 'node:net';import {once} from 'node:events';
import {mp4,gif} from '../tests/fixtures.mjs';import {FONTS} from '../lib/fonts.mjs';import {unzipSync} from 'fflate';
async function start(){const dir=mkdtempSync(path.join(tmpdir(),'deck-http-'));mkdirSync(path.join(dir,'fonts'));for(const f of FONTS)writeFileSync(path.join(dir,'fonts',f.name),Buffer.from([0,1,0,0,0,0,0,0]));
 const socket=net.createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(r=>socket.close(r));
 const proc=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),DECK_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let output='';proc.stderr.on('data',x=>output+=x);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server start timeout '+output)),10000);proc.stdout.once('data',()=>{clearTimeout(timer);resolve()});proc.once('exit',()=>{clearTimeout(timer);reject(Error(output))})});
 return {base:'http://127.0.0.1:'+port,async stop(){const ended=once(proc,'exit');proc.kill();await ended;rmSync(dir,{recursive:true,force:true})}}}
test('HTTP upload → save → ZIP → second workspace; byte ranges, isolation and stale writes',async()=>{
 const a=await start(),b=await start();
 try{const upload=async(bytes)=>{const r=await fetch(a.base+'/api/media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});assert.equal(r.status,200);return (await r.json()).url};const video=await upload(mp4),image=await upload(gif);
 const w=await (await fetch(a.base+'/api/workspace')).json();w.data.slides[0].media=video;w.data.slides[0].gallery=[image];
 const save=await fetch(a.base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:w.data,revision:w.revision})});assert.equal(save.status,200);
 for(const [range,start,end] of [['bytes=0-23',0,23],['bytes=24-',24,mp4.length-1],['bytes=-8',mp4.length-8,mp4.length-1]]){const r=await fetch(a.base+video,{headers:{Range:range}});assert.equal(r.status,206);assert.deepEqual(Buffer.from(await r.arrayBuffer()),mp4.subarray(start,end+1));}
 assert.equal((await fetch(a.base+video,{headers:{Range:'bytes=9999999-'}})).status,416);assert.equal((await fetch(a.base+video,{method:'HEAD'})).headers.get('content-type'),'video/mp4');
 const exported=await fetch(a.base+'/api/export');assert.equal(exported.headers.get('content-type'),'application/zip');const zip=Buffer.from(await exported.arrayBuffer());assert.equal(Object.keys(unzipSync(zip)).filter(x=>x.startsWith('fonts/')).length,4);
 const imported=await fetch(b.base+'/api/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:zip});assert.equal(imported.status,200);const data=(await imported.json()).data;assert.deepEqual(data,w.data);assert.deepEqual(Buffer.from(await (await fetch(b.base+data.slides[0].media)).arrayBuffer()),mp4);
 assert.equal((await fetch(a.base+'/api/workspace',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:w.data,revision:0})})).status,409);
 assert.equal((await fetch(a.base+'/api/media',{method:'POST',headers:{'Content-Type':'application/octet-stream',Origin:'https://untrusted.example'},body:gif})).status,403);
 assert.equal((await fetch(a.base+'/api/import',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
 assert.equal((await fetch(a.base+'/fonts.css')).status,200);assert.equal((await fetch(a.base+'/')).status,200);
 }finally{await a.stop();await b.stop()}
});
