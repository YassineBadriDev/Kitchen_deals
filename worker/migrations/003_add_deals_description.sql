-- Add description column to deals for product detail enrichment.
-- Run: npx wrangler d1 execute kitchen-deals-db --remote --file=worker/migrations/003_add_deals_description.sql
ALTER TABLE deals ADD COLUMN description TEXT;
