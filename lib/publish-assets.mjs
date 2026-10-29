import {createWriteStream} from 'node:fs';
import {open} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {StringDecoder} from 'node:string_decoder';
import path from 'node:path';

const prefix=Buffer.from('<script type="application/octet-stream" data-deck-asset="');
const closing=Buffer.from('</script>');
const header=/^<script type="application\/octet-stream" data-deck-asset="(deck-asset-\d{1,20}\.(?:bin|mp4))" data-mime="([\w.+/-]+)">$/;
const assetType=/^(?:image\/(?:png|jpeg|gif|webp|svg\+xml)|video\/mp4|font\/(?:woff2?|ttf|otf)|application\/(?:font-woff2?|octet-stream))$/;

// Keep only a stream chunk, a partial marker and one base64 quartet in memory.
export async function extractPublishAssets(input,output,dir){
 const assets=[],seen=new Set();
 async function* extract(){
  let pending=Buffer.alloc(0),asset,carry='';
  async function decode(bytes,final=false){
   const text=carry+bytes.toString('ascii').replace(/[\r\n]/g,'');
   // Check raw bytes too: ASCII decoding otherwise masks the high bit.
   if(bytes.some(b=>b>127)||!/^[A-Za-z0-9+/=]*$/.test(text))throw Error('发布素材编码无效');
   const length=final?text.length:Math.max(0,Math.floor((text.length-4)/4)*4);
   const part=text.slice(0,length);carry=text.slice(length);
   if(final?!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(part):part.includes('='))throw Error('发布素材编码无效');
   if(part)await asset.writeFile(Buffer.from(part,'base64'));
  }
  try{
   for await(const chunk of input){
    pending=Buffer.concat([pending,Buffer.from(chunk)]);
    while(pending.length){
     if(asset){
      const end=pending.indexOf(closing);
      if(end<0){const length=Math.max(0,pending.length-closing.length+1);await decode(pending.subarray(0,length));pending=pending.subarray(length);break}
      await decode(pending.subarray(0,end),true);
      await asset.close();asset=undefined;
      pending=pending.subarray(end+closing.length);continue;
     }
     const start=pending.indexOf(prefix);
     if(start<0){const length=Math.max(0,pending.length-prefix.length+1);if(length)yield pending.subarray(0,length);pending=pending.subarray(length);break}
     if(start){yield pending.subarray(0,start);pending=pending.subarray(start)}
     const end=pending.indexOf(62);
     if(end<0&&pending.length<=1024)break;
     const match=end<1024&&end>=0?header.exec(pending.subarray(0,end+1).toString('ascii')):null;
     if(!match)throw Error('发布素材标记无效');
     const [,token,mime]=match;
     if(!assetType.test(mime))throw Error('发布素材类型不受支持');
     if(seen.has(token))throw Error('发布素材标记重复');
     seen.add(token);
     const file=path.join(dir,token);
     asset=await open(file,'wx',0o600);carry='';
     assets.push({token,mime,file});
     pending=pending.subarray(end+1);
    }
   }
   if(asset)throw Error('发布素材不完整，请重新发布');
   if(pending.indexOf(prefix)===0)throw Error('发布素材标记不完整，请重新发布');
   if(pending.length)yield pending;
  }finally{await asset?.close()}
 }
 await pipeline(extract(),createWriteStream(output,{mode:0o600}));
 return assets;
}

// Replace tokens across read boundaries without collecting even the stripped HTML.
export async function rewritePublishAssets(input,output,urls){
 async function* rewrite(){
  const decoder=new StringDecoder('utf8');let pending='';
  function replace(final){
   const boundary=final?pending.length:Math.max(0,pending.length-64);
   const pattern=/deck-asset-\d{1,20}\.(?:bin|mp4)/g;
   let result='',cursor=0;
   for(let match;(match=pattern.exec(pending))&&match.index<boundary;){
    result+=pending.slice(cursor,match.index)+(urls.get(match[0])||match[0]);cursor=pattern.lastIndex;
   }
   const end=Math.max(boundary,cursor);
   result+=pending.slice(cursor,end);pending=pending.slice(end);return result;
  }
  for await(const chunk of input){pending+=decoder.write(Buffer.from(chunk));yield replace(false)}
  pending+=decoder.end();yield replace(true);
 }
 await pipeline(rewrite(),createWriteStream(output,{mode:0o600}));
}
