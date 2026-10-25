import React from 'react';
import type {SlideContent} from '../lib/content';
/** Editable relationship matrix. Focus changes emphasis, never removes information. */
export function FocusTable({table,interactive}:{table:NonNullable<SlideContent['table']>;interactive:boolean}){
 const control=(label:string,axis:string,index:number)=><button type="button" disabled={!interactive} data-matrix-axis={axis} data-matrix-index={index} aria-pressed="false" aria-label={`聚焦${label}`}>{label}</button>;
 return <div className="focus-matrix" data-row-accents={table.rowAccents||undefined} data-matrix="" data-focus-axis="" data-focus-index="">
  <table><thead><tr>{table.headers.map((h,i)=><th key={i} scope="col" data-matrix-col={i}>{control(h,i===0?'all':'col',i)}</th>)}</tr></thead><tbody>{table.rows.map((row,i)=><tr key={i} data-matrix-row={i}>{row.map((cell,j)=>j===0?<th key={j} scope="row" data-matrix-col={0}>{control(cell,'row',i)}</th>:<td key={j} data-matrix-col={j}>{table.tagColumns?.includes(j)?<div className="matrix-products">{cell.split(/[·\n]/).map(v=>v.trim()).filter(Boolean).map((name,k)=><span className="matrix-product" key={k}>{name}</span>)}</div>:table.seriesColumns?.includes(j)?<div className="matrix-series" data-count={cell.split(/[·\n]/).filter(v=>v.trim()).length}>{cell.split(/[·\n]/).map(v=>v.trim()).filter(Boolean).map((name,k)=>{const match=name.match(/^([^：:]{1,8})[：:]\s*(.+)$/);return <div className="matrix-series-card" key={k}>{match&&<span className="matrix-series-scope">{match[1]}</span>}<strong>{match?match[2]:name}</strong></div>})}</div>:cell.split('\n').map((line,k)=><span className="matrix-line" key={k}>{line}</span>)}</td>)}</tr>)}</tbody></table>
  {table.footer&&<div className="matrix-footer" data-matrix-row={table.rows.length}>{control(table.footer.label,'row',table.rows.length)}<p>{table.footer.text}</p></div>}
 </div>;
}
