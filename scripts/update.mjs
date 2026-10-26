import {execFileSync,spawnSync} from 'node:child_process';
import {localUpdateState} from '../lib/app-update.mjs';

const root=process.cwd();
const state=localUpdateState(root);
if(state.dirty)throw Error('有未提交代码改动；不会覆盖或自动丢弃');
if(state.branch!=='main')throw Error('请先切回 main 分支再更新');
const target=execFileSync('git',['ls-remote',state.remote,'refs/heads/main'],{cwd:root,encoding:'utf8',timeout:15000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}}).trim().split(/\s+/)[0];
if(!/^[0-9a-f]{40}$/.test(target))throw Error('无法读取 GitHub main，请检查网络与仓库地址');
if(target===state.current){console.log('已经是最新版');process.exit(0)}
const result=spawnSync(process.execPath,['scripts/apply-update.mjs',state.remote,target],{cwd:root,stdio:'inherit',env:{...process.env,DECK_UPDATE_CHILD:'1'}});
if(result.status!==0)process.exit(result.status||1);
console.log('更新完成，请重启工作台并刷新浏览器。');
