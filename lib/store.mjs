import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {initial,validSlide} from './deck.ts';
export function validWorkspace(d){return !!d&&typeof d.title==='string'&&d.title.length<=200&&Array.isArray(d.slides)&&d.slides.length>0&&d.slides.length<=60&&d.slides.every(validSlide)&&new Set(d.slides.map(x=>x.id)).size===d.slides.length&&Array.isArray(d.comments)&&d.comments.every(c=>c&&typeof c.id==='string'&&typeof c.slideId==='string'&&typeof c.text==='string'&&typeof c.author==='string'&&typeof c.time==='string'&&typeof c.done==='boolean')&&Array.isArray(d.versions)&&d.versions.length<=30&&d.versions.every(v=>v&&typeof v.id==='string'&&typeof v.name==='string'&&typeof v.time==='string'&&Array.isArray(v.slides)&&v.slides.length>0&&v.slides.length<=60&&v.slides.every(validSlide))&&(d.proposals===undefined||(Array.isArray(d.proposals)&&d.proposals.length<=10&&d.proposals.every(p=>p&&typeof p.id==='string'&&typeof p.summary==='string'&&Number.isInteger(p.baseRevision)&&Array.isArray(p.slides)&&p.slides.every(validSlide))));}
export function openStore(dir){
 mkdirSync(dir,{recursive:true});mkdirSync(path.join(dir,'backups'),{recursive:true});
 const db=new DatabaseSync(path.join(dir,'workspace.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL)');
 db.prepare('INSERT OR IGNORE INTO workspace VALUES (1,?,0)').run(JSON.stringify(initial));
 const read=()=>{const r=db.prepare('SELECT data,revision FROM workspace WHERE id=1').get();return {data:JSON.parse(r.data),revision:r.revision,aiReady:false}};
 const save=(data,revision)=>{
  if(!validWorkspace(data)||!Number.isInteger(revision))throw Object.assign(Error('稿件格式不正确'),{status:400});
  db.exec('BEGIN IMMEDIATE');try{const old=read();if(old.revision!==revision)throw Object.assign(Error('稿件已更新，请导出当前修改，再刷新合并。未覆盖原稿。'),{status:409});
   writeFileSync(path.join(dir,'backups',`revision-${revision}.json`),JSON.stringify(old));
   db.prepare('UPDATE workspace SET data=?,revision=revision+1 WHERE id=1').run(JSON.stringify(data));db.exec('COMMIT');return {revision:revision+1};
  }catch(e){db.exec('ROLLBACK');throw e}
 };
 const propose=(a)=>{const {data,revision}=read();if(a.revision!==revision)throw Object.assign(Error('稿件已更新，请重新读取后提交建议'),{status:409});if(typeof a.summary!=='string'||a.summary.length>3000||!Array.isArray(a.slides)||!a.slides.length||!a.slides.every(validSlide)||new Set(a.slides.map(s=>s.id)).size!==a.slides.length||a.slides.some(s=>!data.slides.some(x=>x.id===s.id)))throw Object.assign(Error('修改建议格式错误'),{status:400});data.proposals=[{id:crypto.randomUUID(),summary:a.summary,baseRevision:revision,slides:a.slides}];return save(data,revision)};
 return {read,save,propose,close:()=>db.close()};
}
