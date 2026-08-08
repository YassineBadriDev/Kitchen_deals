import { SITE, CLUSTERS, YEAR, LEGAL_PAGES } from './lib/constants.js';
import { escapeHtml, fullUrl } from './lib/helpers.js';
import { affiliateHref } from './lib/affiliate.js';

function jsonLdScripts(jsonLd) {
  if (!jsonLd || !jsonLd.length) return '';
  return jsonLd
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`)
    .join('\n  ');
}

function head({ title, description, canonical, image, jsonLd = [], site = SITE }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description || '')}">
  <link rel="canonical" href="${escapeHtml(canonical || '')}">
  <link rel="icon" type="image/svg+xml" href="/logo.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <meta name="theme-color" content="#3c5b0a">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description || '')}">
  <meta property="og:url" content="${escapeHtml(canonical || '')}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(site.name)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description || '')}">
  ${jsonLdScripts(jsonLd)}
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-S7BVCX3513"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-S7BVCX3513');
  </script>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  ${header()}
  <main>`;
}

function header() {
  return `<header class="site-header">
  <div class="site-header__inner">
    <a href="/" class="site-header__logo" aria-label="Kitchen Deals Home">
      <img src="/logo.svg" alt="Kitchen Deals" width="150" height="30">
    </a>
    <nav class="site-header__nav" aria-label="Main navigation">
      <button class="site-header__hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <ul class="site-header__links">
        <li><a href="/black-friday-kitchen-appliance-deals">Black Friday</a></li>
        <li><a href="/prime-day-kitchen-deals">Prime Day</a></li>
        <li><a href="/cyber-monday-kitchen-deals">Cyber Monday</a></li>
        <li><a href="/kitchen-appliance-package-deals">Packages</a></li>
        <li><a href="/kitchen-knife-deals">Knives</a></li>
        <li><a href="/kitchenaid-deals">KitchenAid</a></li>
        <li><a href="/amazon-kitchen-deals">Amazon</a></li>
        <li><a href="/products">Products</a></li>
        <li><a href="/watchlist">Watchlist</a></li>
      </ul>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `  </main>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <img src="/logo-white.svg" alt="Kitchen Deals" width="120" height="24">
        <p>Find the best kitchen appliance deals from top retailers. Updated daily.</p>
      </div>
      <div class="site-footer__columns">
        <div class="site-footer__col">
          <h3>Deals</h3>
          <ul>
            <li><a href="/black-friday-kitchen-appliance-deals">Black Friday Kitchen Deals</a></li>
            <li><a href="/cyber-monday-kitchen-deals">Cyber Monday Kitchen Deals</a></li>
            <li><a href="/prime-day-kitchen-deals">Prime Day Kitchen Deals</a></li>
            <li><a href="/memorial-day-kitchen-deals">Memorial Day Kitchen Deals</a></li>
            <li><a href="/labor-day-kitchen-deals">Labor Day Kitchen Deals</a></li>
          </ul>
        </div>
        <div class="site-footer__col">
          <h3>Brands</h3>
          <ul>
            <li><a href="/kitchenaid-deals">KitchenAid Deals</a></li>
            <li><a href="/bosch-kitchen-deals">Bosch Deals</a></li>
            <li><a href="/whirlpool-kitchen-deals">Whirlpool Deals</a></li>
            <li><a href="/samsung-kitchen-deals">Samsung Deals</a></li>
            <li><a href="/lg-kitchen-deals">LG Deals</a></li>
          </ul>
        </div>
        <div class="site-footer__col">
          <h3>Retailers</h3>
          <ul>
            <li><a href="/amazon-kitchen-deals">Amazon Kitchen Deals</a></li>
            <li><a href="/walmart-kitchen-deals">Walmart Kitchen Deals</a></li>
            <li><a href="/best-buy-kitchen-deals">Best Buy Kitchen Deals</a></li>
            <li><a href="/home-depot-kitchen-appliance-deals">Home Depot Kitchen Deals</a></li>
            <li><a href="/lowes-kitchen-deals">Lowe's Kitchen Deals</a></li>
          </ul>
        </div>
        <div class="site-footer__col">
          <h3>Categories</h3>
          <ul>
            <li><a href="/kitchen-appliance-package-deals">Appliance Packages</a></li>
            <li><a href="/kitchen-knife-deals">Knife Deals</a></li>
            <li><a href="/kitchen-cookware-deals">Cookware Deals</a></li>
            <li><a href="/kitchen-oven-deals">Oven Deals</a></li>
            <li><a href="/kitchen-blender-deals">Blender Deals</a></li>
          </ul>
        </div>
      </div>
      <div class="site-footer__bottom">
        <p>&copy; ${YEAR()} Kitchen Deals. All rights reserved.</p>
        <ul class="site-footer__legal">
          <li><a href="/privacy-policy">Privacy Policy</a></li>
          <li><a href="/terms-of-service">Terms of Service</a></li>
          <li><a href="/disclaimer">Disclaimer</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

export function layout({ title, description, canonical, image, jsonLd = [], body = '', site = SITE }) {
  return `${head({ title, description, canonical, image, jsonLd, site })}
  ${body}
  ${footer()}`;
}

function placeholderFor(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('microwave') || cat.includes('blender') || cat.includes('mixer') || cat.includes('coffee') || cat.includes('vacuum') || cat.includes('countertop')) {
    return '/placeholder-small-appliance.svg';
  }
  if (cat.includes('refrigerator') || cat.includes('range') || cat.includes('dishwasher') || cat.includes('oven') || cat.includes('major') || cat.includes('package')) {
    return '/placeholder-appliance.svg';
  }
  if (cat.includes('knife') || cat.includes('knives') || cat.includes('kitchenware')) {
    return '/placeholder-knife.svg';
  }
  if (cat.includes('cookware') || cat.includes('pot') || cat.includes('pan')) {
    return '/placeholder-cookware.svg';
  }
  return '/placeholder.svg';
}

