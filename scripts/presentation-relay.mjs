import http from 'node:http';import {createPresentationRelay} from '../lib/presentation-relay.mjs';
const relay=createPresentationRelay(),port=Number(process.env.PRESENTATION_RELAY_PORT||8790);
const origins=(process.env.PRESENTATION_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
const server=http.createServer((req,res)=>{
 const origin=req.headers.origin;if(origin&&origins.length&&!origins.includes(origin)){res.writeHead(403);res.end('Origin not allowed');return;}
 res.setHeader('Access-Control-Allow-Origin',origins.length?(origin||origins[0]):'*');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Max-Age','600');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');return;}
 if(!['GET','DELETE'].includes(req.method)&&!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);res.end('JSON required');return;}
 void relay(req,res,new URL(req.url,'http://localhost').pathname);
});
server.listen(port,'127.0.0.1',()=>console.log(`演示同步服务：http://127.0.0.1:${port}；对外使用须配置公司 HTTPS 反向代理。`));
for(const event of ['SIGTERM','SIGINT'])process.on(event,()=>server.close(()=>process.exit()));
