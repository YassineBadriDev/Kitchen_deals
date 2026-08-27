/**
 * Shared product-description extraction for the kitchen-deals scrapers.
 *
 * Used by both the HTTP enrichment (scripts/enrich-deals.js) and the
 * browser-based enrichment (src/scraping/enrich.js). Keeps the per-retailer
 * selectors in one place so both paths stay consistent.
 */
const { load } = require('cheerio');

// Description selectors tried per retailer, in priority order (text extraction).
const DESCRIPTION_SELECTORS = {
  Amazon: ['#feature-bullets', '#productDescription', '#productDescription_feature_div', '.aplus-v2 .aplus', '.productDescriptionWrapper'],
  Target: [
    '[data-test="details-content"]',
    '[data-test="@web/ProductDescription/ProductDescriptionSection"]',
    '#tab-content-0',
    '.details-accordion',
    '[class*="description" i]',
  ],
  'Best Buy': ['[data-testid="product-overview"]', '#overview-1', '.section-wrapper', '[class*="overview" i]', '[class*="description" i]'],
  Walmart: ['[data-testid="about-this-item"]', '[class*="about-this-item" i]', '[itemprop="description"]', '[data-testid="product-description"]'],
  'Home Depot': ['[data-testid="product-details"]', '.product-details', '[data-testid="product-description"]', '[class*="description" i]'],
  "Lowe's": ['[data-testid="product-description"]', '.product-description', '[itemprop="description"]'],
  Costco: ['.product-info-description', '[itemprop="description"]', '.body-copy'],
  Bosch: ['[class*="description" i]', '[itemprop="description"]'],
  KitchenAid: ['[class*="description" i]'],
  Whirlpool: ['[class*="description" i]', '[data-testid*="description" i]'],
};

function cleanText(value) {
  return (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function collapseBoilerplate(text, retailer) {
  let t = text;
  const cuts = [
    /\s*By clicking.*$/i,
    /\s*Free shipping on orders over.*$/i,
    /\s*Please check availability.*$/i,
    /^About this item\s*/i,
  ];
  for (const c of cuts) t = t.replace(c, '');
  if (retailer === 'Best Buy') {
    const m = t.match(/(Alright|Meet|Bring|With|Craft|Engineered).*$/i);
    if (m) t = m[0];
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Extract a product description from already-loaded Cheerio root.
 * Returns '' if none found.
 */
function descriptionFromDom($, retailer) {
  const sels = DESCRIPTION_SELECTORS[retailer] || [];
  for (const sel of sels) {
    const t = cleanText($(sel).first().text());
    if (t.length >= 25 && !/^\s+$/.test(t)) {
      return collapseBoilerplate(t, retailer);
    }
  }
  return '';
}

/**
 * Extract a product description from raw HTML string (browser/HTTP agnostic).
 */
function extractDescription(html, retailer) {
  if (!html) return '';
  const $ = load(html);
  let desc = descriptionFromDom($, retailer);
  if (!desc) {
    const meta = cleanText($('meta[name="description"]').attr('content') || '');
    if (meta && meta.length >= 30) desc = meta;
  }
  return desc;
}

/**
 * Canonicalize a product page URL before fetching (avoids tracking params and
 * Amazon's /ref= list-click CAPTCHA).
 */
function canonicalUrl(url, retailer) {
  if (!url) return url;
  if (retailer === 'Amazon') {
    const m = url.match(/(https?:\/\/[^/]+\/dp\/[A-Z0-9]{10})/i);
    if (m) return m[1];
  }
  try {
    const u = new URL(url);
    for (const p of ['ref', 'sp_csd', 'gclid', 'gclsrc', 'utm_source', 'utm_medium', 'utm_campaign', 'cmpid', 'rid', 'intl']) {
      u.searchParams.delete(p);
    }
    return u.toString();
  } catch (err) {
    return url.split('?')[0];
  }
}

/**
 * Normalize a scraped description for display: cap length and collapse whitespace.
 */
function normalizeDescription(desc) {
  const t = cleanText(desc);
  return t.length > 2000 ? t.slice(0, 1997).trimEnd() + '...' : t;
}

module.exports = { extractDescription, descriptionFromDom, canonicalUrl, cleanText, normalizeDescription, DESCRIPTION_SELECTORS };
