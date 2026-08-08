const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { saveDeals } = require('./normalize');
const { addOrUpdateProduct } = require('./products');

const CHROME_USER_DATA = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');

const RETAILERS = {
  amazon: {
    name: 'Amazon',
    url: 'https://www.amazon.com/s?k=kitchen+deals&ref=nb_sb_noss',
    parse: parseAmazonDeals,
  },
  bestbuy: {
    name: 'Best Buy',
    url: 'https://www.bestbuy.com/site/promo/daily-deals',
    parse: parseBestBuyDeals,
  },
  walmart: {
    name: 'Walmart',
    url: 'https://www.walmart.com/shop/deals',
    parse: parseWalmartDeals,
  },
  target: {
    name: 'Target',
    url: 'https://www.target.com/c/kitchen-deals/-/N-5xtum',
    parse: parseTargetDeals,
  },
};

async function scrapeWithProfile(retailerKey) {
  const retailer = RETAILERS[retailerKey];
  if (!retailer) {
    console.error(`Unknown retailer: ${retailerKey}`);
    console.log(`Available: ${Object.keys(RETAILERS).join(', ')}`);
    return [];
  }

  console.log(`[${retailerKey}-profile] Starting Chrome profile scraper for ${retailer.name}...`);
  console.log(`[${retailerKey}-profile] IMPORTANT: Close Chrome completely before running this.\n`);

  const context = await chromium.launchPersistentContext(CHROME_USER_DATA, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1920, height: 1080 },
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    console.log(`[${retailerKey}-profile] Navigating to ${retailer.name}...`);
    await page.goto(retailer.url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await page.waitForTimeout(5000);

    const html = await page.content();
    const deals = retailer.parse(html, retailer.name);
    console.log(`[${retailerKey}-profile] Found ${deals.length} deals`);

    for (const deal of deals) {
      addOrUpdateProduct({
        title: deal.title,
        price: deal.price,
        origPrice: deal.origPrice,
        retailer: deal.retailer,
        url: deal.url,
        image: deal.image,
        brand: deal.brand || '',
        category: deal.category || '',
        asin: deal.asin || null,
        sku: deal.sku || null,
      });
    }

    saveDeals(deals, `${retailerKey}-profile`);
    return deals;
  } catch (err) {
    console.error(`[${retailerKey}-profile] Error: ${err.message}`);
    return [];
  } finally {
    await context.close();
  }
}

async function scrapeAllWithProfile() {
  console.log('=== Chrome Profile Scraper (All Retailers) ===\n');
  console.log('CLOSE CHROME COMPLETELY FIRST, then press Enter...\n');
  await new Promise(resolve => process.stdin.once('data', resolve));

  const results = {};
  for (const key of Object.keys(RETAILERS)) {
    results[key] = await scrapeWithProfile(key);
    await new Promise(r => setTimeout(r, 3000));
  }

  let total = 0;
  for (const [name, deals] of Object.entries(results)) {
    total += deals.length;
    console.log(`  ${name}: ${deals.length} deals`);
  }
  console.log(`\nTotal: ${total} deals`);
}

