import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';import {pack,unpack,saveMedia,mediaType} from '../lib/transfer.mjs';import {initial} from '../lib/deck.ts';import {mp4,gif} from './fixtures.mjs';
test('ZIP transports original MP4/GIF bytes, deduplicates assets across versions and proposals',()=>{
 const a=mkdtempSync(path.join(os.tmpdir(),'zip-a-')),b=mkdtempSync(path.join(os.tmpdir(),'zip-b-'));
 try{const d=structuredClone(initial);d.slides[0].media=saveMedia(a,mp4);d.slides[0].gallery=[saveMedia(a,gif)];d.slides[0].theme='vivid';d.versions=[{id:'v',name:'test',time:'2026-10-16',slides:structuredClone(d.slides)}];
 const z=pack(d,a),files=unzipSync(z);assert.equal(Object.keys(files).length,3);assert.equal(z.readUInt16LE(0),0x4b50);
 const restored=unpack(z,b);assert.deepEqual(restored,d);assert.deepEqual(readFileSync(path.join(b,path.basename(d.slides[0].media))),mp4);assert.deepEqual(mediaType(mp4),['video/mp4','mp4']);
 const manifest=JSON.parse(strFromU8(files['manifest.json']));delete files[manifest.assets[d.slides[0].media].path];
 assert.throws(()=>unpack(Buffer.from(zipSync(files)),path.join(b,'missing')),/缺少素材/);assert.equal(existsSync(path.join(b,'missing')),false);
 }finally{rmSync(a,{recursive:true,force:true});rmSync(b,{recursive:true,force:true})}
});
test('rejects JSON, archive traversal, malformed manifests and changed media',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'zip-invalid-'));
 try{assert.throws(()=>unpack(Buffer.from(JSON.stringify(initial)),dir),/ZIP|zip/);assert.throws(()=>unpack(Buffer.from(zipSync({'../escape':strToU8('bad')})),dir),/路径/);
 assert.throws(()=>unpack(Buffer.from(zipSync({'manifest.json':strToU8('{}')})),dir),/格式/);
 const d=structuredClone(initial);d.slides[0].media=saveMedia(dir,mp4);const f=unzipSync(pack(d,dir));const m=JSON.parse(strFromU8(f['manifest.json']));const entry=m.assets[d.slides[0].media];f[entry.path][f[entry.path].length-1]^=1;assert.throws(()=>unpack(Buffer.from(zipSync(f)),dir),/校验/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('semantic card media and original reference previews travel in the ZIP with chapters and locks',async()=>{const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const path=(await import('node:path')).default;const {pack,unpack,saveMedia}=await import('../lib/transfer.mjs');const {initial}=await import('../lib/deck.ts');const {gif}=await import('./fixtures.mjs');const dir=mkdtempSync(path.join(tmpdir(),'semantic-zip-'));try{const url=saveMedia(path.join(dir,'a'),gif),d=structuredClone(initial);d.slides[0].content={kind:'cards',goal:'一件事',summary:'总结',items:[{id:'one',title:'角色',body:'身份',detail:'原始限定',media:url,importance:'key',interaction:'detail'}],presentation:{layout:'cards',subtitle:'hidden',marker:'number',columns:5,evidence:false},lockedItemIds:['one']};d.slides[0].chapter={id:'ch1',title:'学得懂',visible:true};d.slides[0].sourceLinks=[{documentId:'source',page:9,label:'原稿',preview:url,extractedText:'原始文字'}];const b=pack(d,path.join(dir,'a'));assert.deepEqual(unpack(b,path.join(dir,'b')),d);}finally{rmSync(dir,{recursive:true,force:true})}});
