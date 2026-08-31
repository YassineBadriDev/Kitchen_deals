const { chromium, devices } = require('playwright');
const { saveDeals } = require('./normalize');
const { resolveChromeExecutable } = require('./launch-browser');

const JUNK_PATTERNS = [
  /check each product page/i,
  /price and other details/i,
  /buying options/i,
  /may vary based/i,
  /cookie/i,
  /sign in/i,
  /create account/i,
  /sponsored/i,
  /advertise/i,
  /terms of use/i,
  /privacy notice/i,
  /^deals?$/i,
  /^sale$/i,
  /^best sellers?$/i,
  /^top /i,
  /^see all/i,
  /^more (results|deals)/i,
  /^shop all/i,
  /^the /i,
  /^for /i,
  /^about /i,
];

function isJunkTitle(title) {
  const t = (title || '').trim();
  if (t.length < 10 || t.length > 250) return true;
  if (/\d{2,}\s*(%|percent)/i.test(t) && !/\$\d/.test(t)) return true;
  for (const p of JUNK_PATTERNS) {
    if (p.test(t)) return true;
  }
  return false;
}

function cleanText(value) {
  return (value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

async function scrapeWithPlaywright(source) {
  const realUserAgent = devices['Desktop Chrome'] ? devices['Desktop Chrome'].userAgent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
  const browser = await chromium.launch({
      executablePath: resolveChromeExecutable(), headless: 'new' });
  const context = await browser.newContext({
    userAgent: realUserAgent,
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();

  try {
    console.log(`[${source.name}] Navigating to ${source.url}...`);
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000 + Math.random() * 2000);
    if (source.selector) {
      try {
        await page.waitForSelector(source.selector, { timeout: 10000 });
      } catch (err) {
        console.log(`[${source.name}] Selector "${source.selector}" not found, parsing page anyway`);
      }
    }

    const deals = await page.evaluate(source.extract);
    const cleaned = deals.filter(d => !isJunkTitle(d.title)).slice(0, 30);
    console.log(`[${source.name}] Found ${cleaned.length} deals via Playwright (${deals.length} raw)`);
    return saveDeals(cleaned, source.name);
  } catch (err) {
    console.error(`[${source.name}] Playwright error: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

function extractAmazon() {
  const results = [];
  const cards = document.querySelectorAll('div[data-component-type="s-search-result"]');
  for (const card of cards) {
    const titleEl = card.querySelector('h2 span');
    const linkEl = card.querySelector('h2 a');
    const priceEl = card.querySelector('.a-price .a-offscreen');
    const imgEl = card.querySelector('img.s-image');
    if (!titleEl) continue;
    const title = (titleEl.textContent || '').replace(/\s+/g, ' ').trim();
    let href = '';
    if (linkEl) href = linkEl.getAttribute('href') || '';
    if (!href) {
      const a = card.querySelector('a[href*="/dp/"]');
      if (a) href = a.getAttribute('href') || '';
    }
    const url = href ? 'https://www.amazon.com' + href.split('?')[0] : 'https://www.amazon.com';
    results.push({
      title,
      price: priceEl ? (priceEl.textContent || '').replace(/[^0-9.]/g, '') : null,
      url,
      image: imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '',
      retailer: 'Amazon',
      asin: card.getAttribute('data-asin') || null,
    });
  }
  return results;
}

function extractBestBuy() {
  const results = [];
  const seen = new Set();
  const cards = document.querySelectorAll('li.item, li.sku-item, div[data-sku-id]');
  for (const card of cards) {
    const titleEl = card.querySelector('a.sku-title, h4.sku-title');
    const linkEl = card.querySelector('a.sku-title, a[href*="/product/"], a[href*="/site/"]');
    const priceEl = card.querySelector('[data-testid="price-block-customer-price"] span.sr-only, span.sr-only, [data-testid="current-price"], .priceView');
    const imgEl = card.querySelector('img.product-image, img[data-src], img[src*="bbystatic"]');
    const title = titleEl ? (titleEl.textContent || '').replace(/\s+/g, ' ').trim() : (linkEl ? (linkEl.getAttribute('aria-label') || '') : '');
    if (!title || seen.has(title)) continue;
    seen.add(title);
    let price = null;
    if (priceEl) {
      const m = (priceEl.textContent || '').match(/\$[\d,]+\.?\d*/);
      if (m) price = m[0].replace(/[^0-9.]/g, '');
    }
    if (!price) {
      const body = card.textContent || '';
      const m = body.match(/\$[\d,]+\.\d{2}/);
      if (m) price = m[0].replace(/[^0-9.]/g, '');
    }
    const imgSrc = imgEl ? (imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '') : '';
    results.push({
      title,
      price,
      url: linkEl ? linkEl.href || ('https://www.bestbuy.com' + (linkEl.getAttribute('href') || '')) : 'https://www.bestbuy.com',
      image: imgSrc || '',
      retailer: 'Best Buy',
    });
  }
  if (results.length === 0) {
    const links = document.querySelectorAll('a[href*="/product/"]');
    for (const link of links) {
      const title = (link.querySelector('.nc-product-title, span[class*="product-title"]') ? link.querySelector('.nc-product-title, span[class*="product-title"]').textContent : (link.getAttribute('aria-label') || '')).replace(/\s+/g, ' ').trim();
      if (!title || title.length < 10 || seen.has(title)) continue;
      seen.add(title);
      let price = null;
      const card = link.closest('li, [data-sku-id]');
      if (card) {
        const m = (card.textContent || '').match(/\$[\d,]+\.\d{2}/);
        if (m) price = m[0].replace(/[^0-9.]/g, '');
      }
      const img = link.closest('li, [data-sku-id]') ? link.closest('li, [data-sku-id]').querySelector('img.product-image, img[src*="bbystatic"]') : null;
      results.push({
        title,
        price,
        url: link.href || 'https://www.bestbuy.com',
        image: img ? (img.getAttribute('src') || img.getAttribute('data-src') || '') : '',
        retailer: 'Best Buy',
      });
    }
  }
  return results;
}

function extractWalmart() {
  const results = [];
  const seen = new Set();
  const anchors = document.querySelectorAll('a[href*="/ip/"]');
  for (const link of anchors) {
    let title = (link.getAttribute('aria-label') || link.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    if (!title || seen.has(title)) continue;
    title = title.replace(/^Options\s*[-ÔÇôÔÇö:]\s*/i, '').trim();
    if (!title || isJunkTitle(title)) continue;
    const card = link.closest('[data-testid="item-stack"], [data-testid="product-card"], [data-testid="product-tile"], [data-testid="item-tile"], [class*="search-result"]') || link.parentElement;
    let price = null;
    if (card) {
      const priceEl = card.querySelector('span[itemprop="price"], [data-automation-id="product-price"], [data-testid="price"], span[class*="price-characteristic"]');
      if (priceEl) {
        const m = (priceEl.textContent || '').match(/\$?[\d,]+\.\d{2}/);
        if (m) price = m[0].replace(/[^0-9.]/g, '');
      }
      if (!price) {
        const m = (card.textContent || '').match(/\$\d[\d,]*(?:\.\d{2})?/);
        if (m) price = m[0].replace(/[^0-9.]/g, '');
      }
    }
    let image = '';
    const imgEl = link.querySelector('img[src]') || (card ? card.querySelector('img[src*="walmartimages"], img[data-src*="walmartimages"]') : null);
    if (imgEl) {
      const s = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
      if (s.startsWith('http')) image = s;
    }
    seen.add(title);
    results.push({
      title,
      price,
      url: link.href,
      image,
      retailer: 'Walmart',
    });
  }
  return results;
}

function extractTarget() {
  const results = [];
  const seen = new Set();
  const cards = document.querySelectorAll('[data-test="@web/ProductCard/ProductCardVariantWrapper"], [data-test="@web/ProductCard"]');
  for (const card of cards) {
    const titleEl = card.querySelector('a[data-test="product-title"], a[class*="product-title"], h3[data-test="@web/ProductCard/ProductCardImage"] + div a[href*="/p/"], a[href*="/p/"]');
    const priceEl = card.querySelector('[data-test="current-price"], span[data-test="current-price"]');
    const compPriceEl = card.querySelector('[data-test="comparison-price"]');
    const imgEl = card.querySelector('img[src*="scene7"]');
    let title = '';
    if (titleEl) {
      title = (titleEl.getAttribute('aria-label') || titleEl.textContent || '').replace(/\s+/g, ' ').trim();
    }
    if (!title && imgEl) {
      title = (imgEl.getAttribute('alt') || '').replace(/\s+/g, ' ').trim();
    }
    if (!title || seen.has(title)) continue;
    seen.add(title);
    let price = null;
    if (priceEl) {
      const m = (priceEl.textContent || '').match(/\$[\d,]+\.?\d*/);
      if (m) price = m[0].replace(/[^0-9.]/g, '');
    }
    let origPrice = null;
    if (compPriceEl) {
      const m = (compPriceEl.textContent || '').match(/\$[\d,]+\.?\d*/);
      if (m) origPrice = m[0].replace(/[^0-9.]/g, '');
    }
    let image = '';
    if (imgEl) {
      const s = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
      if (s.startsWith('http')) image = s;
    }
    let href = '';
    if (titleEl) href = titleEl.getAttribute('href') || '';
    if (!href && imgEl) {
      const a = imgEl.closest('a[href*="/p/"]');
      if (a) href = a.getAttribute('href') || '';
    }
    results.push({
      title,
      price,
      origPrice,
      url: href ? 'https://www.target.com' + href.split('#')[0] : 'https://www.target.com',
      image,
      retailer: 'Target',
    });
  }
  return results;
}

const pwSources = [
  {
    name: 'bestbuy',
    label: 'Best Buy',
    url: 'https://www.bestbuy.com/site/searchpage.jsp?intl=nosplash&st=kitchen',
    selector: 'a[href*="/product/"]',
    extract: extractBestBuy,
  },
  {
    name: 'walmart',
    label: 'Walmart',
    url: 'https://www.walmart.com/shop/deals',
    selector: 'a[href*="/ip/"]',
    extract: extractWalmart,
  },
  {
    name: 'amazon',
    label: 'Amazon',
    url: 'https://www.amazon.com/s?k=kitchen+deals&rh=n%3A284507',
    selector: 'div[data-component-type="s-search-result"]',
    extract: extractAmazon,
  },
  {
    name: 'target',
    label: 'Target',
    url: 'https://www.target.com/s?searchTerm=kitchen+appliance',
    selector: 'a[href*="/p/"]',
    extract: extractTarget,
  },
];

async function runPlaywrightScraper() {
  console.log('Kitchen Deals ÔÇö Playwright Scraper\n');
  const results = {};
  for (const source of pwSources) {
    results[source.name] = await scrapeWithPlaywright(source);
    await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000));
  }
  let total = 0;
  for (const [name, deals] of Object.entries(results)) {
    total += deals.length;
    console.log(`  ${name}: ${deals.length} deals`);
  }
  console.log(`\nTotal: ${total} deals`);
}

module.exports = { runPlaywrightScraper, scrapeWithPlaywright, pwSources, isJunkTitle, extractAmazon, extractBestBuy, extractWalmart, extractTarget };