function parseAmazonDeals(html, retailerName) {
  const deals = [];

  const asinRegex = /data-asin="([A-Z0-9]{10})"/g;
  const h2Regex = /<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h2>/gi;
  const titleBlockRegex = /<span[^>]*class="[^"]*a-size-base-plus[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  const altTitleRegex = /<span[^>]*class="[^"]*a-size-medium[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  const priceWholeRegex = /<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  const imgRegex = /<img[^>]*class="[^"]*s-image[^"]*"[^>]*src="([^"]+)"/gi;
  const altImgRegex = /<img[^>]*src="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/gi;
  const dataImgRegex = /data-src="([^"]+)"/gi;
  const linkRegex = /href="(\/dp\/([A-Z0-9]{10})[^"]*)"/g;

  const asins = [];
  let am;
  while ((am = asinRegex.exec(html)) !== null) {
    if (!asins.includes(am[1])) asins.push(am[1]);
  }

  const titles = [];
  let tm;
  for (const pat of [h2Regex, titleBlockRegex, altTitleRegex]) {
    while ((tm = pat.exec(html)) !== null) {
      const t = tm[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
      if (t.length > 10 && t.length < 200 && !titles.includes(t)) titles.push(t);
    }
  }

  const prices = [];
  let pwm;
  while ((pwm = priceWholeRegex.exec(html)) !== null) {
    const whole = pwm[1].replace(/[^0-9]/g, '');
    const fracMatch = html.substring(pwm.index).match(/<span[^>]*class="[^"]*a-price-fraction[^"]*"[^>]*>(\d+)<\/span>/);
    if (whole) prices.push(`${whole}.${fracMatch ? fracMatch[1] : '00'}`);
  }

  const imgs = [];
  let im;
  while ((im = imgRegex.exec(html)) !== null) imgs.push(im[1]);
  if (imgs.length === 0) {
    let aim;
    while ((aim = altImgRegex.exec(html)) !== null) {
      if (!imgs.includes(aim[1])) imgs.push(aim[1]);
    }
  }
  if (imgs.length === 0) {
    let dim;
    while ((dim = dataImgRegex.exec(html)) !== null) {
      if (dim[1].includes('media-amazon') && !imgs.includes(dim[1])) imgs.push(dim[1]);
    }
  }

  const links = [];
  const asinFromLink = [];
  let lm;
  while ((lm = linkRegex.exec(html)) !== null) {
    links.push(`https://www.amazon.com${lm[1]}`);
    asinFromLink.push(lm[2]);
  }

  for (let i = 0; i < Math.min(titles.length, 30); i++) {
    const asin = asinFromLink[i] || asins[i] || null;
    deals.push({
      title: titles[i],
      price: prices[i] || null,
      url: links[i] || 'https://www.amazon.com',
      image: imgs[i] || '',
      retailer: retailerName || 'Amazon',
      asin,
      brand: extractBrandFromTitle(titles[i]),
      category: extractCategoryFromTitle(titles[i]),
    });
  }
  return deals;
}

function parseBestBuyDeals(html, retailerName) {
  const deals = [];
  const titleRegex = /<h4[^>]*class="[^"]*sku-title[^"]*"[^>]*>([\s\S]*?)<\/h4>/gi;
  const altTitleRegex = /"name"\s*:\s*"([^"]{10,150})"/g;
  const priceRegex = /<span[^>]*class="[^"]*priceView[^"]*"[^>]*>[\s\S]*?\$([\d,]+\.?\d*)/gi;
  const altPriceRegex = /"currentPrice"\s*:\s*([\d.]+)/g;
  const imgRegex = /<img[^>]*class="[^"]*product-image[^"]*"[^>]*src="([^"]+)"/gi;
  const altImgRegex = /<img[^>]*src="(https:\/\/[^"]*bbystatic[^"]*\.jpg[^"]*)"/gi;
  const jsonImgRegex =/"image"\s*:\s*"(https:\/\/[^"]+)"/g;
  const linkRegex = /href="(\/site\/[^"]+)"/gi;
  const altLinkRegex = /"url"\s*:\s*"(\/[^"]*\/p\/[^"]+)"/g;

  const titles = [];
  let tm;
  while ((tm = titleRegex.exec(html)) !== null) {
    const t = tm[1].replace(/<[^>]*>/g, '').trim();
    if (t.length > 5) titles.push(t);
  }
  if (titles.length === 0) {
    while ((tm = altTitleRegex.exec(html)) !== null) {
      const t = tm[1].trim();
      if (t.length > 10 && !titles.includes(t)) titles.push(t);
    }
  }

  const prices = [];
  let pm;
  while ((pm = priceRegex.exec(html)) !== null) prices.push(pm[1].replace(/,/g, ''));
  if (prices.length === 0) {
    while ((pm = altPriceRegex.exec(html)) !== null) prices.push(pm[1]);
  }

  const imgs = [];
  let im;
  while ((im = imgRegex.exec(html)) !== null) imgs.push(im[1]);
  if (imgs.length === 0) {
    let aim;
    while ((aim = altImgRegex.exec(html)) !== null) {
      if (!imgs.includes(aim[1])) imgs.push(aim[1]);
    }
  }
  if (imgs.length === 0) {
    let jimg;
    while ((jimg = jsonImgRegex.exec(html)) !== null) {
      if (jimg[1].includes('bbystatic') || jimg[1].includes('bestbuy')) {
        if (!imgs.includes(jimg[1])) imgs.push(jimg[1]);
      }
    }
  }

  const links = [];
  let lm;
  while ((lm = linkRegex.exec(html)) !== null) links.push(`https://www.bestbuy.com${lm[1]}`);
  if (links.length === 0) {
    while ((lm = altLinkRegex.exec(html)) !== null) {
      const url = `https://www.bestbuy.com${lm[1]}`;
      if (!links.includes(url)) links.push(url);
    }
  }

  for (let i = 0; i < Math.min(titles.length, 30); i++) {
    deals.push({
      title: titles[i],
      price: prices[i] || null,
      url: links[i] || 'https://www.bestbuy.com',
      image: imgs[i] || '',
      retailer: retailerName || 'Best Buy',
      brand: extractBrandFromTitle(titles[i]),
      category: extractCategoryFromTitle(titles[i]),
    });
  }
  return deals;
}

