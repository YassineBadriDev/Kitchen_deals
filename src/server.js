const SITE = require('./config');
const clusters = require('./data/clusters.json');

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));

const { addAffiliate } = require('./affiliate');
app.locals.addAffiliate = addAffiliate;

const { seoMiddleware } = require('./render/seo');
const { getKeywordData } = require('./render/keyword-injection');
const legalRoutes = require('./routes/legal');

function buildHubMap() {
  const hubs = {};
  function add(hub) {
    hubs[hub.slug] = hub;
  }
  add(clusters.pillar);
  clusters.seasonal.forEach(add);
  clusters.brands.forEach(add);
  clusters.retailers.forEach(add);
  clusters.categories.forEach(add);
  clusters.combined.forEach(add);
  return hubs;
}

const hubMap = buildHubMap();

function loadDeals() {
  try {
    const fs = require('fs');
    const dealsDir = path.join(__dirname, 'data', 'deals');
    if (!fs.existsSync(dealsDir)) return [];
    const files = fs.readdirSync(dealsDir).filter(f => f.endsWith('.json'));
    const all = [];
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(dealsDir, f), 'utf8'));
      if (Array.isArray(data)) all.push(...data);
    }
    return all;
  } catch { return []; }
}

function filterDeals(deals, hub) {
  if (!hub) return deals;
  const keyword = hub.targetKeyword.toLowerCase();
  const brand = (hub.parentBrand || hub.key || '').toLowerCase();
  const retailer = (hub.parentRetailer || '').toLowerCase();
  const category = (hub.parentCategory || '').toLowerCase();
  const seasonal = (hub.parentSeasonal || '').toLowerCase();

  return deals.filter(d => {
    const title = (d.title || '').toLowerCase();
    if (hub.entityType === 'Brand') return title.includes(brand);
    if (hub.entityType === 'Retailer') return (d.retailer || '').toLowerCase().includes(retailer);
    if (hub.entityType === 'Category') return (d.category || '').toLowerCase().includes(category);
    if (hub.entityType === 'Seasonal') return true;
    if (hub.entityType === 'Pillar') return true;
    if (hub.entityType === 'Combined') {
      if (brand && !title.includes(brand)) return false;
      if (category && !(d.category || '').toLowerCase().includes(category)) return false;
      return true;
    }
    return true;
  });
}

app.get('/', (req, res) => {
  const hub = clusters.pillar;
  const deals = loadDeals();
  const hubDeals = filterDeals(deals, hub);
  const kw = getKeywordData(hub, clusters);
  const relatedHubs = [
    ...clusters.seasonal.slice(0, 3),
    ...clusters.brands.slice(0, 6),
    ...clusters.categories.slice(0, 4),
  ];
  const priceDrops = getPriceDrops(15, 8);
  const trendingProducts = getTrendingProducts(8);
  res.render('home', {
    site: SITE,
    hub,
    deals: hubDeals,
    relatedHubs,
    kw,
    priceDrops,
    trendingProducts,
    seo: seoMiddleware(hub, SITE, kw),
  });
});

app.get('/sitemap.xml', (req, res) => {
  const allHubs = [clusters.pillar, ...clusters.seasonal, ...clusters.brands, ...clusters.retailers, ...clusters.categories, ...clusters.combined];
  const products = getAllProducts();
  res.set('Content-Type', 'application/xml');
  res.render('sitemap', { site: SITE, hubs: allHubs, products });
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.render('llms', { site: SITE, clusters });
});

const { loadProducts: getAllProducts, getProduct, getTrendingProducts, getPriceDrops, getPriceComparison } = require('./scraping/products');

app.get('/products', (req, res) => {
  const products = getAllProducts();
  res.render('hub', {
    site: SITE,
    hub: { title: 'Kitchen Products', description: 'Track kitchen products with price history', h1: 'Kitchen Products', type: 'products', intro: 'Browse kitchen products and track their price history over time.' },
    deals: products,
    relatedHubs: [],
    kw: { title: 'Kitchen Products', description: 'Track kitchen products with price history', h1: 'Kitchen Products', intro: 'Browse kitchen products and track their price history over time.', subHeaders: [] },
    seo: { jsonLd: [] },
  });
});

