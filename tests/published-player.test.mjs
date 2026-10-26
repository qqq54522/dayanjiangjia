import test from 'node:test';
import assert from 'node:assert/strict';
import {wakePublishedPage} from '../lib/published-player.ts';

test('published pages load their images and videos when shown',()=>{
 const image={loading:'lazy'};
 let metadata,videoLoads=0,dialogLoads=0;
 const thumbnail={
  preload:'none',readyState:0,duration:8,currentTime:0,
  classList:{contains:name=>name==='video-thumbnail'},
  closest:()=>null,
  addEventListener:(name,callback)=>{assert.equal(name,'loadedmetadata');metadata=callback},
  load:()=>{videoLoads++}
 };
 const dialogVideo={
  preload:'none',classList:{contains:()=>false},closest:()=>({}),
  load:()=>{dialogLoads++}
 };
 const page={querySelectorAll:selector=>selector==='img[loading="lazy"]'?[image]:[thumbnail,dialogVideo]};
 const run=new Function('page',`return (${wakePublishedPage.toString()})(page)`);
 run(page);
 assert.equal(image.loading,'eager');
 assert.equal(thumbnail.preload,'metadata');
 assert.equal(videoLoads,1);
 assert.equal(dialogVideo.preload,'none');
 assert.equal(dialogLoads,0);
 thumbnail.readyState=1;
 metadata();
 assert.equal(thumbnail.currentTime,0.1);
});
