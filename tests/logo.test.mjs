import test from 'node:test';
import assert from 'node:assert/strict';
import {initLogo} from '../lib/logo.ts';
test('logo follows rendered light/dark background and free-layout surface, including gradients',()=>{
 const oldDocument=globalThis.document,oldStyle=globalThis.getComputedStyle;
 try{
  let pixel=[255,255,255,255],sampled=[];
  globalThis.document={createElement:()=>({getContext:()=>({set fillStyle(v){sampled.push(v)},fillRect(){},getImageData:()=>({data:pixel})})})};
  const logo={dataset:{}},free={},scene={querySelector:s=>s==='.scene-brand'?logo:free};
  globalThis.getComputedStyle=target=>{assert.equal(target,free);return {backgroundColor:'rgb(8,20,40)',backgroundImage:'linear-gradient(125deg, rgb(8, 20, 40), rgb(20, 50, 80))'}};
  pixel=[8,20,40,255];initLogo(scene);assert.equal(logo.dataset.tone,'dark');assert.equal(sampled.at(-1),'rgb(8, 20, 40)');
  pixel=[255,225,50,255];initLogo(scene);assert.equal(logo.dataset.tone,'light');
  pixel=[255,255,255,255];initLogo(scene);assert.equal(logo.dataset.tone,'light');
 }finally{globalThis.document=oldDocument;globalThis.getComputedStyle=oldStyle}
});
