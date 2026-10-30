import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
export function createPresentationRelay({now=Date.now,ttl=6*60*60*1000,maxRooms=200}={}){
 const rooms=new Map(),rates=new Map();
 const same=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);};
 const fail=(message,status)=>Object.assign(Error(message),{status});
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 async function body(req){let bytes=0,parts=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>8192)throw fail('同步请求过大',413);parts.push(chunk)}try{return JSON.parse(Buffer.concat(parts).toString())}catch{throw fail('同步请求格式错误',400)}}
 const validate=s=>s&&(s.clipRun===undefined||Number.isSafeInteger(s.clipRun)&&s.clipRun>=0)&&Number.isInteger(s.page)&&s.page>=0&&s.page<150&&(s.clipId===null||typeof s.clipId==='string'&&s.clipId.length<=100)&&typeof s.playing==='boolean'&&typeof s.presenting==='boolean'&&Number.isFinite(s.time)&&s.time>=0&&s.time<=86400&&(s.actions===undefined||Array.isArray(s.actions)&&s.actions.length<=50&&s.actions.every(a=>a&&Number.isInteger(a.id)&&a.id>=0&&Number.isInteger(a.index)&&a.index>=0&&a.index<1000&&['click','dblclick','close','video'].includes(a.kind)&&(a.kind!=='video'||Number.isFinite(a.time)&&a.time>=0&&a.time<=86400&&typeof a.playing==='boolean')));
 return async function relay(req,res,pathname){try{
  const time=now();for(const [id,r] of rooms)if(r.expiresAt<time)rooms.delete(id);for(const [ip,r] of rates)if(time-r.start>60000)rates.delete(ip);
  const match=/\/rooms(?:\/([\w-]{36})(?:\/(state))?)?\/?$/.exec(pathname);if(!match)return json(res,404,{error:'连接接口不存在'});
  if(!match[1]&&req.method==='POST'){
   const ip=req.socket.remoteAddress||'',rate=rates.get(ip)||{count:0,start:time};if(++rate.count>20)throw fail('创建连接过于频繁，请稍后再试',429);rates.set(ip,rate);if(rooms.size>=maxRooms)throw fail('连接已满，请稍后再试',503);
   const id=randomUUID(),controlToken=randomBytes(24).toString('hex'),viewToken=randomBytes(24).toString('hex');
   const r={controlToken,viewToken,expiresAt:time+ttl,receiverSeen:0,revision:0,updatedAt:time,state:{page:0,clipId:null,playing:false,time:0,presenting:false,actions:[]}};rooms.set(id,r);return json(res,201,{id,controlToken,viewToken,expiresAt:r.expiresAt});
  }
  const room=rooms.get(match[1]);if(!room)throw fail('演示连接已结束或过期，请重新连接',404);
  const auth=(req.headers.authorization||'').replace(/^Bearer /,'');const controller=same(auth,room.controlToken),viewer=same(auth,room.viewToken);if(!controller&&!viewer)throw fail('演示连接凭证不正确',403);
  if(req.method==='DELETE'&&!match[2]){if(!controller)throw fail('仅控制端可结束连接',403);rooms.delete(match[1]);return json(res,200,{closed:true});}
  if(req.method==='GET'&&match[2]){if(viewer)room.receiverSeen=time;return json(res,200,{state:room.state,revision:room.revision,updatedAt:room.updatedAt,serverNow:time,connected:room.receiverSeen>0&&time-room.receiverSeen<6000,expiresAt:room.expiresAt});}
  if(req.method==='PUT'&&match[2]){if(!controller)throw fail('观众端不能修改演示',403);const value=await body(req);if(!validate(value))throw fail('演示状态无效',400);room.state={...(value.clipRun===undefined?{}:{clipRun:value.clipRun}),page:value.page,clipId:value.clipId,playing:value.playing,time:value.time,presenting:value.presenting,actions:(value.actions||[]).map(a=>({id:a.id,kind:a.kind,index:a.index,...(a.kind==='video'?{time:a.time,playing:a.playing}:{})}))};room.updatedAt=now();room.revision++;return json(res,200,{revision:room.revision,serverNow:room.updatedAt});}
  return json(res,405,{error:'演示连接操作不支持'});
 }catch(error){return json(res,error.status||500,{error:error.status?error.message:'演示同步服务错误'});}};
}