function parseWalmartDeals(html, retailerName) {
  const deals = [];
  const titleRegex = /"title"\s*:\s*"([^"]{10,150})"/g;
  const priceRegex = /"price"\s*:\s*"?(\d+\.?\d*)/g;
  const imgRegex = /"imageUrl"\s*:\s*"([^"]+)"/g;
  const altImgRegex = /<img[^>]*src="(https:\/\/[^"]*walmart[^"]*\.(?:jpg|png|webp)[^"]*)"/gi;
  const jsonImgRegex = /"image"\s*:\s*"(https:\/\/[^"]+)"/g;
  const linkRegex = /"canonicalUrl"\s*:\s*"(\/[^"]+)"/g;
  const altLinkRegex = /"url"\s*:\s*"(\/ip\/[^"]+)"/g;

  const titles = [];
  let tm;
  while ((tm = titleRegex.exec(html)) !== null) {
    const t = tm[1].replace(/\\u[\dA-Fa-f]{4}/g, '').trim();
    if (t.length > 10 && !t.includes('cookie') && !titles.includes(t)) titles.push(t);
  }

  const prices = [];
  let pm;
  while ((pm = priceRegex.exec(html)) !== null) prices.push(pm[1]);

  const imgs = [];
  let im;
  while ((im = imgRegex.exec(html)) !== null) imgs.push(im[1]);
  if (imgs.length === 0) {
    let aim;
    while ((aim = altImgRegex.exec(html)) !== null) {
      if (!imgs.includes(aim[1])) imgs.push(aim[1]);
    }
  }
  if (imgs.length === 0) {
    let jimg;
    while ((jimg = jsonImgRegex.exec(html)) !== null) {
      if (jimg[1].includes('walmart') || jimg[1].includes('walmartimages')) {
        if (!imgs.includes(jimg[1])) imgs.push(jimg[1]);
      }
    }
  }

  const links = [];
  let lm;
  while ((lm = linkRegex.exec(html)) !== null) links.push(`https://www.walmart.com${lm[1]}`);
  if (links.length === 0) {
    while ((lm = altLinkRegex.exec(html)) !== null) {
      const url = `https://www.walmart.com${lm[1]}`;
      if (!links.includes(url)) links.push(url);
    }
  }

  for (let i = 0; i < Math.min(titles.length, 30); i++) {
    deals.push({
      title: titles[i],
      price: prices[i] || null,
      url: links[i] || 'https://www.walmart.com',
      image: imgs[i] || '',
      retailer: retailerName || 'Walmart',
      brand: extractBrandFromTitle(titles[i]),
      category: extractCategoryFromTitle(titles[i]),
    });
  }
  return deals;
}

