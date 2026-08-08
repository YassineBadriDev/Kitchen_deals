const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

function loadProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveProducts(products) {
  const dir = path.dirname(PRODUCTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function normalizeProduct(raw) {
  const asin = raw.asin || null;
  const sku = raw.sku || null;
  const upc = raw.upc || null;
  const id = asin || sku || upc || slugify(raw.title);

  const now = new Date().toISOString();
  const priceEntry = {
    price: parseFloat(raw.price) || null,
    origPrice: parseFloat(raw.origPrice) || null,
    retailer: raw.retailer || '',
    url: raw.url || '',
    timestamp: now,
  };

  return {
    id,
    title: (raw.title || '').trim(),
    brand: (raw.brand || '').trim(),
    category: (raw.category || '').trim(),
    image: raw.image || '',
    asin,
    sku,
    upc,
    retailer: raw.retailer || '',
    url: raw.url || '',
    currentPrice: priceEntry.price,
    lowestEver: priceEntry.price,
    highestEver: priceEntry.price,
    avgPrice: priceEntry.price,
    priceHistory: [priceEntry],
    firstSeen: now,
    lastUpdated: now,
  };
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

function addOrUpdateProduct(raw) {
  const products = loadProducts();
  const normalized = normalizeProduct(raw);
  const existing = products.find(p => p.id === normalized.id);

  if (existing) {
    existing.lastUpdated = new Date().toISOString();
    existing.title = normalized.title || existing.title;
    existing.brand = normalized.brand || existing.brand;
    existing.image = normalized.image || existing.image;

    if (normalized.currentPrice && normalized.currentPrice > 0) {
      existing.priceHistory.push(normalized.priceHistory[0]);
      existing.currentPrice = normalized.currentPrice;

      if (existing.lowestEver === null || normalized.currentPrice < existing.lowestEver) {
        existing.lowestEver = normalized.currentPrice;
      }
      if (existing.highestEver === null || normalized.currentPrice > existing.highestEver) {
        existing.highestEver = normalized.currentPrice;
      }

      const prices = existing.priceHistory.filter(p => p.price > 0).map(p => p.price);
      existing.avgPrice = prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : null;
    }

    saveProducts(products);
    return existing;
  } else {
    products.push(normalized);
    saveProducts(products);
    return normalized;
  }
}

function getProduct(id) {
  const products = loadProducts();
  return products.find(p => p.id === id) || null;
}

function getProductsByRetailer(retailer) {
  const products = loadProducts();
  return products.filter(p => p.retailer.toLowerCase() === retailer.toLowerCase());
}

function getProductsByBrand(brand) {
  const products = loadProducts();
  return products.filter(p => p.brand.toLowerCase().includes(brand.toLowerCase()));
}

function getProductsByCategory(category) {
  const products = loadProducts();
  return products.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
}

function getTrendingProducts(limit = 20) {
  const products = loadProducts();
  return products
    .filter(p => p.currentPrice && p.lowestEver && p.currentPrice <= p.lowestEver * 1.1)
    .sort((a, b) => {
      const aDiscount = a.lowestEver ? ((a.lowestEver - a.currentPrice) / a.lowestEver) : 0;
      const bDiscount = b.lowestEver ? ((b.lowestEver - b.currentPrice) / b.lowestEver) : 0;
      return bDiscount - aDiscount;
    })
    .slice(0, limit);
}

function getPriceDrops(threshold = 20, limit = 20) {
  const products = loadProducts();
  return products
    .filter(p => {
      if (!p.currentPrice || !p.avgPrice || p.avgPrice === 0) return false;
      const dropPct = ((p.avgPrice - p.currentPrice) / p.avgPrice) * 100;
      return dropPct >= threshold;
    })
    .map(p => ({
      ...p,
      dropPct: Math.round(((p.avgPrice - p.currentPrice) / p.avgPrice) * 100),
    }))
    .sort((a, b) => b.dropPct - a.dropPct)
    .slice(0, limit);
}

function getPriceComparison(productId) {
  const product = getProduct(productId);
  if (!product) return null;

  const retailerPrices = {};
  for (const entry of product.priceHistory) {
    const retailer = entry.retailer || 'Unknown';
    if (!retailerPrices[retailer]) {
      retailerPrices[retailer] = { retailer, prices: [], latestPrice: null, latestUrl: null };
    }
    if (entry.price && entry.price > 0) {
      retailerPrices[retailer].prices.push(entry.price);
    }
    retailerPrices[retailer].latestUrl = entry.url || retailerPrices[retailer].latestUrl;
  }

  for (const key of Object.keys(retailerPrices)) {
    const rp = retailerPrices[key];
    const prices = rp.prices.filter(p => p > 0);
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

module.exports = {
  loadProducts,
  saveProducts,
  addOrUpdateProduct,
  getProduct,
  getProductsByRetailer,
  getProductsByBrand,
  getProductsByCategory,
  getTrendingProducts,
  getPriceDrops,
  getPriceComparison,
};
