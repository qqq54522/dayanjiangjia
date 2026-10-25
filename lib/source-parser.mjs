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
 for(const r of list(parse(files[key]).Relationships?.Relationship)){if(r['@TargetMode']==='External')continue;const raw=r['@Target']||'';const target=path.posix.normalize(raw.startsWith('/')?raw.slice(1):path.posix.join(path.posix.dirname(part),raw));if(target.startsWith('../')||!files[target])continue;result[r['@Id']]={target,type:r['@Type']||''};}return result;
}
function walk(node,fn){if(!node||typeof node!=='object')return;for(const [key,value] of Object.entries(node)){if(key.startsWith('@'))continue;for(const v of list(value)){fn(key,v);walk(v,fn)}}}
function textRuns(node){const out=[];walk(node,(k,v)=>{if(k==='t')out.push(typeof v==='object'?v['#text']||'':String(v))});return out.join('')}
function paragraphs(node){const out=[];walk(node,(k,v)=>{if(k==='p'){const t=textRuns(v).trim();if(t)out.push(t)}});return out}
// A media file can appear several times with different crops. Keep the visible
// instances, not every relationship (which also contains unused/off-canvas art).
function mediaInstances(tree, rels, width, height) {
 const instances=[], excluded=[], visibleShapes=[], composites=[];
 function visit(node, transform={sx:1,sy:1,tx:0,ty:0}, groupPath=[], groupHidden=false) {
  if(!node||typeof node!=='object')return;
  for(const [kind,values] of Object.entries(node))for(const shape of list(values)) {
   if(!shape||typeof shape!=='object')continue;
   if(kind==='grpSp') {
    const x=shape.grpSpPr?.xfrm, off=x?.off, ext=x?.ext, ch=x?.chOff, ce=x?.chExt;
    const sx=Number(ext?.['@cx']||1)/Number(ce?.['@cx']||1), sy=Number(ext?.['@cy']||1)/Number(ce?.['@cy']||1);
    const groupName=shape.nvGrpSpPr?.cNvPr?.['@name']||'组合';
    const groupBounds=x?.ext?{x:transform.tx+Number(off?.['@x']||0)*transform.sx,y:transform.ty+Number(off?.['@y']||0)*transform.sy,width:Number(ext['@cx'])*transform.sx,height:Number(ext['@cy'])*transform.sy}:null;
    const before=instances.length;
    const t=x?{sx:transform.sx*sx,sy:transform.sy*sy,tx:transform.tx+transform.sx*(Number(off?.['@x']||0)-sx*Number(ch?.['@x']||0)),ty:transform.ty+transform.sy*(Number(off?.['@y']||0)-sy*Number(ch?.['@y']||0))}:transform;
    visit(shape,t,[...groupPath,shape.nvGrpSpPr?.cNvPr?.['@name']||'组合'],groupHidden||['1','true'].includes(String(shape.nvGrpSpPr?.cNvPr?.['@hidden'])));
    if(instances.length>before&&groupBounds&&groupBounds.width>0&&groupBounds.height>0&&groupBounds.x>=0&&groupBounds.y>=0&&groupBounds.x+groupBounds.width<=width&&groupBounds.y+groupBounds.height<=height&&groupBounds.width*groupBounds.height<width*height*.9)composites.push({name:groupName,bounds:groupBounds,rotation:Number(x?.['@rot']||0)/60000});
    continue;
   }
   if(!['pic','sp','graphicFrame'].includes(kind)){visit(shape,transform,groupPath,groupHidden);continue;}
   const nv=shape.nvPicPr?.cNvPr||shape.nvSpPr?.cNvPr||shape.nvGraphicFramePr?.cNvPr||{};
   const x=shape.spPr?.xfrm||shape.xfrm;
   const bounds=x?.ext?{x:transform.tx+Number(x.off?.['@x']||0)*transform.sx,y:transform.ty+Number(x.off?.['@y']||0)*transform.sy,width:Number(x.ext['@cx'])*transform.sx,height:Number(x.ext['@cy'])*transform.sy}:null;
   const hidden=groupHidden||['1','true'].includes(String(nv['@hidden']));
   const outside=bounds&&width&&height&&(bounds.x>=width||bounds.y>=height||bounds.x+bounds.width<=0||bounds.y+bounds.height<=0);
   if(!hidden&&!outside)visibleShapes.push({kind,shape});
   const found=[];let crop={},video;
   walk(shape,(k,v)=>{
    if(k==='srcRect')crop=Object.fromEntries(['l','t','r','b'].map(side=>[side,Number(v['@'+side]||0)/100000]));
    if(k==='blip'||k==='svgBlip'){const r=rels[v['@embed']];if(r&&!found.includes(r.target))found.push(r.target);}
    if(k==='videoFile'||k==='media'){const r=rels[v['@link']||v['@embed']];if(r)video=r.target;}
   });
   // SVG is the preferred vector alternative to its fallback bitmap.
   const targets=video?[video]:found.some(t=>t.toLowerCase().endsWith('.svg'))?found.filter(t=>t.toLowerCase().endsWith('.svg')):found;
   const clipped=bounds&&width&&height&&(bounds.x<0||bounds.y<0||bounds.x+bounds.width>width||bounds.y+bounds.height>height);
   if(clipped&&!outside){const innerW=1-(crop.l||0)-(crop.r||0),innerH=1-(crop.t||0)-(crop.b||0);crop={l:(crop.l||0)+Math.max(0,-bounds.x)/bounds.width*innerW,r:(crop.r||0)+Math.max(0,bounds.x+bounds.width-width)/bounds.width*innerW,t:(crop.t||0)+Math.max(0,-bounds.y)/bounds.height*innerH,b:(crop.b||0)+Math.max(0,bounds.y+bounds.height-height)/bounds.height*innerH};}
   for(const target of targets){const item={target,name:nv['@name']||path.posix.basename(target),shapeId:String(nv['@id']||''),bounds,crop,groupPath,masked:!!shape.spPr?.custGeom||!!(shape.spPr?.prstGeom?.['@prst']&&!['rect','roundRect','round1Rect','round2SameRect','round2DiagRect'].includes(shape.spPr.prstGeom['@prst'])),rotation:Number(x?.['@rot']||0)/60000,flipH:['1','true'].includes(String(x?.['@flipH'])),flipV:['1','true'].includes(String(x?.['@flipV']))};
    if(hidden||outside)excluded.push({...item,reason:hidden?'hidden':'off-canvas'});else instances.push(item);
   }
  }
 }
 visit(tree);return {instances,excluded,visibleShapes,composites};
}
export function extractPptx(bytes){
 const files=pptxArchive(bytes),pres=parse(files['ppt/presentation.xml']).presentation,rels=relationships(files,'ppt/presentation.xml');
 const parts=list(pres.sldIdLst?.sldId).map(s=>rels[s['@id']]?.target).filter(Boolean);
 if(!parts.length)throw Error('PPTX 中没有可读取的页面');
 const pages=parts.map((part,i)=>{const tree=parse(files[part]),r=relationships(files,part),elements=[];let n=0;
  const {instances,excluded,visibleShapes,composites}=mediaInstances(tree,r,Number(pres.sldSz?.['@cx']),Number(pres.sldSz?.['@cy']));
  for(const {kind,shape} of visibleShapes){
   if(kind==='sp'){const lines=paragraphs(shape.txBody);if(lines.length)elements.push({id:`p${i+1}-e${++n}`,kind:'text',text:lines.join('\n')})}
   if(kind==='graphicFrame')walk(shape,(k,v)=>{if(k==='tbl'){const rows=list(v.tr).map(tr=>list(tr.tc).map(tc=>paragraphs(tc.txBody).join('\n')));if(rows.length)elements.push({id:`p${i+1}-e${++n}`,kind:'table',rows,text:rows.map(row=>row.join(' | ')).join('\n')})}});
  }
  const media=instances.map(x=>x.target);
  const notesPart=Object.values(r).find(x=>x.type.endsWith('/notesSlide'))?.target;
  const notes=notesPart?paragraphs(parse(files[notesPart])).filter(x=>x!==String(i+1)).join('\n'):'';
  if(notes)elements.push({id:`p${i+1}-notes`,kind:'notes',text:notes});
  return {number:i+1,elements,media,slideSize:{width:Number(pres.sldSz?.['@cx']),height:Number(pres.sldSz?.['@cy'])},mediaInstances:instances,composites,excludedMedia:excluded,notes,hasAnimation:!!tree.sld&&Object.hasOwn(tree.sld,'timing')};
 });
 return {files,pages,width:Number(pres.sldSz?.['@cx']||0),height:Number(pres.sldSz?.['@cy']||0)};
}
