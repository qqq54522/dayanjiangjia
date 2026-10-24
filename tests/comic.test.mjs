import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';
import {pack,unpack,saveMedia} from '../lib/transfer.mjs';
import {initial,validSlide} from '../lib/deck.ts';
import {defaultStyle} from '../lib/design.ts';
import {gif} from './fixtures.mjs';
test('comic background travels with draft, fixed version and proposal without becoming gallery content',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'comic-'));
 try{const d=structuredClone(initial);d.slides[0].background=saveMedia(dir,gif);d.slides[0].tagStyle='blue';d.slides[0].composition={intent:'balanced',sequence:'grid',fit:'contain',brief:'逐步对比'};d.versions=[{id:'v',name:'fixed',time:'2026-10-16',slides:structuredClone(d.slides)}];d.proposals=[{id:'p',summary:'test',baseRevision:0,slides:structuredClone(d.slides)}];
 const restored=unpack(pack(d,dir),path.join(dir,'dest'));assert.deepEqual(restored,d);assert.deepEqual(readFileSync(path.join(dir,'dest',path.basename(restored.slides[0].background))),gif);assert.equal(restored.slides[0].media,'');
 const reset=defaultStyle({...d.slides[0],design:{nodes:[{type:'text',bind:'title'}]}});assert.equal(reset.background,d.slides[0].background);assert.equal(reset.design,undefined);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('background only accepts managed local media references',()=>{
 assert.equal(validSlide({...initial.slides[0],background:'/media/test.png'}),true);
 for(const background of ['javascript:alert(1)','/media/../../private.png','https://example.com/image.png'])assert.equal(validSlide({...initial.slides[0],background}),false);
});

test('tag style defaults to dark and only accepts supported values',()=>{assert.ok(validSlide(initial.slides[0]));assert.ok(validSlide({...initial.slides[0],tagStyle:'blue'}));assert.equal(validSlide({...initial.slides[0],tagStyle:'red'}),false);});

test('semantic presentation never invokes legacy font shrinking in offline playback',async()=>{const {initComic}=await import('../lib/comic.ts');const scene={classList:{contains:c=>['comic-default','semantic-scene'].includes(c)},querySelector(){throw Error('must not measure or shrink semantic text')}};assert.equal(initComic(scene),undefined)});
