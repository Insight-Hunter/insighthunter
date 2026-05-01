#!/usr/bin/env node
/**

- convert-wrangler.mjs
- 
- Finds every wrangler.jsonc in the monorepo, converts it to wrangler.toml
- (merging if a .toml already exists), then deletes the .jsonc file.
- 
- Usage:
- node scripts/convert-wrangler.mjs
- node scripts/convert-wrangler.mjs –dry-run   (preview only, no writes)
  */

import fs from ‘fs’;
import path from ‘path’;
import { fileURLToPath } from ‘url’;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ‘..’);
const DRY_RUN = process.argv.includes(’–dry-run’);

// ─── TOML serialiser (no dependencies) ───────────────────────────────────────

function toToml(obj, parentKey = ‘’) {
let out = ‘’;
const inlineTypes = new Set([‘string’, ‘number’, ‘boolean’]);
const isInlineArray = (arr) => arr.every(v => inlineTypes.has(typeof v));

// Scalars and inline arrays first (key = value lines)
for (const [k, v] of Object.entries(obj)) {
if (v === null || v === undefined) continue;
const key = parentKey ? k : k;

```
if (typeof v === 'string')  { out += `${key} = ${JSON.stringify(v)}\n`; continue; }
if (typeof v === 'number')  { out += `${key} = ${v}\n`;                continue; }
if (typeof v === 'boolean') { out += `${key} = ${v}\n`;                continue; }

if (Array.isArray(v)) {
  if (isInlineArray(v)) {
    out += `${key} = [${v.map(x => JSON.stringify(x)).join(', ')}]\n`;
  }
  // Non-inline arrays handled below in a second pass
  continue;
}
```

}

// Objects (becomes [section])
for (const [k, v] of Object.entries(obj)) {
if (v === null || v === undefined) continue;
if (typeof v !== ‘object’ || Array.isArray(v)) continue;

```
const section = parentKey ? `${parentKey}.${k}` : k;
out += `\n[${section}]\n`;
out += toToml(v, section);
```

}

// Non-inline arrays (becomes [[array]])
for (const [k, v] of Object.entries(obj)) {
if (!Array.isArray(v)) continue;
if (isInlineArray(v)) continue;
if (v.length === 0) continue;

```
const section = parentKey ? `${parentKey}.${k}` : k;

for (const item of v) {
  if (typeof item !== 'object' || item === null) continue;
  out += `\n[[${section}]]\n`;
  out += toToml(item, section);
}
```

}

return out;
}

// ─── Strip comments from JSONC ────────────────────────────────────────────────

