const { load } = require('cheerio');
const { sources, fetchPage, UA } = require('./sources');
const { saveDeals } = require('./normalize');

async function scrapeSource(source) {
  console.log(`[${source.name}] Fetching ${source.url}...`);
  try {
    const html = await fetchPage(source.url);
    const $ = load(html);
    const deals = source.parse($);
    console.log(`[${source.name}] Found ${deals.length} raw deals`);
    return saveDeals(deals, source.name);
  } catch (err) {
    console.error(`[${source.name}] Error: ${err.message}`);
    return [];
  }
}

async function runAll() {
  console.log('Kitchen Deals Scraper — starting...\n');
  const results = {};
  for (const source of sources) {
    results[source.name] = await scrapeSource(source);
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
  }
  let total = 0;
  for (const [name, deals] of Object.entries(results)) {
    total += deals.length;
    console.log(`  ${name}: ${deals.length} deals`);
  }
  console.log(`\nTotal: ${total} deals across ${Object.keys(results).length} sources.`);
}

module.exports = { scrapeSource, runAll };
