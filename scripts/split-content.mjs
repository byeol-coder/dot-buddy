import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const source = process.argv[2] || 'content/01_intro.dtms';
const target = process.argv[3] || 'content/01_intro';
const document = JSON.parse(await readFile(source, 'utf8'));
if (!Array.isArray(document.items) || !document.items.length) throw new Error('Expected a DTMS document with items[].');
await rm(target, { recursive:true, force:true });
await mkdir(join(target, 'pages'), { recursive:true });
const { items, ...metadata } = document;
const manifest = { ...metadata, pageCount:items.length, pages:items.map((item,index)=>({ page:item.page ?? index + 1, title:item.title || '', file:`pages/${String(index + 1).padStart(3,'0')}.json` })) };
await writeFile(join(target, 'manifest.json'), JSON.stringify(manifest));
await Promise.all(items.map((item,index)=>writeFile(join(target, 'pages', `${String(index + 1).padStart(3,'0')}.json`), JSON.stringify(item))));
console.log(`Wrote ${items.length} progressive page files to ${target}`);