function dealCard(deal, affiliateLinks) {
  if (!deal) return '';
  const placeholder = placeholderFor(deal.category);
  const href = affiliateHref(affiliateLinks, deal.url, deal.retailer);
  return `<article class="deal-card">
  <img class="deal-card__image" src="${escapeHtml(deal.image || placeholder)}" alt="${escapeHtml(deal.title)}" width="300" height="200" loading="lazy">
  <div class="deal-card__body">
    <h3 class="deal-card__title">
      <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(deal.title)}</a>
    </h3>
    ${deal.retailer ? `<span class="deal-card__retailer">${escapeHtml(deal.retailer)}</span>` : ''}
    <div class="deal-card__pricing">
      ${deal.price ? `<span class="deal-card__price">$${deal.price}</span>` : ''}
      ${deal.origPrice ? `<span class="deal-card__orig-price"><del>$${deal.origPrice}</del></span>` : ''}
      ${deal.discountPct ? `<span class="deal-card__discount">-${deal.discountPct}%</span>` : ''}
    </div>
    ${deal.validThrough ? `<time class="deal-card__valid" datetime="${escapeHtml(deal.validThrough)}">Valid through ${escapeHtml(deal.validThrough)}</time>` : ''}
  </div>
</article>`;
}

function dealGrid(deals, affiliateLinks) {
  return `<div class="deal-grid">
  ${deals.map((d) => dealCard(d, affiliateLinks)).join('\n  ')}
</div>`;
}

