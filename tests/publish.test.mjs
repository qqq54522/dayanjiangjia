import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createPublisher} from '../lib/publish.mjs';

test('publishing uploads HTML through presign, keeps credentials local, and preserves prior links',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'deck-publish-test-'));
 try{
  writeFileSync(path.join(dir,'publish-config.json'),JSON.stringify({gatewayUrl:'https://gateway.example.test',apiKey:'private-key'}));
  const calls=[];
  const fetchImpl=async(url,options)=>{
   calls.push({url,options});
   if(url.endsWith('/v1/presign')){
    assert.equal(options.headers.Authorization,'Bearer private-key');
    const input=JSON.parse(options.body);
    assert.match(input.key,/^onion-deck-studio\/deck\/20261026-120000-fixed-id\/index\.html$/);
    assert.equal(input.content_type,'text/html');
    return new Response(JSON.stringify({key:input.key,upload_url:'https://storage.example.test/upload',public_url:'https://public.example.test/deck/index.html',retention_days:300,retention_notice:'300 天后清理'}),{status:200});
   }
   assert.equal(url,'https://storage.example.test/upload');
   assert.equal(options.method,'PUT');
   assert.equal(options.headers['Content-Type'],'text/html');
   let text='';for await(const chunk of options.body)text+=chunk;
   assert.equal(text,'<!doctype html><title>test</title>');
   return new Response(null,{status:204});
  };
  let serial=0;
  const publisher=createPublisher({dir,fetchImpl,clock:()=>new Date('2026-10-26T12:00:00Z'),id:()=>serial++?'publication-id':'fixed-id'});
  const item=await publisher.publish(Readable.from(['<!doctype html><title>test</title>']),{title:'演示 Deck',source:'当前草稿'});
  assert.equal(item.url,'https://public.example.test/deck/index.html');
  assert.equal(item.retentionDays,300);
  assert.equal(item.versionNumber,1);
  assert.equal(item.bytes,34);
  assert.equal(publisher.status().publications.length,1);
  assert.equal(calls.length,2);
  const history=readFileSync(path.join(dir,'publications.json'),'utf8');
  assert.ok(!history.includes('private-key'));
  assert.ok(!history.includes('upload'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('legacy publications become v1.0 and each project advances only after a successful upload',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'deck-publish-version-test-'));
 try{
  writeFileSync(path.join(dir,'publish-config.json'),JSON.stringify({gatewayUrl:'https://gateway.example.test',apiKey:'private-key'}));
  const oldUrl='https://public.example.test/old/index.html';
  writeFileSync(path.join(dir,'publications.json'),JSON.stringify([{id:'old',projectId:'project-a',title:'Deck',source:'当前草稿',url:oldUrl,createdAt:'2026-10-26T10:00:00Z'}]));
  let fail=false,sequence=0;
  const publisher=createPublisher({dir,id:()=>String(++sequence),fetchImpl:async(url,options)=>{
   if(url.endsWith('/v1/presign'))return new Response(JSON.stringify({upload_url:'https://storage.example.test/upload',public_url:`https://public.example.test/new-${sequence}/index.html`}),{status:200});
   for await(const _ of options.body){}
   return new Response(null,{status:fail?500:204});
  }});
  assert.equal(publisher.status('project-a').publications[0].versionNumber,1);
  fail=true;
  await assert.rejects(publisher.publish(Readable.from(['<html/>']),{title:'Deck',projectId:'project-a'}),/文件上传失败/);
  assert.equal(publisher.status('project-a').publications.length,1);
  fail=false;
  const second=await publisher.publish(Readable.from(['<html/>']),{title:'Deck',projectId:'project-a'});
  assert.equal(second.versionNumber,2);
  const another=await publisher.publish(Readable.from(['<html/>']),{title:'Other',projectId:'project-b'});
  assert.equal(another.versionNumber,1);
  const reloaded=createPublisher({dir});
  assert.deepEqual(reloaded.status('project-a').publications.map(item=>item.versionNumber),[2,1]);
  assert.equal(reloaded.status('project-a').publications[1].url,oldUrl);
  assert.equal(reloaded.status('project-b').publications[0].versionNumber,1);
  assert.equal(JSON.parse(readFileSync(path.join(dir,'publications.json'),'utf8'))[2].versionNumber,1);
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('failed upload creates no publication history',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'deck-publish-test-'));
 try{
  writeFileSync(path.join(dir,'publish-config.json'),JSON.stringify({gatewayUrl:'https://gateway.example.test',apiKey:'private-key'}));
  const publisher=createPublisher({dir,fetchImpl:async (url,options)=>{if(url.endsWith('/v1/presign'))return new Response(JSON.stringify({upload_url:'https://storage.example.test/upload',public_url:'https://public.example.test/deck/index.html'}),{status:200});for await(const _ of options.body){}return new Response('failed',{status:500})}});
  await assert.rejects(publisher.publish(Readable.from(['<html/>']),{title:'Deck'}),/文件上传失败/);
  assert.deepEqual(publisher.status().publications,[]);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