function parseTargetDeals(html, retailerName) {
  const deals = [];
  const titleRegex = /"name"\s*:\s*"([^"]{10,150})"/g;
  const priceRegex = /"current_retail"\s*:\s*(\d+\.?\d*)/g;
  const imgRegex = /"primary_image"\s*:\s*"([^"]+)"/g;
  const altImgRegex = /<img[^>]*src="(https:\/\/[^"]*target\.com[^"]*\.(?:jpg|png|webp)[^"]*)"/gi;
  const cdnImgRegex = /<img[^>]*src="(https:\/\/[^"]*scene7[^"]*\.jpg[^"]*)"/gi;
  const linkRegex = /"url"\s*:\s*"(\/p\/[^"]+)"/g;
  const altLinkRegex = /"url"\s*:\s*"(\/[^"]*\/A-\d+[^"]*)"/g;

  const titles = [];
  let tm;
  while ((tm = titleRegex.exec(html)) !== null) {
    const t = tm[1].trim();
    if (t.length > 10 && !titles.includes(t)) titles.push(t);
  }

  const prices = [];
  let pm;
  while ((pm = priceRegex.exec(html)) !== null) prices.push(pm[1]);

  const imgs = [];
  let im;
  while ((im = imgRegex.exec(html)) !== null) imgs.push(im[1]);
  if (imgs.length === 0) {
    let aim;
    while ((aim = altImgRegex.exec(html)) !== null) {
      if (!imgs.includes(aim[1])) imgs.push(aim[1]);
    }
  }
  if (imgs.length === 0) {
    let cim;
    while ((cim = cdnImgRegex.exec(html)) !== null) {
      if (!imgs.includes(cim[1])) imgs.push(cim[1]);
    }
  }

  const links = [];
  let lm;
  while ((lm = linkRegex.exec(html)) !== null) links.push(`https://www.target.com${lm[1]}`);
  if (links.length === 0) {
    while ((lm = altLinkRegex.exec(html)) !== null) {
      const url = `https://www.target.com${lm[1]}`;
      if (!links.includes(url)) links.push(url);
    }
  }

  for (let i = 0; i < Math.min(titles.length, 30); i++) {
    deals.push({
      title: titles[i],
      price: prices[i] || null,
      url: links[i] || 'https://www.target.com',
      image: imgs[i] || '',
      retailer: retailerName || 'Target',
      brand: extractBrandFromTitle(titles[i]),
      category: extractCategoryFromTitle(titles[i]),
    });
  }
  return deals;
}

const BRANDS = [
  'kitchenaid', 'shark', 'bosch', 'whirlpool', 'frigidaire', 'samsung', 'lg',
  'ge appliances', 'ge', 'dacor', 'wolf', 'viking', 'cuisinart', 'ninja',
  'stonewall kitchen', 'wusthof', 'zwilling', 'pampered chef', 'miele',
  'kenmore', 'maytag', 'haier', 'broil king', 'weber', 'lodge', 'le creuset',
  'all-clad', 'calphalon', 'tefal', 'circulon', 'farberware', 'inox',
  'vitamix', 'blendtec', 'breville', "de'longhi", 'keurig', 'nespresso',
  'hamilton beach', 'oxo', 'microplane', 'staub', 'rachel ray',
];

const CATEGORIES = [
  'refrigerator', 'fridge', 'dishwasher', 'oven', 'range', 'stove', 'microwave',
  'blender', 'mixer', 'food processor', 'toaster', 'coffee maker', 'air fryer',
  'slow cooker', 'instant pot', 'pressure cooker', 'grill', 'griddle',
  'knife', 'knives', 'cookware', 'pots', 'pans', 'skillet', 'frying pan',
  'stand mixer', 'hand mixer', 'immersion blender', 'waffle maker',
  'bakeware', 'cutting board', 'kitchen scale', 'timer', 'water filter',
  'vacuum', 'espresso', 'cappuccino',
];

function extractBrandFromTitle(title) {
  const lower = title.toLowerCase();
  for (const b of BRANDS) {
    if (lower.includes(b)) return b.replace(/\b\w/g, c => c.toUpperCase());
  }
  return '';
}

function extractCategoryFromTitle(title) {
  const lower = title.toLowerCase();
  for (const c of CATEGORIES) {
    if (lower.includes(c)) return c.replace(/\b\w/g, ch => ch.toUpperCase());
  }
  return '';
}

module.exports = { scrapeWithProfile, scrapeAllWithProfile, RETAILERS };
