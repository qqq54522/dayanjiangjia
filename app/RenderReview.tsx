import React,{useEffect,useRef} from 'react';
import {Scene} from './Scene';
import {inspectScene} from '../lib/render-review';
import type {Slide} from '../lib/deck';
export function RenderReview({slide,onIssues,interactive=true}:{slide:Slide;interactive?:boolean;onIssues:(id:string,issues:string[])=>void}){
 const ref=useRef<HTMLDivElement>(null),callback=useRef(onIssues);callback.current=onIssues;
 useEffect(()=>{const node=ref.current;if(!node)return;let live=true;const check=()=>{const scene=node.querySelector<HTMLElement>('.scene');if(live&&scene)callback.current(slide.id,document.fonts.status==='loaded'?inspectScene(scene):['字体尚未加载完成，正在等待排版检查'])};const observer=new ResizeObserver(check);observer.observe(node);node.querySelectorAll('.scene,.content-main,.content-items,.content-item,.comic-title,.comic-opening,.cover-opening,.scene-media').forEach(el=>observer.observe(el));node.addEventListener('load',check,true);void document.fonts.ready.then(check);const frame=requestAnimationFrame(check);check();return()=>{live=false;cancelAnimationFrame(frame);observer.disconnect();node.removeEventListener('load',check,true)}},[slide]);
 return <div ref={ref}><Scene s={slide} interactive={interactive}/></div>;
}
