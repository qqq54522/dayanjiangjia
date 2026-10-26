import test from 'node:test';
import assert from 'node:assert/strict';
import {optimizePublishedImage} from '../lib/publish-image.ts';

test('published image compression keeps animations and uses WebP only when substantially smaller',async()=>{
 const originalBitmap=globalThis.createImageBitmap,originalDocument=globalThis.document;
 let outputSize=100_000,closed=0;
 try{
  globalThis.createImageBitmap=async()=>({width:2000,height:1000,close(){closed++}});
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toBlob(done){done(new Blob([Buffer.alloc(outputSize)],{type:'image/webp'}))}})};
  const source=new Blob([Buffer.alloc(2_000_000)],{type:'image/png'});
  assert.equal((await optimizePublishedImage(source)).type,'image/webp');
  outputSize=1_900_000;
  assert.equal(await optimizePublishedImage(source),source);
  const animated=Buffer.alloc(2_000_000);animated.write('acTL',12);
  const apng=new Blob([animated],{type:'image/png'});
  assert.equal(await optimizePublishedImage(apng),apng);
  assert.equal(closed,2);
 }finally{globalThis.createImageBitmap=originalBitmap;globalThis.document=originalDocument}
});
