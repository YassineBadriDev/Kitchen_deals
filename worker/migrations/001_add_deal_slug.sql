-- Migration: add slug column to deals for Slickdeals-style detail pages.
-- Run once on production: npx wrangler d1 execute kitchen-deals-db --remote --file=worker/migrations/001_add_deal_slug.sql

ALTER TABLE deals ADD COLUMN slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_slug ON deals(slug);
