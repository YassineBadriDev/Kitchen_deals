const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env');

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) return;
  const lines = fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const AFFILIATE_PARAMS = {
  amazon: process.env.AFFILIATE_AMAZON || '',
  bestbuy: process.env.AFFILIATE_BESTBUY || '',
  walmart: process.env.AFFILIATE_WALMART || '',
  target: process.env.AFFILIATE_TARGET || '',
  homedepot: process.env.AFFILIATE_HOMEDEPOT || '',
  lowes: process.env.AFFILIATE_LOWES || '',
  costco: process.env.AFFILIATE_COSTCO || '',
};

const RETAILER_KEYWORDS = [
  ['amazon', ['amazon.com']],
  ['bestbuy', ['bestbuy.com']],
  ['walmart', ['walmart.com']],
  ['target', ['target.com']],
  ['homedepot', ['homedepot.com']],
  ['lowes', ['lowes.com']],
  ['costco', ['costco.com']],
];

function detectRetailer(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const [key, domains] of RETAILER_KEYWORDS) {
    if (domains.some((d) => lower.includes(d))) return key;
  }
  return null;
}

function addAffiliate(url, retailer) {
  if (!url) return url;
  const key = retailer && AFFILIATE_PARAMS[String(retailer).toLowerCase().replace(/[^a-z]/g, '')]
    ? String(retailer).toLowerCase().replace(/[^a-z]/g, '')
    : detectRetailer(url);
  const params = key ? AFFILIATE_PARAMS[key] : '';
  if (!params) return url;
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + params;
}

module.exports = { addAffiliate, AFFILIATE_PARAMS };
