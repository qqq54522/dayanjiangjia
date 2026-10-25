import React from 'react';
import type {SlideContent} from '../lib/content';
type Table=NonNullable<SlideContent['table']>;
export function MatrixEditor({table,update}:{table:Table;update:(t:Table)=>void}){return <div className="matrix-editor"><h3>表头与行列内容</h3>{table.headers.map((h,j)=><label className="field" key={j}>第 {j+1} 列标题<input value={h} onChange={e=>update({...table,headers:table.headers.map((v,k)=>k===j?e.target.value:v)})}/></label>)}{table.rows.map((row,i)=><fieldset key={i}><legend>第 {i+1} 行</legend>{row.map((cell,j)=><label className="field" key={j}>{table.headers[j]}<textarea rows={j===0?1:2} value={cell} onChange={e=>update({...table,rows:table.rows.map((r,k)=>k===i?r.map((v,l)=>l===j?e.target.value:v):r)})}/></label>)}</fieldset>)}</div>}
