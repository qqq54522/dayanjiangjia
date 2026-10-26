import {execFileSync,spawnSync} from 'node:child_process';
import {localUpdateState} from '../lib/app-update.mjs';

const [remote,target]=process.argv.slice(2);
if(process.env.DECK_UPDATE_CHILD!=='1'||!remote||!/^[0-9a-f]{40}$/.test(target))throw Error('更新请求无效');
const root=process.cwd();
process.env.GIT_TERMINAL_PROMPT='0';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',timeout:120000}).trim();
const before=localUpdateState(root);
if(before.remote!==remote||before.branch!=='main'||before.dirty)throw Error('代码目录已变化，更新已取消');
git('fetch',remote,'main');
const fetched=git('rev-parse','FETCH_HEAD');
if(fetched!==target)throw Error('远端 main 在检查后发生变化，请重新检查更新');
if(spawnSync('git',['merge-base','--is-ancestor',before.current,target],{cwd:root}).status!==0)throw Error('本地 main 与远端存在分叉，请让 Codex 处理；没有覆盖本地代码');
git('merge','--ff-only',target);
const install=spawnSync(process.execPath,['scripts/setup.mjs'],{cwd:root,stdio:'inherit',timeout:10*60*1000});
if(install.status!==0)throw Error('代码已拉取，但安装或构建失败；请在终端运行 npm run setup 后重启工作台');
console.log('更新完成：'+target);
