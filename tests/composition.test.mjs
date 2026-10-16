import test from 'node:test';import assert from 'node:assert/strict';
import {defaultComposition,presentation,withMedia,mediaUrls} from '../lib/composition.ts';
import {initial,validSlide} from '../lib/deck.ts';
import {proposalFrom} from '../lib/codex.mjs';
const slide=()=>structuredClone(initial.slides[0]);
test('intent preserves text but hides it only in visual presentation, conservative defaults',()=>{
 const s={...slide(),composition:{...defaultComposition,intent:'visual'}};assert.equal(presentation(s).intent,'visual');assert.ok(s.subtitle);assert.ok(s.points.length);
 assert.equal(presentation(slide()).intent,'balanced');assert.equal(presentation({...slide(),subtitle:'',points:[]}).intent,'visual');assert.equal(presentation(slide()).fit,'contain');assert.equal(presentation(slide()).sequence,'carousel');
});
test('remove, reorder and replace media maintain the primary slot and other fields',()=>{
 const s={...slide(),background:'/media/bg.png',composition:{...defaultComposition,brief:'原始意图'},media:'/media/a.png',gallery:['/media/b.gif','/media/c.mp4']};
 const removed=withMedia(s,mediaUrls(s).slice(1));assert.equal(removed.media,'/media/b.gif');assert.deepEqual(removed.gallery,['/media/c.mp4']);assert.deepEqual(removed.composition,s.composition);assert.equal(removed.background,s.background);assert.deepEqual(withMedia(s,[]).gallery,[]);assert.equal(withMedia(s,[]).media,'');assert.throws(()=>withMedia(s,Array(14).fill('/media/a.png')));
});
test('composition survives Codex proposals; invalid presets cannot enter workspace',()=>{
 const s={...slide(),composition:{...defaultComposition,brief:'优先讲原理'}};const snapshot={revision:1,data:{slides:[s]}};
 const p={id:s.id,title:s.title,subtitle:s.subtitle,points:s.points,note:s.note,layout:s.layout,theme:'brand',designJson:null,compositionJson:JSON.stringify({...s.composition,intent:'balanced',sequence:'grid'})};
 const next=proposalFrom({summary:'平铺对比',slides:[p]},snapshot,'all').slides[0];assert.equal(next.composition.sequence,'grid');assert.equal(next.composition.brief,s.composition.brief);assert.equal(next.media,s.media);
 assert.deepEqual(proposalFrom({summary:'沿用',slides:[{...p,compositionJson:null}]},snapshot,'all').slides[0].composition,s.composition);
 assert.equal(validSlide({...s,composition:{...s.composition,intent:'bad'}}),false);assert.throws(()=>proposalFrom({summary:'bad',slides:[{...p,compositionJson:'{}'}]},snapshot,'all'));
});
test('visual references only attach scoped local static images, never videos or external URLs',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),os=await import('node:os'),path=await import('node:path');const {saveMedia}=await import('../lib/transfer.mjs');const {gif}=await import('./fixtures.mjs');const {visualReferences}=await import('../lib/codex.mjs');
 const dir=mkdtempSync(path.join(os.tmpdir(),'references-'));try{const u=saveMedia(path.join(dir,'media'),gif);const snap={data:{slides:[{...slide(),id:'A',media:u,gallery:['https://example.com/image.png','/media/missing.jpg']},{...slide(),id:'B',media:'/media/other.png'}]}};const r=visualReferences(snap,'A',dir);assert.equal(r.attached.length,0);assert.equal(r.unavailable.length,3);assert.ok(r.unavailable.every(x=>x.slideId==='A'));}finally{rmSync(dir,{recursive:true,force:true})}
});
