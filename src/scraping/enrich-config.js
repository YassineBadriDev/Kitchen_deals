/**
 * Configuration for deal enrichment (src/scraping/enrich.js).
 */
module.exports = {
  // Re-fetch descriptions on every run even for deals that already have one.
  // Set via env: KITCHEN_REFRESH_DESCRIPTIONS=1
  REFRESH_DESCRIPTIONS: process.env.KITCHEN_REFRESH_DESCRIPTIONS === '1',
};
