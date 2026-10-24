import type {Workspace,Version} from './deck.ts';
export function captureVersion(doc:Workspace,name:string,id:string=crypto.randomUUID()):Version{
 if(!doc.slides.length)throw Error('请先添加页面，再保存版本');
 if(!name.trim())throw Error('请填写版本名称');
 return {settings:structuredClone(doc.settings),id,name:name.trim(),time:new Date().toISOString(),slides:structuredClone(doc.slides),comments:structuredClone(doc.comments)};
}
export function putVersion(doc:Workspace,version:Version):Workspace{
 const exists=doc.versions.some(v=>v.id===version.id);
 if(!exists&&doc.versions.length>=30)throw Error('最多保存 30 个版本，请先导出并删除不再需要的版本');
 return {...doc,versions:exists?doc.versions.map(v=>v.id===version.id?version:v):[version,...doc.versions]};
}
export function loadVersion(doc:Workspace,id:string):Workspace{
 const v=doc.versions.find(v=>v.id===id);if(!v)throw Error('版本不存在');
 return {...doc,settings:structuredClone(v.settings),slides:structuredClone(v.slides),comments:structuredClone(v.comments||[]),proposals:[]};
}
export function importVersion(doc:Workspace,incoming:Workspace,name:string):Workspace{
 return putVersion(doc,captureVersion(incoming,name));
}
