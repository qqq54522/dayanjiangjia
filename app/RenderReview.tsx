import React,{useEffect,useRef} from 'react';
import {Scene} from './Scene';
import {inspectScene} from '../lib/render-review';
import type {Slide} from '../lib/deck';
export function RenderReview({slide,onIssues}:{slide:Slide;onIssues:(id:string,issues:string[])=>void}){
 const ref=useRef<HTMLDivElement>(null),callback=useRef(onIssues);callback.current=onIssues;
 useEffect(()=>{const node=ref.current;if(!node)return;let live=true;const check=()=>{const scene=node.querySelector<HTMLElement>('.scene');if(live&&scene)callback.current(slide.id,inspectScene(scene))};const observer=new ResizeObserver(check);observer.observe(node);node.addEventListener('load',check,true);void document.fonts.ready.then(check);check();return()=>{live=false;observer.disconnect();node.removeEventListener('load',check,true)}},[slide]);
 return <div ref={ref}><Scene s={slide}/></div>;
}
