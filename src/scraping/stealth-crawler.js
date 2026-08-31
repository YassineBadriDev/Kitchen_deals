const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { saveDeals } = require('./normalize');
const { isJunkTitle, extractAmazon, extractBestBuy, extractWalmart, extractTarget } = require('./playwright-crawler');
const { resolveChromeExecutable, LAUNCH_ARGS } = require('./launch-browser');

chromium.use(StealthPlugin());

async function getRealUserAgent() {
  const { chromium: core } = require('playwright');
  if (core.chromium) {
    const { devices } = require('playwright');
    const desktop = devices['Desktop Chrome'];
    if (desktop && desktop.userAgent) return desktop.userAgent;
  }
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
}

const INIT_SCRIPT = () => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
  window.chrome = window.chrome || { runtime: {} };
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  const origQuery = window.navigator.permissions && window.navigator.permissions.query;
  if (origQuery) {
    window.navigator.permissions.query = (parameters) =>
      parameters && parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : origQuery(parameters);
  }
};

function makeHeaders(source) {
  const base = { 'accept-language': 'en-US,en;q=0.9' };
  if (source === 'bestbuy') base['x-country-code'] = 'US';
  return base;
}

async function humanBehavior(page) {
  const steps = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < steps; i++) {
    const x = 100 + Math.floor(Math.random() * 1600);
    const y = 100 + Math.floor(Math.random() * 800);
    await page.mouse.move(x, y).catch(() => {});
    await page.waitForTimeout(200 + Math.random() * 500);
  }
  await page.mouse.wheel(0, 300 + Math.random() * 900).catch(() => {});
  await page.waitForTimeout(400 + Math.random() * 600);
}

async function waitForCaptchaFallback(page) {
  try {
    await page.waitForFunction(
      () => !document.body.innerText.includes('Robot or human') && !document.body.innerText.includes('are you human'),
      { timeout: 25000 }
    );
  } catch (err) {
    return false;
  }
  return true;
}

async function findPxFrame(page) {
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    let url = '';
    try { url = frame.url(); } catch (e) {}
    if (/px-captcha|perimeterx|px\.challenges|challenges\.cloudflare|human/i.test(url)) return frame;
  }
  return null;
}

async function solveWalmartChallenge(page) {
  console.log('[walmart-stealth] Detected human verification, attempting PerimeterX bypass...');
  try {
    await page.waitForSelector('#px-captcha, .px-captcha-holder, form#px-captcha, [data-testid="px-captcha"]', { timeout: 10000 });
  } catch (err) {
    console.log('[walmart-stealth] No PX widget in main frame');
  }

  let solved = false;
  for (let round = 0; round < 6 && !solved; round++) {
    let interacted = false;

    const held = await findPressHoldButton(page, page.frames(), true);
    if (held) {
      console.log(`[walmart-stealth] Press-and-hold button found, holding (round ${round + 1})...`);
      interacted = true;
      await page.waitForTimeout(6000);
    }

    const pxFrame = await findPxFrame(page);
    if (pxFrame && !interacted) {
      console.log(`[walmart-stealth] Interacting with PX frame (${pxFrame.url()})...`);
      const heldInFrame = await findPressHoldButton(page, [pxFrame], false);
      if (heldInFrame) {
        console.log(`[walmart-stealth] Press-and-hold button found in PX frame (round ${round + 1})...`);
        interacted = true;
        await page.waitForTimeout(6000);
      }
    }

    if (!interacted) {
      console.log(`[walmart-stealth] No press-and-hold button this round, waiting...`);
      await page.waitForTimeout(4000);
    }

    const bodyAfter = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 160) : '');
    if (!/robot or human/i.test(bodyAfter) && !/are you human/i.test(bodyAfter)) {
      solved = true;
      console.log('[walmart-stealth] Challenge cleared!');
      break;
    } else if (interacted) {
      console.log('[walmart-stealth] Challenge still present after interaction, retrying...');
    }
  }
  await page.waitForTimeout(3000);
  return solved;
}

async function findPressHoldButton(page, framesArray, includeMainFrame) {
  const frames = framesArray || page.frames();
  for (const frame of frames) {
    if (page.mainFrame && frame === page.mainFrame() && !includeMainFrame) continue;
    try {
      const hasHold = await frame.evaluate(() => {
        const btn = document.querySelector('[role="button"], #px-captcha button, .px-captcha button, [data-testid="px-captcha"] button, button');
        return !!(btn && /press|hold|continue|tap|verify|start/i.test((btn.textContent || '').toLowerCase()));
      });
      if (!hasHold) continue;
    } catch (err) {
      continue;
    }
    const btn = frame.locator('[role="button"], #px-captcha button, .px-captcha button, [data-testid="px-captcha"] button, button').first();
    try {
      const box = await btn.boundingBox();
      if (!box) continue;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const activePage = frame.page();
      await activePage.mouse.move(cx, cy, { steps: 15 });
      await activePage.waitForTimeout(300 + Math.random() * 200);
      await activePage.mouse.down();
      const holdTime = 5000 + Math.random() * 2000;
      const start = Date.now();
      while (Date.now() - start < holdTime) {
        await activePage.mouse.move(cx + (Math.random() - 0.5) * 6, cy + (Math.random() - 0.5) * 6);
        await activePage.waitForTimeout(150 + Math.random() * 200);
      }
      await activePage.mouse.up();
      return true;
    } catch (err) {
      continue;
    }
  }
  return false;
}