app.get('/product/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) return res.status(404).render('404', { site: SITE, seo: { title: 'Page Not Found', description: 'Page not found', canonical: SITE.url + '/404', jsonLd: [] } });
  const products = getAllProducts();
  const relatedProducts = products.filter(p => p.id !== product.id && (p.brand === product.brand || p.category === product.category)).slice(0, 4);
  const priceComparison = getPriceComparison(req.params.id);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.title,
      image: product.image || '',
      description: `${product.title} - tracked price history on Kitchen Deals`,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      sku: product.asin || product.sku || product.id,
      offers: product.currentPrice ? {
        '@type': 'Offer',
        priceCurrency: 'USD',
        price: product.currentPrice,
        availability: 'https://schema.org/InStock',
        url: product.url || SITE.url + '/product/' + product.id,
        seller: product.retailer ? { '@type': 'Organization', name: product.retailer } : undefined,
      } : undefined,
      aggregateRating: product.priceHistory.length > 2 ? {
        '@type': 'AggregateRating',
        ratingValue: Math.min(5, Math.max(1, 5 - ((product.currentPrice - product.lowestEver) / (product.highestEver - product.lowestEver || 1)) * 4)).toFixed(1),
        reviewCount: product.priceHistory.length,
      } : undefined,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kitchen Deals', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Products', item: SITE.url + '/products' },
        { '@type': 'ListItem', position: 3, name: product.title, item: SITE.url + '/product/' + product.id },
      ],
    },
  ];

  res.render('product', {
    site: SITE,
    product,
    relatedProducts,
    priceComparison,
    seo: {
      title: `${product.title} - Price History & Deals | Kitchen Deals`,
      description: `Track ${product.title} price history. Current price: $${product.currentPrice || 'N/A'}. Lowest: $${product.lowestEver || 'N/A'}. Compare prices across retailers.`,
      canonical: SITE.url + '/product/' + product.id,
      jsonLd,
    },
  });
});

app.get('/watchlist', (req, res) => {
  res.render('watchlist', {
    site: SITE,
    seo: { title: 'My Watchlist - Track Kitchen Product Prices | Kitchen Deals', description: 'Track kitchen products you are interested in and get notified about price drops.', canonical: SITE.url + '/watchlist', jsonLd: [] },
  });
});

