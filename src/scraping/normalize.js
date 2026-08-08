const fs = require('fs');
const path = require('path');

function normalizeDeal(raw) {
  const title = (raw.title || '').trim();
  if (!title || title.length < 5) return null;

  const price = raw.price != null ? String(raw.price).replace(/[^0-9.]/g, '') : null;
  const origPrice = raw.origPrice != null ? String(raw.origPrice).replace(/[^0-9.]/g, '') : null;

  let discountPct = null;
  if (price && origPrice && parseFloat(origPrice) > 0) {
    discountPct = Math.round((1 - parseFloat(price) / parseFloat(origPrice)) * 100);
    if (discountPct <= 0 || discountPct > 95) discountPct = null;
  }
  if (raw.discountPct) discountPct = parseInt(raw.discountPct, 10);

  const brand = raw.brand || extractBrand(title);
  const retailer = raw.retailer || '';
  const category = raw.category || extractCategory(title);

  return {
    title,
    url: raw.url || '',
    image: raw.image || '',
    price: price || null,
    origPrice: origPrice || null,
    discountPct,
    brand,
    retailer,
    category,
    validThrough: raw.validThrough || null,
    scrapedAt: new Date().toISOString(),
  };
}

const BRANDS = [
  'kitchenaid', 'shark', 'bosch', 'whirlpool', 'frigidaire', 'samsung', 'lg',
  'ge appliances', 'ge', 'dacor', 'wolf', 'viking', 'cuisinart', 'ninja',
  'stonewall kitchen', 'wusthof', 'zwilling', 'pampered chef', 'miele',
  'kenmore', 'maytag', 'haier', 'broil king', 'weber', 'lodge', 'le creuset',
  'all-clad', 'calphalon', 'tefal', 'circulon', 'farberware', 'inox',
];

function extractBrand(title) {
  const lower = title.toLowerCase();
  for (const b of BRANDS) {
    if (lower.includes(b)) return b.replace(/\b\w/g, c => c.toUpperCase());
  }
  return '';
}

const CATEGORIES = [
  'refrigerator', 'fridge', 'dishwasher', 'oven', 'range', 'stove', 'microwave',
  'blender', 'mixer', 'food processor', 'toaster', 'coffee maker', 'air fryer',
  'slow cooker', 'instant pot', 'pressure cooker', 'grill', 'griddle',
  'knife', 'knives', 'cookware', 'pots', 'pans', 'skillet', 'frying pan',
  'stand mixer', 'hand mixer', ' immersion blender', 'waffle maker',
  'bakeware', 'cutting board', 'kitchen scale', 'timer',
];

function extractCategory(title) {
  const lower = title.toLowerCase();
  for (const c of CATEGORIES) {
    if (lower.includes(c)) return c.replace(/\b\w/g, ch => ch.toUpperCase());
  }
  return '';
}

function saveDeals(deals, source) {
  const dealsDir = path.join(__dirname, '..', 'data', 'deals');
  if (!fs.existsSync(dealsDir)) fs.mkdirSync(dealsDir, { recursive: true });
  const normalized = deals.map(normalizeDeal).filter(Boolean);
  const file = path.join(dealsDir, `${source}.json`);
  const isSeed = source === 'seed';
  if (normalized.length === 0 && !isSeed) {
    try {
      if (fs.existsSync(file)) {
        const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(existing) && existing.length > 0) {
          console.log(`[${source}] Scrape returned 0 deals, keeping existing ${existing.length} deals`);
          return existing;
        }
      }
    } catch (err) {}
    fs.writeFileSync(file, '[]');
    console.log(`[${source}] Saved 0 deals`);
    return [];
  }
  fs.writeFileSync(file, JSON.stringify(normalized, null, 2));
  console.log(`[${source}] Saved ${normalized.length} deals`);
  return normalized;
}

module.exports = { normalizeDeal, saveDeals, extractBrand, extractCategory };
