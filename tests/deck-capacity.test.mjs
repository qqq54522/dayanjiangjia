import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {zipSync,strToU8} from 'fflate';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {initial} from '../lib/deck.ts';
import {MAX_SLIDES} from '../lib/limits.ts';
import {openStore,validWorkspace} from '../lib/store.mjs';
import {pack,unpack} from '../lib/transfer.mjs';
import {captureVersion,putVersion,loadVersion} from '../lib/versions.ts';
import {insertSupplement} from '../lib/supplement-context.ts';
import {createConversions} from '../lib/conversion.mjs';
import {createCodexBridge} from '../lib/codex.mjs';

const slides=n=>Array.from({length:n},(_,i)=>({...structuredClone(initial.slides[0]),id:'page-'+i,title:'测试第 '+(i+1)+' 页',media:'',gallery:[],background:undefined}));
const doc=n=>({...structuredClone(initial),slides:slides(n),versions:[],comments:[]});

test('100 and 150 pages save, preserve versions and round-trip through a manuscript package; overflow is rejected',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'deck-capacity-')),store=openStore(dir);
 try{
  let d=doc(100);d=putVersion(d,captureVersion(d,'100 pages','fixed'));d.slides[99].title='当前稿第 100 页';store.save(d,0);assert.equal(store.read().data.slides.length,100);
  const imported=unpack(pack(store.read().data,path.join(dir,'media')),path.join(dir,'other-media'));assert.deepEqual(imported,JSON.parse(JSON.stringify(d)));assert.equal(loadVersion(imported,'fixed').slides[99].title,'测试第 100 页');
  const added=slides(MAX_SLIDES-100).map(s=>({...s,id:'added-'+s.id})),next=insertSupplement(d,added,{afterId:d.slides[49].id,chapterId:null});assert.equal(next.slides.length,MAX_SLIDES);assert.deepEqual(next.versions,d.versions);assert.deepEqual(next.slides.filter(s=>!s.id.startsWith('added-')),d.slides);store.save(next,1);
  assert.throws(()=>insertSupplement(next,[{...added[0],id:'overflow'}],{afterId:null,chapterId:null}),/150/);
  assert.equal(validWorkspace(doc(MAX_SLIDES+1)),false);assert.equal(validWorkspace({...d,versions:[captureVersion(doc(MAX_SLIDES+1),'overflow')]}),false);assert.throws(()=>store.save(doc(MAX_SLIDES+1),2),/格式/);assert.equal(store.read().revision,2);
 }finally{store.close();rmSync(dir,{recursive:true,force:true})}
});

test('100-page PPTX parsing retains every page and conversion acceptance uses the same project capacity',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'ppt-capacity-')),files={},count=100;
 files['ppt/presentation.xml']=strToU8('<presentation><sldIdLst>'+Array.from({length:count},(_,i)=>`<sldId r:id="r${i}"/>`).join('')+'</sldIdLst><sldSz cx="1600" cy="900"/></presentation>');
 files['ppt/_rels/presentation.xml.rels']=strToU8('<Relationships>'+Array.from({length:count},(_,i)=>`<Relationship Id="r${i}" Target="slides/slide${i+1}.xml"/>`).join('')+'</Relationships>');
 for(let i=1;i<=count;i++)files[`ppt/slides/slide${i}.xml`]=strToU8(`<sld><spTree><sp><txBody><p><r><t>Source ${i}</t></r></p></txBody></sp></spTree></sld>`);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9xkAAAAASUVORK5CYII=','base64');
 const api=createConversions({dir,native:async(name,args)=>{if(name==='pdfinfo')return {stdout:'Pages: 100\n'};if(name==='pdftoppm')for(let i=1;i<=count;i++)writeFileSync(args.at(-1)+'-'+i+'.jpg',png);return {stdout:''}}});
 try{
  let d=api.upload(Buffer.from(zipSync(files)),'100-pages.pptx');for(let i=0;i<200&&d.state==='parsing';i++){await new Promise(r=>setImmediate(r));d=api.read(d.id)}
  assert.equal(d.state,'ready',d.error);assert.equal(d.pages.length,count);assert.equal(d.groups.length,count);assert.equal(d.pages[99].elements[0].text,'Source 100');
  const converted=slides(count);d.groups=d.groups.map((g,i)=>({...g,state:'accepted',slides:[converted[i]]}));const file=path.join(dir,'imports',d.id,'draft.json');writeFileSync(file,JSON.stringify(d));const version=api.version(d.id,'100-page result');assert.equal(version.slides.length,count);assert.equal(version.slides[99].id,'page-99');
  d.groups=slides(MAX_SLIDES+1).map((s,i)=>({id:'group-'+i,pages:[1],state:'accepted',slides:[s]}));writeFileSync(file,JSON.stringify(d));assert.throws(()=>api.version(d.id,'too many'),/150/);
 }finally{api.close();rmSync(dir,{recursive:true,force:true})}
});

test('selecting 100 pages reaches the local CLI bridge instead of the former 60-page validation error',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'scope-capacity-')),store=openStore(dir);let launched=false;
 const api=createCodexBridge({dir,store,launch:()=>{launched=true;throw Error('isolated mock CLI')}});
 try{store.save(doc(100),0);const result=api.start({revision:1,scope:store.read().data.slides.map(s=>s.id),request:'只调整所选页面的排版'});assert.equal(launched,true);assert.equal(result.job.state,'failed');assert.match(result.job.message,/isolated mock CLI/)}finally{api.close();store.close();rmSync(dir,{recursive:true,force:true})}
});

test('large deck rail retains every page label, defers offscreen previews and enforces the shared add/copy boundary',async()=>{
 const vite=await createServer({server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'});
 try{const {default:Rail}=await vite.ssrLoadModule('/app/SlideRail.tsx');let rendered=[];const render=n=>renderToStaticMarkup(React.createElement(Rail,{slides:slides(n),selected:'page-0',select(){},change(){},render:s=>{rendered.push(s.id);return React.createElement('i',{'data-preview':s.id})},hasFeedback:()=>false,newDeck(){},onCreate(){}}));
  const html=render(100);assert.ok(html.includes('测试第 100 页'));assert.equal((html.match(/<button class="thumbnail\b/g)||[]).length,100);assert.deepEqual(rendered,['page-0']);assert.ok(!html.match(/<button[^>]*aria-label="新增页面"[^>]*>/)[0].includes('disabled'));
  rendered=[];const full=render(MAX_SLIDES);assert.ok(full.match(/<button[^>]*aria-label="新增页面"[^>]*>/)[0].includes('disabled'));assert.ok(full.match(/<button[^>]*aria-label="复制第 150 页"[^>]*>/)[0].includes('disabled'));
 }finally{await vite.close()}
});