function productCard(p) {
  return `<article class="deal-card product-card">
  <a href="/product/${escapeHtml(p.id)}" class="deal-card__link">
    <img class="deal-card__image" src="${escapeHtml(p.image || '/placeholder.svg')}" alt="${escapeHtml(p.title)}" width="300" height="200" loading="lazy">
  </a>
  <div class="deal-card__body">
    <h3 class="deal-card__title">
      <a href="/product/${escapeHtml(p.id)}">${escapeHtml(p.title)}</a>
    </h3>
    ${p.brand ? `<span class="deal-card__retailer">${escapeHtml(p.brand)}</span>` : ''}
    <div class="deal-card__pricing">
      ${p.currentPrice ? `<span class="deal-card__price">$${p.currentPrice}</span>` : ''}
      ${p.lowestEver && p.currentPrice !== p.lowestEver ? `<span class="deal-card__orig-price"><del>$${p.lowestEver}</del></span>` : ''}
      ${p.dropPct ? `<span class="deal-card__discount">-${p.dropPct}%</span>` : ''}
    </div>
    ${p.avgPrice && p.currentPrice < p.avgPrice ? `<span class="deal-card__valid">${escapeHtml(String(p.priceHistory ? p.priceHistory.length : 0))} updates tracked</span>` : ''}
  </div>
</article>`;
}

function productGrid(products) {
  return `<div class="deal-grid">
  ${products.map(productCard).join('\n  ')}
</div>`;
}

function hero(h1, intro) {
  return `<section class="hero">
  <div class="hero__inner">
    <h1>${escapeHtml(h1)}</h1>
    <p class="hero__intro">${escapeHtml(intro || '')}</p>
  </div>
</section>`;
}

function clusterGroup(title, links) {
  return `<div class="cluster-group">
  <h2>${escapeHtml(title)}</h2>
  <div class="cluster-grid">
    ${links.map((l) => `<a href="${escapeHtml(l.href)}" class="cluster-card">${l.icon ? `<span class="cluster-card__icon">${l.icon}</span>` : ''}<span>${escapeHtml(l.label)}</span></a>`).join('\n    ')}
  </div>
</div>`;
}

