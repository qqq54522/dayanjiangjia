import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {extractPublishAssets,rewritePublishAssets} from '../lib/publish-assets.mjs';
import {createPublisher} from '../lib/publish.mjs';

const marker=(token,mime,body)=>`<script type="application/octet-stream" data-deck-asset="${token}" data-mime="${mime}">${body}</script>`;
const bytes=text=>Readable.from([...Buffer.from(text)].map(b=>Buffer.from([b])));

test('streaming handles split headers, base64 quartets, closing tags, Unicode and token prefixes',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'deck-publish-stream-'));
 try{
  const payload=Buffer.from([0,255,254,1,2]),token='deck-asset-1.bin',other='deck-asset-10.mp4';
  const page=`中文<style>url("${token}")</style><img src="${token}"><video src="${other}"></video>末尾`;
  const encoded=payload.toString('base64').replace(/(.{3})/g,'$1\r\n');
  const stripped=path.join(dir,'stripped.html'),output=path.join(dir,'index.html');
  const assets=await extractPublishAssets(bytes(page+marker(token,'image/png',encoded)+marker(other,'video/mp4','AQID')),stripped,dir);
  assert.equal(readFileSync(stripped,'utf8'),page);
  assert.deepEqual(readFileSync(assets[0].file),payload);
  assert.deepEqual(readFileSync(assets[1].file),Buffer.from([1,2,3]));
  const url='https://static.example.test/asset?$&=1';
  await rewritePublishAssets(bytes(page),output,new Map([[token,url],[other,'https://static.example.test/video.mp4']]));
  assert.equal(readFileSync(output,'utf8'),page.replaceAll(token,()=>url).replaceAll(other,'https://static.example.test/video.mp4'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('incomplete, invalid and duplicate payloads never upload or record history and allow retry',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'deck-publish-invalid-'));
 try{
  writeFileSync(path.join(dir,'publish-config.json'),JSON.stringify({gatewayUrl:'https://gateway.example.test',apiKey:'test-key'}));
  let uploads=0;
  const publisher=createPublisher({dir,fetchImpl:async(url,options)=>{
   uploads++;
   if(url.endsWith('/v1/presign'))return new Response(JSON.stringify({upload_url:'https://static.example.test/upload',public_url:'https://static.example.test/page'}));
   for await(const _ of options.body){}
   return new Response(null,{status:204});
  }});
  const good=marker('deck-asset-0.bin','image/png','AQID');
  for(const html of [good.slice(0,-2),good.replace('AQID','A!ID'),good.replace('AQID','AQ='),good.replace('AQID','AQ==AAAA'),good.replace('AQID','A\u00c1ID'),good.replace('image/png','text/html'),good+good]){
   await assert.rejects(publisher.publish(bytes(html),{title:'Test'}),/发布素材/);
   assert.equal(uploads,0);assert.deepEqual(publisher.status().publications,[]);
   assert.deepEqual(readdirSync(dir),['publish-config.json']);
  }
  await publisher.publish(bytes('<html>重试成功</html>'),{title:'Test'});
  assert.equal(publisher.status().publications.length,1);
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('publishes more than the Node string limit with a 96 MiB heap',async()=>{
 // Generate synthetic media incrementally; never load business material or a
 // giant fixture into memory. Old whole-file readFileSync fails on this input.
 const script=`
  import assert from 'node:assert/strict';
  import {Readable} from 'node:stream';
  import {mkdtempSync,rmSync,writeFileSync,readdirSync} from 'node:fs';
  import {tmpdir} from 'node:os';
  import path from 'node:path';
  import {createHash} from 'node:crypto';
  import {createPublisher} from './lib/publish.mjs';
  const dir=mkdtempSync(path.join(tmpdir(),'deck-publish-large-'));
  try{
   writeFileSync(path.join(dir,'publish-config.json'),JSON.stringify({gatewayUrl:'https://gateway.example.test',apiKey:'test-key'}));
   const block=Buffer.alloc(65536,65),count=8193;
   assert.ok(block.length*count>0x1fffffe8);
   const expected=createHash('sha256'),decoded=Buffer.alloc(49152);
   for(let i=0;i<count;i++)expected.update(decoded);
   let type,assetBytes=0,html='';
   const publisher=createPublisher({dir,fetchImpl:async(url,options)=>{
    if(url.endsWith('/v1/presign')){
     type=JSON.parse(options.body).content_type;
     return new Response(JSON.stringify({upload_url:'https://static.example.test/upload',public_url:'https://static.example.test/'+(type==='text/html'?'index.html':'video.mp4')}));
    }
    const hash=createHash('sha256');let size=0;
    for await(const chunk of options.body){size+=chunk.length;if(type==='text/html')html+=chunk;else hash.update(chunk)}
    assert.equal(size,Number(options.headers['Content-Length']));
    if(type==='video/mp4'){assetBytes=size;assert.equal(hash.digest('hex'),expected.digest('hex'))}
    return new Response(null,{status:204});
   }});
   async function* input(){
    yield '<html>视频<video src="deck-asset-0.mp4"></video><script type="application/octet-stream" data-deck-asset="deck-asset-0.mp4" data-mime="video/mp4">';
    for(let i=0;i<count;i++)yield block;
    yield '</script></html>';
   }
   const result=await publisher.publish(Readable.from(input()),{title:'Synthetic large deck'});
   assert.equal(assetBytes,count*decoded.length);
   assert.equal(html,'<html>视频<video src="https://static.example.test/video.mp4"></video></html>');
   assert.equal(result.bytes,assetBytes+Buffer.byteLength(html));
   assert.equal(result.versionNumber,1);
   assert.deepEqual(readdirSync(dir).sort(),['publications.json','publish-config.json']);
  }finally{rmSync(dir,{recursive:true,force:true})}
 `;
 const child=spawn(process.execPath,['--max-old-space-size=96','--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),env:{...process.env,UPLOAD_GATEWAY_URL:'',UPLOAD_API_KEY:''},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)});
 assert.equal(code,0,output);
});
