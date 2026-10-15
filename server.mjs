import http from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openStore} from './lib/store.mjs';
import {pack,unpack,saveImage} from './lib/transfer.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));const port=Number(process.env.PORT||8788);const dataDir=path.resolve(process.env.DECK_DATA_DIR||path.join(root,'.local'));
const mediaDir=path.join(dataDir,'media');mkdirSync(mediaDir,{recursive:true});const store=openStore(dataDir);
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
const body=async req=>{let size=0;const chunks=[];for await(const b of req){size+=b.length;if(size>100*1024*1024)throw Object.assign(Error('文件超过 100 MB'),{status:413});chunks.push(b)}return JSON.parse(Buffer.concat(chunks).toString())};
const server=http.createServer(async(req,res)=>{try{
 const allowed=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);if(!allowed.has(req.headers.host))return send(res,403,{error:'仅允许本机访问'});
 if(req.headers.origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin))return send(res,403,{error:'不接受跨站请求'});
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 if(!['GET','HEAD'].includes(req.method)&&!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'需要 JSON 请求'});
 if(url.pathname==='/api/identity')return send(res,200,{app:'onion-deck-studio',version:1});
 if(url.pathname==='/api/workspace'&&req.method==='GET')return send(res,200,store.read());
 if(url.pathname==='/api/workspace'&&req.method==='PUT'){const b=await body(req);return send(res,200,store.save(b.data,b.revision))}
 if(url.pathname==='/api/proposals'&&req.method==='POST')return send(res,200,store.propose(await body(req)));
 if(url.pathname==='/api/export'&&req.method==='GET')return send(res,200,pack(store.read().data,mediaDir));
 if(url.pathname==='/api/import'&&req.method==='POST')return send(res,200,{data:unpack(await body(req),mediaDir)});
 if(url.pathname==='/api/media'&&req.method==='POST'){const b=await body(req);if(typeof b.base64!=='string')throw Error('缺少图片');return send(res,200,{url:saveImage(mediaDir,Buffer.from(b.base64,'base64'))})}
 if(url.pathname.startsWith('/api/'))return send(res,404,{error:'未找到接口'});
 if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'不支持此操作'});
 let file;
 if(url.pathname.startsWith('/media/')){if(!/^\/media\/[\w.-]+$/.test(url.pathname))return send(res,404,{error:'无此素材'});file=path.join(mediaDir,path.basename(url.pathname))}
 else{const relative=decodeURIComponent(url.pathname);const dist=path.join(root,'dist');file=path.resolve(dist,'.'+relative);if(!file.startsWith(dist+path.sep)&&file!==dist)return send(res,403,{error:'拒绝访问'});if(relative==='/')file=path.join(dist,'index.html')}
 if(!existsSync(file))return send(res,404,{error:'文件不存在，请先运行 npm run setup'});
 const bytes=readFileSync(file);const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.gif':'image/gif','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){send(res,e.status||400,{error:e.message})}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`端口 ${port} 已占用，请关闭旧工作台后重试，或指定 PORT。`:e.message);store.close();process.exit(1)});
server.listen(port,'127.0.0.1',()=>console.log(`洋葱直播工作台 http://127.0.0.1:${port}\n文稿保存在 ${dataDir}，不会上传 GitLab。`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0)}));
