import React,{useEffect,useRef,useState} from 'react';
import {Upload,ArrowLeft,ArrowRight,Check,RefreshCw,Plus,Layers} from 'lucide-react';
import type {Slide,Workspace} from '../lib/deck';
import {insertionIndex,placementChapter,type Placement} from '../lib/supplement-context';
import {reviewReady} from '../lib/render-review';
import {confirmedSupplementGroups,supplementPreviewStatus} from '../lib/supplement-preview';
import {Scene} from './Scene';
import {RenderReview} from './RenderReview';
import {TaskProgress,type ProgressTask} from './TaskProgress';
import {SupplementHistory,type PreviewResult,type SourcePreview} from './SupplementHistory';

type Group=ProgressTask&{id:string;pages:number[];state:string;request:string;slides?:Slide[];error?:string;reason?:string;questions?:string[];revisionHistory?:{request:string;summary:string}[];previewHistory?:PreviewResult[];activePreviewId?:string};
type Draft={id:string;name:string;state:string;progress?:string;error?:string;pages:{number:number;preview:string}[];groups:Group[];warnings:string[];supplement?:{projectId:string;placement?:Placement}};
type Review={id:string;projectId:string;revision:number;state:string;placement:Placement;groupIds:string[];summary:string;findings:{severity:'notice'|'conflict';message:string}[];error?:string};
type Inserted={id:string;data:Workspace;revision:number;insertedIds:string[]};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
async function api(url:string,method='GET',data?:unknown){const r=await fetch(url,{method,...data===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}});const j=await r.json();if(!r.ok)throw Error(j.error||'请求未完成');return j}

