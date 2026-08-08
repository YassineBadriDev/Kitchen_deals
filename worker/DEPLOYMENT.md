# Kitchen Deals Worker — Deployment

Plain JS Cloudflare Worker serving all HTML/API/SEO with D1 SQLite storage.
Data is fed by the root Node scraper service via the protected `POST /api/ingest`.

## Prerequisites

- Cloudflare account + authenticated CLI (`wrangler login`)
- Node 18+ (for the push script only)

## 1. Install dependencies

```sh
cd worker
npm install
```

## 2. Create the D1 database

```sh
npx wrangler d1 create kitchen-deals-db
```

Copy the returned `database_id` into `worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "kitchen-deals-db"
database_id = "<database_id>"
```

## 3. Apply the schema

```sh
npx wrangler d1 execute kitchen-deals-db --remote --file=./schema.sql
```

## 4. Set secrets and vars

Affiliate links are kept as a secret so they can be changed from the
dashboard without redeploying code. Format is JSON keyed by retailer:

```sh
npx wrangler secret put AFFILIATE_LINKS
# {"amazon":"tag=kitchendeals-20","bestbuy":"affid=…","walmart":"…","target":"…","homedepot":"…","lowes":"…","costco":"…"}

npx wrangler secret put INGEST_TOKEN
# any long random string shared with the push script
```

Supported retailer keys: amazon, bestbuy, walmart, target, homedepot, lowes,
costco, macys, nordstrom, wayfair, ikea, aldi. An empty string disables the
affiliate param for that retailer. Values are appended as query strings to the
deal/product URL. A value containing `{url}` is treated as a full URL template.

## 5. Deploy

```sh
npx wrangler deploy
```

## 6. Push data (from the Node scraper service)

At the repo root (same directory as `package.json`):

```sh
INGEST_TOKEN=... node scripts/push-to-worker.js --url https://kitchendeals.org
```

`INGEST_TOKEN` can be passed with `--token`, set as an env var, or placed in
`worker/.dev.vars` (see `worker/.dev.vars.example`).

The push script reads `src/data/deals/*.json` and `src/data/products.json` and
POSTs them to `POST /api/ingest` with `Authorization: Bearer <token>`.

## 7. Custom domain

Add the custom domain in the Cloudflare dashboard under
Workers & Pages → kitchen-deals → Settings → Domains & Routes.

## Local development

```sh
cd worker
cp .dev.vars.example .dev.vars   # fill INGEST_TOKEN + AFFILIATE_LINKS
npx wrangler dev --local
```

In a second terminal, seed local data:

```sh
node scripts/push-to-worker.js --url http://localhost:8787
```

Static assets (css, product images, favicons) are served from the repo's
`public/` folder via the `[assets]` binding.
