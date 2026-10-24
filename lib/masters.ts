import comic from '../masters/onion-comic/1.0.0/manifest.json' with {type:'json'};
export type MasterRef={id:string;version:string};
export const DEFAULT_MASTER:MasterRef={id:comic.id,version:comic.version};
/** Explicit allowlist: packages never execute uploaded code or choose arbitrary paths. */
export const masterCatalog=[comic] as const;
export function validMasterRef(value:unknown):value is MasterRef{const m=value as MasterRef;return !!m&&typeof m.id==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(m.id)&&typeof m.version==='string'&&/^\d+\.\d+\.\d+$/.test(m.version)}
export function masterDefinition(ref:MasterRef=DEFAULT_MASTER){const m=masterCatalog.find(m=>m.id===ref.id&&m.version===ref.version);if(!m)throw Error(`不支持母版 ${ref.id}@${ref.version}，请更新工作台后重试。`);return m}

export function masterBackground(ref:MasterRef=DEFAULT_MASTER){return '/media/'+masterDefinition(ref).assets.background.sha256+'.png'}
