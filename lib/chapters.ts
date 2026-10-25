import type {Chapter} from './content.ts';
export const chapterPalette=[{id:'forest',name:'松绿',hex:'#316457'},{id:'clay',name:'陶红',hex:'#A34F40'},{id:'plum',name:'莓紫',hex:'#77506E'},{id:'cocoa',name:'暖棕',hex:'#796047'}] as const;
export type ChapterColor=typeof chapterPalette[number]['id'];
export const validChapterColor=(x:unknown)=>chapterPalette.some(c=>c.id===x);
export function chapterColor(chapter:Chapter){if(chapter.color)return chapterPalette.find(c=>c.id===chapter.color)!.hex;let hash=0;for(const c of chapter.id)hash=(hash*31+c.charCodeAt(0))>>>0;return chapterPalette[hash%chapterPalette.length].hex;}
export function nextChapterColor(chapters:Chapter[]):ChapterColor{return [...chapterPalette].sort((a,b)=>chapters.filter(c=>chapterColor(c)===a.hex).length-chapters.filter(c=>chapterColor(c)===b.hex).length)[0].id;}
