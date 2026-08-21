const { runAll } = require('./crawler');
const { runPlaywrightScraper } = require('./playwright-crawler');
const { runStealthScraper } = require('./stealth-crawler');
const { scrapeWithProfile, scrapeAllWithProfile, RETAILERS } = require('./chrome-profile');

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--profile')) {
    const retailerArg = args.find(a => a !== '--profile' && !a.startsWith('--'));
    if (retailerArg && RETAILERS[retailerArg]) {
      console.log('CLOSE CHROME FIRST, then press Enter...');
      await new Promise(resolve => process.stdin.once('data', resolve));
      await scrapeWithProfile(retailerArg);
    } else {
      await scrapeAllWithProfile();
    }
    console.log('\nDone!');
    return;
  }

  if (args.includes('--amazon-profile')) {
    console.log('CLOSE CHROME FIRST, then press Enter...');
    await new Promise(resolve => process.stdin.once('data', resolve));
    await scrapeWithProfile('amazon');
    console.log('\nDone!');
    return;
  }

  if (args.includes('--all')) {
    console.log('=== Phase 1: Cheerio/axios scraper ===\n');
    await runAll();

    console.log('\n=== Phase 2: Playwright scraper ===\n');
    await runPlaywrightScraper();

    console.log('\n=== Phase 3: Stealth Playwright scraper ===\n');
    await runStealthScraper();

    console.log('\n=== Phase 4: Chrome Profile scraper ===\n');
    await scrapeAllWithProfile();

    console.log('\nDone!');
    return;
  }

  if (args.includes('--scrape')) {
    console.log('=== Phase 1: Cheerio/axios scraper ===\n');
    await runAll();

    console.log('\n=== Phase 2: Playwright scraper ===\n');
    await runPlaywrightScraper();

    console.log('\n=== Phase 3: Stealth Playwright scraper ===\n');
    await runStealthScraper();

    console.log('\nDone!');
    return;
  }

  console.log('Usage:');
  console.log('  node src/scraping/run.js --profile              (scrape ALL retailers with Chrome cookies)');
  console.log('  node src/scraping/run.js --profile amazon       (scrape Amazon only with Chrome cookies)');
  console.log('  node src/scraping/run.js --profile bestbuy      (scrape Best Buy only)');
  console.log('  node src/scraping/run.js --profile walmart      (scrape Walmart only)');
  console.log('  node src/scraping/run.js --profile target       (scrape Target only)');
  console.log('  node src/scraping/run.js --all                  (run all scrapers)');
  console.log('  node src/scraping/run.js --scrape               (cheerio+playwright+stealth, no Chrome Profile)');
  console.log('');
  console.log('IMPORTANT: Close Chrome completely before using --profile');
}

main().catch(err => {
  console.error('Scraper failed:', err.message);
  process.exit(1);
});
