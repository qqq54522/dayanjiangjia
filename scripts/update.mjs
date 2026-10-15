import {execFileSync,spawnSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw Error('有未提交改动，请让 Codex 先整理；不会覆盖或自动丢弃');
if(git('branch','--show-current')!=='main')throw Error('请先让 Codex 合并或保留当前功能分支，再切回 main 更新');
git('pull','--ff-only','origin','main');const r=spawnSync(process.execPath,['scripts/setup.mjs'],{stdio:'inherit'});process.exit(r.status||0);
