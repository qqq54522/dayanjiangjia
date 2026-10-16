import {spawnSync} from 'node:child_process';
if(Number(process.versions.node.split('.')[0])<24)throw Error('请先安装 Node.js 24 或更新版本');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status||1)};
run('npm',['ci']);run('npm',['run','check']);run('npm',['run','build']);


const fontSetup=spawnSync(process.execPath,['scripts/fonts.mjs'],{stdio:'inherit'});if(fontSetup.status)process.exit(fontSetup.status);

console.log('安装完成，运行 npm start。文稿和字体只保存在 .local/。');
