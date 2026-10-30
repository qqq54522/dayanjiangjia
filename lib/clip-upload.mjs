import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {run} from './native-tools.mjs';
import {saveMedia,mediaType} from './transfer.mjs';
export const MAX_CLIP_UPLOAD_BYTES=512*1024*1024;
const extensions=new Set(['.mp4','.m4v','.mov','.qt','.webm','.mkv','.avi','.gif']);
const error=(message,status=400)=>Object.assign(Error(message),{status});
/** Normalize only project-library videos. Never alter existing slide media. */
export function createClipUploader(mediaDir,{native=run}={}){
 let busy=false;
 return async function upload(bytes,name){
  const ext=path.extname(name).toLowerCase();
  if(!extensions.has(ext))throw error('支持 GIF、MP4、MOV、QT、M4V、WebM、MKV、AVI');
  if(!bytes.length||bytes.length>MAX_CLIP_UPLOAD_BYTES)throw error('单个片段须大于 0 且不超过 512 MB',413);
  if(ext==='.gif'){
   if(mediaType(bytes)[1]!=='gif')throw error('文件内容不是 GIF 动图');
   return {url:saveMedia(mediaDir,bytes),kind:'gif'};
  }
  if(busy)throw error('另一个视频正在处理，请完成后重试',409);
  busy=true;let dir;
  try{
   dir=await mkdtemp(path.join(tmpdir(),'deck-clip-'));const input=path.join(dir,'source'+ext),output=path.join(dir,'playback.mp4');await writeFile(input,bytes);
   const safe=['-protocol_whitelist','file,pipe','-format_whitelist','mov,matroska,webm,avi'];
   const result=await native('ffprobe',['-v','error',...safe,'-show_streams','-show_format','-of','json',input],{timeout:30000});
   const probe=JSON.parse(result.stdout),video=probe.streams?.find(s=>s.codec_type==='video'&&s.disposition?.attached_pic!==1),audio=probe.streams?.filter(s=>s.codec_type==='audio')||[],duration=Number(probe.format?.duration||video?.duration);
   if(!video||!Number.isFinite(duration)||duration<=0||duration>86400)throw error('请上传包含有效画面、时长不超过 24 小时的视频');
   if(!video.width||!video.height||video.width>7680||video.height>7680)throw error('视频尺寸无效或超过可处理范围');
   let nativeMP4=false;try{nativeMP4=mediaType(bytes)[1]==='mp4'}catch{}
   if(ext==='.mp4'&&nativeMP4&&video.codec_name==='h264'&&video.pix_fmt==='yuv420p'&&audio.every(a=>a.codec_name==='aac'))return {url:saveMedia(mediaDir,bytes),kind:'video',duration};
   await native('ffmpeg',['-hide_banner','-loglevel','error','-nostdin',...safe,'-i',input,'-map','0:'+video.index,'-map','0:a:0?','-sn','-dn','-vf','scale=trunc(max(2\\,iw)/2)*2:trunc(max(2\\,ih)/2)*2,setsar=1','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-ar','48000','-map_metadata','-1','-movflags','+faststart','-threads','2',output],{timeout:600000});
   return {url:saveMedia(mediaDir,await readFile(output)),kind:'video',duration};
  }catch(e){if(e.status)throw e;throw error('视频处理失败：'+e.message,422)}finally{busy=false;if(dir)await rm(dir,{recursive:true,force:true})}
 };
}
