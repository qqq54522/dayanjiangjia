import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdtempSync,readFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createCliConnection,validateConnection} from '../lib/cli-connection.mjs';
import {createCodexBridge} from '../lib/codex.mjs';
import {openStore} from '../lib/store.mjs';

test('third-party connection stays local, hides the key, and is passed to the actual CLI',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cli-connection-'));const secret='test-only-secret-12345';let probeArgs,probeEnv;
 const launch=(command,args,options)=>{assert.equal(command,'codex');probeArgs=args;probeEnv=options.env;const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};queueMicrotask(()=>{child.stdout.write('{"type":"turn.completed"}\n');child.emit('close',0)});return child};
 const run=args=>args[0]==='--version'?{status:0,stdout:'codex-cli 1.2.3'}:{status:1,stdout:''};
 try{
  const connection=createCliConnection({dir,launch,run});
  const saved=connection.save({mode:'custom',baseUrl:'https://relay.example/v1/',model:'vendor/model',apiKey:secret});
  assert.equal(saved.keyConfigured,true);assert.equal(saved.baseUrl,'https://relay.example/v1');assert.ok(!JSON.stringify(saved).includes(secret));
  assert.equal(statSync(path.join(dir,'cli-connection.json')).mode&0o777,0o600);
  assert.ok(readFileSync(path.join(dir,'cli-connection.json'),'utf8').includes(secret));
  const checked=await connection.probe();assert.equal(checked.lastTest.ok,true);assert.ok(!JSON.stringify(checked).includes(secret));
  assert.ok(probeArgs.includes('model_provider="deck_workbench"'));assert.equal(probeArgs[probeArgs.indexOf('--model')+1],'vendor/model');assert.equal(probeEnv.DECK_CODEX_PROVIDER_KEY,secret);
  const again=createCliConnection({dir,launch,run});assert.equal(again.status().lastTest.ok,true);assert.ok(!JSON.stringify(again.status()).includes(secret));
  const store=openStore(dir);let editArgs,editEnv;const bridge=createCodexBridge({dir,store,connection,launch:(cmd,args,options)=>{editArgs=args;editEnv=options.env;const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};return child}});
  bridge.start({revision:0,scope:'all',request:'测试',settings:{model:'stale-model',effort:'high'}});assert.ok(editArgs.includes('model_provider="deck_workbench"'));assert.equal(editArgs[editArgs.indexOf('--model')+1],'vendor/model');assert.ok(!editArgs.some(x=>x.includes('model_reasoning_effort')));assert.equal(editEnv.DECK_CODEX_PROVIDER_KEY,secret);bridge.close();store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('invalid URLs and missing model or key are rejected before any connection attempt',()=>{
 assert.throws(()=>validateConnection({mode:'custom',baseUrl:'http://relay.example/v1',model:'x',apiKey:'abc'}),/HTTPS/);
 assert.throws(()=>validateConnection({mode:'custom',baseUrl:'https://relay.example/v1?key=oops',model:'x',apiKey:'abc'}),/网址/);
 assert.throws(()=>validateConnection({mode:'custom',baseUrl:'https://relay.example/v1',model:'',apiKey:'abc'}),/模型/);
 assert.throws(()=>validateConnection({mode:'custom',baseUrl:'https://relay.example/v1',model:'x',apiKey:''}),/API Key/);
});

test('failed CLI output does not disclose a third-party credential',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cli-connection-error-'));const secret='test-only-secret-for-redaction';
 const launch=()=>{const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};queueMicrotask(()=>{child.stderr.write('authentication rejected '+secret);child.emit('close',1)});return child};
 const run=args=>args[0]==='--version'?{status:0,stdout:'codex-cli test'}:{status:1,stdout:''};
 try{const connection=createCliConnection({dir,launch,run});connection.save({mode:'custom',baseUrl:'https://relay.example/v1',model:'vendor/model',apiKey:secret});const status=await connection.probe();assert.equal(status.lastTest.ok,false);assert.ok(!JSON.stringify(status).includes(secret));assert.match(status.lastTest.message,/凭证已隐藏/)}finally{rmSync(dir,{recursive:true,force:true})}
});
