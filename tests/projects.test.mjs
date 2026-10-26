import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {openStore} from '../lib/store.mjs';
import {initial} from '../lib/deck.ts';

test('existing single draft migrates once; projects save independently and persist',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'deck-projects-'));
 try{
  const db=new DatabaseSync(path.join(dir,'workspace.sqlite'));
  db.exec('CREATE TABLE workspace (id INTEGER PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL)');
  const legacy={...structuredClone(initial),title:'原有演示稿'};
  db.prepare('INSERT INTO workspace VALUES (1,?,7)').run(JSON.stringify(legacy));db.close();
  let store=openStore(dir);
  const original=store.list()[0];assert.equal(original.title,'原有演示稿');assert.equal(original.revision,7);
  const fresh=store.create('新项目');assert.equal(fresh.slideCount,0);assert.equal(store.read(fresh.id).revision,0);
  store.select(fresh.id);
  const next={...store.read().data,slides:[structuredClone(initial.slides[0])]};
  assert.deepEqual(store.save(next,0),{revision:1});
  assert.equal(store.read(original.id).data.title,'原有演示稿');
  assert.equal(store.read(original.id).revision,7);
  assert.equal(store.read(fresh.id).data.slides.length,1);
  assert.throws(()=>store.save(next,0,fresh.id),e=>e.status===409);
  assert.ok(existsSync(path.join(dir,'backups',fresh.id,'revision-0.json')));
  store.close();store=openStore(dir);
  assert.equal(store.list().length,2);
  assert.equal(store.read().id,fresh.id);
  assert.equal(store.read(original.id).data.title,'原有演示稿');
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
