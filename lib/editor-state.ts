import type {Workspace} from './deck.ts';
type Draft=Pick<Workspace,'title'|'slides'|'comments'|'proposals'|'settings'|'clips'>;
const draft=(d:Workspace):Draft=>({clips:d.clips,settings:d.settings,title:d.title,slides:d.slides,comments:d.comments,proposals:d.proposals});
const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export class EditorState{
 data:Workspace;revision:number;past:Draft[]=[];future:Draft[]=[];dirty=false;saving=false;error='';conflict=false;
 private generation=0;private group='';private time=0;private flight:Promise<number|false>|null=null;
 private write:(d:Workspace,r:number)=>Promise<number>;private notify:()=>void;
 constructor(data:Workspace,revision:number,write:(d:Workspace,r:number)=>Promise<number>,notify:()=>void){this.data=data;this.revision=revision;this.write=write;this.notify=notify;}
 adopt(data:Workspace,revision:number){this.data=data;this.revision=revision;this.dirty=false;this.error='';this.conflict=false;this.past=[];this.future=[];this.group='';this.notify();}
 acceptSaved(data:Workspace,revision:number,baseRevision:number){
  if(this.dirty||this.saving||this.revision!==baseRevision)throw Error('当前稿件已变化，补页已经保存到本机，请刷新后查看。');
  this.change(data);this.revision=revision;this.dirty=false;this.error='';this.notify();
 }
 change(data:Workspace,group=''){
 if(equal(data,this.data))return;
 if(!equal(draft(data),draft(this.data))){if(!group||group!==this.group||Date.now()-this.time>900){this.past.push(structuredClone(draft(this.data)));if(this.past.length>60)this.past.shift();}this.future=[];}
 this.group=group;this.time=Date.now();this.data=data;this.generation++;this.dirty=true;this.notify();
 }
 undo(){this.travel(this.past,this.future)}redo(){this.travel(this.future,this.past)}
 private travel(from:Draft[],to:Draft[]){const d=from.pop();if(!d)return;to.push(structuredClone(draft(this.data)));this.data={...this.data,...d};this.generation++;this.dirty=true;this.group='';this.notify();}
 flush():Promise<number|false>{if(this.flight)return this.flight;if(this.conflict)return Promise.resolve(false);if(!this.dirty)return Promise.resolve(this.revision);this.flight=this.run().finally(()=>{this.flight=null;});return this.flight;}
 private async run(){this.saving=true;this.error='';this.notify();try{while(this.dirty){const n=this.generation,r=await this.write(structuredClone(this.data),this.revision);this.revision=r;if(n===this.generation)this.dirty=false;this.notify();}return this.revision;}catch(e){this.conflict=(e as {status?:number}).status===409;this.error=this.conflict?'另一窗口或 Codex 已更新稿件。当前修改仍在此页，请导出 HTML 备份后刷新核对。':'自动保存失败，修改仍在此页。请保持页面打开，连接恢复后会重试。';return false;}finally{this.saving=false;this.notify();}}
}
export function historyShortcut(e:{key:string;metaKey:boolean;ctrlKey:boolean;shiftKey:boolean;altKey:boolean},editing:boolean){if(editing||e.altKey||!(e.metaKey||e.ctrlKey))return null;const key=e.key.toLowerCase();return key==='z'?(e.shiftKey?'redo':'undo'):key==='y'&&e.ctrlKey?'redo':null;}
