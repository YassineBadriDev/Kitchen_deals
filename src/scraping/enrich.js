/**
 * Product-detail enrichment for scraped deals.
 *
 * After the list-page scrapers save deals to src/data/deals/*.json, this
 * module fetches each deal's product page and attaches a `description` (plus
 * any missing brand/category). It tries cheap HTTP first, then falls back to a
 * stealth Playwright browser for pages that are bot-protected (Amazon, Best
 * Buy, Walmart). Deals that already have a description are skipped.
 *
 * Usage:
 *   node src/scraping/enrich.js --browser          # also use the browser phase
 *   node src/scraping/enrich.js --http-only        # HTTP only (fast, fewer reqs)
 *   node src/scraping/enrich.js --limit N --retailer R
 */
const fs = require('fs');
const path = require('path');
const { load } = require('cheerio');
const axios = require('axios');
const { extractDescription, canonicalUrl, normalizeDescription, cleanText } = require('./description');
const { resolveChromeExecutable } = require('./launch-browser');
const { REFRESH_DESCRIPTIONS } = require('./enrich-config');

const ROOT = path.join(__dirname, '..', '..');
const DEALS_DIR = path.join(ROOT, 'src', 'data', 'deals');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';

// Retailers whose detail pages are reliably fetchable over plain HTTP.
const HTTP_SAFE_RETAILERS = ['Target', 'Costco', 'Bosch', 'KitchenAid', 'Whirlpool', 'Home Depot', "Lowe's"];

// ---------------------------------------------------------------------------
// HTTP phase
// ---------------------------------------------------------------------------

async function fetchHtmlHttp(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', 'Accept': 'text/html,application/xhtml+xml' },
    timeout: 20000,
    maxRedirects: 5,
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return res.data;
}

async function enrichHttp(deal) {
  if (!deal.url || !/^https?:\/\//i.test(deal.url)) return;
  try {
    const url = canonicalUrl(deal.url, deal.retailer);
    const html = await fetchHtmlHttp(url);
    const desc = extractDescription(html, deal.retailer);
    if (desc) deal.description = normalizeDescription(desc);
  } catch (err) {
    // fall through to browser phase
  }
}

// ---------------------------------------------------------------------------
// Browser phase (stealth Playwright) for bot-protected retailers
// ---------------------------------------------------------------------------

async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = require('playwright-extra'));
  } catch (err) {
    ({ chromium } = require('playwright'));
  }
  let StealthPlugin;
  try {
    ({ default: StealthPlugin } = require('puppeteer-extra-plugin-stealth'));
  } catch (err) {
    try {
      StealthPlugin = require('puppeteer-extra-plugin-stealth');
    } catch (err2) {}
  }
  if (StealthPlugin && chromium.use) {
    try { chromium.use(StealthPlugin()); } catch (err) {}
  }
  return chromium;
}

const LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
  '--disable-site-isolation-trials',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-infobars',
  '--window-size=1920,1080',
  '--lang=en-US',
];

const INIT_SCRIPT = () => {
  try {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
    window.chrome = window.chrome || { runtime: {} };
  } catch (err) {}
};

async function enrichWithBrowser(chromium, deal) {
  if (!deal.url || !/^https?:\/\//i.test(deal.url)) return;
  const retailer = deal.retailer || '';
  const browser = await chromium.launch({
    executablePath: resolveChromeExecutable(),
    headless: 'new',
    args: LAUNCH_ARGS,
    ignoreDefaultArgs: ['--enable-automation'],
  });
  try {
    const context = await browser.newContext({
      userAgent: UA,
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });
    await context.addInitScript(INIT_SCRIPT);
    const page = await context.newPage();
    await page.goto(canonicalUrl(deal.url, retailer), { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500 + Math.random() * 2000);

    // Dismiss common cookie/consent banners before reading content.
    const dismissed = await page.evaluate(() => {
      const labels = ['Accept all', 'Accept', 'Got it', 'OK', 'Continue'];
      let done = false;
      for (const label of labels) {
        const btn = Array.from(document.querySelectorAll('button, a, [role="button"]'))
          .find((b) => labels.some((l) => (b.textContent || '').trim() === l) && !done);
        if (btn && !done) { btn.click(); done = true; }
      }
      return done;
    });
    if (dismissed && (retailer === 'Walmart' || retailer === 'Best Buy')) {
      await page.waitForTimeout(2500);
    }

    const html = await page.content();
    const $ = load(html);
    const desc = extractDescription(html, retailer);
    if (desc) deal.description = normalizeDescription(desc);
  } catch (err) {
    // keep existing/empty description
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function loadDeals() {
  if (!fs.existsSync(DEALS_DIR)) return [];
  return fs.readdirSync(DEALS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ name: f, deals: JSON.parse(fs.readFileSync(path.join(DEALS_DIR, f), 'utf8')) }));
}

async function main(argvOverride) {
  const args = argvOverride || process.argv.slice(2);
  const get = (flag) => { const i = args.indexOf(flag); return i === -1 ? null : args[i + 1]; };
  const useBrowser = args.includes('--browser');
  const httpOnly = args.includes('--http-only');
  const limit = parseInt(get('--limit') || '0', 10);
  const onlyRetailer = get('--retailer');

  const files = loadDeals();
  if (files.length === 0) { console.log('No deal JSON files found.'); process.exit(0); }

  const pending = [];
  for (const file of files) {
    for (const d of file.deals) {
      if (onlyRetailer && d.retailer !== onlyRetailer) continue;
      if (!d.description || REFRESH_DESCRIPTIONS) pending.push({ deal: d, file });
    }
  }
  if (!pending.length) { console.log('All deals already have descriptions.'); process.exit(0); }
  if (limit) pending.length = Math.min(pending.length, limit);

  console.log(`Enriching ${pending.length} deal(s)...`);

  // Phase A: HTTP for retailers that allow it.
  const needsBrowser = [];
  for (const item of pending) {
    const isHttpSafe = HTTP_SAFE_RETAILERS.includes(item.deal.retailer);
    if (!isHttpSafe) { needsBrowser.push(item); continue; }
    await enrichHttp(item.deal);
    if (!httpOnly) {
      process.stdout.write(item.deal.description ? '+' : '-');
      if (!item.deal.description) needsBrowser.push(item);
    } else {
      process.stdout.write(item.deal.description ? '+' : '-');
    }
  }
  console.log('');

  // Phase B: browser for the rest (or all when --browser).
  if (useBrowser && needsBrowser.length) {
    console.log(`Browser phase: ${needsBrowser.length} deal(s)...`);
    const chromium = await launchBrowser();
    for (const item of needsBrowser) {
      await enrichWithBrowser(chromium, item.deal);
      process.stdout.write(item.deal.description ? 'B' : '.');
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2500));
    }
    console.log('');
  }

  // Persist back to the per-retailer JSON files.
  const byFile = new Map();
  for (const file of files) byFile.set(file.name, file.deals);
  let changedFiles = 0;
  for (const [name, deals] of byFile) {
    fs.writeFileSync(path.join(DEALS_DIR, name), JSON.stringify(deals, null, 2));
    changedFiles++;
  }
  console.log(`Wrote ${changedFiles} file(s).`);
}

module.exports = { main, enrichHttp, enrichWithBrowser };

if (require.main === module) {
  main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
}
