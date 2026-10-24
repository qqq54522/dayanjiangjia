import test from 'node:test';
import assert from 'node:assert/strict';
import {offlineAssets,hydrateOfflineAssets} from '../lib/offline.ts';
test('offline export deduplicates repeated videos and preserves video detection',async()=>{
 let reads=0;const registry=offlineAssets(async()=>{reads++;return 'data:video/mp4;base64,AQID'});
 const tokens=await Promise.all(Array.from({length:60},()=>registry.embed('/media/same.mp4')));
 assert.equal(reads,1);assert.equal(new Set(tokens).size,1);assert.match(tokens[0],/\.mp4$/);
 assert.equal(registry.parts().length,1);assert.equal(registry.parts()[0].split('AQID').length,2);
 await assert.rejects(offlineAssets(async()=>'<script>invalid</script>').embed('bad'),/编码无效/);
});
test('offline hydration reconstructs chunked binary and replaces image, SVG and font references',async()=>{
 const bytes=Buffer.alloc(90000,137),token='deck-asset-0.bin',payload={textContent:bytes.toString('base64'),dataset:{deckAsset:token,mime:'image/png'},remove(){this.removed=true}};
 const attrs=['src','href','poster'].map(name=>({values:{[name]:token},getAttribute(k){return this.values[k]},setAttribute(k,v){this.values[k]=v}}));
 const style={textContent:`@font-face{src:url("${token}")}`},blobs=[];
 const document={querySelectorAll(selector){return selector==='script[data-deck-asset]'?[payload]:selector==='style'?[style]:attrs}};
 const run=new Function('document','URL','Blob','atob',`(${hydrateOfflineAssets.toString()})()`);
 run(document,{createObjectURL(b){blobs.push(b);return 'blob:offline-test'}},Blob,atob);
 assert.deepEqual(Buffer.from(await blobs[0].arrayBuffer()),bytes);assert.ok(payload.removed);
 assert.deepEqual(attrs.map((el,i)=>el.values[['src','href','poster'][i]]),Array(3).fill('blob:offline-test'));
 assert.match(style.textContent,/blob:offline-test/);
});
