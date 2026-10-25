import React from 'react';
/** Cover typography stays editable; no decorative business claims or hidden copy. */
export function CoverOpening({title,subtitle}:{title:string;subtitle?:string}){
 const length=title.replace(/\s/g,'').length,lines=title.split('\n'),longest=Math.max(...lines.map(line=>line.replace(/\s/g,'').length));
 return <><div className="cover-stage" aria-hidden="true"/><div className="cover-cut" aria-hidden="true"/><div className="cover-spark" aria-hidden="true"/><div className="cover-opening" data-title-density={length>36||longest>10?'long':length>20||longest>7?'medium':'short'}><div className="cover-signal" aria-hidden="true"><i/><i/><i/></div><h1>{lines.map((line,i)=><span key={i} data-accent={lines.length>1&&i===lines.length-1?true:undefined}>{line}</span>)}</h1>{subtitle&&<p className="cover-subtitle">{subtitle}</p>}</div><div className="cover-endmark" aria-hidden="true"/></>;
}
