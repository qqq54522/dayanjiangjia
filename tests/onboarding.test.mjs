import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync,statSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {exportTeamConfig,importTeamConfig,teamConfigName} from '../lib/team-config.mjs';
import {ensureNative,nativeStatus} from '../lib/native-setup.mjs';
import {tool} from '../lib/native-tools.mjs';

test('company publish config is imported once without entering the public repository',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'team-config-'));
 try{
  const owner=path.join(root,'owner'),colleague=path.join(root,'colleague');
  mkdirSync(path.join(owner,'.local'),{recursive:true});mkdirSync(colleague);
  const expected={gatewayUrl:'https://gateway.example.test/',apiKey:'test-secret'};
  writeFileSync(path.join(owner,'.local','publish-config.json'),JSON.stringify(expected));
  const exported=exportTeamConfig({dir:owner});
  assert.equal(path.basename(exported),teamConfigName);
  assert.equal(statSync(exported).mode&0o777,0o600);
  copyFileSync(exported,path.join(colleague,teamConfigName));
  assert.deepEqual(importTeamConfig({dir:colleague,removeLocalBundle:true}),{state:'imported'});
  assert.equal(existsSync(path.join(colleague,teamConfigName)),false);
  assert.deepEqual(JSON.parse(readFileSync(path.join(colleague,'.local','publish-config.json'),'utf8')),{gatewayUrl:'https://gateway.example.test',apiKey:'test-secret'});
  assert.equal(statSync(path.join(colleague,'.local','publish-config.json')).mode&0o777,0o600);
  assert.deepEqual(importTeamConfig({dir:colleague,source:exported}),{state:'already-configured'});
  assert.throws(()=>exportTeamConfig({dir:owner}),/EEXIST/);
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('setup installs only missing native tool groups and verifies all commands afterwards',()=>{
 const available=new Set(['soffice','ffmpeg','ffprobe']);
 const calls=[];
 const install=(cmd,args)=>{calls.push([cmd,...args]);if(args[0]==='install')for(const name of ['pdfinfo','pdftoppm','pdftotext'])available.add(name);return {status:0}};
 assert.deepEqual(nativeStatus(name=>available.has(name)).filter(group=>group.missing.length).map(group=>group.label),['Poppler']);
 assert.deepEqual(ensureNative({platform:'darwin',probe:name=>available.has(name),install}).installed,['Poppler']);
 assert.deepEqual(calls.at(-1).slice(1),['install','poppler']);
 assert.deepEqual(ensureNative({platform:'darwin',probe:name=>available.has(name),install}).installed,[]);
 assert.equal(calls.length,2);
});

test('Windows installer selects verified package IDs and existing executable override is detected',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'native-override-'));
 const previous=process.env.DECK_FFMPEG;
 try{
  const executable=path.join(root,'ffmpeg');writeFileSync(executable,'');process.env.DECK_FFMPEG=executable;
  assert.equal(tool('ffmpeg'),executable);
  const calls=[],available=new Set();
  const install=(cmd,args)=>{calls.push([cmd,...args]);if(args[0]==='install'){
   const groups={['TheDocumentFoundation.LibreOffice']:['soffice'],['oschwartz10612.Poppler']:['pdfinfo','pdftoppm','pdftotext'],['Gyan.FFmpeg']:['ffmpeg','ffprobe']};
   for(const name of groups[args[2]]||[])available.add(name);
  }return {status:0}};
  ensureNative({platform:'win32',probe:name=>available.has(name),install});
  assert.deepEqual(calls.filter(call=>call[1]==='install').map(call=>call[3]),['TheDocumentFoundation.LibreOffice','oschwartz10612.Poppler','Gyan.FFmpeg']);
 }finally{if(previous===undefined)delete process.env.DECK_FFMPEG;else process.env.DECK_FFMPEG=previous;rmSync(root,{recursive:true,force:true})}
});
