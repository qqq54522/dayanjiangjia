export type ProjectClip={id:string;title:string;url:string;kind?:'gif'|'video';grade?:string;subject?:string;duration?:number};
export const MAX_PROJECT_CLIPS=500;
const text=(x:unknown,n:number)=>typeof x==='string'&&x.length<=n;
export function validClips(value:unknown):value is ProjectClip[]{return Array.isArray(value)&&value.length<=MAX_PROJECT_CLIPS&&new Set(value.map(c=>c?.id)).size===value.length&&value.every(c=>c&&text(c.id,100)&&c.id&&text(c.title,200)&&typeof c.url==='string'&&/^\/media\/[\w.-]+\.(?:mp4|gif)$/i.test(c.url)&&(c.kind===undefined||c.kind===(/\.gif$/i.test(c.url)?'gif':'video'))&&(c.grade===undefined||text(c.grade,80))&&(c.subject===undefined||text(c.subject,80))&&(c.duration===undefined||Number.isFinite(c.duration)&&c.duration>0&&c.duration<=86400));}
export function allProjectClips(data:{clips?:ProjectClip[];versions?:{clips?:ProjectClip[]}[]}){return [...data.clips||[],...(data.versions||[]).flatMap(v=>v.clips||[])];}
export const CLIP_ACCEPT='.gif,.mp4,.m4v,.mov,.qt,.webm,.mkv,.avi,image/gif,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo';
export const isGifClip=(clip:ProjectClip)=>clip.kind==='gif'||/\.gif(?:[?#]|$)/i.test(clip.url);
