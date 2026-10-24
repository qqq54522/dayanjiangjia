import {unzipSync,strFromU8} from 'fflate';
import {XMLParser} from 'fast-xml-parser';
import path from 'node:path';
const xml=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@',removeNSPrefix:true,parseTagValue:false,trimValues:false,processEntities:true});
const list=x=>x===undefined?[]:Array.isArray(x)?x:[x];
function parse(bytes){const text=strFromU8(bytes);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('不支持包含实体声明的 XML');return xml.parse(text)}
export function pptxArchive(bytes){
 const names=new Set();let count=0;
 const files=unzipSync(bytes,{filter:f=>{if(++count>20000||names.has(f.name)||f.name.startsWith('/')||f.name.split('/').includes('..')||f.name.includes('\\'))throw Error('PPTX 内包含无效路径');names.add(f.name);return true}});
 if(!files['ppt/presentation.xml'])throw Error('请上传有效的 .pptx 文件');
 return files;
}
function relationships(files,part){const key=path.posix.join(path.posix.dirname(part),'_rels',path.posix.basename(part)+'.rels');const result={};if(!files[key])return result;
 for(const r of list(parse(files[key]).Relationships?.Relationship)){if(r['@TargetMode']==='External')continue;const target=path.posix.normalize(path.posix.join(path.posix.dirname(part),r['@Target']||''));if(target.startsWith('../')||!files[target])continue;result[r['@Id']]={target,type:r['@Type']||''};}return result;
}
function walk(node,fn){if(!node||typeof node!=='object')return;for(const [key,value] of Object.entries(node)){if(key.startsWith('@'))continue;for(const v of list(value)){fn(key,v);walk(v,fn)}}}
function textRuns(node){const out=[];walk(node,(k,v)=>{if(k==='t')out.push(typeof v==='object'?v['#text']||'':String(v))});return out.join('')}
function paragraphs(node){const out=[];walk(node,(k,v)=>{if(k==='p'){const t=textRuns(v).trim();if(t)out.push(t)}});return out}
export function extractPptx(bytes){
 const files=pptxArchive(bytes),pres=parse(files['ppt/presentation.xml']).presentation,rels=relationships(files,'ppt/presentation.xml');
 const parts=list(pres.sldIdLst?.sldId).map(s=>rels[s['@id']]?.target).filter(Boolean);
 if(!parts.length)throw Error('PPTX 中没有可读取的页面');
 const pages=parts.map((part,i)=>{const tree=parse(files[part]),r=relationships(files,part),elements=[];let n=0;
  walk(tree,(k,v)=>{if(k==='sp'){const lines=paragraphs(v.txBody);if(lines.length)elements.push({id:`p${i+1}-e${++n}`,kind:'text',text:lines.join('\n')})}
   if(k==='tbl'){const rows=list(v.tr).map(tr=>list(tr.tc).map(tc=>paragraphs(tc.txBody).join('\n')));if(rows.length)elements.push({id:`p${i+1}-e${++n}`,kind:'table',rows,text:rows.map(row=>row.join(' | ')).join('\n')})}
  });
  const media=[...new Set(Object.values(r).filter(x=>/\/(image|video|media)$/.test(x.type)).map(x=>x.target))];
  const notesPart=Object.values(r).find(x=>x.type.endsWith('/notesSlide'))?.target;
  const notes=notesPart?paragraphs(parse(files[notesPart])).filter(x=>x!==String(i+1)).join('\n'):'';
  if(notes)elements.push({id:`p${i+1}-notes`,kind:'notes',text:notes});
  return {number:i+1,elements,media,notes,hasAnimation:!!tree.sld&&Object.hasOwn(tree.sld,'timing')};
 });
 return {files,pages,width:Number(pres.sldSz?.['@cx']||0),height:Number(pres.sldSz?.['@cy']||0)};
}
