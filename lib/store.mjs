import {validSettings} from './content.ts';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {initial,validSlide} from './deck.ts';
export function validWorkspace(d){return !!d&&(d.settings===undefined||validSettings(d.settings))&&typeof d.title==='string'&&d.title.length<=200&&Array.isArray(d.slides)&&d.slides.length<=60&&d.slides.every(validSlide)&&new Set(d.slides.map(x=>x.id)).size===d.slides.length&&Array.isArray(d.comments)&&d.comments.every(c=>c&&typeof c.id==='string'&&typeof c.slideId==='string'&&typeof c.text==='string'&&typeof c.author==='string'&&typeof c.time==='string'&&typeof c.done==='boolean')&&Array.isArray(d.versions)&&d.versions.length<=30&&d.versions.every(v=>v&&(v.settings===undefined||validSettings(v.settings))&&(v.comments===undefined||(Array.isArray(v.comments)&&v.comments.every(c=>c&&typeof c.id==='string'&&typeof c.slideId==='string'&&typeof c.text==='string'&&typeof c.author==='string'&&typeof c.time==='string'&&typeof c.done==='boolean')))&&typeof v.id==='string'&&typeof v.name==='string'&&typeof v.time==='string'&&Array.isArray(v.slides)&&v.slides.length>0&&v.slides.length<=60&&v.slides.every(validSlide))&&(d.proposals===undefined||(Array.isArray(d.proposals)&&d.proposals.length<=10&&d.proposals.every(p=>p&&typeof p.id==='string'&&typeof p.summary==='string'&&Number.isInteger(p.baseRevision)&&Array.isArray(p.slides)&&p.slides.every(validSlide))));}
export function openStore(dir){
 mkdirSync(dir,{recursive:true});mkdirSync(path.join(dir,'backups'),{recursive:true});
 const db=new DatabaseSync(path.join(dir,'workspace.sqlite'));db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
 db.prepare('INSERT OR IGNORE INTO workspace VALUES (1,?,0)').run(JSON.stringify(initial));
 // Import the original single draft once; leave the old table intact as a recovery copy.
 if(!db.prepare('SELECT id FROM projects LIMIT 1').get()){
  const legacy=db.prepare('SELECT data,revision FROM workspace WHERE id=1').get();
  const now=new Date().toISOString(),id=randomUUID();
  db.prepare('INSERT INTO projects VALUES (?,?,?,?,?)').run(id,legacy.data,legacy.revision,now,now);
  db.prepare("INSERT OR REPLACE INTO app_state VALUES ('active_project',?)").run(id);
 }
 const find=id=>{const row=db.prepare('SELECT id,data,revision,created_at,updated_at FROM projects WHERE id=?').get(id);if(!row)throw Object.assign(Error('项目不存在'),{status:404});return row};
 const activeId=()=>{const id=db.prepare("SELECT value FROM app_state WHERE key='active_project'").get()?.value;return id&&db.prepare('SELECT id FROM projects WHERE id=?').get(id)?id:db.prepare('SELECT id FROM projects ORDER BY updated_at DESC LIMIT 1').get().id};
 const read=(id=activeId())=>{const r=find(id);return {id:r.id,data:JSON.parse(r.data),revision:r.revision,aiReady:false}};
 const list=()=>db.prepare('SELECT id,data,revision,created_at,updated_at FROM projects ORDER BY updated_at DESC,id DESC').all().map(r=>{const data=JSON.parse(r.data);return {id:r.id,title:data.title,coverTitle:data.slides[0]?.title||'',slideCount:data.slides.length,versionCount:data.versions.length,createdAt:r.created_at,updatedAt:r.updated_at,revision:r.revision}});
 const create=title=>{if(typeof title!=='string'||!title.trim()||title.length>200)throw Object.assign(Error('请输入 1—200 字的项目名称'),{status:400});const id=randomUUID(),now=new Date().toISOString();const data={...structuredClone(initial),title:title.trim(),slides:[]};db.prepare('INSERT INTO projects VALUES (?,?,?,?,?)').run(id,JSON.stringify(data),0,now,now);return {id,title:data.title,slideCount:0,versionCount:0,createdAt:now,updatedAt:now,revision:0}};
 const select=id=>{find(id);db.prepare("INSERT OR REPLACE INTO app_state VALUES ('active_project',?)").run(id);return read(id)};
 const save=(data,revision,id=activeId())=>{
  if(!validWorkspace(data)||!Number.isInteger(revision))throw Object.assign(Error('稿件格式不正确'),{status:400});
  db.exec('BEGIN IMMEDIATE');try{const old=read(id);if(old.revision!==revision)throw Object.assign(Error('稿件已更新，请导出当前修改，再刷新合并。未覆盖原稿。'),{status:409});
   const backupDir=path.join(dir,'backups',id);mkdirSync(backupDir,{recursive:true});writeFileSync(path.join(backupDir,`revision-${revision}.json`),JSON.stringify(old));
   db.prepare('UPDATE projects SET data=?,revision=revision+1,updated_at=? WHERE id=?').run(JSON.stringify(data),new Date().toISOString(),id);db.exec('COMMIT');return {revision:revision+1};
  }catch(e){db.exec('ROLLBACK');throw e}
 };
 const propose=(a,id=activeId())=>{const {data,revision}=read(id);if(a.revision!==revision)throw Object.assign(Error('稿件已更新，请重新读取后提交建议'),{status:409});if(typeof a.summary!=='string'||a.summary.length>3000||!Array.isArray(a.slides)||!a.slides.length||!a.slides.every(validSlide)||new Set(a.slides.map(s=>s.id)).size!==a.slides.length||a.slides.some(s=>!data.slides.some(x=>x.id===s.id)))throw Object.assign(Error('修改建议格式错误'),{status:400});data.proposals=[{id:randomUUID(),summary:a.summary,baseRevision:revision,slides:a.slides}];return save(data,revision,id)};
 return {read,save,propose,list,create,select,activeId,close:()=>db.close()};
}
