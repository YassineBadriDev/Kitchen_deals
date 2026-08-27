const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { runAll } = require('./crawler');
const { runPlaywrightScraper } = require('./playwright-crawler');
const { runStealthScraper } = require('./stealth-crawler');
const { scrapeWithProfile, RETAILERS } = require('./chrome-profile');
const { main: runEnrichment } = require('./enrich');

const LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'scraper.log');

// Schedule config from env vars
const SCRAPE_CRON = process.env.SCRAPE_CRON || '0 */6 * * *'; // default every 6 hours
const ENABLE_PROFILE = process.env.SCRAPE_PROFILE !== 'false';
const ENABLE_PLAYWRIGHT = process.env.SCRAPE_PLAYWRIGHT !== 'false';
const ENABLE_STEALTH = process.env.SCRAPE_STEALTH !== 'false';
const ENABLE_HTTP = process.env.SCRAPE_HTTP !== 'false';

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    if (!fs.existsSync(path.dirname(LOG_FILE))) fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (err) {}
}

function isChromeRunning() {
  try {
    const out = execSync('tasklist /FI "IMAGENAME eq chrome.exe" /NH 2>NUL', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return /chrome\.exe/i.test(out);
  } catch (err) {
    return false;
  }
}

async function runScheduledScrape() {
  log('=== Scheduled scrape starting ===');
  const results = {};

  try {
    if (ENABLE_HTTP) {
      log('Phase 1: HTTP/Cheerio scraper...');
      const start = Date.now();
      try { await runAll(); } catch (err) { log(`  HTTP error: ${err.message}`); }
      log(`  done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }

    if (ENABLE_PLAYWRIGHT) {
      log('Phase 2: Playwright scraper...');
      const start = Date.now();
      try { await runPlaywrightScraper(); } catch (err) { log(`  Playwright error: ${err.message}`); }
      log(`  done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }

    if (ENABLE_STEALTH) {
      log('Phase 3: Stealth Playwright scraper...');
      const start = Date.now();
      try { await runStealthScraper(); } catch (err) { log(`  Stealth error: ${err.message}`); }
      log(`  done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }

    if (ENABLE_PROFILE) {
      if (isChromeRunning()) {
        log('Phase 4: Chrome profile scraper SKIPPED - Chrome is running. Close Chrome to enable profile scraping.');
      } else {
        log('Phase 4: Chrome profile scraper...');
        const start = Date.now();
        for (const key of Object.keys(RETAILERS)) {
          try {
            const deals = await scrapeWithProfile(key);
            results[key] = deals.length;
            log(`  ${RETAILERS[key].name}: ${deals.length} deals`);
          } catch (err) {
            log(`  ${RETAILERS[key].name}: error ${err.message}`);
          }
          await new Promise(r => setTimeout(r, 3000));
        }
        log(`  done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
      }
    }

    try {
      log('Phase 5: Deal enrichment (descriptions)...');
      const start = Date.now();
      // Browser phase for bot-protected retailers, unless SCRAPE_ENRICH_HTTP_ONLY=1.
      const enrichArgs = process.env.SCRAPE_ENRICH_HTTP_ONLY === '1' ? ['--http-only'] : ['--browser'];
      await runEnrichment(enrichArgs);
      log(`  done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    } catch (err) {
      log(`  Enrichment error: ${err.message}`);
    }

    log('=== Scheduled scrape finished ===');
  } catch (err) {
    log(`FATAL: ${err.stack || err.message}`);
  }
}

function startScheduler() {
  log(`Starting scheduler. Cron: "${SCRAPE_CRON}"`);
  log(`  HTTP scraper: ${ENABLE_HTTP ? 'ON' : 'OFF'}`);
  log(`  Playwright scraper: ${ENABLE_PLAYWRIGHT ? 'ON' : 'OFF'}`);
  log(`  Stealth scraper: ${ENABLE_STEALTH ? 'ON' : 'OFF'}`);
  log(`  Chrome profile scraper: ${ENABLE_PROFILE ? 'ON (requires Chrome closed)' : 'OFF'}`);

  cron.schedule(SCRAPE_CRON, () => {
    runScheduledScrape();
  });
}

// Allow running standalone: node src/scraping/scheduler.js --once
if (require.main === module && process.argv.includes('--once')) {
  runScheduledScrape().then(() => process.exit(0));
} else if (require.main === module) {
  startScheduler();
  console.log('Scheduler running. Press Ctrl+C to stop.');
}

module.exports = { startScheduler, runScheduledScrape, isChromeRunning };
