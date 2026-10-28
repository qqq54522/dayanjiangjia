import {createHash,randomUUID} from 'node:crypto';

const fields=['slides','reason','questions','destinations','issues','request','keepOne','allowPageCountChange'];
const copyResult=g=>Object.fromEntries(fields.filter(k=>g[k]!==undefined).map(k=>[k,structuredClone(g[k])]));

// Older installations retained only the latest preview. Give that result a stable
// history entry without inventing any earlier generations or changing its pages.
export function ensurePreviewHistory(g){
 if(!g.slides?.length)return g;
 if(!g.previewHistory?.some(h=>h.id===g.activePreviewId)){
  const entry={id:'existing-'+createHash('sha256').update(JSON.stringify(g.slides)).digest('hex').slice(0,24),label:'已有结果',time:g.finishedAt||null,legacy:true,...copyResult(g)};
  g.previewHistory=[...(g.previewHistory||[]),entry];g.activePreviewId=entry.id;
 }
 return g;
}

export function savePreviewResult(g){
 const history=g.previewHistory||[];
 const entry={id:randomUUID(),label:history.length?`第 ${history.length} 次修改`:'首次生成',time:new Date().toISOString(),parentId:g.activePreviewId||null,...copyResult(g)};
 g.previewHistory=[...history,entry];g.activePreviewId=entry.id;return g;
}

export function restorePreviewResult(g,id,expectedId){
 ensurePreviewHistory(g);
 if(typeof expectedId!=='string'||expectedId!==g.activePreviewId)throw Error('当前结果已变化，请刷新预览后重新选择');
 const entry=g.previewHistory?.find(h=>h.id===id);
 if(!entry)throw Error('找不到这一轮结果，请刷新后重试');
 for(const key of fields){delete g[key];if(entry[key]!==undefined)g[key]=structuredClone(entry[key])}
 g.activePreviewId=entry.id;g.state='review';
 for(const key of ['confirmedAt','error','renderIssues','progress','startedAt'])delete g[key];
 g.finishedAt=entry.time||undefined;
 // A new edit must follow the selected branch, never abandoned later requests.
 const ancestors=[];let parent=g.previewHistory.find(h=>h.id===entry.parentId);
 while(parent&&ancestors.length<g.previewHistory.length){ancestors.unshift({request:parent.request||'',summary:parent.reason||''});parent=g.previewHistory.find(h=>h.id===parent.parentId)}
 g.revisionHistory=ancestors.slice(-6);return g;
}
