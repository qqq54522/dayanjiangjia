import {chapterColor,chapterPalette} from '../lib/chapters.ts';
import {validatePublishedPlayer} from '../lib/publish-validation.mjs';
import {PLAYER_VERSION} from '../lib/player-version.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {build} from 'vite';import react from '@vitejs/plugin-react';import {parse} from 'parse5';import {initial} from '../lib/deck.ts';
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const hasClass=(node,name)=>(attr(node,'class')||'').split(/\s+/).includes(name);
const descendants=node=>[node,...(node.childNodes||[]).flatMap(descendants)];
test('production-minified 67-page exports retain every thumbnail and player control inside the parsed player',async()=>{
 mkdirSync('node_modules/.cache',{recursive:true});const dir=mkdtempSync(path.resolve('node_modules/.cache/player-dom-'));
 try{
  // Exercise the actual production serializer, rather than Vite's unminified SSR path.
  await build({configFile:false,plugins:[react()],logLevel:'silent',build:{lib:{entry:path.resolve('app/standalone-player.tsx'),formats:['es'],fileName:()=> 'renderer.mjs'},minify:true,outDir:dir,rollupOptions:{external:['react','react/jsx-runtime','react-dom/server']}}});
  const {standalonePlayerHTML}=await import(pathToFileURL(path.join(dir,'renderer.mjs')).href);
  const doc=structuredClone(initial),items=Array.from({length:3},(_,i)=>({id:'item-'+i,title:'Step '+i,body:'Explanation',detail:'',interaction:'focus'}));
  doc.slides=Array.from({length:67},(_,i)=>({...structuredClone(initial.slides[0]),id:'page-'+i,title:'Page '+(i+1),content:i%3===0?{kind:'table',goal:'',summary:'',items:[],table:{headers:['Scope','One','Two'],rows:[['A','B','C']],focus:true}}:i%3===1?{kind:'process',goal:'',summary:'',items:structuredClone(items),presentation:{layout:'cycle'}}:{kind:'cards',goal:'',summary:'',items:structuredClone(items)}}));
  doc.slides.forEach((s,i)=>{if(i<8)s.chapter={id:'chapter-'+Math.floor(i/2),title:'Group '+Math.floor(i/2),color:chapterPalette[Math.floor(i/2)].id,visible:i!==7};else if(i===8)s.chapter={id:'automatic-color',title:'Automatic group color',visible:true};});
  doc.clips=[{id:'clip',title:'Sample clip',url:'/media/example.mp4'}];
  const io={readAsset:async()=> 'data:video/mp4;base64,AQID',readText:async()=>''};
  for(const publishing of [false,true]){
   const html=(await standalonePlayerHTML(doc,publishing,'',io)).join(''),errors=[];
   const tree=parse(html,{onParseError:error=>errors.push(error.code)}),all=descendants(tree),root=all.find(n=>attr(n,'data-deck-player')!==undefined);assert.ok(root);
   const inside=descendants(root);assert.equal(inside.filter(n=>attr(n,'data-play-index')!==undefined).length,67);const thumbs=inside.filter(n=>attr(n,'data-play-page')!==undefined);assert.equal(thumbs.length,67);
   for(const [i,thumb] of thumbs.entries()){const band=descendants(thumb).find(n=>hasClass(n,'play-thumb-number'));assert.ok(band);const chapter=doc.slides[i].chapter;if(chapter)assert.match(attr(band,'style')||'',new RegExp('background-color:'+chapterColor(chapter),'i'),'published thumbnail group color must match its ribbon');else assert.equal(attr(band,'style'),undefined,'ungrouped slides keep the default band');}
   // Table/relation thumbnails really contain native buttons, the trigger of the original parser repair.
   assert.ok(descendants(thumbs[0]).some(n=>n.tagName==='button'));
   for(const control of ['play-clip-overlay','play-clip-video','play-clip-gif','play-sidebar'])assert.equal(inside.filter(n=>hasClass(n,control)).length,1,control+' escaped player');
   for(const name of ['data-player-next','data-player-prev','data-player-fullscreen','data-player-connect','data-connect-close','data-clip-return','data-thumbnails-toggle'])assert.equal(inside.filter(n=>attr(n,name)!==undefined).length,1,name+' missing');
   const rail=inside.find(n=>hasClass(n,'play-thumbnails'));assert.notEqual(attr(rail,'hidden'),undefined,'filmstrip starts collapsed even before scripts load');const toggle=inside.find(n=>attr(n,'data-thumbnails-toggle')!==undefined);assert.equal(toggle.tagName,'button');assert.equal(attr(toggle,'aria-expanded'),'false');
   const overlay=inside.find(n=>hasClass(n,'play-clip-overlay'));assert.equal(overlay.tagName,'div');assert.ok(hasClass(overlay.parentNode,'play-pages'),'clip must stay inside the PPT canvas');assert.ok(descendants(overlay).some(n=>attr(n,'data-clip-return')!==undefined));assert.ok(!descendants(overlay).some(n=>hasClass(n,'play-dialog-head')),'video has no title bar or dialog frame');
   assert.deepEqual(errors,[],'browser parser repaired malformed player markup');
   assert.ok(html.includes('playerReady'));const file=path.join(dir,'export.html');writeFileSync(file,html);assert.deepEqual(await validatePublishedPlayer(file),{playerVersion:PLAYER_VERSION,pageCount:67});
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});
