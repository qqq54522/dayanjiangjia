import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {openStore} from '../lib/store.mjs';import {pack,unpack,saveImage} from '../lib/transfer.mjs';
const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
test('两个本机工作区可交换带图片、反馈、版本的文稿包，改稿建议不覆盖正文',()=>{
 const a=mkdtempSync(path.join(tmpdir(),'deck-test-a-')),b=mkdtempSync(path.join(tmpdir(),'deck-test-b-'));const store=openStore(a);const other=openStore(b);
 try{const {data,revision}=store.read();const image=saveImage(path.join(a,'media'),gif);data.slides[0].media=image;data.slides[0].gallery=[image];data.comments.push({id:'test',slideId:'S01',author:'测试',text:'请压缩标题',time:new Date().toISOString(),done:false});data.versions.push({id:'v1',name:'固定版本',time:new Date().toISOString(),slides:structuredClone(data.slides)});store.save(data,revision);
 const roundtrip=unpack(pack(data,path.join(a,'media')),path.join(b,'media'));other.save(roundtrip,0);assert.deepEqual(other.read().data,data);assert.deepEqual(unpack(pack(other.read().data,path.join(b,'media')),path.join(a,'media')),data);
 assert.throws(()=>store.save(data,0),e=>e.status===409);const next={...data.slides[0],title:'修改建议'};store.propose({revision:1,summary:'测试',slides:[next]});assert.equal(store.read().data.slides[0].title,data.slides[0].title);assert.equal(store.read().data.proposals[0].slides[0].title,'修改建议');assert.equal(store.read().data.versions[0].slides[0].title,data.slides[0].title);
 assert.throws(()=>store.propose({revision:2,summary:'错误页',slides:[{...next,id:'missing'}]}));assert.throws(()=>unpack({format:'onion-deck-package-v1',workspace:data,assets:{}},path.join(b,'media')));
 }finally{store.close();other.close();rmSync(a,{recursive:true,force:true});rmSync(b,{recursive:true,force:true})}
});
test('拒绝非图片上传和损坏文稿',()=>{assert.throws(()=>saveImage(tmpdir(),Buffer.from('<script>bad</script>')));assert.throws(()=>unpack({slides:[]},tmpdir()))});
