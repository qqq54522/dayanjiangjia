import React from 'react';
export function PlaybackSettings({value,onChange}:{value:{autoplay?:boolean;autoplaySeconds?:4|6|8};onChange:(patch:{autoplay?:boolean;autoplaySeconds?:4|6|8})=>void}){
 return <div className="gallery-playback-settings"><label className="supplement-option"><input type="checkbox" checked={!!value.autoplay} onChange={e=>onChange({autoplay:e.target.checked})}/><span>进入页面时自动轮播（默认手动）</span></label><label className="field">自动轮播间隔<select aria-label="自动轮播间隔" value={value.autoplaySeconds||6} onChange={e=>onChange({autoplaySeconds:Number(e.target.value) as 4|6|8})}><option value="4">4 秒</option><option value="6">6 秒</option><option value="8">8 秒</option></select></label><p className="source">手动切图、放大原图或离开页面时暂停；视频由你主动播放。</p></div>;
}
