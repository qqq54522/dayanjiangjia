import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdtempSync,readFileSync,rmSync,statSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createCliConnection,inspectLocalCodexConfig,validateConnection} from '../lib/cli-connection.mjs';
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

test('existing third-party Codex CLI config is detected and used without app credentials or provider overrides',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'cli-inherited-')),home=path.join(dir,'codex-home');mkdirSync(home);
 const key='local-test-key-never-returned';const env={CODEX_HOME:home,RELAY_TOKEN:key,PATH:process.env.PATH};
 writeFileSync(path.join(home,'config.toml'),`model_provider = "company_relay"\nmodel = "relay-model"\n\n[model_providers.company_relay]\nname = "Company"\nbase_url = "https://relay.example/v1/private-path-token"\nenv_key = "RELAY_TOKEN"\nwire_api = "responses"\n`);
 const run=args=>args[0]==='--version'?{status:0,stdout:'codex-cli test'}:{status:1,stdout:''};
 let args,options;const launch=(cmd,callArgs,callOptions)=>{assert.equal(cmd,'codex');args=callArgs;options=callOptions;const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};queueMicrotask(()=>{child.stdout.write('{"type":"turn.completed"}\n');child.emit('close',0)});return child};
 try{
  const detected=inspectLocalCodexConfig(home,env);assert.equal(detected.provider,'company_relay');assert.equal(detected.model,'relay-model');assert.equal(detected.baseUrl,'https://relay.example');assert.match(detected.credential,/已检测到/);assert.ok(!JSON.stringify(detected).includes(key));
  const connection=createCliConnection({dir,launch,run,env});const status=connection.status();assert.equal(status.mode,'local');assert.equal(status.model,'relay-model');assert.equal(status.baseUrl,'https://relay.example');assert.ok(!JSON.stringify(status).includes(key));
  const result=await connection.probe();assert.equal(result.lastTest.ok,true);assert.ok(!args.includes('--model'));assert.ok(!args.includes('-c'));assert.equal(options.env.RELAY_TOKEN,key);
  writeFileSync(path.join(dir,'codex-settings.json'),JSON.stringify({model:'explicit-override',effort:''}));assert.equal(connection.status().modelOverride,'explicit-override');await connection.probe();assert.equal(args[args.indexOf('--model')+1],'explicit-override');
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('missing inherited environment key is reported without falsely requiring OpenAI login',()=>{
 const home=mkdtempSync(path.join(tmpdir(),'cli-config-'));
 try{writeFileSync(path.join(home,'config.toml'),'model_provider = "relay"\n[model_providers.relay]\nbase_url = "https://relay.example/v1"\nenv_key = "RELAY_TOKEN"\n');const status=inspectLocalCodexConfig(home,{});assert.equal(status.provider,'relay');assert.match(status.credential,/未传入工作台/)}finally{rmSync(home,{recursive:true,force:true})}
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