export function pageHome({ hub, deals, relatedHubs, kw, priceDrops, trendingProducts, seo, affiliateLinks, site = SITE }) {
  const body = `
  ${hero(kw.h1, kw.intro)}

  ${priceDrops && priceDrops.length > 0 ? `
  <section class="hub-section price-drops-section">
    <div class="hub-section__inner">
      <div class="hub-section__header">
        <h2>&#128176; Biggest Price Drops</h2>
        <p class="section-subtitle">Products with the biggest discounts from their average price</p>
      </div>
      ${productGrid(priceDrops)}
    </div>
  </section>` : ''}

  <section class="hub-section">
    <div class="hub-section__inner">
      <div class="hub-section__header">
        <h2>Today's Best Kitchen Deals</h2>
      </div>
      ${deals.length > 0
        ? dealGrid(deals.slice(0, 24), affiliateLinks)
        : `<div class="empty-state">
        <p>Checking for the latest kitchen deals...</p>
        <p>New deals are added daily from top retailers.</p>
      </div>`}
    </div>
  </section>

  ${trendingProducts && trendingProducts.length > 0 ? `
  <section class="hub-section trending-section">
    <div class="hub-section__inner">
      <div class="hub-section__header">
        <h2>&#128200; Trending Products</h2>
        <p class="section-subtitle">Products currently near their lowest price</p>
      </div>
      ${productGrid(trendingProducts)}
      <div class="section-cta">
        <a href="/products" class="btn-primary">View All Products &rarr;</a>
      </div>
    </div>
  </section>` : ''}

  <section class="clusters-section">
    <div class="clusters-section__inner">
      ${(kw.sections && kw.sections.length) ? kw.sections.map((s) => `
        <div class="info-section">
          <h2>${escapeHtml(s.heading)}</h2>
          <p>${escapeHtml(s.text)}</p>
          ${s.links && s.links.length ? `
            <ul class="info-section__links">
              ${s.links.map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`).join('\n              ')}
            </ul>` : ''}
        </div>`).join('\n      ') : kw.subHeaders.map((h2) => `<h2>${escapeHtml(h2)}</h2>`).join('\n      ')}

      ${clusterGroup('Seasonal Kitchen Deals', [
        { href: '/black-friday-kitchen-appliance-deals', icon: '&#127876;', label: 'Black Friday' },
        { href: '/cyber-monday-kitchen-deals', icon: '&#128187;', label: 'Cyber Monday' },
        { href: '/prime-day-kitchen-deals', icon: '&#128230;', label: 'Prime Day' },
        { href: '/memorial-day-kitchen-deals', icon: '&#127482;&#127480;', label: 'Memorial Day' },
        { href: '/labor-day-kitchen-deals', icon: '&#128736;', label: 'Labor Day' },
      ])}

      ${clusterGroup('Top Brand Deals', relatedHubs.filter((h) => h.entityType === 'Brand').slice(0, 8).map((h) => ({ href: `/${h.slug}`, label: h.name })))}

      ${clusterGroup('Shop by Category', [
        { href: '/kitchen-appliance-package-deals', label: 'Appliance Packages' },
        { href: '/kitchen-knife-deals', label: 'Knives' },
        { href: '/kitchen-cookware-deals', label: 'Cookware' },
        { href: '/kitchen-oven-deals', label: 'Ovens &amp; Ranges' },
        { href: '/kitchen-blender-deals', label: 'Blenders' },
        { href: '/kitchen-mixer-deals', label: 'Mixers' },
        { href: '/kitchen-microwave-deals', label: 'Microwaves' },
        { href: '/kitchen-grill-deals', label: 'Grills' },
      ])}

      ${clusterGroup('Shop by Retailer', [
        { href: '/amazon-kitchen-deals', label: 'Amazon' },
        { href: '/walmart-kitchen-deals', label: 'Walmart' },
        { href: '/best-buy-kitchen-deals', label: 'Best Buy' },
        { href: '/target-kitchen-deals', label: 'Target' },
        { href: '/home-depot-kitchen-appliance-deals', label: 'Home Depot' },
        { href: '/lowes-kitchen-deals', label: "Lowe's" },
        { href: '/costco-kitchen-deals', label: 'Costco' },
        { href: '/ikea-kitchen-deals', label: 'IKEA' },
      ])}
    </div>
  </section>`;

  return layout({ title: seo.title, description: seo.description, canonical: seo.canonical, jsonLd: seo.jsonLd, body, site });
}

export function pageHub({ hub, deals, hubProducts, relatedHubs, kw, seo, affiliateLinks, site = SITE }) {
  const body = `
  ${hero(kw.h1, kw.intro)}

  ${hubProducts && hubProducts.length > 0 ? `
  <section class="hub-section">
    <div class="hub-section__inner">
      <div class="hub-section__header">
        <h2>Tracked Products</h2>
        <p class="section-subtitle">Products we're tracking with price history</p>
      </div>
      ${productGrid(hubProducts)}
    </div>
  </section>` : ''}

  <section class="hub-section">
    <div class="hub-section__inner">
      <div class="hub-section__header">
        <h2>${escapeHtml(kw.h1)} — Latest Deals</h2>
      </div>
      ${deals.length > 0
        ? dealGrid(deals.slice(0, 24), affiliateLinks)
        : `<div class="empty-state">
        <p>Checking for the latest deals on ${escapeHtml(hub.targetKeyword)}...</p>
        <p>New deals are added daily from top retailers.</p>
      </div>`}
    </div>
  </section>

  ${(kw.subHeaders.length > 0 || (kw.sections && kw.sections.length)) ? `
  <section class="hub-subheadings">
    <div class="hub-subheadings__inner">
      ${(kw.sections && kw.sections.length) ? kw.sections.map((s) => `
        <div class="info-section">
          <h2>${escapeHtml(s.heading)}</h2>
          <p>${escapeHtml(s.text)}</p>
          ${s.links && s.links.length ? `
            <ul class="info-section__links">
              ${s.links.map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a></li>`).join('\n              ')}
            </ul>` : ''}
        </div>`).join('\n      ') : kw.subHeaders.map((h2) => `<h2>${escapeHtml(h2)}</h2>`).join('\n      ')}
    </div>
  </section>` : ''}

  ${relatedHubs.length > 0 ? `
  <section class="related-section">
    <div class="related-section__inner">
      <h2>Related Deals</h2>
      <div class="cluster-grid">
        ${relatedHubs.map((rh) => `<a href="/${escapeHtml(rh.slug)}" class="cluster-card"><span>${escapeHtml(rh.name)}</span></a>`).join('\n        ')}
      </div>
    </div>
  </section>` : ''}`;

  return layout({ title: seo.title, description: seo.description, canonical: seo.canonical, jsonLd: seo.jsonLd, body, site });
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function pageProduct({ product, relatedProducts, priceComparison, seo, affiliateLinks, site = SITE }) {
  const body = `
  <section class="hero hero--product">
    <div class="hero__inner">
      <h1>${escapeHtml(product.title)}</h1>
      <div class="product-meta">
        ${product.brand ? `<span class="product-meta__brand">${escapeHtml(product.brand)}</span>` : ''}
        ${product.retailer ? `<span class="product-meta__retailer">at ${escapeHtml(product.retailer)}</span>` : ''}
      </div>
    </div>
  </section>

  <section class="product-detail">
    <div class="product-detail__inner">
      <div class="product-detail__main">
        <img class="product-detail__image" src="${escapeHtml(product.image || '/placeholder.svg')}" alt="${escapeHtml(product.title)}" width="400" height="400">

        <div class="product-detail__pricing">
          ${product.currentPrice ? `<span class="product-detail__price">$${product.currentPrice}</span>` : ''}
          ${product.lowestEver && product.lowestEver !== product.currentPrice ? `<span class="product-detail__lowest">Lowest ever: $${product.lowestEver}</span>` : ''}
          ${product.highestEver ? `<span class="product-detail__highest">Highest: $${product.highestEver}</span>` : ''}
          ${product.avgPrice ? `<span class="product-detail__avg">Average: $${product.avgPrice}</span>` : ''}
        </div>

        ${product.url ? `
        <a href="${escapeHtml(affiliateHref(affiliateLinks, product.url, product.retailer))}" target="_blank" rel="noopener noreferrer" class="product-detail__cta">
          View at ${escapeHtml(product.retailer || 'Retailer')}
        </a>` : ''}

        <button class="product-detail__watchlist" id="watchlistBtn" data-product-id="${escapeHtml(product.id)}">
          <span class="watchlist-icon">&#9734;</span> Add to Watchlist
        </button>
      </div>

      <div class="product-detail__history">
        <h2>Price History</h2>
        <div class="price-chart" id="priceChart"
             data-prices='${escapeHtml(JSON.stringify(product.priceHistory.filter((p) => p.price > 0).map((p) => ({ price: p.price, date: p.timestamp, retailer: p.retailer }))))}'>
        </div>
        <div class="price-stats">
          <div class="price-stat">
            <span class="price-stat__label">Current</span>
            <span class="price-stat__value">${product.currentPrice ? `$${product.currentPrice}` : 'N/A'}</span>
          </div>
          <div class="price-stat">
            <span class="price-stat__label">Lowest</span>
            <span class="price-stat__value">${product.lowestEver ? `$${product.lowestEver}` : 'N/A'}</span>
          </div>
          <div class="price-stat">
            <span class="price-stat__label">Average</span>
            <span class="price-stat__value">${product.avgPrice ? `$${product.avgPrice}` : 'N/A'}</span>
          </div>
          <div class="price-stat">
            <span class="price-stat__label">Highest</span>
            <span class="price-stat__value">${product.highestEver ? `$${product.highestEver}` : 'N/A'}</span>
          </div>
        </div>
        ${product.priceHistory.length > 1 ? `<p class="price-history-note">Tracked ${product.priceHistory.length} price points since ${escapeHtml(formatDateLabel(product.firstSeen))}</p>` : ''}
      </div>
    </div>
  </section>

  ${relatedProducts && relatedProducts.length > 0 ? `
  <section class="related-section">
    <div class="related-section__inner">
      <h2>Similar Products</h2>
      <div class="deal-grid">
        ${relatedProducts.map((p) => `
        <article class="deal-card">
          <a href="/product/${escapeHtml(p.id)}" class="deal-card__link">
            <img class="deal-card__image" src="${escapeHtml(p.image || '/placeholder.svg')}" alt="${escapeHtml(p.title)}" width="300" height="200" loading="lazy">
          </a>
          <div class="deal-card__body">
            <h3 class="deal-card__title">
              <a href="/product/${escapeHtml(p.id)}">${escapeHtml(p.title)}</a>
            </h3>
            ${p.retailer ? `<span class="deal-card__retailer">${escapeHtml(p.retailer)}</span>` : ''}
            <div class="deal-card__pricing">
              ${p.currentPrice ? `<span class="deal-card__price">$${p.currentPrice}</span>` : ''}
              ${p.lowestEver && p.lowestEver < p.currentPrice ? `<span class="deal-card__orig-price"><del>$${p.lowestEver}</del></span>` : ''}
            </div>
          </div>
        </article>`).join('\n        ')}
      </div>
    </div>
  </section>` : ''}

  ${priceComparison && priceComparison.retailers && priceComparison.retailers.length > 1 ? `
  <section class="product-detail">
    <div class="product-detail__inner">
      <div class="product-detail__history">
        <h2>Price Comparison by Retailer</h2>
        <div class="price-comparison-table">
          <table>
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Current Price</th>
                <th>Lowest</th>
                <th>Highest</th>
                <th>Average</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${priceComparison.retailers.map((r) => `
              <tr>
                <td><strong>${escapeHtml(r.retailer)}</strong></td>
                <td>${r.latestPrice ? `$${r.latestPrice}` : 'N/A'}</td>
                <td>${r.lowestPrice ? `$${r.lowestPrice}` : 'N/A'}</td>
                <td>${r.highestPrice ? `$${r.highestPrice}` : 'N/A'}</td>
                <td>${r.avgPrice ? `$${r.avgPrice}` : 'N/A'}</td>
                <td>
                  ${r.latestUrl ? `<a href="${escapeHtml(affiliateHref(affiliateLinks, r.latestUrl, r.retailer))}" target="_blank" rel="noopener noreferrer" class="btn-small">View Deal</a>` : ''}
                </td>
              </tr>`).join('\n              ')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>` : ''}

  <script>
  const chartEl = document.getElementById('priceChart');
  if (chartEl) {
    const data = JSON.parse(chartEl.dataset.prices || '[]');
    if (data.length > 0) {
      const prices = data.map(d => d.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const range = max - min || 1;
      const width = chartEl.offsetWidth || 600;
      const height = 200;
      const padding = 40;

      let svg = \`<svg viewBox="0 0 \${width} \${height}" xmlns="http://www.w3.org/2000/svg">\`;
      svg += \`<rect width="\${width}" height="\${height}" fill="#f8f9fa" rx="8"/>\`;

      for (let i = 0; i <= 4; i++) {
        const y = padding + ((height - 2 * padding) * i / 4);
        const val = max - (range * i / 4);
        svg += \`<line x1="\${padding}" y1="\${y}" x2="\${width - padding}" y2="\${y}" stroke="#e9ecef" stroke-width="1"/>\`;
        svg += \`<text x="\${padding - 5}" y="\${y + 4}" text-anchor="end" font-size="10" fill="#999">$\${val.toFixed(0)}</text>\`;
      }

      const points = data.map((d, i) => {
        const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
        const y = padding + ((max - d.price) / range) * (height - 2 * padding);
        return \`\${x},\${y}\`;
      });

      svg += \`<polyline points="\${points.join(' ')}" fill="none" stroke="#3c5b0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>\`;

      if (data.length > 0) {
        const last = data[data.length - 1];
        const x = width - padding;
        const y = padding + ((max - last.price) / range) * (height - 2 * padding);
        svg += \`<circle cx="\${x}" cy="\${y}" r="4" fill="#3c5b0a"/>\`;
        svg += \`<text x="\${x}" y="\${y - 10}" text-anchor="middle" font-size="11" font-weight="bold" fill="#3c5b0a">$\${last.price}</text>\`;
      }

      svg += '</svg>';
      chartEl.innerHTML = svg;
    }
  }

  const watchlistBtn = document.getElementById('watchlistBtn');
  if (watchlistBtn) {
    const productId = watchlistBtn.dataset.productId;
    let watchlist = JSON.parse(localStorage.getItem('kitchendeals_watchlist') || '[]');

    function updateButton() {
      if (watchlist.includes(productId)) {
        watchlistBtn.innerHTML = '<span class="watchlist-icon">&#9733;</span> In Watchlist';
        watchlistBtn.classList.add('active');
      } else {
        watchlistBtn.innerHTML = '<span class="watchlist-icon">&#9734;</span> Add to Watchlist';
        watchlistBtn.classList.remove('active');
      }
    }

    updateButton();

    watchlistBtn.addEventListener('click', function() {
      if (watchlist.includes(productId)) {
        watchlist = watchlist.filter(id => id !== productId);
      } else {
        watchlist.push(productId);
      }
      localStorage.setItem('kitchendeals_watchlist', JSON.stringify(watchlist));
      updateButton();
    });
  }
  </script>`;

  return layout({ title: seo.title, description: seo.description, canonical: seo.canonical, jsonLd: seo.jsonLd, body, site });
}

export function pageWatchlist({ seo, site = SITE }) {
  const body = `
  ${hero('My Watchlist', "Products you're tracking for price drops")}

  <section class="hub-section">
    <div class="hub-section__inner">
      <div id="watchlistContent">
        <div class="empty-state">
          <p>Loading your watchlist...</p>
        </div>
      </div>
    </div>
  </section>

  <script>
  const watchlistContent = document.getElementById('watchlistContent');
  const watchlist = JSON.parse(localStorage.getItem('kitchendeals_watchlist') || '[]');

  if (watchlist.length === 0) {
    watchlistContent.innerHTML = \`
      <div class="empty-state">
        <p>Your watchlist is empty</p>
        <p>Browse products and click "Add to Watchlist" to track price changes.</p>
        <a href="/products" class="btn-primary" style="margin-top:1rem;display:inline-block">Browse Products</a>
      </div>
    \`;
  } else {
    watchlistContent.innerHTML = \`
      <div class="hub-section__header">
        <h2>Tracking \${watchlist.length} product\${watchlist.length > 1 ? 's' : ''}</h2>
      </div>
      <div class="deal-grid" id="watchlistGrid">
        \${watchlist.map(id => \`
          <article class="deal-card product-card" id="product-\${id}">
            <div class="deal-card__body" style="text-align:center;padding:2rem">
              <p>Loading product \${id}...</p>
            </div>
          </article>
        \`).join('')}
      </div>
    \`;

    watchlist.forEach(async (id) => {
      try {
        const resp = await fetch('/api/product/' + id);
        if (resp.ok) {
          const product = await resp.json();
          const el = document.getElementById('product-' + id);
          if (el) {
            el.innerHTML = \`
              <a href="/product/\${product.id}" class="deal-card__link">
                <img class="deal-card__image" src="\${product.image || '/placeholder.svg'}" alt="\${product.title}" width="300" height="200" loading="lazy">
              </a>
              <div class="deal-card__body">
                <h3 class="deal-card__title">
                  <a href="/product/\${product.id}">\${product.title}</a>
                </h3>
                \${product.brand ? '<span class="deal-card__retailer">' + product.brand + '</span>' : ''}
                <div class="deal-card__pricing">
                  \${product.currentPrice ? '<span class="deal-card__price">$' + product.currentPrice + '</span>' : ''}
                  \${product.lowestEver && product.currentPrice !== product.lowestEver ? '<span class="deal-card__orig-price">Low: $' + product.lowestEver + '</span>' : ''}
                </div>
                <button class="btn-remove-watchlist" data-id="\${product.id}" style="margin-top:.5rem;background:none;border:1px solid #ccc;padding:.25rem .5rem;border-radius:4px;cursor:pointer;font-size:.75rem">Remove</button>
              </div>
            \`;
          }
        }
      } catch (e) {
        console.error('Error loading product:', id, e);
      }
    });

    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('btn-remove-watchlist')) {
        const id = e.target.dataset.id;
        let wl = JSON.parse(localStorage.getItem('kitchendeals_watchlist') || '[]');
        wl = wl.filter(pid => pid !== id);
        localStorage.setItem('kitchendeals_watchlist', JSON.stringify(wl));
        const card = document.getElementById('product-' + id);
        if (card) card.remove();
        if (wl.length === 0) {
          location.reload();
        }
      }
    });
  }
  </script>`;

  return layout({ title: seo.title, description: seo.description, canonical: seo.canonical, jsonLd: seo.jsonLd, body, site });
}

export function pageLegal({ hub, content, seo, site = SITE }) {
  const body = `
  <section class="legal-page">
    <div class="legal-page__inner">
      <h1>${escapeHtml(hub.name)}</h1>
      <div class="legal-page__content">
        ${content}
      </div>
    </div>
  </section>`;
  return layout({ title: seo.title, description: seo.description, canonical: seo.canonical, jsonLd: seo.jsonLd, body, site });
}

export function pageNotFound({ site = SITE } = {}) {
  return layout({
    title: 'Page Not Found | ' + site.name,
    description: 'The page you are looking for does not exist.',
    canonical: site.url,
    jsonLd: [],
    body: `
  <section class="legal-page">
    <div class="legal-page__inner">
      <h1>404 — Page Not Found</h1>
      <div class="legal-page__content">
        <p>The page you are looking for does not exist or has been moved.</p>
        <p><a href="/">Back to Kitchen Deals</a></p>
      </div>
    </div>
  </section>`,
    site,
  });
}

export function sitemapXml(hubs, products, site = SITE) {
  const url = (loc, freq, prio) => `  <url>\n    <loc>${escapeHtml(loc)}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
  const entries = [`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${url(`${site.url}/`, 'daily', '1.0')}`];
  for (const hub of hubs) {
    const prio = hub.entityType === 'Pillar' ? '1.0' : hub.entityType === 'Seasonal' ? '0.9' : '0.8';
    entries.push(url(`${site.url}/${hub.slug}`, 'weekly', prio));
  }
  if (Array.isArray(products)) {
    for (const p of products) entries.push(url(`${site.url}/product/${p.id}`, 'daily', '0.7'));
  }
  for (const lp of LEGAL_PAGES) entries.push(url(`${site.url}/${lp.slug}`, 'monthly', '0.3'));
  entries.push('</urlset>');
  return entries.join('\n');
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`;
}

export function llmsTxt() {
  const lines = [];
  lines.push(`# ${SITE.name}`);
  lines.push('');
  lines.push(`> ${SITE.description}`);
  lines.push('');
  lines.push('## Sections');
  lines.push('');
  lines.push(`- [Kitchen Deals](/${CLUSTERS.pillar.slug}): The main hub for kitchen appliance deals, discounts, and promo codes.`);
  lines.push('');
  lines.push('## Seasonal Deals');
  lines.push('');
  for (const s of CLUSTERS.seasonal) lines.push(`- [${s.name}](/${s.slug}): ${s.description}`);
  lines.push('');
  lines.push('## Brand Deals');
  lines.push('');
  for (const b of CLUSTERS.brands) lines.push(`- [${b.name}](/${b.slug}): ${b.description}`);
  lines.push('');
  lines.push('## Retailer Deals');
  lines.push('');
  for (const r of CLUSTERS.retailers) lines.push(`- [${r.name}](/${r.slug}): ${r.description}`);
  lines.push('');
  lines.push('## Category Deals');
  lines.push('');
  for (const c of CLUSTERS.categories) lines.push(`- [${c.name}](/${c.slug}): ${c.description}`);
  lines.push('');
  lines.push('## Pages');
  lines.push('');
  lines.push('- [Privacy Policy](/privacy-policy): How we collect, use, and protect your data.');
  lines.push('- [Terms of Service](/terms-of-service): Rules for using our site.');
  lines.push('- [Contact](/contact): Get in touch with our team.');
  lines.push('- [Disclaimer](/disclaimer): Legal disclosures and affiliate information.');
  return lines.join('\n');
}
