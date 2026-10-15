import {spawnSync} from 'node:child_process';
if(Number(process.versions.node.split('.')[0])<24)throw Error('请先安装 Node.js 24 或更新版本');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status||1)};
run('npm',['ci']);run('npm',['run','check']);run('npm',['run','build']);
console.log('安装完成。运行 npm start，打开 http://127.0.0.1:8788。文稿保存在 .local/，不会提交到 GitLab。');