app.get('/api/product/:id', (req, res) => {
  const product = getProduct(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.get('/:slug', (req, res, next) => {
  const hub = hubMap[req.params.slug];
  if (!hub) return next();
  const deals = loadDeals();
  const hubDeals = filterDeals(deals, hub);
  const kw = getKeywordData(hub, clusters);

  const allProducts = getAllProducts();
  const candidateStems = (word) => {
    const w = (word || '').toLowerCase().trim();
    const norm = w.replace(/[^a-z0-9]+/g, '');
    const out = new Set([w, norm]);
    if (w.includes('knives')) out.add(w.replace('knives', 'knife'));
    if (w.includes('knife')) out.add(w.replace('knife', 'knives'));
    if (w.endsWith('ies') && w.length > 3) out.add(w.slice(0, -3) + 'y');
    if (w.endsWith('ves') && w.length > 3) {
      out.add(w.slice(0, -3) + 'f');
      out.add(w.slice(0, -3) + 'fe');
      out.add(w.slice(0, -2));
    }
    if (w.endsWith('es') && !w.endsWith('ves') && w.length > 2) out.add(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 1) out.add(w.slice(0, -1));
    return out;
  };
  const matchesCategory = (cat, pCat) => {
    const cStems = candidateStems(cat);
    const pStems = candidateStems(pCat);
    for (const c of cStems) {
      for (const p of pStems) {
        if (p === c || p.includes(c) || c.includes(p)) return true;
      }
    }
    return false;
  };
  const hubProducts = allProducts.filter(p => {
    if (hub.entityType === 'Brand' && hub.name) {
      return p.brand && p.brand.toLowerCase() === hub.name.toLowerCase();
    }
    if (hub.entityType === 'Retailer' && hub.name) {
      return p.retailer && p.retailer.toLowerCase() === hub.name.toLowerCase();
    }
    if (hub.entityType === 'Category' && hub.name) {
      return p.category && matchesCategory(hub.key || hub.name, p.category);
    }
    if (hub.entityType === 'Combined') {
      if (hub.parentBrand) {
        const brandName = (clusters.brands.find(b => b.key === hub.parentBrand) || {}).name || '';
        if (brandName && !(p.brand || '').toLowerCase().includes(brandName.toLowerCase())) return false;
      }
      if (hub.parentRetailer) {
        const retailerName = (clusters.retailers.find(r => r.key === hub.parentRetailer) || {}).name || '';
        if (retailerName && !(p.retailer || '').toLowerCase().includes(retailerName.toLowerCase())) return false;
      }
      if (hub.parentCategory) {
        const catName = (clusters.categories.find(c => c.key === hub.parentCategory) || {}).name || hub.parentCategory;
        if (!p.category || !matchesCategory(catName, p.category)) return false;
      }
      return true;
    }
    if (hub.entityType === 'Seasonal' || hub.entityType === 'Pillar') {
      return true;
    }
    return false;
  }).slice(0, 8);

  const relatedHubs = [];
  if (hub.entityType === 'Brand') {
    relatedHubs.push(...clusters.retailers.slice(0, 5));
    relatedHubs.push(...clusters.categories.filter(c => {
      return hubDeals.some(d => (d.category || '').toLowerCase().includes(c.key));
    }).slice(0, 4));
    const brandCombined = clusters.combined.filter(c => c.parentBrand === hub.key);
    relatedHubs.push(...brandCombined);
  } else if (hub.entityType === 'Retailer') {
    relatedHubs.push(...clusters.brands.slice(0, 6));
    relatedHubs.push(...clusters.categories.slice(0, 4));
  } else if (hub.entityType === 'Category') {
    relatedHubs.push(...clusters.brands.slice(0, 6));
    relatedHubs.push(...clusters.retailers.slice(0, 4));
  } else if (hub.entityType === 'Seasonal') {
    relatedHubs.push(...clusters.brands.slice(0, 5));
    relatedHubs.push(...clusters.retailers.slice(0, 5));
  } else if (hub.entityType === 'Combined') {
    if (hub.parentBrand) relatedHubs.push(...clusters.brands.filter(b => b.key === hub.parentBrand));
    if (hub.parentRetailer) relatedHubs.push(...clusters.retailers.filter(r => r.key === hub.parentRetailer));
    if (hub.parentCategory) relatedHubs.push(...clusters.categories.filter(c => c.key === hub.parentCategory));
    if (hub.parentSeasonal) relatedHubs.push(...clusters.seasonal.filter(s => s.key === hub.parentSeasonal));
  }

  res.render('hub', {
    site: SITE,
    hub,
    deals: hubDeals,
    hubProducts,
    relatedHubs: relatedHubs.filter(Boolean).slice(0, 12),
    kw,
    seo: seoMiddleware(hub, SITE, kw),
  });
});

app.use(legalRoutes);

app.use((req, res) => {
  res.status(404).render('legal', {
    site: SITE,
    hub: { name: 'Page Not Found', slug: '404', entityType: 'Page', description: 'The page you are looking for does not exist.' },
    content: '<h1>404 — Page Not Found</h1><p>The page you are looking for does not exist or has been moved.</p><p><a href="/">Back to Kitchen Deals</a></p>',
    deals: [],
    relatedHubs: [],
    kw: getKeywordData({ targetKeyword: 'page not found', entityType: 'Page' }, clusters),
    seo: seoMiddleware({ name: 'Page Not Found', targetKeyword: 'page not found', entityType: 'Page', slug: '404' }, SITE, getKeywordData({ targetKeyword: 'page not found', entityType: 'Page' }, clusters)),
  });
});

app.listen(PORT, () => {
  console.log(`Kitchen Deals running at http://localhost:${PORT}`);
  if (process.env.SCRAPE_SCHEDULE !== 'false') {
    const { startScheduler } = require('./scraping/scheduler');
    startScheduler();
  }
});
