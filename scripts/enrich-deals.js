#!/usr/bin/env node
/**
 * Enrich scraped deals with product descriptions.
 *
 * Thin wrapper around src/scraping/enrich.js (see that module for options).
 *
 * Usage:
 *   node scripts/enrich-deals.js [--browser] [--http-only] [--limit N] [--retailer R]
 */
const path = require('path');
const { main } = require(path.join(__dirname, '..', 'src', 'scraping', 'enrich'));

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
