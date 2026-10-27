import {spawnSync} from 'node:child_process';
import {tool} from './native-tools.mjs';

export const nativeGroups=[
 {label:'LibreOffice',tools:['soffice'],darwin:['--cask','libreoffice'],win32:'TheDocumentFoundation.LibreOffice'},
 {label:'Poppler',tools:['pdfinfo','pdftoppm','pdftotext'],darwin:['poppler'],win32:'oschwartz10612.Poppler'},
 {label:'FFmpeg',tools:['ffmpeg','ffprobe'],darwin:['ffmpeg'],win32:'Gyan.FFmpeg'}
];
const probes={soffice:['--version'],pdfinfo:['-v'],pdftoppm:['-v'],pdftotext:['-v'],ffmpeg:['-version'],ffprobe:['-version']};
export function nativeStatus(probe=(name)=>spawnSync(tool(name),probes[name],{stdio:'ignore',timeout:15000}).status===0){
 return nativeGroups.map(group=>({...group,missing:group.tools.filter(name=>!probe(name))}));
}
export function ensureNative({platform=process.platform,probe,install=(cmd,args)=>spawnSync(cmd,args,{stdio:'inherit',timeout:30*60*1000})}={}){
 const missing=nativeStatus(probe).filter(group=>group.missing.length);
 if(!missing.length)return {installed:[],missing:[]};
 const manager=platform==='darwin'?'brew':platform==='win32'?'winget':'';
 if(!manager)throw Error('当前系统未提供自动安装方案；请先安装 '+missing.map(g=>g.label).join('、'));
 const managerPath=manager==='brew'?tool('brew'):manager;
 if(install(managerPath,['--version']).status!==0)throw Error(`缺少 ${manager}，无法自动安装 ${missing.map(g=>g.label).join('、')}。请运行对应系统的“安装工作台”脚本。`);
 for(const group of missing){
  console.log(`正在安装 ${group.label}（缺少 ${group.missing.join('、')}）…`);
  const args=platform==='darwin'?['install',...group.darwin]:['install','--id',group.win32,'--exact','--source','winget','--accept-source-agreements','--accept-package-agreements'];
  const result=install(managerPath,args);
  if(result.status!==0)throw Error(`${group.label} 安装失败，请查看上方安装器输出；已安装的工具仍保留`);
 }
 const unresolved=nativeStatus(probe).filter(group=>group.missing.length);
 if(unresolved.length)throw Error('安装后仍未检测到 '+unresolved.flatMap(g=>g.missing).join('、')+'；请重新打开终端后运行 npm run doctor，或设置 DECK_工具名 指向已有可执行文件');
 return {installed:missing.map(g=>g.label),missing:[]};
}
