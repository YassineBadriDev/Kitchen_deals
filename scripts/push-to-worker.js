#!/usr/bin/env node
/**
 * Push scraped deals/products JSON into the Cloudflare Worker's D1 database
 * via the protected POST /api/ingest endpoint (sneakerreleasedates.net pattern).
 *
 * Usage:
 *   node scripts/push-to-worker.js [--url https://kitchendeals.org] [--token <INGEST_TOKEN>] [--clean]
 *
 * Reads:
 *   - src/data/deals/*.json   (arrays of deal objects)
 *   - src/data/products.json  (array of product objects with priceHistory)
 *
 * The token can also come from env INGEST_TOKEN or worker/.dev.vars.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadEnvVars() {
  const vars = {};
  const file = path.join(__dirname, '..', 'worker', '.dev.vars');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      vars[key] = value;
    }
  }
  return vars;
}

function loadDeals() {
  const dealsDir = path.join(ROOT, 'src', 'data', 'deals');
  if (!fs.existsSync(dealsDir)) return [];
  const files = fs.readdirSync(dealsDir).filter((f) => f.endsWith('.json'));
  const all = [];
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dealsDir, f), 'utf8'));
    if (Array.isArray(data)) all.push(...data);
  }
  return all;
}

function loadProducts() {
  const file = path.join(ROOT, 'src', 'data', 'products.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function main() {
  const args = process.argv.slice(2);
  const get = (flag) => {
    const i = args.indexOf(flag);
    return i === -1 ? null : args[i + 1];
  };

  const url = get('--url') || 'http://localhost:8787';
  const envVars = loadEnvVars();
  const token = get('--token') || process.env.INGEST_TOKEN || envVars.INGEST_TOKEN;
  const clean = args.includes('--clean');

  if (!token) {
    console.error('Missing INGEST_TOKEN. Pass --token, set INGEST_TOKEN env, or create worker/.dev.vars from .dev.vars.example');
    process.exit(1);
  }

  const deals = loadDeals();
  const products = loadProducts();
  console.log(`Loaded ${deals.length} deals, ${products.length} products`);

  const payload = { deals, products };
  if (clean) payload.clean = '1';

  const resp = await fetch(`${url}/api/ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
      'accept': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (err) {
    console.error(`Ingest non-JSON response (HTTP ${resp.status}), first 200 chars:`);
    console.error(text.slice(0, 200));
    process.exit(1);
  }
  if (!resp.ok) {
    console.error(`Ingest failed (${resp.status}):`, body);
    process.exit(1);
  }
  console.log('Ingest OK:', body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
