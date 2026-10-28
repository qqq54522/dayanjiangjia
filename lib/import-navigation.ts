type ReviewGroup={id:string;state:string;slides?:{id:string}[]};
export const hasImportResult=(g:ReviewGroup)=>!!g.slides?.length;
export const needsImportGeneration=(g:ReviewGroup)=>g.state==='failed'||g.state==='pending'&&!hasImportResult(g);
export function resumeImport(groups:ReviewGroup[],attach=false,scopeIds?:string[]){
 const active=groups.filter(g=>hasImportResult(g)||g.state==='running'||g.state==='failed');
 const review=!attach&&active.length>0;
 const saved=scopeIds?.length?groups.filter(g=>scopeIds.includes(g.id)):undefined;
 const scope=attach?groups.slice(0,1):review?saved||active:groups.filter(g=>g.state!=='rejected');
 return {step:review?2:1,checked:scope.map(g=>g.id),selected:(scope.find(g=>g.state==='failed')||scope.find(g=>g.state==='review')||scope.find(g=>g.state==='running')||scope[0])?.id||''};
}
/** Pending/failed neighbours never block applying the already reviewed subset. */
export function readyImportGroups<T extends ReviewGroup>(groups:T[],issues:Record<string,string[]>):T[]{
 return groups.filter(g=>g.state==='accepted'&&!!g.slides?.length&&g.slides.every(s=>Object.hasOwn(issues,s.id)&&issues[s.id].length===0));
}
