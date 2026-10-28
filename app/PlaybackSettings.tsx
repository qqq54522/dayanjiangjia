import React,{useEffect,useState} from 'react';
export function PlaybackSettings({value,onChange}:{value:{autoplay?:boolean;autoplaySeconds?:number};onChange:(patch:{autoplay?:boolean;autoplaySeconds?:number})=>void}){
 const [seconds,setSeconds]=useState(String(value.autoplaySeconds??6)),[error,setError]=useState('');
 useEffect(()=>{setSeconds(String(value.autoplaySeconds??6));setError('')},[value.autoplaySeconds]);
 const valid=(raw:string)=>!!raw.trim()&&Number.isFinite(Number(raw))&&Number(raw)>=1&&Number(raw)<=3600;
 const edit=(raw:string)=>{setSeconds(raw);setError(valid(raw)?'':'请输入 1—3600 秒，可填写小数。')};
 const commit=()=>{if(valid(seconds)){setError('');onChange({autoplaySeconds:Number(seconds)})}else setError('请输入 1—3600 秒，可填写小数。')};
 return <div className="gallery-playback-settings"><label className="supplement-option"><input type="checkbox" checked={!!value.autoplay} onChange={e=>onChange({autoplay:e.target.checked})}/><span>进入页面时自动轮播（默认手动）</span></label><label className="field">自动轮播间隔（秒）<input type="number" aria-label="自动轮播间隔（秒）" min="1" max="3600" step="any" inputMode="decimal" value={seconds} aria-invalid={!!error} onChange={e=>edit(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label>{error&&<p className="source" role="alert">{error}</p>}<p className="source">直接输入秒数，例如 3 或 2.5。手动切图、放大原图或离开页面时暂停；视频由你主动播放。</p></div>;
}
