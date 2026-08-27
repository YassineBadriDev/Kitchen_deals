function toProduct(row, history) {
  return {
    id: row.id,
    title: row.title,
    brand: row.brand || '',
    category: row.category || '',
    retailer: row.retailer || '',
    url: row.url || '',
    image: row.image || '',
    asin: row.asin || null,
    sku: row.sku || null,
    upc: row.upc || null,
    currentPrice: row.current_price,
    lowestEver: row.lowest_ever,
    highestEver: row.highest_ever,
    avgPrice: row.avg_price,
    firstSeen: row.first_seen,
    lastUpdated: row.last_updated,
    priceHistory: (history || []).map((h) => ({
      price: h.price,
      origPrice: h.orig_price,
      retailer: h.retailer || '',
      url: h.url || '',
      timestamp: h.timestamp,
    })),
  };
}

export function slugify(text, retailer = '') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  const ret = String(retailer || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ret ? `${base}-${ret}` : base;
}

function toDeal(row) {
  return {
    id: row.id,
    retailer: row.retailer,
    title: row.title,
    url: row.url || '',
    image: row.image || '',
    price: row.price,
    origPrice: row.orig_price,
    discountPct: row.discount_pct,
    brand: row.brand || '',
    category: row.category || '',
    validThrough: row.valid_through || '',
    scrapedAt: row.scraped_at || '',
    slug: row.slug || '',
  };
}

export async function getDeals(env, limit = 500) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM deals ORDER BY scraped_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all();
  return results.map(toDeal);
}

export async function getDealBySlug(env, slug) {
  const { results } = await env.DB.prepare(`SELECT * FROM deals WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .all();
  const row = results[0];
  return row ? toDeal(row) : null;
}

export async function getDealById(env, id) {
  const { results } = await env.DB.prepare(`SELECT * FROM deals WHERE id = ? LIMIT 1`)
    .bind(id)
    .all();
  const row = results[0];
  return row ? toDeal(row) : null;
}

export async function getRelatedDeals(env, deal, limit = 4) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM deals
     WHERE id != ? AND (retailer = ? OR category = ?)
     ORDER BY scraped_at DESC
     LIMIT ?`,
  )
    .bind(deal.id, deal.retailer, deal.category || '', limit)
    .all();
  return results.map(toDeal);
}

export async function getProductRows(env) {
  const { results } = await env.DB.prepare(`SELECT * FROM products`).all();
  return results;
}

export async function getPriceHistoryRows(env) {
  const { results } = await env.DB.prepare(
    `SELECT product_id, retailer, price, orig_price, url, timestamp FROM price_history ORDER BY timestamp ASC`,
  ).all();
  return results;
}

export async function getProducts(env) {
  const [rows, history] = await Promise.all([getProductRows(env), getPriceHistoryRows(env)]);
  const byId = new Map();
  for (const h of history) {
    if (!byId.has(h.product_id)) byId.set(h.product_id, []);
    byId.get(h.product_id).push(h);
  }
  return rows.map((r) => toProduct(r, byId.get(r.id) || []));
}

export async function getProduct(env, id) {
  const { results } = await env.DB.prepare(`SELECT * FROM products WHERE id = ? LIMIT 1`)
    .bind(id)
    .all();
  const row = results[0];
  if (!row) return null;
  const { results: history } = await env.DB.prepare(
    `SELECT retailer, price, orig_price, url, timestamp FROM price_history WHERE product_id = ? ORDER BY timestamp ASC`,
  )
    .bind(id)
    .all();
  return toProduct(row, history);
}

export async function getTrendingProducts(env, limit = 20) {
  const products = await getProducts(env);
  return products
    .filter((p) => p.currentPrice && p.lowestEver && p.currentPrice <= p.lowestEver * 1.1)
    .sort((a, b) => {
      const aDiscount = a.lowestEver ? (a.lowestEver - a.currentPrice) / a.lowestEver : 0;
      const bDiscount = b.lowestEver ? (b.lowestEver - b.currentPrice) / b.lowestEver : 0;
      return bDiscount - aDiscount;
    })
    .slice(0, limit);
}

export async function getPriceDrops(env, threshold = 20, limit = 20) {
  const products = await getProducts(env);
  return products
    .filter((p) => {
      if (!p.currentPrice || !p.avgPrice || p.avgPrice === 0) return false;
      const dropPct = ((p.avgPrice - p.currentPrice) / p.avgPrice) * 100;
      return dropPct >= threshold;
    })
    .map((p) => ({
      ...p,
      dropPct: Math.round(((p.avgPrice - p.currentPrice) / p.avgPrice) * 100),
    }))
    .sort((a, b) => b.dropPct - a.dropPct)
    .slice(0, limit);
}

export async function getPriceComparison(env, productId) {
  const product = await getProduct(env, productId);
  if (!product) return null;

  const retailerPrices = {};
  for (const entry of product.priceHistory) {
    const retailer = entry.retailer || 'Unknown';
    if (!retailerPrices[retailer]) {
      retailerPrices[retailer] = { retailer, prices: [], latestPrice: null, latestUrl: null };
    }
    if (entry.price && entry.price > 0) retailerPrices[retailer].prices.push(entry.price);
    retailerPrices[retailer].latestUrl = entry.url || retailerPrices[retailer].latestUrl;
  }

  for (const key of Object.keys(retailerPrices)) {
    const rp = retailerPrices[key];
    const prices = rp.prices.filter((p) => p > 0);
    rp.latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
    rp.lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
    rp.highestPrice = prices.length > 0 ? Math.max(...prices) : null;
    rp.avgPrice = prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null;
    delete rp.prices;
  }

  return {
    product,
    retailers: Object.values(retailerPrices).sort((a, b) => {
      if (!a.latestPrice) return 1;
      if (!b.latestPrice) return -1;
      return a.latestPrice - b.latestPrice;
    }),
  };
}