function stripJsoncComments(src) {
let out = ‘’;
let i = 0;
while (i < src.length) {
// Line comment
if (src[i] === ‘/’ && src[i + 1] === ‘/’) {
while (i < src.length && src[i] !== ‘\n’) i++;
continue;
}
// Block comment
if (src[i] === ‘/’ && src[i + 1] === ‘*’) {
i += 2;
while (i < src.length && !(src[i] === ’*’ && src[i + 1] === ‘/’)) i++;
i += 2;
continue;
}
// String literal — skip contents so we don’t strip // inside strings
if (src[i] === ‘"’) {
out += src[i++];
while (i < src.length) {
if (src[i] === ‘\’) { out += src[i++]; out += src[i++]; continue; }
if (src[i] === ‘"’)  { out += src[i++]; break; }
out += src[i++];
}
continue;
}
out += src[i++];
}
return out;
}

// ─── Simple TOML parser (handles what wrangler.toml typically contains) ──────

function parseToml(src) {
const result = {};
let current = result;
let currentPath = [];
let currentArrayKey = null;

for (let line of src.split(’\n’)) {
line = line.trim();
if (!line || line.startsWith(’#’)) continue;

```
// [[array-of-tables]]
const arrMatch = line.match(/^\[\[(.+)\]\]$/);
if (arrMatch) {
  const keyPath = arrMatch[1].trim().split('.');
  currentArrayKey = keyPath;
  let node = result;
  for (let i = 0; i < keyPath.length - 1; i++) {
    if (!node[keyPath[i]]) node[keyPath[i]] = {};
    node = node[keyPath[i]];
  }
  const last = keyPath[keyPath.length - 1];
  if (!node[last]) node[last] = [];
  const entry = {};
  node[last].push(entry);
  current = entry;
  currentPath = keyPath;
  continue;
}

// [table]
const tableMatch = line.match(/^\[(.+)\]$/);
if (tableMatch) {
  currentArrayKey = null;
  const keyPath = tableMatch[1].trim().split('.');
  currentPath = keyPath;
  current = result;
  for (const k of keyPath) {
    if (!current[k]) current[k] = {};
    current = current[k];
  }
  continue;
}

// key = value
const eqIdx = line.indexOf('=');
if (eqIdx === -1) continue;
const key = line.slice(0, eqIdx).trim();
const rawVal = line.slice(eqIdx + 1).trim();

let value;
if (rawVal === 'true')  value = true;
else if (rawVal === 'false') value = false;
else if (!isNaN(Number(rawVal)) && rawVal !== '') value = Number(rawVal);
else if (rawVal.startsWith('"') || rawVal.startsWith("'")) {
  value = rawVal.slice(1, -1);
} else if (rawVal.startsWith('[')) {
  try { value = JSON.parse(rawVal); } catch { value = rawVal; }
} else {
  value = rawVal;
}

current[key] = value;
```

}

return result;
}

// ─── Deep merge (b wins on conflicts) ────────────────────────────────────────

function deepMerge(a, b) {
if (typeof a !== ‘object’ || typeof b !== ‘object’ || a === null || b === null) return b;
if (Array.isArray(a) && Array.isArray(b)) {
// Merge arrays by deduplicating on ‘binding’ or ‘name’ key if present
const merged = […a];
for (const bItem of b) {
const key = bItem.binding ?? bItem.name ?? null;
const existing = key !== null ? merged.findIndex(x => (x.binding ?? x.name) === key) : -1;
if (existing >= 0) merged[existing] = deepMerge(merged[existing], bItem);
else merged.push(bItem);
}
return merged;
}
const out = { …a };
for (const [k, v] of Object.entries(b)) {
out[k] = k in a ? deepMerge(a[k], v) : v;
}
return out;
}

// ─── Find all wrangler.jsonc files ───────────────────────────────────────────

function findJsoncFiles(dir, results = []) {
for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
if (entry.name === ‘node_modules’ || entry.name === ‘.git’) continue;
const full = path.join(dir, entry.name);
if (entry.isDirectory()) { findJsoncFiles(full, results); continue; }
if (entry.name === ‘wrangler.jsonc’) results.push(full);
}
return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const jsoncFiles = findJsoncFiles(ROOT);

if (jsoncFiles.length === 0) {
console.log(‘No wrangler.jsonc files found.’);
process.exit(0);
}

console.log(`Found ${jsoncFiles.length} wrangler.jsonc file(s):\n`);

let converted = 0;
let merged = 0;
let errors = 0;

for (const jsoncPath of jsoncFiles) {
const dir = path.dirname(jsoncPath);
const tomlPath = path.join(dir, ‘wrangler.toml’);
const rel = path.relative(ROOT, jsoncPath);

try {
// Parse the JSONC
const jsoncRaw = fs.readFileSync(jsoncPath, ‘utf8’);
const jsoncClean = stripJsoncComments(jsoncRaw);
const jsoncData = JSON.parse(jsoncClean);

```
let finalData = jsoncData;
let action = 'create';

// If wrangler.toml already exists, merge (TOML is base, JSONC wins)
if (fs.existsSync(tomlPath)) {
  const tomlRaw = fs.readFileSync(tomlPath, 'utf8');
  const tomlData = parseToml(tomlRaw);
  finalData = deepMerge(tomlData, jsoncData);
  action = 'merge';
}

// Serialise to TOML
const tomlOut = [
  `# Generated from wrangler.jsonc by scripts/convert-wrangler.mjs`,
  `# ${new Date().toISOString()}`,
  '',
  toToml(finalData).trim(),
  '',
].join('\n');

if (DRY_RUN) {
  console.log(`[DRY RUN] ${action.toUpperCase()}: ${rel} → ${path.relative(ROOT, tomlPath)}`);
  console.log('─'.repeat(60));
  console.log(tomlOut);
  console.log('─'.repeat(60) + '\n');
} else {
  fs.writeFileSync(tomlPath, tomlOut, 'utf8');
  fs.unlinkSync(jsoncPath);
  if (action === 'merge') {
    console.log(`  ✓ MERGED  ${rel} → wrangler.toml`);
    merged++;
  } else {
    console.log(`  ✓ CREATED ${rel} → wrangler.toml`);
    converted++;
  }
}
```

} catch (err) {
console.error(`  ✗ ERROR   ${rel}: ${err.message}`);
errors++;
}
}

console.log(’’);
if (DRY_RUN) {
console.log(‘Dry run complete. No files were written.’);
} else {
console.log(`Done. ${converted} created, ${merged} merged, ${errors} errors.`);
}