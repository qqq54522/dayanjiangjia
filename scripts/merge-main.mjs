import {execFileSync,spawnSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw Error('工作区有未提交修改，请先保存；不会覆盖');
const branch=git('branch','--show-current');
if(!branch.startsWith('codex/'))throw Error('请在已验证的 codex/ 功能分支执行');
if(git('remote','get-url','origin')!=='git@gitlab.yc345.tv:linfeng/onion-deck-studio.git')throw Error('仓库地址不符合预期');
const head=git('rev-parse','HEAD');
git('fetch','origin','main');
if(spawnSync('git',['merge-base','--is-ancestor','origin/main',head]).status!==0)throw Error('main 已有其他更新。请让 Codex 合并最新 main、处理冲突并重新测试，再同步；不会强推');
for(const task of ['guard','test:acceptance']){const r=spawnSync('npm',['run',task],{stdio:'inherit'});if(r.status)process.exit(r.status||1)}
// Normal push rejects a concurrent main update. Never force or change protection.
execFileSync('git',['push','origin',`${head}:refs/heads/main`],{stdio:'inherit'});
const remote=git('ls-remote','origin','refs/heads/main').split(/\s/)[0];
if(remote!==head)throw Error('远端 main 与本次提交不一致，请复核');
git('fetch','origin','main');
git('switch','main');git('merge','--ff-only','origin/main');
console.log(`成功：远端 main 已核验为 ${head}，本机已切回 main。对方可更新工具。`);