export async function ingest(env, payload) {
  const now = new Date().toISOString();
  let dealsInserted = 0;
  let dealsUpdated = 0;
  let productsInserted = 0;
  let productsUpdated = 0;
  let pricePoints = 0;

  const deals = Array.isArray(payload.deals) ? payload.deals : [];
  for (let i = 0; i < deals.length; i += 100) {
    const chunk = deals.slice(i, i + 100);
    const stmts = chunk.map((d) => {
      const slug = d.slug || slugify(d.title, d.retailer);
      return env.DB.prepare(
        `INSERT INTO deals (retailer, title, url, image, price, orig_price, discount_pct, brand, category, valid_through, scraped_at, slug)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (retailer, title) DO UPDATE SET
           url = excluded.url, image = excluded.image, price = excluded.price,
           orig_price = excluded.orig_price, discount_pct = excluded.discount_pct,
           brand = excluded.brand, category = excluded.category,
           valid_through = excluded.valid_through, scraped_at = excluded.scraped_at,
           slug = excluded.slug`,
      ).bind(
        d.retailer || '',
        d.title || '',
        d.url || null,
        d.image || null,
        d.price ?? null,
        d.origPrice ?? null,
        d.discountPct ?? null,
        d.brand || null,
        d.category || null,
        d.validThrough || null,
        d.scrapedAt || now,
        slug,
      );
    });
    const results = await env.DB.batch(stmts);
    for (let j = 0; j < results.length; j++) {
      if (results[j].meta.changes > 1) dealsUpdated++;
      else dealsInserted++;
    }
  }

  const products = Array.isArray(payload.products) ? payload.products : [];
  const upsertStmts = [];
  for (const p of products) {
    const id = p.id || p.asin || p.sku || p.upc || p.title;
    if (!id) continue;
    const ph = Array.isArray(p.priceHistory) ? p.priceHistory : [];
    const valid = ph.filter((e) => e && e.price != null && e.price > 0);
    const prices = valid.map((e) => Number(e.price));
    const lowest = prices.length ? Math.min(...prices) : null;
    const highest = prices.length ? Math.max(...prices) : null;
    const avg = prices.length ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null;
    const current = prices.length ? prices[prices.length - 1] : p.currentPrice ?? null;
    const lastEntry = valid[valid.length - 1] || null;

    upsertStmts.push(
      env.DB.prepare(
        `INSERT INTO products (id, title, brand, category, retailer, url, image, asin, sku, upc,
           current_price, lowest_ever, highest_ever, avg_price, first_seen, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           title = excluded.title, brand = excluded.brand, category = excluded.category,
           retailer = excluded.retailer, url = excluded.url, image = excluded.image,
           asin = excluded.asin, sku = excluded.sku, upc = excluded.upc,
           current_price = excluded.current_price, lowest_ever = excluded.lowest_ever,
           highest_ever = excluded.highest_ever, avg_price = excluded.avg_price,
           last_updated = excluded.last_updated`,
      ).bind(
        id,
        p.title || '',
        p.brand || null,
        p.category || null,
        p.retailer || null,
        p.url || null,
        p.image || null,
        p.asin || null,
        p.sku || null,
        p.upc || null,
        current,
        lowest,
        highest,
        avg,
        p.firstSeen || now,
        now,
      ),
    );

    if (lastEntry) {
      upsertStmts.push(
        env.DB.prepare(
          `INSERT INTO price_history (product_id, retailer, price, orig_price, url, timestamp)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(
          id,
          lastEntry.retailer || p.retailer || '',
          lastEntry.price ?? null,
          lastEntry.origPrice ?? null,
          lastEntry.url || p.url || null,
          lastEntry.timestamp || now,
        ),
      );
      pricePoints++;
    }
  }
  for (let i = 0; i < upsertStmts.length; i += 100) {
    await env.DB.batch(upsertStmts.slice(i, i + 100));
  }
  productsInserted = products.length;

  return { dealsInserted, dealsUpdated, productsInserted, productsUpdated, pricePoints };
}

export async function getLastUpdated(env) {
  const deal = await env.DB.prepare(`SELECT MAX(scraped_at) AS t FROM deals`).first();
  const prod = await env.DB.prepare(`SELECT MAX(last_updated) AS t FROM products`).first();
  const timestamps = [deal && deal.t, prod && prod.t].filter(Boolean);
  if (!timestamps.length) return null;
  const iso = timestamps.sort().pop();
  return iso;
}

export async function stats(env) {
  const deals = await env.DB.prepare(`SELECT COUNT(*) AS n FROM deals`).first();
  const products = await env.DB.prepare(`SELECT COUNT(*) AS n FROM products`).first();
  const pricePoints = await env.DB.prepare(`SELECT COUNT(*) AS n FROM price_history`).first();
  return {
    deals: Number(deals.n || 0),
    products: Number(products.n || 0),
    pricePoints: Number(pricePoints.n || 0),
    updated_at: new Date().toISOString(),
  };
}
