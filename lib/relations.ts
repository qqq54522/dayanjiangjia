import {contentLayout,type SlideContent,type ContentItem} from './content.ts';

export type RelationNode={item:ContentItem;role:'premise'|'bridge'|'result'|'cycle';x:number;y:number;width:number;height:number};
export function relationParts(c:SlideContent){
 const main=c.items.filter(i=>i.placement!=='detail'),result=main.find(i=>i.id===c.presentation?.resultId)||main.at(-1);
 const rest=main.filter(i=>i!==result),bridge=c.presentation?.bridgeId===null?undefined:rest.find(i=>i.id===c.presentation?.bridgeId)||(main.length>=4?rest.at(-1):undefined);
 return {main,result,bridge,premises:rest.filter(i=>i!==bridge)};
}
/** Normalized geometry is shared by preview and self-contained exported markup. */
export function relationPlan(c:SlideContent):{nodes:RelationNode[];paths:string[]}{
 const {main,result,bridge,premises}=relationParts(c),layout=contentLayout(c),nodes:RelationNode[]=[],paths:string[]=[];
 const put=(item:ContentItem|undefined,role:RelationNode['role'],x:number,y:number,width:number,height:number)=>{if(item)nodes.push({item,role,x,y,width,height})};
 if(layout==='induction'){
  const hasBridge=!!bridge,simpleInputs=[...premises,...(bridge?[bridge]:[])].every(item=>!item.body?.trim()&&!item.media&&!item.value?.trim());
  const roomForResult=!!result?.body?.trim()&&simpleInputs,rows=premises.length,gap=1.5,w=(100-Math.max(0,rows-1)*gap)/Math.max(1,rows);
  const h=roomForResult?(hasBridge?27:35):(hasBridge?32:44),bridgeY=roomForResult?35:47,bridgeHeight=roomForResult?18:24,resultY=roomForResult?(hasBridge?58:52):(hasBridge?80:73);
  premises.forEach((item,i)=>put(item,'premise',i*(w+gap),0,w,h));
  if(rows>1)paths.push(`M${w*5} ${h*5+5} V${h*5+30} H${(100-w/2)*10} V${h*5+5}`);
  if(rows)paths.push(`M500 ${h*5+5} V${(hasBridge?bridgeY:resultY)*5-15}`);
  if(hasBridge){put(bridge,'bridge',9,bridgeY,82,bridgeHeight);paths.push(`M500 ${(bridgeY+bridgeHeight)*5+5} V${resultY*5-10}`)}
  put(result,'result',15,resultY,70,100-resultY);
 }else if(layout==='converge'){
  const inputs=main.filter(i=>i!==result),count=inputs.length,center=c.presentation?.relationMode==='center';
  if(center){
   const rows=Math.ceil(count/2),gap=8,h=Math.min(35,(100-Math.max(0,rows-1)*gap)/Math.max(1,rows));
   inputs.forEach((item,i)=>{const side=i%2,row=Math.floor(i/2),y=rows===1?32.5:row*(100-h)/(rows-1);put(item,'premise',side?72:0,y,28,h);const mid=(y+h/2)*5;paths.push(`M${side?715:285} ${mid} Q${side?680:320} ${mid} ${side?650:350} ${mid<250?170:330}`)});
   put(result,'result',36,30,28,40);
  }else{
   const gap=4,h=(100-Math.max(0,count-1)*gap)/Math.max(1,count);
   inputs.forEach((item,i)=>{const y=i*(h+gap),mid=(y+h/2)*5;put(item,'premise',0,y,65,h);paths.push(`M655 ${mid} H720 V250`)});
   if(count)paths.push('M720 250 H775');put(result,'result',79,31,21,38);
  }
 }else{
  const fixed=[[50,11],[84,30],[84,71],[50,90],[16,71],[16,30]];
  main.forEach((item,i)=>{const a=-Math.PI/2+i*2*Math.PI/main.length,p=main.length===6?fixed[i]:[50+34*Math.cos(a),50+39*Math.sin(a)];put(item,'cycle',p[0]-11,p[1]-10,22,20)});
  if(main.length===6)paths.push('M615 55 Q725 55 775 95','M840 203 L840 295','M775 410 Q715 450 623 450','M385 450 Q275 450 225 410','M160 303 L160 210','M225 95 Q285 55 377 55');
  else if(main.length>1)for(let i=0;i<nodes.length;i++){
   const from=nodes[i],to=nodes[(i+1)%nodes.length],x=(from.x+11)*10,y=(from.y+10)*5,tx=(to.x+11)*10,ty=(to.y+10)*5,dx=tx-x,dy=ty-y;
   const trim=Math.min(.45,125/Math.abs(dx),58/Math.abs(dy));
   paths.push(`M${x+dx*trim} ${y+dy*trim} Q${500+(x+tx-1000)*.65} ${250+(y+ty-500)*.65} ${tx-dx*trim} ${ty-dy*trim}`);
  }
 }
 return {nodes,paths};
}
