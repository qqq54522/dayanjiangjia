type ReviewGroup={id:string;state:string;slides?:unknown[]};
export const hasImportResult=(g:ReviewGroup)=>!!g.slides?.length;
export const needsImportGeneration=(g:ReviewGroup)=>['pending','failed'].includes(g.state)&&!hasImportResult(g);
export function resumeImport(groups:ReviewGroup[],attach=false){
 const active=groups.filter(g=>hasImportResult(g)||g.state==='running');
 const review=!attach&&active.length>0;
 const scope=attach?groups.slice(0,1):review?active:groups.filter(g=>g.state!=='rejected');
 return {step:review?2:1,checked:scope.map(g=>g.id),selected:(scope.find(g=>g.state==='review')||scope.find(g=>g.state==='running')||scope[0])?.id||''};
}
