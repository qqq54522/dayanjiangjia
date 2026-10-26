import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EventEmitter} from 'node:events';
import {createAppUpdater,localUpdateState} from '../lib/app-update.mjs';

test('update only starts for a clean main checkout of the intended GitHub repository',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'deck-update-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 try{
  git('init','-q','-b','main');git('config','user.email','test@example.invalid');git('config','user.name','Test');
  writeFileSync(path.join(root,'README.md'),'test');git('add','README.md');git('commit','-qm','init');
  git('remote','add','origin','https://github.com/qqq54522/dayanjiangjia.git');
  const current=git('rev-parse','HEAD');
  let spawned=0,restarted=0,child;
  const updater=createAppUpdater({root,supervised:true,getRemoteHead:()=> 'a'.repeat(40),onRestart:()=>restarted++,run:()=>{spawned++;child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();return child}});
  assert.equal(localUpdateState(root).remote,'origin');
  assert.equal((await updater.status()).canUpdate,true);
  assert.equal((await updater.start()).phase,'updating');assert.equal(spawned,1);
  child.emit('exit',0);assert.equal(restarted,1);
  assert.equal((await updater.status()).phase,'restarting');
  const dirty=createAppUpdater({root,supervised:true,getRemoteHead:()=> 'a'.repeat(40)});
  writeFileSync(path.join(root,'local-change.txt'),'keep');
  assert.equal((await dirty.status()).canUpdate,false);
  await assert.rejects(dirty.start(),/未提交改动/);
  assert.equal(git('rev-parse','HEAD'),current);
  rmSync(path.join(root,'local-change.txt'));
  git('checkout','-qb','feature');
  await assert.rejects(dirty.start(),/main 分支/);
  git('remote','set-url','origin','https://example.invalid/wrong.git');
  assert.throws(()=>localUpdateState(root),/没有找到大演说家 GitHub 仓库/);
 }finally{rmSync(root,{recursive:true,force:true})}
});

test('the workbench runner restarts after a successful update',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'deck-runner-'));
 try{
  writeFileSync(path.join(root,'server.mjs'),"import {readFileSync,writeFileSync} from 'node:fs';const file='runs.txt';let count=0;try{count=Number(readFileSync(file,'utf8'))}catch{};writeFileSync(file,String(count+1));if(process.env.DECK_SUPERVISED!=='1')process.exit(2);process.exit(count?0:75)");
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/run.mjs',import.meta.url))],{cwd:root,timeout:10000});
  assert.equal(result.status,0,`${result.stdout}\n${result.stderr}`);
  assert.equal(readFileSync(path.join(root,'runs.txt'),'utf8'),'2');
 }finally{rmSync(root,{recursive:true,force:true})}
});
