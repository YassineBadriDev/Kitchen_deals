// Sanitize mojibake/control characters out of every string field in
// src/data/deals/*.json so payloads POST to the D1 ingest endpoint cleanly.
// Broken chars (U+2500..U+25FF, C0 controls) throw a 500 in D1; strip them.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEALS_DIR = path.join(ROOT, 'src', 'data', 'deals');

const REPLACEMENTS = [
  ['ÔÇÖ', "'"], ['ÔÇÿ', "'"], ['ÔÇØ', '"'], ['ÔÇ£', '"'],
  ['┬░', '°'], ['┬«', '®'], ['┬▒', '±'], ['Ôäó', '™'], ['Ôäë', '℉'],
  ['ÔÇö', '—'], ['ÔÇó', '•'], ['ÔÇô', '–'], ['├ù', '×'], ['´╝å', '＆'],
  ['«', '®'], ['ù', '×'], ['´å', '＆'],
]

function clean(s) {
  let out = String(s);
  for (const [from, to] of REPLACEMENTS) out = out.split(from).join(to);
  out = out.replace(/[\u2500-\u25FF\u0000-\u001F\u007F]/g, '');
  out = out.replace(/ {3,}/g, ' ').trim();
  return out;
}

function main() {
  const files = fs.readdirSync(DEALS_DIR).filter((f) => f.endsWith('.json'));
  const perFile = [];

  for (const f of files) {
    const filePath = path.join(DEALS_DIR, f);
    const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(arr)) continue;

    let changed = 0;
    for (const deal of arr) {
      let dealChanged = false;
      for (const key of Object.keys(deal)) {
        if (typeof deal[key] !== 'string') continue;
        const cleaned = clean(deal[key]);
        if (cleaned !== deal[key]) {
          deal[key] = cleaned;
          dealChanged = true;
        }
      }
      if (dealChanged) changed++;
    }

    fs.writeFileSync(filePath, JSON.stringify(arr, null, 2));
    perFile.push({ file: f, changed, total: arr.length });
    console.log(`${f}: ${changed}/${arr.length} deals changed`);
  }

  console.log('---');
  for (const p of perFile) console.log(`${p.file}: ${p.changed}/${p.total}`);
}

main();
