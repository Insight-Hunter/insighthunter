#!/usr/bin/env node
/**
 * scripts/resolve-bindings.js
 *
 * Scans apps/*/wrangler.toml for REPLACE_WITH_* tokens, looks up resources
 * in Cloudflare via REST API, creates missing resources, and writes
 * wrangler.generated.toml with tokens replaced.
 *
 * Usage:
 *   CF_ACCOUNT_ID=... CF_API_TOKEN=... node scripts/resolve-bindings.js [--env staging] [--dry-run]
 *
 * Notes:
 * - Requires Node 18+ (global fetch). If using older Node, install node-fetch and adjust.
 * - Ensure CF_API_TOKEN has the necessary scopes.
 */

const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');
const minimist = require('minimist');

const API_BASE = 'https://api.cloudflare.com/client/v4';

const argv = minimist(process.argv.slice(2), { string: ['env'], boolean: ['dry-run'], default: { env: 'staging', 'dry-run': false } });
const DRY_RUN = argv['dry-run'];
const ENV_NAME = argv.env;

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error('CF_ACCOUNT_ID and CF_API_TOKEN must be set in environment');
  process.exit(1);
}

function log(...args) { console.log('[resolve-bindings]', ...args); }

async function cfFetch(method, pathSuffix, body) {
  const url = `${API_BASE}${pathSuffix}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json && json.errors ? JSON.stringify(json.errors) : `${res.status} ${res.statusText}`;
    throw new Error(`Cloudflare API error ${url}: ${msg}`);
  }
  return json;
}

/* Heuristic mapping from placeholder token to resource type and API handlers.
   Token examples:
     REPLACE_WITH_IH_PORTAL_KV_ID        -> KV namespace
     REPLACE_WITH_IH_PORTAL_DB_ID        -> D1 database
     REPLACE_WITH_IH_PORTAL_ASSETS_BUCKET-> R2 bucket
     REPLACE_WITH_IH_AGG_QUEUE_NAME      -> Queues
     REPLACE_WITH_CF_ACCOUNT_ID          -> top-level var
*/
function detectResourceType(token) {
  const t = token.toUpperCase();
  if (t.includes('_KV') || t.endsWith('_KV_ID') || t.includes('KV_ID')) return 'kv';
  if (t.includes('_DB') || t.includes('D1') || t.endsWith('_DB_ID')) return 'd1';
  if (t.includes('_R2') || t.includes('_BUCKET') || t.endsWith('_BUCKET')) return 'r2';
  if (t.includes('QUEUE') || t.includes('_QUEUE_') || t.endsWith('_QUEUE_NAME')) return 'queue';
  if (t.includes('DURABLE') || t.includes('AGENT') || t.endsWith('AGENT') || t.endsWith('DO')) return 'durable';
  if (t.includes('CF_ACCOUNT_ID') || t.includes('SERVICE_API_TOKEN') || t.includes('JWT_PUBLIC_KEY')) return 'var';
  return 'var';
}

/* Cloudflare resource helpers */

async function ensureKV(namespaceName) {
  // list namespaces and find by title
  const list = await cfFetch('GET', `/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces`);
  const found = (list.result || []).find(n => n.title === namespaceName || n.name === namespaceName);
  if (found) return found.id || found.namespace_id || found.name;
  if (DRY_RUN) {
    log(`DRY RUN: would create KV namespace "${namespaceName}"`);
    return `kv-${namespaceName}-dry`;
  }
  log(`Creating KV namespace "${namespaceName}"`);
  const created = await cfFetch('POST', `/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces`, { title: namespaceName });
  return created.result.id;
}

async function ensureD1(dbName) {
  // list D1 databases
  const list = await cfFetch('GET', `/accounts/${CF_ACCOUNT_ID}/d1/databases`);
  const found = (list.result || []).find(d => d.name === dbName || d.database_name === dbName);
  if (found) return found.id || found.database_id || found.database_name;
  if (DRY_RUN) {
    log(`DRY RUN: would create D1 database "${dbName}"`);
    return `d1-${dbName}-dry`;
  }
  log(`Creating D1 database "${dbName}"`);
  const created = await cfFetch('POST', `/accounts/${CF_ACCOUNT_ID}/d1/databases`, { name: dbName });
  return created.result.id;
}

async function ensureR2(bucketName) {
  const list = await cfFetch('GET', `/accounts/${CF_ACCOUNT_ID}/r2/buckets`);
  const found = (list.result || []).find(b => b.name === bucketName);
  if (found) return found.id || found.name;
  if (DRY_RUN) {
    log(`DRY RUN: would create R2 bucket "${bucketName}"`);
    return `r2-${bucketName}-dry`;
  }
  log(`Creating R2 bucket "${bucketName}"`);
  const created = await cfFetch('POST', `/accounts/${CF_ACCOUNT_ID}/r2/buckets`, { name: bucketName });
  return created.result.name || created.result.id;
}

async function ensureQueue(queueName) {
  // Queues API
  const list = await cfFetch('GET', `/accounts/${CF_ACCOUNT_ID}/workers/queues/queues`);
  const found = (list.result || []).find(q => q.name === queueName);
  if (found) return found.name;
  if (DRY_RUN) {
    log(`DRY RUN: would create Queue "${queueName}"`);
    return `queue-${queueName}-dry`;
  }
  log(`Creating Queue "${queueName}"`);
  const created = await cfFetch('POST', `/accounts/${CF_ACCOUNT_ID}/workers/queues/queues`, { name: queueName });
  return created.result.name;
}

async function ensureDurableNamespace(namespaceName) {
  // Durable Objects namespaces
  const list = await cfFetch('GET', `/accounts/${CF_ACCOUNT_ID}/workers/durable_objects/namespaces`);
  const found = (list.result || []).find(n => n.name === namespaceName || n.title === namespaceName);
  if (found) return found.id || found.namespace_id || found.name;
  if (DRY_RUN) {
    log(`DRY RUN: would create Durable Objects namespace "${namespaceName}"`);
    return `do-${namespaceName}-dry`;
  }
  log(`Creating Durable Objects namespace "${namespaceName}"`);
  const created = await cfFetch('POST', `/accounts/${CF_ACCOUNT_ID}/workers/durable_objects/namespaces`, { name: namespaceName });
  return created.result.id || created.result.name;
}

/* Generic top-level var replacement */
function resolveTopLevelVar(token) {
  const t = token.toUpperCase();
  if (t === 'REPLACE_WITH_CF_ACCOUNT_ID') return CF_ACCOUNT_ID;
  // other secrets should come from environment or mapping.json; leave as-is if not present
  if (t === 'REPLACE_WITH_SERVICE_API_TOKEN') return process.env.SERVICE_API_TOKEN || token;
  if (t === 'REPLACE_WITH_JWT_PUBLIC_KEY_PEM') return process.env.JWT_PUBLIC_KEY || token;
  return token;
}

/* Main flow */

async function processWranglerFile(wranglerPath) {
  const content = fs.readFileSync(wranglerPath, 'utf8');
  const tokens = new Set();
  // find REPLACE_WITH_* tokens
  const re = /REPLACE_WITH_[A-Z0-9_]+(?:_ID|_BUCKET|_NAME|_TOKEN|_PEM)?/g;
  let m;
  while ((m = re.exec(content)) !== null) tokens.add(m[0]);

  if (tokens.size === 0) {
    log(`No placeholders in ${wranglerPath}`);
    return;
  }

  log(`Found ${tokens.size} placeholders in ${wranglerPath}:`, Array.from(tokens).join(', '));

  const replacements = {};

  for (const token of tokens) {
    const type = detectResourceType(token);
    // derive a friendly resource name from token, e.g. IH_PORTAL_KV -> ih-portal-kv
    const friendly = token.replace(/^REPLACE_WITH_/, '').replace(/_ID$|_BUCKET$|_NAME$|_TOKEN$|_PEM$/g, '').toLowerCase().replace(/_/g, '-');

    try {
      if (type === 'kv') {
        // use friendly as namespace title
        const id = await ensureKV(friendly);
        replacements[token] = id;
      } else if (type === 'd1') {
        const id = await ensureD1(friendly);
        replacements[token] = id;
      } else if (type === 'r2') {
        const id = await ensureR2(friendly);
        replacements[token] = id;
      } else if (type === 'queue') {
        const id = await ensureQueue(friendly);
        replacements[token] = id;
      } else if (type === 'durable') {
        const id = await ensureDurableNamespace(friendly);
        replacements[token] = id;
      } else if (type === 'var') {
        replacements[token] = resolveTopLevelVar(token);
      } else {
        replacements[token] = token;
      }
      log(`Resolved ${token} -> ${replacements[token]}`);
    } catch (e) {
      console.error(`Failed to resolve ${token}:`, e.message || e);
      // keep token unchanged on failure
      replacements[token] = token;
    }
  }

  // perform replacements in content
  let newContent = content;
  for (const [token, val] of Object.entries(replacements)) {
    newContent = newContent.split(token).join(val);
  }

  const outPath = path.join(path.dirname(wranglerPath), 'wrangler.generated.toml');
  if (DRY_RUN) {
    log(`DRY RUN: would write ${outPath}`);
  } else {
    fs.writeFileSync(outPath, newContent, 'utf8');
    log(`Wrote ${outPath}`);
  }
}

async function main() {
  const appsDir = path.resolve(process.cwd(), 'apps');
  if (!fs.existsSync(appsDir)) {
    console.error('apps/ directory not found at', appsDir);
    process.exit(1);
  }

  const appDirs = fs.readdirSync(appsDir).filter(d => fs.statSync(path.join(appsDir, d)).isDirectory());
  for (const app of appDirs) {
    const wranglerPath = path.join(appsDir, app, 'wrangler.toml');
    if (fs.existsSync(wranglerPath)) {
      try {
        await processWranglerFile(wranglerPath);
      } catch (e) {
        console.error(`Error processing ${wranglerPath}:`, e);
      }
    } else {
      log(`No wrangler.toml for ${app}, skipping`);
    }
  }

  log('Done');
}

main().catch(err => {
  console.error('Fatal error', err);
  process.exit(1);
});
