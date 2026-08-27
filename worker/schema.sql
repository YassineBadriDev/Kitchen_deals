-- Kitchen Deals D1 schema
-- Run: wrangler d1 execute kitchen-deals-db --file=./schema.sql
--   or with --remote to apply to production

CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  retailer TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  image TEXT,
  price REAL,
  orig_price REAL,
  discount_pct REAL,
  brand TEXT,
  category TEXT,
  valid_through TEXT,
  scraped_at TEXT,
  slug TEXT,
  UNIQUE (retailer, title),
  UNIQUE (slug)
);
CREATE INDEX IF NOT EXISTS idx_deals_retailer ON deals(retailer);
CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_deals_scraped ON deals(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_slug ON deals(slug);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  retailer TEXT,
  url TEXT,
  image TEXT,
  asin TEXT,
  sku TEXT,
  upc TEXT,
  current_price REAL,
  lowest_ever REAL,
  highest_ever REAL,
  avg_price REAL,
  first_seen TEXT,
  last_updated TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_retailer ON products(retailer);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  retailer TEXT,
  price REAL,
  orig_price REAL,
  url TEXT,
  timestamp TEXT
);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
