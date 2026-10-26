import {installMasters} from './lib/master-resources.mjs';
import {DEFAULT_MASTER,masterCatalog} from './lib/masters.ts';
import http from 'node:http';
import {createConversions} from './lib/conversion.mjs';
import {readFileSync,existsSync,mkdirSync,statSync,createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCodexBridge} from './lib/codex.mjs';
import {createPublisher} from './lib/publish.mjs';
import {openStore} from './lib/store.mjs';
import {FONTS,fontCSS} from './lib/fonts.mjs';
import {pack,unpack,saveMedia} from './lib/transfer.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));const port=Number(process.env.PORT||8788);const dataDir=path.resolve(process.env.DECK_DATA_DIR||path.join(root,'.local'));
const fontDir=path.join(dataDir,'fonts');
const mediaDir=path.join(dataDir,'media');mkdirSync(mediaDir,{recursive:true});const store=openStore(dataDir);
const masters=installMasters(mediaDir);
const defaultBackground=masters.background();
const workspaceView=id=>{const v=store.read(id);return {...v,data:masters.hydrate(v.data)}};
const codex=createCodexBridge({dir:dataDir,store});
const publisher=createPublisher({dir:dataDir});
const conversions=createConversions({dir:dataDir});
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
const raw=async(req,limit=Infinity)=>{let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>limit)throw Object.assign(Error('上传文件超过大小限制'),{status:413});chunks.push(b)}return Buffer.concat(chunks)};
const body=async req=>JSON.parse((await raw(req,10*1024*1024)).toString());
const server=http.createServer(async(req,res)=>{try{
 const allowed=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);if(!allowed.has(req.headers.host))return send(res,403,{error:'仅允许本机访问'});
 if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return send(res,403,{error:'不接受跨站请求'});
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(!['GET','HEAD'].includes(req.method)&&!(req.headers['content-type']?.startsWith('application/json')||(['/api/media','/api/import','/api/references'].includes(url.pathname)&&['application/zip','application/octet-stream','video/mp4'].includes(req.headers['content-type']))||(url.pathname==='/api/publish'&&req.headers['content-type']?.startsWith('text/html'))))return send(res,415,{error:'需要 JSON 或受支持的文件类型'});
 if(url.pathname==='/api/references'&&req.method==='GET')return send(res,200,conversions.list());
 if(url.pathname==='/api/references'&&req.method==='POST')return send(res,202,conversions.upload(await raw(req),url.searchParams.get('name')||'source',{background:defaultBackground,settings:workspaceView().data.settings}));
 const refMatch=/^\/api\/references\/([a-f0-9-]{36})(?:\/(generate|generate-all|retry|version))?$/.exec(url.pathname);
 if(refMatch){const [,id,action]=refMatch;
  if(req.method==='GET')return send(res,200,conversions.read(id));
  const b=await body(req);
  if(req.method!=='POST'&&action)return send(res,405,{error:'请使用 POST 提交转换操作'});
  if(action==='generate-all')return send(res,202,conversions.generateAll(id,codex.status().settings,b.groupIds));
  if(action==='generate')return send(res,202,conversions.generate(id,b.groupId,codex.status().settings));
  if(action==='retry')return send(res,202,conversions.retry(id));
  if(action==='version')return send(res,200,conversions.version(id,b.name,b.groupIds));
  if(req.method==='PATCH')return send(res,200,conversions.patch(id,b));
 }
 if(url.pathname==='/api/conversion/cancel'&&req.method==='POST')return send(res,200,conversions.cancel());
 if(url.pathname==='/api/codex'&&req.method==='GET')return send(res,200,codex.status());
 if(url.pathname==='/api/codex/settings'&&req.method==='PUT')return send(res,200,codex.update(await body(req)));
 if(url.pathname==='/api/codex/start'&&req.method==='POST')return send(res,202,codex.start(await body(req)));
 if(url.pathname==='/api/codex/cancel'&&req.method==='POST')return send(res,200,codex.cancel());
 if(url.pathname==='/api/publish'&&req.method==='GET'){const id=url.searchParams.get('project');if(id)store.read(id);return send(res,200,publisher.status(id))}
 if(url.pathname==='/api/publish'&&req.method==='POST'){
  if(!req.headers['content-type']?.startsWith('text/html'))return send(res,415,{error:'发布内容必须是 HTML'});
  const id=url.searchParams.get('project')||store.activeId();store.read(id);
  return send(res,201,await publisher.publish(req,{title:url.searchParams.get('title')||'',source:url.searchParams.get('source')||'当前草稿',projectId:id}));
 }
 if(url.pathname==='/api/identity')return send(res,200,{app:'onion-deck-studio',version:1});
 if(url.pathname==='/api/masters'&&req.method==='GET')return send(res,200,{default:DEFAULT_MASTER,masters:masterCatalog});
 if(url.pathname==='/api/projects'&&req.method==='GET'){
  const latest=new Map();
  for(const item of publisher.status().publications){
   if(item.projectId&&!latest.has(item.projectId))latest.set(item.projectId,{versionNumber:item.versionNumber,createdAt:item.createdAt,url:item.url});
  }
  return send(res,200,{projects:store.list().map(project=>({...project,latestPublication:latest.get(project.id)||null}))});
 }
 if(url.pathname==='/api/projects'&&req.method==='POST')return send(res,201,store.create((await body(req)).title));
 const projectMatch=/^\/api\/projects\/([a-f0-9-]{36})\/(open|workspace)$/.exec(url.pathname);
 if(projectMatch){const [,id,action]=projectMatch;
  if(action==='open'&&req.method==='POST'){store.select(id);return send(res,200,workspaceView(id))}
  if(action==='workspace'&&req.method==='GET')return send(res,200,workspaceView(id));
  if(action==='workspace'&&req.method==='PUT'){const b=await body(req);return send(res,200,store.save(masters.hydrate(b.data),b.revision,id))}
 }
 if(url.pathname==='/api/workspace'&&req.method==='GET')return send(res,200,workspaceView());
 if(url.pathname==='/api/workspace'&&req.method==='PUT'){const b=await body(req);return send(res,200,store.save(masters.hydrate(b.data),b.revision))}
 if(url.pathname==='/api/proposals'&&req.method==='POST')return send(res,200,store.propose(await body(req)));
 if(url.pathname==='/api/export'&&req.method==='GET'){let data=workspaceView(url.searchParams.get('project')||undefined).data;const versionId=url.searchParams.get('version');if(versionId!==null){const version=data.versions.find(v=>v.id===versionId);if(!version)return send(res,404,{error:'此演示版本不存在，请刷新版本列表'});data={...data,slides:version.slides,settings:version.settings,comments:version.comments||[],proposals:[],versions:[version]}}const zip=pack(data,mediaDir,fontDir);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename=deck.deck.zip','Cache-Control':'no-store'});return res.end(zip)}
 if(url.pathname==='/api/import'&&req.method==='POST')return send(res,200,{data:masters.hydrate(unpack(await raw(req),mediaDir,fontDir))});
 if(url.pathname==='/api/media'&&req.method==='POST'){return send(res,200,{url:saveMedia(mediaDir,await raw(req))})}
 if(url.pathname.startsWith('/api/'))return send(res,404,{error:'未找到接口'});
 if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'不支持此操作'});
 if(url.pathname==='/fonts.css'){res.writeHead(200,{'Content-Type':'text/css'});return res.end(fontCSS())}
 let file;
 if(url.pathname.startsWith('/fonts/')){const name=path.basename(url.pathname);if(!FONTS.some(f=>f.name===name))return send(res,404,{error:'无此字体'});file=path.join(fontDir,name)}
 else
 if(url.pathname.startsWith('/media/')){if(!/^\/media\/[\w.-]+$/.test(url.pathname))return send(res,404,{error:'无此素材'});file=path.join(mediaDir,path.basename(url.pathname))}
 else{const relative=decodeURIComponent(url.pathname);const dist=path.join(root,'dist');file=path.resolve(dist,'.'+relative);if(!file.startsWith(dist+path.sep)&&file!==dist)return send(res,403,{error:'拒绝访问'});if(relative==='/')file=path.join(dist,'index.html')}
 if(!existsSync(file))return send(res,404,{error:'文件不存在，请先运行 npm run setup'});
 const size=statSync(file).size;const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.gif':'image/gif','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.ttf':'font/ttf'};
 if(path.extname(file)==='.mp4'&&req.headers.range){
 const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let start=0,end=size-1;
 if(m){if(!m[1])start=Math.max(0,size-Number(m[2]));else {start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}}
 if(!m||(!m[1]&&!m[2])||start>end||start>=size){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end()}
 res.writeHead(206,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});if(req.method==='HEAD')return res.end();return createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
 }
 res.writeHead(200,{'Accept-Ranges':'bytes','Content-Length':size,'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')return res.end();createReadStream(file).on('error',()=>res.destroy()).pipe(res);
 }catch(e){send(res,e.status||400,{error:e.message})}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已占用，请关闭旧工作台后重试，或指定 PORT。`:e.message);store.close();process.exit(1)});
server.listen(port,'127.0.0.1',()=>console.log(`洋葱学园演示工作台 http://127.0.0.1:${port}\n文稿保存在 ${dataDir}，不会上传 GitLab。`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{codex.close();conversions.close();server.close(()=>{store.close();process.exit(0)})});
