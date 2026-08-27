import { SITE, CLUSTERS, YEAR } from './lib/constants.js';
import { escapeHtml, fullUrl, round2 } from './lib/helpers.js';
import { parseAffiliateLinks } from './lib/affiliate.js';
import { getKeywordData, seoMiddleware } from './lib/seo.js';
import { LEGAL_HTML } from './lib/legal.js';
import { buildHubMap, filterDeals, hubProducts, relatedHubsFor, allHubs } from './lib/hubs.js';
import * as db from './db.js';
import * as render from './render.js';

const hubMap = buildHubMap();
const LEGAL_SLUGS = ['privacy-policy', 'terms-of-service', 'contact', 'disclaimer'];

const retailerHubSlug = (name) => {
  const key = String(name || '').toLowerCase();
  const hub = CLUSTERS.retailers.find((r) => (r.name || '').toLowerCase() === key);
  return hub ? hub.slug : null;
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const html = (body, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

const text = (body, status = 200, contentType = 'text/plain; charset=utf-8') =>
  new Response(body, { status, headers: { 'content-type': contentType } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const affiliateLinks = parseAffiliateLinks(env.AFFILIATE_LINKS);

    if (pathname.startsWith('/api/')) return handleApi(request, env, pathname, searchParams);

    if (pathname === '/') {
      const hub = CLUSTERS.pillar;
      const [deals, priceDrops, trendingProducts, updatedAt] = await Promise.all([
        db.getDeals(env),
        db.getPriceDrops(env, 15, 8),
        db.getTrendingProducts(env, 8),
        db.getLastUpdated(env),
      ]);
      const kw = getKeywordData(hub, CLUSTERS);
      const relatedHubs = [
        ...CLUSTERS.seasonal.slice(0, 3),
        ...CLUSTERS.brands.slice(0, 6),
        ...CLUSTERS.categories.slice(0, 4),
      ];
      const seo = seoMiddleware(hub, SITE, kw);
      return html(render.pageHome({ hub, deals, relatedHubs, kw, priceDrops, trendingProducts, seo, affiliateLinks, updatedAt }));
    }

    if (pathname === '/sitemap.xml') {
      const [products, deals] = await Promise.all([db.getProductRows(env), db.getDeals(env)]);
      return text(render.sitemapXml(allHubs(), products, deals), 200, 'application/xml; charset=utf-8');
    }

    if (pathname === '/robots.txt') return text(render.robotsTxt());
    if (pathname === '/llms.txt') return text(render.llmsTxt());

    if (pathname === '/products') {
      const [products, updatedAt] = await Promise.all([db.getProducts(env), db.getLastUpdated(env)]);
      const hub = {
        title: 'Kitchen Products',
        description: 'Track kitchen products with price history',
        h1: 'Kitchen Products',
        type: 'products',
        intro: 'Browse kitchen products and track their price history over time.',
        slug: 'products',
        entityType: 'Page',
        targetKeyword: 'kitchen products',
        name: 'Kitchen Products',
      };
      const kw = {
        title: 'Kitchen Products',
        description: 'Track kitchen products with price history',
        h1: 'Kitchen Products',
        intro: 'Browse kitchen products and track their price history over time.',
        subHeaders: [],
        pageTitle: 'Kitchen Products | ' + SITE.name,
        metaDescription: 'Track kitchen products with price history',
      };
      const seo = { title: 'Kitchen Products | ' + SITE.name, description: kw.metaDescription, canonical: `${SITE.url}/products`, jsonLd: [] };
      return html(render.pageHub({ hub, deals: products, hubProducts: [], relatedHubs: [], kw, seo, affiliateLinks, updatedAt }));
    }

    if (pathname === '/watchlist') {
      const updatedAt = await db.getLastUpdated(env);
      const seo = {
        title: 'My Watchlist - Track Kitchen Product Prices | ' + SITE.name,
        description: 'Track kitchen products you are interested in and get notified about price drops.',
        canonical: `${SITE.url}/watchlist`,
        jsonLd: [],
      };
      return html(render.pageWatchlist({ seo, updatedAt }));
    }

    const dealMatch = pathname.match(/^\/deal\/([^/]+)$/);
    if (dealMatch) {
      const [deal, updatedAt] = await Promise.all([db.getDealBySlug(env, dealMatch[1]), db.getLastUpdated(env)]);
      if (!deal) return html(render.pageNotFound({ updatedAt }), 404);
      const relatedDeals = await db.getRelatedDeals(env, deal, 4);
      const jsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: deal.title,
          image: deal.image || '',
          description: deal.description || `${deal.title} - ${deal.discountPct ? `save ${deal.discountPct}%` : 'deal'} on Kitchen Deals`,
          brand: deal.brand ? { '@type': 'Brand', name: deal.brand } : undefined,
          offers: deal.price
            ? {
                '@type': 'Offer',
                priceCurrency: 'USD',
                price: deal.price,
                ...(deal.origPrice ? { highPrice: deal.origPrice } : {}),
                availability: 'https://schema.org/InStock',
                url: deal.url || `${SITE.url}/deal/${deal.slug}`,
                seller: deal.retailer ? { '@type': 'Organization', name: deal.retailer } : undefined,
                priceValidUntil: deal.validThrough || undefined,
              }
            : undefined,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Kitchen Deals', item: SITE.url },
            { '@type': 'ListItem', position: 2, name: deal.retailer || 'Deals', item: retailerHubSlug(deal.retailer) ? `${SITE.url}/${retailerHubSlug(deal.retailer)}` : `${SITE.url}/` },
            { '@type': 'ListItem', position: 3, name: deal.title, item: `${SITE.url}/deal/${deal.slug}` },
          ],
        },
      ];
      const seo = {
        title: `${deal.title} - ${deal.retailer || 'Deal'} | ${SITE.name}`,
        description: deal.description || `${deal.title} at ${deal.retailer || 'retailer'}${deal.price ? ` for $${deal.price}` : ''}${deal.discountPct ? ` (save ${deal.discountPct}%)` : ''}. Click to get the deal.`,
        canonical: `${SITE.url}/deal/${deal.slug}`,
        jsonLd,
      };
      return html(render.pageDeal({ deal, relatedDeals, seo, affiliateLinks, updatedAt }));
    }

    const productMatch = pathname.match(/^\/product\/([^/]+)$/);
    if (productMatch) {
      const [product, updatedAt] = await Promise.all([db.getProduct(env, productMatch[1]), db.getLastUpdated(env)]);
      if (!product) return html(render.pageNotFound({ updatedAt }), 404);
      const products = await db.getProducts(env);
      const relatedProducts = products
        .filter((p) => p.id !== product.id && (p.brand === product.brand || p.category === product.category))
        .slice(0, 4);
      const priceComparison = await db.getPriceComparison(env, productMatch[1]);

      const jsonLd = [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.title,
          image: product.image || '',
          description: `${product.title} - tracked price history on Kitchen Deals`,
          brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
          sku: product.asin || product.sku || product.id,
          offers: product.currentPrice
            ? {
                '@type': 'Offer',
                priceCurrency: 'USD',
                price: product.currentPrice,
                availability: 'https://schema.org/InStock',
                url: product.url || `${SITE.url}/product/${product.id}`,
                seller: product.retailer ? { '@type': 'Organization', name: product.retailer } : undefined,
              }
            : undefined,
          aggregateRating:
            product.priceHistory.length > 2
              ? {
                  '@type': 'AggregateRating',
                  ratingValue: Math.min(5, Math.max(1, 5 - ((product.currentPrice - product.lowestEver) / (product.highestEver - product.lowestEver || 1)) * 4)).toFixed(1),
                  reviewCount: product.priceHistory.length,
                }
              : undefined,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Kitchen Deals', item: SITE.url },
            { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE.url}/products` },
            { '@type': 'ListItem', position: 3, name: product.title, item: `${SITE.url}/product/${product.id}` },
          ],
        },
      ];

      const seo = {
        title: `${product.title} - Price History & Deals | ${SITE.name}`,
        description: `Track ${product.title} price history. Current price: $${product.currentPrice || 'N/A'}. Lowest: $${product.lowestEver || 'N/A'}. Compare prices across retailers.`,
        canonical: `${SITE.url}/product/${product.id}`,
        jsonLd,
      };
      return html(render.pageProduct({ product, relatedProducts, priceComparison, seo, affiliateLinks, updatedAt }));
    }

    const legal = LEGAL_SLUGS.find((s) => `/${s}` === pathname);
    if (legal) {
      const updatedAt = await db.getLastUpdated(env);
      const page = {
        name: legal === 'privacy-policy' ? 'Privacy Policy' : legal === 'terms-of-service' ? 'Terms of Service' : legal === 'contact' ? 'Contact Us' : 'Disclaimer',
      };
      const titles = {
        'privacy-policy': 'Privacy Policy',
        'terms-of-service': 'Terms of Service',
        contact: 'Contact Us',
        disclaimer: 'Disclaimer',
      };
      const seo = {
        title: `${titles[legal]} | ${SITE.name}`,
        description: page.name,
        canonical: `${SITE.url}/${legal}`,
        jsonLd: [],
      };
      return html(render.pageLegal({ hub: { name: page.name, slug: legal, entityType: 'Page' }, content: LEGAL_HTML[legal], seo, updatedAt }));
    }

    const hub = hubMap[pathname.slice(1)];
    if (hub) {
      const [deals, products, updatedAt] = await Promise.all([db.getDeals(env), db.getProducts(env), db.getLastUpdated(env)]);
      const hubDeals = filterDeals(deals, hub);
      const kw = getKeywordData(hub, CLUSTERS);
      const hubProds = hubProducts(products, hub);
      const related = relatedHubsFor(hub, hubDeals);
      const seo = seoMiddleware(hub, SITE, kw);
      return html(render.pageHub({ hub, deals: hubDeals, hubProducts: hubProds, relatedHubs: related, kw, seo, affiliateLinks, updatedAt }));
    }

    return html(render.pageNotFound({ updatedAt: await db.getLastUpdated(env) }), 404);
  },
};

async function handleApi(request, env, pathname, searchParams) {
  const token = request.headers.get('Authorization') || '';
  const expected = env.INGEST_TOKEN ? `Bearer ${env.INGEST_TOKEN}` : '';

  if (pathname === '/api/ingest' && request.method === 'POST') {
    if (!expected || token !== expected) return json({ error: 'unauthorized' }, 401);
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: 'invalid json' }, 400);
    }
    const result = await db.ingest(env, payload);
    return json({ ok: true, ...result });
  }

  if (pathname.startsWith('/api/product/') && request.method === 'GET') {
    const id = decodeURIComponent(pathname.slice('/api/product/'.length));
    const product = await db.getProduct(env, id);
    if (!product) return json({ error: 'Product not found' }, 404);
    return json(product);
  }

  if (pathname === '/api/stats' && request.method === 'GET') {
    return json(await db.stats(env));
  }

  return json({ error: 'not found' }, 404);
}
