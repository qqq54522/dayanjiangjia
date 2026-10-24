import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {homedir,tmpdir} from 'node:os';
const exec=promisify(execFile);
export function tool(name){
 const override=process.env['DECK_'+name.toUpperCase()];
 const runtime=path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies');
 const options=[override,...(name==='soffice'?[...(process.platform==='win32'?[path.join(process.env.ProgramFiles||'C:\\Program Files','LibreOffice','program','soffice.exe')]:[]),'/Applications/LibreOffice.app/Contents/MacOS/soffice',path.resolve('.local/tools/LibreOffice.app/Contents/MacOS/soffice'),path.join(runtime,'bin/override/soffice')]:[]),'/opt/homebrew/bin/'+name,'/usr/local/bin/'+name,'/usr/bin/'+name];
 return options.find(p=>p&&existsSync(p))||name;
}
export async function run(name,args,options={}){
 let profile;
 try{if(name==='soffice'&&!args.some(a=>a.startsWith('-env:UserInstallation='))){profile=mkdtempSync(path.join(tmpdir(),'deck-office-'));args=['-env:UserInstallation='+pathToFileURL(profile).href,...args]}
  if(name==='soffice'&&profile&&process.platform==='darwin'){const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');const fontDir=options.env?.DECK_FONT_DIR||path.resolve('.local/fonts');const config=path.join(profile,'fonts.conf');writeFileSync(config,`<?xml version="1.0"?><fontconfig><dir>/System/Library/Fonts</dir><dir>/Library/Fonts</dir><dir>${escape(fontDir)}</dir><cachedir>${escape(path.join(profile,'fontcache'))}</cachedir><alias><family>sans-serif</family><prefer><family>Alibaba PuHuiTi 2.0</family></prefer></alias><alias><family>serif</family><prefer><family>Alibaba PuHuiTi 2.0</family></prefer></alias></fontconfig>`);options={...options,env:{...process.env,...options.env,FONTCONFIG_FILE:config}};}
  return await exec(tool(name),args,{timeout:180000,maxBuffer:30*1024*1024,...options});
 }catch(e){if(e.code==='ENOENT')throw Error(`缺少本地转换工具 ${name}，请安装 LibreOffice、Poppler 或 FFmpeg 后重试。`);throw Error(`${name} 转换失败：${String(e.stderr||e.message).slice(-1200)}`)}finally{if(profile)rmSync(profile,{recursive:true,force:true})}
}
