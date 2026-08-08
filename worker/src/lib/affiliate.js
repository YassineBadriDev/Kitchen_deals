const RETAILER_KEYWORDS = [
  ['amazon', ['amazon.com', 'amzn.to']],
  ['bestbuy', ['bestbuy.com']],
  ['walmart', ['walmart.com']],
  ['target', ['target.com']],
  ['homedepot', ['homedepot.com']],
  ['lowes', ['lowes.com']],
  ['costco', ['costco.com']],
  ['macys', ['macys.com']],
  ['nordstrom', ['nordstrom.com']],
  ['wayfair', ['wayfair.com']],
  ['ikea', ['ikea.com']],
  ['aldi', ['aldi.us', 'aldi.com']],
];

export function parseAffiliateLinks(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw || {};
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function normalizeKey(retailer) {
  return String(retailer || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function detectRetailer(url) {
  if (!url) return null;
  const lower = String(url).toLowerCase();
  for (const [key, domains] of RETAILER_KEYWORDS) {
    if (domains.some((d) => lower.includes(d))) return key;
  }
  return null;
}

// links: parsed AFFILIATE_LINKS map, e.g. { "bestbuy": "affid=…", "amazon": "tag=…" }.
// Each value is appended as a query-string to the deal URL. A value containing
// "{url}" is treated as a full URL template (sneaker-style), filled and returned.
export function affiliateHref(links, url, retailer) {
  if (!url) return url;
  const key = normalizeKey(retailer) || detectRetailer(url);
  const value = key ? links[key] : null;
  if (!value) return url;
  const v = String(value).trim();
  if (v === '{url}') return url;
  if (v.includes('{url}')) {
    return v.replace(/\{url\}/g, encodeURIComponent(url)).replace(/\{retailer\}/g, encodeURIComponent(retailer || ''));
  }
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + v;
}

export function isAffiliateLink(links, url, retailer) {
  const key = normalizeKey(retailer) || detectRetailer(url);
  const v = key ? links[key] : null;
  return Boolean(v && String(v).trim() && !String(v).trim().startsWith('{url}'));
}
