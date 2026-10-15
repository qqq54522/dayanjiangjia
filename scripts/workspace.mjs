import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import path from 'node:path';
const base='http://127.0.0.1:'+(process.env.PORT||8788);const [command,file]=process.argv.slice(2);
async function request(route,body,method='POST'){const r=await fetch(base+route,body?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok)throw Error(d.error);return d}
if((await request('/api/identity')).app!=='onion-deck-studio')throw Error('目标不是本工作台');
if(command==='read')console.log(JSON.stringify(await request('/api/workspace'),null,2));
else if(command==='propose'){if(!file)throw Error('用法：npm run workspace -- propose .local/proposal.json');console.log(await request('/api/proposals',JSON.parse(readFileSync(file,'utf8'))));console.log('建议已保存；请用户刷新网页，预览后应用。')}
else if(command==='export'){if(!file)throw Error('请指定导出文件，例如 exports/讲品稿.deck.json');const d=await request('/api/export');mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(d));console.log('已导出含素材的文稿包：'+file)}
else if(command==='import'){if(!file)throw Error('请指定文稿包');const current=await request('/api/workspace');const imported=await request('/api/import',JSON.parse(readFileSync(file,'utf8')));console.log(await request('/api/workspace',{data:imported.data,revision:current.revision},'PUT'));console.log('导入成功，原稿已在 .local/backups 自动备份。')}
else throw Error('用法：npm run workspace -- read | propose 文件 | export 文件 | import 文件');