async function scrapeWithStealth(source) {
  const maxAttempts = source.name === 'walmart' ? 6 : 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await scrapeAttempt(source, attempt);
    if (result !== 'challenge') return result;
    console.log(`[${source.name}-stealth] Retrying (attempt ${attempt + 1}/${maxAttempts})...`);
    await new Promise(r => setTimeout(r, 8000 + Math.random() * 8000));
  }
  console.log(`[${source.name}-stealth] Gave up after ${maxAttempts} attempts`);
  return [];
}

async function scrapeAttempt(source, attempt) {
  const realUserAgent = await getRealUserAgent();
  const browser = await chromium.launch({
    executablePath: resolveChromeExecutable(),
    headless: 'new',
    args: LAUNCH_ARGS,
    ignoreDefaultArgs: ['--enable-automation'],
  });
  const context = await browser.newContext({
    userAgent: realUserAgent,
    viewport: { width: 1920, height: 1080 },
    screen: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    colorScheme: 'light',
    extraHTTPHeaders: makeHeaders(source.name),
  });
  await context.addInitScript(INIT_SCRIPT);
  const page = await context.newPage();

  try {
    if (source.home) {
      console.log(`[${source.name}-stealth] Visiting homepage to warm up session...`);
      await page.goto(source.home, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000 + Math.random() * 1500);
    }

    console.log(`[${source.name}-stealth] Navigating to ${source.url}...`);
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    if (source.name === 'walmart') {
      const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 200) : '');
      if (/robot or human/i.test(bodyText) || /are you human/i.test(bodyText)) {
        const solved = await solveWalmartChallenge(page);
        if (solved) {
          console.log('[walmart-stealth] Challenge solved!');
        } else {
          console.log(`[${source.name}-stealth] Human verification still present (attempt ${attempt})`);
          return 'challenge';
        }
      }
    }

    if (source.name === 'bestbuy') {
      const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 200) : '');
      if (/choose a country|select your country/i.test(bodyText)) {
        console.log('[bestbuy-stealth] Detected country splash, clicking United States...');
        const usBtn = page.locator('a:has-text("United States")').first();
        try {
          if (await usBtn.count()) {
            await usBtn.click({ timeout: 4000 });
            await page.waitForTimeout(4000);
          }
        } catch (err) {}
      }
    }

    await humanBehavior(page);

    if (source.name === 'bestbuy') {
      try {
        await page.waitForSelector('li.item, li.sku-item, div[data-sku-id], a[href*="/product/"]', { timeout: 15000 });
      } catch (err) {
        console.log(`[${source.name}-stealth] Product grid selector not found, continuing with links`);
      }
    }

    if (source.name === 'target') {
      try {
        await page.waitForSelector('a[href*="/p/"]', { timeout: 15000 });
      } catch (err) {
        console.log(`[${source.name}-stealth] Target product selector not found, continuing`);
      }
    }

    const deals = await page.evaluate(source.extract);
    const cleaned = deals.filter(d => !isJunkTitle(d.title)).slice(0, 30);
    console.log(`[${source.name}-stealth] Found ${cleaned.length} deals (${deals.length} raw)`);
    if (cleaned.length > 0) {
      return saveDeals(cleaned, `${source.name}`);
    }
    return [];
  } catch (err) {
    console.error(`[${source.name}-stealth] Error: ${err.message}`);
    return [];
  } finally {
    await browser.close();
  }
}

const sources = [
  {
    name: 'bestbuy',
    label: 'Best Buy',
    url: 'https://www.bestbuy.com/site/searchpage.jsp?intl=nosplash&st=kitchen',
    home: 'https://www.bestbuy.com/?intl=nosplash',
    extract: extractBestBuy,
  },
  {
    name: 'walmart',
    label: 'Walmart',
    url: 'https://www.walmart.com/shop/deals',
    home: 'https://www.walmart.com/',
    extract: extractWalmart,
  },
  {
    name: 'target',
    label: 'Target',
    url: 'https://www.target.com/s?searchTerm=kitchen+appliance',
    home: 'https://www.target.com/',
    extract: extractTarget,
  },
];

async function runStealthScraper() {
  console.log('Kitchen Deals — Stealth Playwright Scraper\n');
  const results = {};
  for (const source of sources) {
    results[source.name] = await scrapeWithStealth(source);
    await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
  }
  let total = 0;
  for (const [name, deals] of Object.entries(results)) {
    total += deals.length;
    console.log(`  ${name}: ${deals.length} deals`);
  }
  console.log(`\nTotal: ${total} deals`);
}

module.exports = { runStealthScraper, scrapeWithStealth, sources };
