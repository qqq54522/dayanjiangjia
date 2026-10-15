import {execFileSync,spawnSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const branch=git('branch','--show-current');if(!branch.startsWith('codex/'))throw Error('先建立 codex/ 功能分支，再同步；不直接推送 main');
const message=process.argv.slice(2).join(' ');if(!message)throw Error('请提供此次功能修改的提交说明');
for(const args of [['run','check'],['run','build']]){const r=spawnSync('npm',args,{stdio:'inherit',shell:process.platform==='win32'});if(r.status)process.exit(r.status)}
// Stage only source paths; never add the whole worktree.
git('add','app','lib','public/deck.css','public/favicon.svg','scripts','tests','docs','README.md','AGENTS.md','package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','server.mjs','.gitignore','.npmrc','.nvmrc','启动工作台.command');
const guard=spawnSync(process.execPath,['scripts/guard.mjs','--staged'],{stdio:'inherit'});if(guard.status)process.exit(guard.status);
if(git('diff','--cached','--name-only'))git('commit','-m',message);
execFileSync('git',['push','-u','origin',branch,'-o','merge_request.create','-o','merge_request.target=main'],{stdio:'inherit'});
console.log('功能分支已同步，并请求 GitLab 建立合并请求；请核验远端返回的合并请求地址。没有自动合并 main。');