export default function SupplementPages({projectId,doc,revision,onInserted}:{projectId:string;doc:Workspace;revision:number;onInserted:(value:Inserted,baseRevision:number)=>void}){
 const storage='onion-supplement:'+projectId;
 const [draft,setDraft]=useState<Draft|null>(null),[checked,setChecked]=useState<string[]>([]),[step,setStep]=useState(0),[request,setRequest]=useState(''),[allowSplit,setAllowSplit]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<Review|null>(null),[acknowledge,setAcknowledge]=useState(false),[afterId,setAfterId]=useState<string|null|undefined>(),[chapterId,setChapterId]=useState<string|null>(null);
 const [followups,setFollowups]=useState<Record<string,string>>({}),[insertionIds,setInsertionIds]=useState<string[]>([]);
 const [issues,setIssues]=useState<Record<string,string[]>>({}),[large,setLarge]=useState<Slide|{url:string;label:string}|null>(null),[history,setHistory]=useState<{id:string;name:string;state:string}[]>([]);
 const [viewing,setViewing]=useState<Record<string,string>>({});
 const uploadInput=useRef<HTMLInputElement>(null),alive=useRef(true);
 const insertedIds=new Set(doc.slides.map(s=>s.id));
 const groups=draft?.groups.filter(g=>checked.includes(g.id)&&!g.slides?.every(s=>insertedIds.has(s.id)))||[];
 const insertionGroups=draft?.groups.filter(g=>insertionIds.includes(g.id))||[],activeGroups=step===2?insertionGroups:groups,pages=activeGroups.flatMap(g=>g.slides||[]);
 const confirmed=confirmedSupplementGroups(groups,issues,insertedIds);
 const generating=!!draft?.groups.some(g=>g.state==='running'),checking=review?.state==='running',working=generating||checking||draft?.state==='parsing';
 const allGenerated=!!activeGroups.length&&activeGroups.every(g=>['review','accepted'].includes(g.state)&&g.slides?.length);
 const measured=allGenerated&&reviewReady(pages,issues);
 const chapters=[...new Map(doc.slides.filter(s=>s.chapter).map(s=>[s.chapter!.id,s.chapter!])).values()];
 const placement=afterId===undefined?undefined:{afterId,chapterId};
 const positionValid=afterId===null||doc.slides.some(s=>s.id===afterId);
 const validReview=review?.state==='completed'&&review.revision===revision&&same(review.placement,placement)&&same(review.groupIds,insertionIds)&&allGenerated;
 const conflicts=!!review?.findings.some(f=>f.severity==='conflict');
 const previewPages=pages.map(s=>({...s,chapter:doc.slides.find(p=>p.chapter?.id===chapterId)?.chapter}));
 const recordIssues=(id:string,value:string[])=>setIssues(old=>same(old[id],value)?old:{...old,[id]:value});
 async function perform(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await fn()}catch(e){if(alive.current)setError(String((e as Error).message||e))}finally{if(alive.current)setBusy(false)}}
 async function resume(id:string){const d=await api('/api/references/'+id) as Draft;if(d.supplement?.projectId!==projectId)throw Error('此补页任务不属于当前项目');setDraft(d);const result=await api('/api/supplements/'+id) as Review|null;setReview(result);if(result){setAfterId(result.placement.afterId);setChapterId(result.placement.chapterId);setInsertionIds(result.groupIds);setChecked(old=>[...new Set([...old,...result.groupIds])]);setStep(result.state==='inserted'?2:result.state==='outdated'||!result.groupIds.every(id=>d.groups.find(g=>g.id===id)?.state==='accepted')?1:2)}else {setChecked(old=>old.filter(id=>d.groups.some(g=>g.id===id)));if(!d.groups.some(g=>g.state==='accepted'))setStep(old=>old===2?1:old)}}
 useEffect(()=>{alive.current=true;void api('/api/references').then(list=>{if(alive.current)setHistory(list.filter((d:any)=>d.supplement?.projectId===projectId))}).catch(()=>{});
  try{const saved=JSON.parse(localStorage.getItem(storage)||'null');if(saved){setChecked(saved.checked||[]);setStep(saved.step||0);setRequest(saved.request||'');setAllowSplit(!!saved.allowSplit);setFollowups(saved.followups||{});setInsertionIds(saved.insertionIds||[]);setAfterId(saved.afterId);setChapterId(saved.chapterId||null);void resume(saved.id).catch(e=>{if(alive.current)setError(String(e.message))})}}catch{}
  return()=>{alive.current=false};
 },[projectId]);
 useEffect(()=>{if(draft)localStorage.setItem(storage,JSON.stringify({id:draft.id,checked,step,request,allowSplit,afterId,chapterId,followups,insertionIds}))},[draft?.id,checked,step,request,allowSplit,afterId,chapterId,followups,insertionIds]);
 useEffect(()=>{if(!draft||!generating&&draft.state!=='parsing')return;let live=true;const timer=setInterval(()=>{void api('/api/references/'+draft.id).then(d=>{if(live)setDraft(d)}).catch(e=>{if(live)setError(e.message)})},1500);return()=>{live=false;clearInterval(timer)}},[draft?.id,generating,draft?.state]);
 useEffect(()=>{if(!draft||!checking)return;let live=true;const timer=setInterval(()=>{void api('/api/supplements/'+draft.id).then(r=>{if(live)setReview(r)}).catch(e=>{if(live)setError(e.message)})},1500);return()=>{live=false;clearInterval(timer)}},[draft?.id,checking]);
 useEffect(()=>{if(draft?.state==='ready'&&draft.groups.length===1&&!checked.length)setChecked([draft.groups[0].id])},[draft?.id,draft?.state]);
 async function upload(file:File){if(working)return;await perform(async()=>{if(!/\.pptx$/i.test(file.name))throw Error('请选择 PPTX 文件；单页或多页均可。');const r=await fetch('/api/references?purpose=supplement&project='+encodeURIComponent(projectId)+'&name='+encodeURIComponent(file.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});const d=await r.json();if(!r.ok)throw Error(d.error);setDraft(d);setChecked([]);setInsertionIds([]);setReview(null);setStep(0);setIssues({});setAfterId(undefined);setAcknowledge(false)})}
 async function generate(target?:Group){if(!draft)return;if(target?.slides?.length){await perform(async()=>{setViewing(old=>({...old,[target.id]:''}));setReview(null);setDraft(await api('/api/references/'+draft.id+'/revise','POST',{groupId:target.id,request:followups[target.id]?.trim()||target.request||'保留当前结果，完成上次未成功的调整。',renderIssues:(target.slides||[]).flatMap(s=>issues[s.id]||[]).slice(0,30),allowPageCountChange:allowSplit}))});return;}await perform(async()=>{const chosen=(target?[target]:groups).filter(g=>!g.slides?.length);for(const g of chosen)await api('/api/references/'+draft.id,'PATCH',{groupId:g.id,request,keepOne:!allowSplit,allowPageCountChange:allowSplit});setReview(null);setAcknowledge(false);setStep(1);
  setDraft(await api('/api/references/'+draft.id+(target?'/generate':'/generate-all'),'POST',target?{groupId:target.id}:{groupIds:groups.map(g=>g.id)}));
 })}
 async function revise(target:Group,repair=false){if(!draft)return;const message=followups[target.id]?.trim()|| (repair?'保留当前预览中未提到的内容和素材，修复检查发现的越界；优先重新分配图文区域与留白，保持正常字号。':'');if(!message)return;await perform(async()=>{
  const renderIssues=(target.slides||[]).flatMap(s=>issues[s.id]||[]).slice(0,30);
  setViewing(old=>({...old,[target.id]:''}));setReview(null);setAcknowledge(false);setDraft(await api('/api/references/'+draft.id+'/revise','POST',{groupId:target.id,request:message,renderIssues,allowPageCountChange:allowSplit}));
 })}
 async function restoreResult(target:Group,previewId:string){if(!draft)return;await perform(async()=>{
  const d=await api('/api/references/'+draft.id+'/restore','POST',{groupId:target.id,previewId,expectedPreviewId:target.activePreviewId});
  setDraft(d);setViewing(old=>({...old,[target.id]:''}));setReview(null);setAcknowledge(false);setFollowups(old=>({...old,[target.id]:''}));
 })}
 async function confirmGroup(target:Group){if(!draft||supplementPreviewStatus(target,issues,insertedIds).state!=='ready')return;await perform(async()=>{setDraft(await api('/api/references/'+draft.id,'PATCH',{groupId:target.id,decision:'accepted',previewIds:target.slides!.map(s=>s.id)}));setReview(null)})}
 function choosePosition(id:string|null){setAfterId(id);setChapterId(placementChapter(doc.slides,id)?.id||null);setAcknowledge(false)}
 const input=()=>({projectId,revision,groupIds:insertionIds,placement});
 async function check(){if(!draft||!placement)return;await perform(async()=>{setAcknowledge(false);setReview(await api('/api/supplements/'+draft.id+'/review','POST',input()))})}
 async function adjust(){if(!draft||!placement)return;await perform(async()=>{setDraft(await api('/api/supplements/'+draft.id+'/adjust','POST',input()));setReview(null);setAcknowledge(false);setStep(1)})}
 async function insert(){if(!draft||!review||!validReview)return;await perform(async()=>{const result=await api('/api/supplements/'+draft.id+'/insert','POST',{projectId,revision,jobId:review.id,acknowledge});localStorage.removeItem(storage);onInserted(result,review.revision)})}
 let previous:Slide|undefined,next:Slide|undefined;if(placement&&positionValid){const at=insertionIndex(doc.slides,placement.afterId);previous=doc.slides[at-1];next=doc.slides[at]}
 const showPage=(s:Slide)=> <div className="supplement-scene"><Scene s={s} interactive={false}/></div>;
 return <div className="supplement-wizard">
  <header className="import-heading"><div><span className="import-eyebrow">在现有稿件中继续创作</span><h2>补入页面</h2><p>上传新增 PPT，生成并检查后选择位置，确认插入当前稿件。</p></div></header>
  <nav className="import-steps" aria-label="补页步骤">{['上传与选页','生成与预览','选择位置并插入'].map((label,i)=><div key={label} className={step===i?'current':step>i?'complete':''} aria-current={step===i?'step':undefined}><span>{step>i?<Check size={14}/>:i+1}</span>{label}</div>)}</nav>
  <div className="supplement-context"><b>已参考当前稿件：{doc.slides.length} 页 · {chapters.length} 个章节</b><span>生成时参考整稿大纲和代表页面，选好位置后检查前后衔接。</span><details><summary>查看参考范围</summary><p>{doc.title}</p><ol>{doc.slides.map((s,i)=><li key={s.id}>第 {i+1} 页 · {s.title||'未命名页面'}{s.chapter?' · '+s.chapter.title:''}</li>)}</ol></details></div>
  {error&&<p className="error" role="alert">{error}</p>}
  {draft?.state==='parsing'&&<p role="status">{draft.progress||'正在分析 PPT、提取素材并建立索引…'}</p>}
  {draft?.state==='failed'&&<div role="alert"><p>{draft.error}</p><button disabled={busy} onClick={()=>void perform(async()=>setDraft(await api('/api/references/'+draft.id+'/retry','POST',{})))}>重新解析</button></div>}
  {generating&&<><TaskProgress task={draft!.groups.find(g=>g.state==='running')!} title="正在生成补页"/><button disabled={busy} onClick={()=>void perform(async()=>{await api('/api/conversion/cancel','POST',{});setDraft(await api('/api/references/'+draft!.id))})}>取消生成</button></>}
  {step===0&&<>
   {!draft&&<div className="import-upload-zone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)void upload(f)}}><Upload size={32}/><h3>上传需要补入的 PPT</h3><p>可以是单页 PPT，也可以从完整 PPT 中选择新增页。</p><button className="primary" disabled={busy} onClick={()=>uploadInput.current?.click()}>选择 PPTX 文件</button></div>}
   {draft?.state==='ready'&&<><h3>{draft.name}</h3><p>只生成本次选中的原页。</p><div className="supplement-source-grid">{draft.groups.map(g=><label key={g.id} className={checked.includes(g.id)?'selected':''}><input type="checkbox" checked={checked.includes(g.id)} disabled={busy||working||supplementPreviewStatus(g,issues,insertedIds).state==='inserted'} onChange={e=>{setChecked(ids=>e.target.checked?draft.groups.filter(x=>ids.includes(x.id)||x.id===g.id).map(x=>x.id):ids.filter(id=>id!==g.id));setReview(null)}}/>{draft.pages.filter(p=>g.pages.includes(p.number)).map(p=><img key={p.number} src={p.preview} alt={'原稿第 '+p.number+' 页'}/>)}<b>原稿第 {g.pages.join('、')} 页</b>{!!g.slides?.length&&<span>已有 {g.slides.length} 页预览</span>}</label>)}</div><button className="primary" disabled={!checked.length||busy||working} onClick={()=>setStep(1)}>继续 · 已选 {checked.length} 组 <ArrowRight size={16}/></button></>}
   {!draft&&history.length>0&&<section><h3>本项目的补页记录</h3>{history.map(h=><button key={h.id} disabled={busy} onClick={()=>void perform(async()=>{setChecked([]);setStep(0);await resume(h.id)})}>{h.name}</button>)}</section>}
   <input ref={uploadInput} hidden type="file" accept=".pptx" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void upload(f)}}/>
  </>}
  {step===1&&draft&&<>
   <label className="field">首次补页要求（可选）<textarea rows={3} value={request} maxLength={10000} onChange={e=>setRequest(e.target.value)} placeholder="例如：补充课程范围，用原图作证据，沿用现有稿件风格。" disabled={working||busy}/></label>
   <label className="supplement-option"><input type="checkbox" checked={allowSplit} disabled={working||busy} onChange={e=>setAllowSplit(e.target.checked)}/><span>允许内容较多的原页拆成多页（默认每个原页生成一页）</span></label>
   <div className="supplement-actions"><button disabled={busy||working} onClick={()=>setStep(0)}><ArrowLeft size={16}/>重新选页</button><button className="primary" disabled={!groups.length||busy||working||groups.every(g=>['review','accepted'].includes(g.state))} onClick={()=>void generate()}><Layers size={16}/>生成未完成页面</button></div>
   {groups.map(g=>{const status=supplementPreviewStatus(g,issues,insertedIds),selected=viewing[g.id]||g.activePreviewId,browsing=!!selected&&selected!==g.activePreviewId;return <section className="supplement-result" key={g.id}>
    <header><h3>原稿第 {g.pages.join('、')} 页</h3>{g.state==='failed'&&<button disabled={busy||working} onClick={()=>void generate(g)}><RefreshCw size={15}/>重试这一组</button>}</header>
    {g.error&&<p className="error" role="alert">{g.error}</p>}{!g.slides?.length&&!generating&&<p>生成后在这里预览。</p>}
    {!!g.previewHistory?.length&&<SupplementHistory results={g.previewHistory} currentId={g.activePreviewId} selectedId={selected} sources={draft.pages.filter(p=>g.pages.includes(p.number))} busy={busy||!!working} onSelect={id=>setViewing(old=>({...old,[g.id]:id}))} onRestore={id=>void restoreResult(g,id)} onLarge={setLarge} onSourceLarge={(p:SourcePreview)=>setLarge({url:p.preview,label:'原稿第 '+p.number+' 页'})}/>}
    {!!g.slides?.length&&!browsing&&<>
     <div className={'supplement-group-status '+status.state} role="status"><b>{status.state==='confirmed'?'✓ 已确认这一组':status.state==='ready'?'排版检查通过，请确认这一组':status.state==='blocked'?'需要调整后再确认':status.state==='checking'?'正在检查排版':'当前预览待处理'}</b>{status.messages.map((message,i)=><p key={i}>{message}</p>)}</div>
     <div className="supplement-followup"><label className="field">在当前结果上继续修改<textarea aria-label={'修改原稿第 '+g.pages.join('、')+' 页的生成结果'} rows={3} value={followups[g.id]||''} maxLength={10000} disabled={busy||working} onChange={e=>setFollowups(old=>({...old,[g.id]:e.target.value}))} placeholder="例如：整体保留，把视频右侧的空白收小，让文字区域宽一些，文字和视频都保留。"/></label><p className="source">会同时参考原稿素材、当前生成结果、最近的调整要求和排版检查，只修改这一组。</p><div className="supplement-actions"><button disabled={busy||working||!followups[g.id]?.trim()} onClick={()=>void revise(g)}><RefreshCw size={15}/>按这段话修改这一组</button>{status.state==='blocked'&&<button disabled={busy||working} onClick={()=>void revise(g,true)}>修复本组排版问题</button>}</div></div>
     {!!g.revisionHistory?.length&&<details className="supplement-turns"><summary>最近的调整记录</summary>{g.revisionHistory.map((turn,i)=><div key={i}><p>{turn.request||'首次生成'}</p><small>{turn.summary}</small></div>)}</details>}
     <button className="primary" disabled={busy||working||status.state!=='ready'} onClick={()=>void confirmGroup(g)}><Check size={16}/>{status.state==='confirmed'?'这一组已确认':'确认这一组'}</button>
    </>}
   </section>})}
   <div className="supplement-continue"><p>已确认 {confirmed.length} / {groups.length} 组。{confirmed.length<groups.length?'可以先插入已确认的部分，其他组保留供继续修改。':''}</p><button className="primary wide" disabled={!confirmed.length||busy||working} onClick={()=>{setInsertionIds(confirmed.map(g=>g.id));setStep(2)}}>选择插入位置（已确认 {confirmed.length} 组） <ArrowRight size={16}/></button>{!confirmed.length&&<p className="source">请在满意且排版检查通过的预览下点击「确认这一组」。</p>}</div>
  </>}
  {step===2&&draft&&<>
   {review?.state==='inserted'?<div><p role="status">这一批补页已插入当前稿件。</p><button onClick={()=>{setReview(null);setInsertionIds([]);setChecked([]);setStep(0)}}>继续选择其他补页</button></div>:<>
    <button disabled={busy||working} onClick={()=>setStep(1)}><ArrowLeft size={16}/>返回补页预览</button>
    <h3>选择插入位置</h3><div className="supplement-position-list" aria-label="插入位置"><button aria-pressed={afterId===null} disabled={busy||working} onClick={()=>choosePosition(null)}><Plus size={16}/>放在稿件开头</button>{doc.slides.map((s,i)=><button key={s.id} aria-pressed={afterId===s.id} disabled={busy||working} onClick={()=>choosePosition(s.id)}><div className="supplement-position-thumb">{showPage(s)}</div><span>插在第 {i+1} 页后<br/>{s.title||'未命名页面'}</span></button>)}</div>
    {placement&&!positionValid&&<p className="error">原插入位置已删除，请重新选择。</p>}
    {placement&&positionValid&&<><label className="field">补页所属章节<select value={chapterId||''} disabled={busy||working} onChange={e=>{setChapterId(e.target.value||null);setAcknowledge(false)}}><option value="">不加入章节</option>{chapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
     <div className="supplement-neighbours"><section><h4>前一页</h4>{previous?showPage(previous):<p>稿件开头</p>}</section><section><h4>待插入 · {pages.length} 页</h4>{previewPages.map(s=><div key={s.id}><Scene s={s} interactive={false}/><button onClick={()=>setLarge(s)}>放大检查</button></div>)}</section><section><h4>后一页</h4>{next?showPage(next):<p>稿件结尾</p>}</section></div>
     <div className="supplement-actions"><button className="primary" disabled={busy||working||!measured} onClick={()=>void check()}>{checking?'正在检查衔接…':validReview?'重新检查衔接':'检查此位置的衔接'}</button><button disabled={busy||working||!allGenerated} onClick={()=>void adjust()}>按此位置调整补页</button>{checking&&<button disabled={busy} onClick={()=>void perform(async()=>{await api('/api/supplements/'+draft.id+'/cancel','POST',{});setReview(await api('/api/supplements/'+draft.id))})}>取消检查</button>}</div>
     {review?.error&&<p className="error" role="alert">{review.error}</p>}
     {review?.state==='completed'&&!validReview&&<p className="error">位置、章节或稿件已变化，请重新检查衔接。</p>}
     {validReview&&<section className="supplement-review" role="status"><h3>衔接检查</h3><p>{review!.summary}</p>{review!.findings.map((f,i)=><p key={i} className={f.severity==='conflict'?'error':''}>{f.severity==='conflict'?'需核对：':'建议：'}{f.message}</p>)}{conflicts&&<label className="supplement-option"><input type="checkbox" checked={acknowledge} onChange={e=>setAcknowledge(e.target.checked)}/><span>我已核对冲突提示，确认按当前内容插入</span></label>}</section>}
     <button className="primary wide" disabled={busy||working||!validReview||!measured||conflicts&&!acknowledge} onClick={()=>void insert()}><Check size={16}/>确认插入 {pages.length} 页</button><p className="source">插入当前草稿，可撤销。之后可以重新导出 HTML，或在顶部发布。</p>
    </>}
   </>}
  </>}
  {draft&&!working&&review?.state!=='inserted'&&<button className="supplement-reset" disabled={busy} onClick={()=>{localStorage.removeItem(storage);setDraft(null);setChecked([]);setReview(null);setStep(0);setAfterId(undefined);setAcknowledge(false)}}>换一份 PPT</button>}
  {step>0&&<div className="review-background-checks" aria-hidden="true">{(step===2?previewPages:pages).map(s=><div key={s.id}><RenderReview slide={s} interactive={false} onIssues={recordIssues}/></div>)}</div>}
  {step===2&&pages.some(s=>issues[s.id]?.length)&&<div className="error" role="alert">{pages.flatMap(s=>(issues[s.id]||[]).map((message,i)=><p key={s.id+i}>{message}</p>))}<p>请返回补页预览，调整后重新检查。</p></div>}
  {!!draft?.warnings?.length&&<details><summary>原稿解析提示（{draft.warnings.length}）</summary>{draft.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
  {large&&<div className="overlay supplement-large" onClick={()=>setLarge(null)}><section className="dialog large" role="dialog" aria-modal="true" aria-label="补页放大预览" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setLarge(null)}>关闭预览</button>{'url' in large?<img className="supplement-original-large" src={large.url} alt={large.label}/>:<Scene s={large}/>}</section></div>}
 </div>;
}
