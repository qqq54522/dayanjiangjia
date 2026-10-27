import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {existsSync,mkdtempSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {homedir,tmpdir} from 'node:os';
const exec=promisify(execFile);
const wingetPackages={ffmpeg:'Gyan.FFmpeg',ffprobe:'Gyan.FFmpeg',pdfinfo:'oschwartz10612.Poppler',pdftoppm:'oschwartz10612.Poppler',pdftotext:'oschwartz10612.Poppler'};
function wingetTool(name){
 const local=process.env.LOCALAPPDATA,packageName=wingetPackages[name];
 if(!packageName)return '';
 const roots=[...(local?[path.join(local,'Microsoft','WinGet','Packages')]:[]),...(process.env.ProgramFiles?[path.join(process.env.ProgramFiles,'WinGet','Packages')]:[]),...(process.env['ProgramFiles(x86)']?[path.join(process.env['ProgramFiles(x86)'],'WinGet','Packages')]:[])].filter(existsSync);
 try{
  const queue=roots.flatMap(root=>readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.toLowerCase().startsWith(packageName.toLowerCase())).map(e=>({dir:path.join(root,e.name),depth:0})));
  let visited=0;
  while(queue.length&&visited++<500){
   const {dir,depth}=queue.shift();
   for(const entry of readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isFile()&&entry.name.toLowerCase()===name+'.exe')return full;
    if(entry.isDirectory()&&depth<5)queue.push({dir:full,depth:depth+1});
   }
  }
 }catch{}
 return '';
}
export function tool(name){
 const override=process.env['DECK_'+name.toUpperCase()];
 const runtime=path.join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies');
 const windows=process.platform==='win32';
 const pathCandidates=(process.env.PATH||'').split(path.delimiter).filter(Boolean).map(dir=>path.join(dir,name+(windows?'.exe':'')));
 const wingetLinks=windows?[process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Microsoft','WinGet','Links',name+'.exe'),process.env.ProgramFiles&&path.join(process.env.ProgramFiles,'WinGet','Links',name+'.exe'),process.env['ProgramFiles(x86)']&&path.join(process.env['ProgramFiles(x86)'],'WinGet','Links',name+'.exe')].filter(Boolean):[];
 const options=[override,...pathCandidates,...(name==='soffice'?[...(windows?[path.join(process.env.ProgramFiles||'C:\\Program Files','LibreOffice','program','soffice.exe'),path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','LibreOffice','program','soffice.exe')]:[]),'/Applications/LibreOffice.app/Contents/MacOS/soffice',path.join(homedir(),'Applications/LibreOffice.app/Contents/MacOS/soffice'),path.resolve('.local/tools/LibreOffice.app/Contents/MacOS/soffice'),path.join(runtime,'bin/override/soffice')]:[]),...(windows?[wingetTool(name),...wingetLinks]:[]),...['/opt/homebrew/bin','/usr/local/bin','/opt/local/bin','/usr/bin'].map(dir=>path.join(dir,name))];
 return options.find(p=>p&&existsSync(p))||name;
}
export async function run(name,args,options={}){
 let profile;
 try{if(name==='soffice'&&!args.some(a=>a.startsWith('-env:UserInstallation='))){profile=mkdtempSync(path.join(tmpdir(),'deck-office-'));args=['-env:UserInstallation='+pathToFileURL(profile).href,...args]}
  if(name==='soffice'&&profile&&process.platform==='darwin'){const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');const fontDir=options.env?.DECK_FONT_DIR||path.resolve('.local/fonts');const config=path.join(profile,'fonts.conf');writeFileSync(config,`<?xml version="1.0"?><fontconfig><dir>/System/Library/Fonts</dir><dir>/Library/Fonts</dir><dir>${escape(fontDir)}</dir><cachedir>${escape(path.join(profile,'fontcache'))}</cachedir><alias><family>sans-serif</family><prefer><family>Alibaba PuHuiTi 2.0</family></prefer></alias><alias><family>serif</family><prefer><family>Alibaba PuHuiTi 2.0</family></prefer></alias></fontconfig>`);options={...options,env:{...process.env,...options.env,FONTCONFIG_FILE:config}};}
  return await exec(tool(name),args,{timeout:180000,maxBuffer:30*1024*1024,...options});
 }catch(e){if(e.code==='ENOENT')throw Error(`缺少本地转换工具 ${name}，请运行 npm run setup:native 检测并安装后重试。`);throw Error(`${name} 转换失败：${String(e.stderr||e.message).slice(-1200)}`)}finally{if(profile)rmSync(profile,{recursive:true,force:true})}
}
