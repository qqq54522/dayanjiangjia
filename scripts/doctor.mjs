import {existsSync} from 'node:fs';
console.log('Node',process.versions.node);console.log('依赖',existsSync('node_modules')?'已安装':'请运行 npm run setup');console.log('网页',existsSync('dist/index.html')?'已构建':'请运行 npm run setup');
try{const r=await fetch('http://127.0.0.1:'+(process.env.PORT||8788)+'/api/identity');console.log('服务',await r.json())}catch{console.log('服务未启动：运行 npm start')}
