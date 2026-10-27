import {spawnSync} from 'node:child_process';
import {importTeamConfig} from '../lib/team-config.mjs';
import {ensureNative,nativeStatus} from '../lib/native-setup.mjs';
import {rememberNativeTools} from '../lib/native-tools.mjs';
if(Number(process.versions.node.split('.')[0])<24)throw Error('请先安装 Node.js 24 或更新版本');
const updating=process.argv.includes('--update');
const reuseNodeModules=process.argv.includes('--reuse-node-modules');
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status||1)};
if(!reuseNodeModules)run('npm',['ci']);
run('npm',['run','check']);run('npm',['run','build']);


const fontSetup=spawnSync(process.execPath,['scripts/fonts.mjs'],{stdio:'inherit'});if(fontSetup.status)process.exit(fontSetup.status);
const team=importTeamConfig({removeLocalBundle:true});
if(team.state==='imported')console.log('公司发布配置已导入本机；原始配置文件已从项目根目录移除。');
if(updating){
 const missing=nativeStatus().filter(group=>group.missing.length);
 if(missing.length)console.warn('工具代码已更新，但原稿转换工具仍缺少：'+missing.map(group=>`${group.label}（${group.missing.join('、')}）`).join('；')+'。请运行“安装工作台”入口完成安装，再用 npm run doctor 检查。');
}else ensureNative();
rememberNativeTools(['soffice','pdfinfo','pdftoppm','pdftotext','ffmpeg','ffprobe']);

console.log(updating?'代码依赖与网页构建完成。':'安装完成，运行 npm start。文稿、字体和发布密钥只保存在 .local/。');
