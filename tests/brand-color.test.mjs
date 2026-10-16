import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('default brand blue is the official SVG blue; chips and controls share a single token',()=>{
 const css=readFileSync(new URL('../public/deck.css',import.meta.url),'utf8'),ui=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8'),logo=readFileSync(new URL('../lib/brand.ts',import.meta.url),'utf8');
 assert.match(logo,/#1eb2ff/i);assert.match(css,/--onion-brand-blue:#1EB2FF/);assert.doesNotMatch(css+ui,/#(?:087db8|518aff)\b/i);assert.match(css,/tags-blue \.comic-tags>span\{background:var\(--onion-brand-blue\);color:white/);assert.match(ui,/tag-swatch.blue\{background:var\(--onion-brand-blue\)/);
});
