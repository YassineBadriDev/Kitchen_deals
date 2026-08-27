// Generate exact backfill UPDATE statements for deal slugs from a D1 dump.
// Reads the deals JSON dump, slugs each via the same slugify used in db.js,
// then emits worker/migrations/002_backfill_deal_slugs.sql .
const fs = require('fs');

const dumpPath = process.argv[2];
const outPath = process.argv[3] || 'worker/migrations/002_backfill_deal_slugs.sql';

function slugify(text, retailer = '') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  const ret = String(retailer || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ret ? `${base}-${ret}` : base;
}

const parsed = JSON.parse(fs.readFileSync(dumpPath, 'utf8').replace(/^\uFEFF/, ''));
const rows = parsed[0].results;
const seen = {};
const updates = [];
let duplicates = 0;
for (const r of rows) {
  let slug = slugify(r.title, r.retailer);
  if (seen[slug] !== undefined) {
    seen[slug]++;
    duplicates++;
    slug = `${slug}-${seen[slug]}`;
  } else {
    seen[slug] = 1;
  }
  const esc = (s) => String(s).replace(/'/g, "''");
  updates.push(`UPDATE deals SET slug = '${esc(slug)}' WHERE id = ${Number(r.id)};`);
}

const out =
  `-- Backfill deal slugs for existing rows. Generated from live D1 data.
-- Run: npx wrangler d1 execute kitchen-deals-db --remote --file=worker/migrations/002_backfill_deal_slugs.sql

` + updates.join('\n') + '\n';

fs.writeFileSync(outPath, out);
console.log(`Wrote ${updates.length} UPDATEs (${duplicates} duplicate slugs suffixed) to ${outPath}`);
