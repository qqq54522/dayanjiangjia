import {writeFileSync} from 'node:fs';
import {masterCatalog} from '../lib/masters.ts';
import {masterAsset,masterCSS} from '../lib/master-resources.mjs';
for(const m of masterCatalog)masterAsset(m);
writeFileSync(new URL('../public/deck.css',import.meta.url),masterCSS());
console.log('已校验并构建母版：'+masterCatalog.map(m=>m.id+'@'+m.version).join(', '));
