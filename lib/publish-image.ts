// Keep offline exports untouched. Published PNGs can use a smaller WebP copy.
export async function optimizePublishedImage(source:Blob):Promise<Blob>{
 if(source.type!=='image/png'||source.size<1024*1024)return source;
 try{
  for(let offset=8;offset+12<=source.size;){
   const bytes=new Uint8Array(await source.slice(offset,offset+8).arrayBuffer());
   const length=((bytes[0]<<24)|(bytes[1]<<16)|(bytes[2]<<8)|bytes[3])>>>0;
   const type=String.fromCharCode(...bytes.subarray(4,8));
   if(type==='acTL')return source; // Animated PNG must keep its frames.
   if(type==='IDAT')break;
   offset+=length+12;
  }
  const bitmap=await createImageBitmap(source);
  try{
   const canvas=document.createElement('canvas');
   canvas.width=bitmap.width;canvas.height=bitmap.height;
   const context=canvas.getContext('2d');
   if(!context)return source;
   context.drawImage(bitmap,0,0);
   const webp=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',0.96));
   return webp?.type==='image/webp'&&webp.size<source.size*0.8?webp:source;
  }finally{bitmap.close()}
 }catch{return source}
}
