const fs = require('fs');
const path = require('path');
const clusters = require('../src/data/clusters.json');

function generate() {
  const url = clusters.site.url;
  const hubs = [clusters.pillar, ...clusters.seasonal, ...clusters.brands, ...clusters.retailers, ...clusters.categories, ...clusters.combined];
  const pages = clusters.pages || [];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <url>\n    <loc>${url}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

  for (const hub of hubs) {
    const priority = hub.entityType === 'Pillar' ? '1.0' : hub.entityType === 'Seasonal' ? '0.9' : '0.8';
    xml += `  <url>\n    <loc>${url}/${hub.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  }

  for (const page of pages) {
    xml += `  <url>\n    <loc>${url}/${page.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;
  }

  xml += '</urlset>\n';

  const out = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(out, xml);
  console.log(`Sitemap generated: ${out}`);
  console.log(`  ${hubs.length + pages.length + 1} URLs total`);
}

generate();
