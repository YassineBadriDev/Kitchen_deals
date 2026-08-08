const path = require('path');
const { addOrUpdateProduct } = require('./src/scraping/products');
const seedProducts = require('./src/data/products/seed.json');

console.log(`Seeding ${seedProducts.length} products...\n`);

for (const product of seedProducts) {
  addOrUpdateProduct(product);
  console.log(`  ✓ ${product.title} (${product.asin})`);
}

console.log('\nDone!');
