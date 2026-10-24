// One payload per source URL, even when the same video appears in cards/details.
// Return Blob parts so the whole document never needs to be one giant JS string.
export function offlineAssets(read:(url:string)=>Promise<string>){
 const pending=new Map<string,Promise<string>>(),parts:string[]=[];
 return {
  embed(url:string):Promise<string>{
   if(pending.has(url))return pending.get(url)!;
   const index=pending.size;
   const task=read(url).then(data=>{
    const m=/^data:([\w.+/-]+);base64,([A-Za-z0-9+/=\r\n]*)$/.exec(data);
    if(!m)throw Error('离线素材编码无效');
    const token=`deck-asset-${index}.${m[1]==='video/mp4'?'mp4':'bin'}`;
    parts[index]=`<script type="application/octet-stream" data-deck-asset="${token}" data-mime="${m[1]}">${m[2]}</script>`;
    return token;
   });pending.set(url,task);return task;
  },
  parts(){return parts.slice()}
 };
}

// Self-contained because its source is included in exported HTML.
export function hydrateOfflineAssets(){
 const urls=new Map<string,string>();
 document.querySelectorAll<HTMLScriptElement>('script[data-deck-asset]').forEach(node=>{
  const base64=node.textContent||'',chunks:BlobPart[]=[];
  for(let i=0;i<base64.length;i+=65536){const raw=atob(base64.slice(i,i+65536));const bytes=new Uint8Array(raw.length);for(let j=0;j<raw.length;j++)bytes[j]=raw.charCodeAt(j);chunks.push(bytes)}
  urls.set(node.dataset.deckAsset!,URL.createObjectURL(new Blob(chunks,{type:node.dataset.mime})));node.remove();
 });
 document.querySelectorAll('[src],[href],[poster]').forEach(node=>{
  for(const attr of ['src','href','poster']){const url=urls.get(node.getAttribute(attr)||'');if(url)node.setAttribute(attr,url)}
 });
 document.querySelectorAll('style').forEach(node=>{node.textContent=(node.textContent||'').replace(/deck-asset-\d+\.(?:bin|mp4)/g,token=>urls.get(token)||token)});
}
