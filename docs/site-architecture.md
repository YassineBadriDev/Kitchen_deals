# kitchendeals.org — Site Architecture

## Overview

- **Domain:** kitchendeals.org
- **Site Name:** Kitchen Deals
- **Stack:** Express.js + EJS + Crawlee + Playwright + Cheerio
- **SEO:** Entity-first + semantic SEO + flat keyword slugs

## URL Structure (flat keyword slugs)

Every page targets one keyword in all six positions: title, URL, H1, H2s/H3s, intro, meta description.

| Hub type | URL pattern | Example |
|---|---|---|
| Pillar | `/` | kitchendeals.org |
| Seasonal | `/{event}-kitchen-deals/` | `/black-friday-kitchen-appliance-deals/` |
| Brand | `/{brand}-deals/` | `/kitchenaid-deals/` |
| Retailer | `/{retailer}-kitchen-deals/` | `/amazon-kitchen-deals/` |
| Category | `/kitchen-{category}-deals/` | `/kitchen-knife-deals/` |
| Combined | `/{brand}-{category}-deals/` | `/kitchenaid-mixer-deals/` |

## Entity Cluster Model

Five entity types, ranked by classification priority:

1. **Pillar hub** — root entity, no modifier
2. **Seasonal hubs** — time-based shopping events
3. **Brand hubs** — appliance/cookware manufacturers
4. **Retailer hubs** — marketplaces and stores
5. **Category hubs** — appliance types

## Schema (JSON-LD)

- Global: `WebSite`, `Organization`
- Pillar: `CollectionPage`, `ItemList`
- Seasonal: `Offer.validThrough`
- Brand: `Brand`, `Offer` under `Product`
- Retailer: `Organization`, `Offer.seller`
- Category: `ItemList`
- BreadcrumbList on every page

## Internal Linking

- Every page → pillar hub
- Brand hubs → retailers carrying it + categories
- Retailer hubs → brands + categories
- Category hubs → brands + retailers
- Seasonal hubs → brands + retailers
- Footer: all major hubs

## Technical SEO

- Flat keyword slugs in URL
- Target keyword in title, H1, H2s, intro, meta description
- Unique title/meta per hub
- Canonical URLs
- Mobile-first responsive design
- No AI-generated text signatures

## Scraper Architecture

- CheerioCrawler/axios for lighter sources
- PlaywrightCrawler for JS-heavy retailers
- Per-retailer source adapters
- Normalized `Deal` model
- JSON file store
- `npm run scrape` refresh

## Legal Pages

- `/privacy-policy`
- `/terms-of-service`
- `/contact`
- `/disclaimer`

## Bot Files

- `robots.txt`
- `sitemap.xml` (generated)
- `llms.txt`
