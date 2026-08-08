import { SITE } from './constants.js';

export function seoMiddleware(hub, site, kw) {
  const url = `${site.url}/${hub.slug || ''}`;
  const jsonLd = buildJsonLd(hub, site, kw, url);
  return {
    title: kw.pageTitle,
    description: kw.metaDescription,
    canonical: url,
    jsonLd,
  };
}

function buildJsonLd(hub, site, kw, url) {
  const webSite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.description,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      url: site.url,
      logo: { '@type': 'ImageObject', url: `${site.url}/logo.svg` },
    },
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kitchen Deals', item: site.url },
    ],
  };

  if (hub.slug && hub.entityType !== 'Pillar') {
    const entityType = hub.entityType || 'Page';
    const typeMap = {
      Brand: 'Brand',
      Retailer: 'Organization',
      Category: 'CollectionPage',
      Seasonal: 'CollectionPage',
      Combined: 'CollectionPage',
      Page: 'WebPage',
    };
    const hubSchema = {
      '@context': 'https://schema.org',
      '@type': typeMap[entityType] || 'WebPage',
      name: hub.name,
      description: kw.metaDescription,
      url,
    };
    breadcrumbs.itemListElement.push({ '@type': 'ListItem', position: 2, name: hub.name, item: url });
    return [webSite, hubSchema, breadcrumbs];
  }

  return [webSite, breadcrumbs];
}

export function getKeywordData(hub, clusters) {
  const kw = {
    targetKeyword: hub.targetKeyword || hub.name,
    h1: hub.name || hub.targetKeyword,
    metaDescription: hub.description || '',
    intro: hub.description || '',
    subHeaders: [],
    sections: [],
    pageTitle: '',
  };

  kw.pageTitle = kw.targetKeyword.charAt(0).toUpperCase() + kw.targetKeyword.slice(1);
  if (kw.pageTitle.length < 60) kw.pageTitle += ' | Kitchen Deals';

  const entityType = hub.entityType;
  if (entityType === 'Brand') {
    const brandName = hub.name;
    kw.subHeaders = [
      `Best ${brandName} Deals This Week`,
      `${brandName} Deals at Popular Retailers`,
      `How to Find ${brandName} Discount Codes`,
      `${brandName} Kitchen Appliance Savings`,
    ];
    kw.sections = [
      {
        heading: `Best ${brandName} Deals This Week`,
        text: `Find the latest ${brandName} discounts below, gathered from top retailers and updated regularly. Check back often because prices and offers change quickly.`,
        links: [{ href: '/kitchen-deals', label: 'Browse all kitchen deals' }],
      },
      {
        heading: `${brandName} Deals at Popular Retailers`,
        text: `Compare ${brandName} pricing at Amazon, Walmart, Best Buy, Target, Home Depot, and Lowe's. The same model often sells for different prices at different stores.`,
        links: [
          { href: '/amazon-kitchen-deals', label: 'Amazon kitchen deals' },
          { href: '/walmart-kitchen-deals', label: 'Walmart kitchen deals' },
          { href: '/best-buy-kitchen-deals', label: 'Best Buy kitchen deals' },
        ],
      },
      {
        heading: `How to Find ${brandName} Discount Codes`,
        text: `Look for manufacturer rebates, email sign-up coupons, and seasonal promotions. Combining a promo code with a retailer sale can often bring the final price well below the list price.`,
        links: [{ href: '/products', label: 'Track prices on your favorites' }],
      },
      {
        heading: `${brandName} Kitchen Appliance Savings`,
        text: `Major ${brandName} appliances see their biggest discounts during holiday sales. Follow our seasonal deal pages to time your purchase around the best promotions.`,
        links: [
          { href: '/black-friday-kitchen-appliance-deals', label: 'Black Friday kitchen deals' },
          { href: '/cyber-monday-kitchen-deals', label: 'Cyber Monday kitchen deals' },
        ],
      },
    ];
    kw.intro = `Find the latest ${hub.targetKeyword} from top retailers. We track ${brandName} kitchen appliance discounts so you never miss a deal.`;
    kw.metaDescription = `Compare ${hub.targetKeyword} from top retailers. Updated daily with the best ${brandName} kitchen appliance discounts and promo codes.`;
  } else if (entityType === 'Retailer') {
    const retailerName = hub.name;
    kw.subHeaders = [
      `${retailerName} Kitchen Appliance Deals Today`,
      `Top ${retailerName} Kitchen Savings`,
      `${retailerName} Clearance Kitchen Items`,
      `Best ${retailerName} Kitchen Deals Right Now`,
    ];
    kw.sections = [
      {
        heading: `${retailerName} Kitchen Appliance Deals Today`,
        text: `See the newest ${retailerName} kitchen appliance discounts below. Prices and availability update regularly, so check back for today's best offers.`,
        links: [{ href: '/kitchen-deals', label: 'Browse all kitchen deals' }],
      },
      {
        heading: `Top ${retailerName} Kitchen Savings`,
        text: `We round up the highest-value ${retailerName} kitchen deals so you can focus on the offers worth your time instead of scanning every product page.`,
        links: [{ href: '/products', label: 'Compare product prices' }],
      },
      {
        heading: `${retailerName} Clearance Kitchen Items`,
        text: `Clearance sections at ${retailerName} can offer deep discounts on open-box and end-of-line kitchen products. These deals often sell out quickly.`,
        links: [{ href: '/kitchen-appliance-package-deals', label: 'Appliance package deals' }],
      },
      {
        heading: `Best ${retailerName} Kitchen Deals Right Now`,
        text: `Check the current top offers at ${retailerName}, plus seasonal sales like Black Friday and Prime Day where kitchen appliances see their biggest markdowns.`,
        links: [
          { href: '/black-friday-kitchen-appliance-deals', label: 'Black Friday kitchen deals' },
          { href: '/prime-day-kitchen-deals', label: 'Prime Day kitchen deals' },
        ],
      },
    ];
    kw.intro = `Browse the best ${hub.targetKeyword} available now. ${retailerName} offers kitchen appliances at competitive prices.`;
    kw.metaDescription = `Find ${hub.targetKeyword} at ${retailerName}. Updated daily with the best kitchen appliance discounts, sales, and clearance items.`;
  } else if (entityType === 'Category') {
    const catName = hub.name;
    kw.subHeaders = [
      `Best ${catName} Deals This Week`,
      `Top ${catName} Savings at Major Retailers`,
      `${catName} Buying Guide`,
      `Cheap ${catName} on Sale`,
    ];
    kw.sections = [
      {
        heading: `Best ${catName} Deals This Week`,
        text: `Here are the latest ${catName.toLowerCase()} discounts from top retailers, updated regularly. Prices move fast, so the best offers tend to change from week to week.`,
        links: [{ href: '/kitchen-deals', label: 'Browse all kitchen deals' }],
      },
      {
        heading: `Top ${catName} Savings at Major Retailers`,
        text: `Compare ${catName.toLowerCase()} prices across Amazon, Walmart, Best Buy, Target, and more. The same product can differ in price by tens of dollars between stores.`,
        links: [
          { href: '/amazon-kitchen-deals', label: 'Amazon kitchen deals' },
          { href: '/walmart-kitchen-deals', label: 'Walmart kitchen deals' },
          { href: '/best-buy-kitchen-deals', label: 'Best Buy kitchen deals' },
        ],
      },
      {
        heading: `${catName} Buying Guide`,
        text: `Before you buy, think about size, features, and how the product fits your kitchen. Read reviews, compare specs, and use price history to know whether a current sale is actually a good deal.`,
        links: [{ href: '/products', label: 'Track prices and see price history' }],
      },
      {
        heading: `Cheap ${catName} on Sale`,
        text: `Seasonal events like Black Friday and Prime Day are the best time to find ${catName.toLowerCase()} at their lowest prices of the year.`,
        links: [
          { href: '/black-friday-kitchen-appliance-deals', label: 'Black Friday kitchen deals' },
          { href: '/prime-day-kitchen-deals', label: 'Prime Day kitchen deals' },
        ],
      },
    ];
    kw.intro = `Shop the best ${hub.targetKeyword} from top retailers. Compare prices on ${catName.toLowerCase()} to find the best deal.`;
    kw.metaDescription = `Compare ${hub.targetKeyword} from top retailers. Updated daily with the best ${catName.toLowerCase()} discounts and sales.`;
  } else if (entityType === 'Seasonal') {
    const eventName = hub.name;
    kw.subHeaders = [
      `Best ${eventName} Appliance Deals`,
      `${eventName} Shopping Tips`,
      `${eventName} Retailer Sales`,
      `When Do ${eventName} Deals Start?`,
    ];
    kw.sections = [
      {
        heading: `Best ${eventName} Appliance Deals`,
        text: `Kitchen appliances see some of their deepest discounts during ${eventName}. Check this page for the top markdowns and bundle offers from major retailers.`,
        links: [{ href: '/kitchen-deals', label: 'Browse all kitchen deals' }],
      },
      {
        heading: `${eventName} Shopping Tips`,
        text: `Plan ahead, set a budget, and track prices before ${eventName} begins so you know a real deal when you see one. Popular models sell out fast once the sale starts.`,
        links: [{ href: '/products', label: 'Track prices on your favorites' }],
      },
      {
        heading: `${eventName} Retailer Sales`,
        text: `Amazon, Walmart, Best Buy, Target, and Home Depot all run major promotions around ${eventName}. Compare the same model across stores to maximize your savings.`,
        links: [
          { href: '/amazon-kitchen-deals', label: 'Amazon kitchen deals' },
          { href: '/best-buy-kitchen-deals', label: 'Best Buy kitchen deals' },
          { href: '/target-kitchen-deals', label: 'Target kitchen deals' },
        ],
      },
      {
        heading: `When Do ${eventName} Deals Start?`,
        text: `Retailers typically open their ${eventName} sales a few days before the event, and stock is limited. Following our deal pages keeps you notified of when offers go live.`,
        links: [{ href: '/kitchen-deals', label: 'Get notified via our deal page' }],
      },
    ];
    kw.intro = `${eventName} is one of the best times to buy kitchen appliances. Here are the top deals from major retailers.`;
    kw.metaDescription = `Shop the best ${hub.targetKeyword}. Find top appliance deals, retailer sales, and shopping tips.`;
  } else if (entityType === 'Pillar') {
    kw.subHeaders = [
      'Best Kitchen Appliance Deals Today',
      'Top Kitchen Deals by Category',
      'Kitchen Deals by Retailer',
      'Kitchen Deals by Brand',
      'Kitchen Appliance Package Deals',
      'How to Find the Best Kitchen Deals',
    ];
    kw.sections = [
      {
        heading: 'Best Kitchen Appliance Deals Today',
        text: "Every day we scan top retailers for the newest kitchen appliance discounts, from refrigerators and dishwashers to mixers and coffee makers. The list below is refreshed regularly, so check back often for today's best savings.",
        links: [{ href: '/kitchen-deals', label: 'Browse all kitchen deals' }],
      },
      {
        heading: 'Top Kitchen Deals by Category',
        text: 'Whether you are shopping for cookware, knives, blenders, or ovens and ranges, we organize the best savings by category so you can jump straight to the deals that matter for your kitchen.',
        links: [
          { href: '/kitchen-appliance-package-deals', label: 'Appliance packages' },
          { href: '/kitchen-knife-deals', label: 'Knife deals' },
          { href: '/kitchen-cookware-deals', label: 'Cookware deals' },
          { href: '/kitchen-oven-deals', label: 'Oven and range deals' },
        ],
      },
      {
        heading: 'Kitchen Deals by Retailer',
        text: "Compare offers from Amazon, Walmart, Best Buy, Target, Home Depot, Lowe's, and Costco all in one place. Each retailer page lists the best current deals so you can buy from the store that gives you the lowest price.",
        links: [
          { href: '/amazon-kitchen-deals', label: 'Amazon kitchen deals' },
          { href: '/walmart-kitchen-deals', label: 'Walmart kitchen deals' },
          { href: '/best-buy-kitchen-deals', label: 'Best Buy kitchen deals' },
          { href: '/target-kitchen-deals', label: 'Target kitchen deals' },
        ],
      },
      {
        heading: 'Kitchen Deals by Brand',
        text: 'KitchenAid, Shark, Bosch, Whirlpool, Frigidaire, Samsung, LG, and more. Browse brand-specific pages to find discounts on your favorite kitchen appliance brands without hunting through every retailer.',
        links: [
          { href: '/kitchenaid-deals', label: 'KitchenAid deals' },
          { href: '/shark-kitchen-deals', label: 'Shark deals' },
          { href: '/bosch-kitchen-deals', label: 'Bosch deals' },
          { href: '/whirlpool-kitchen-deals', label: 'Whirlpool deals' },
        ],
      },
      {
        heading: 'Kitchen Appliance Package Deals',
        text: 'Buying multiple appliances at once can save hundreds. Our package deals page rounds up combined offers like buy more, save more and appliance bundle discounts from major retailers.',
        links: [{ href: '/kitchen-appliance-package-deals', label: 'See appliance package deals' }],
      },
      {
        heading: 'How to Find the Best Kitchen Deals',
        text: 'A few simple habits help you save: track prices over time instead of buying on impulse, watch for seasonal sales like Black Friday and Prime Day, compare the same model across retailers, and set a target price before you buy.',
        links: [
          { href: '/black-friday-kitchen-appliance-deals', label: 'Black Friday kitchen deals' },
          { href: '/prime-day-kitchen-deals', label: 'Prime Day kitchen deals' },
          { href: '/products', label: 'Track product prices' },
        ],
      },
    ];
    kw.intro = 'Kitchen Deals helps you find the best kitchen appliance deals, discounts, and promo codes from top retailers. Updated daily.';
    kw.metaDescription = 'Find the best kitchen appliance deals, discounts, and promo codes from top retailers. Updated daily with the latest savings on kitchen appliances.';
  } else if (entityType === 'Combined') {
    kw.subHeaders = [
      `${hub.name} at Top Retailers`,
      `Best ${hub.name} Today`,
      `How to Save on ${hub.name}`,
    ];
    kw.sections = [
      {
        heading: `${hub.name} at Top Retailers`,
        text: `Find ${hub.targetKeyword} at the retailers that carry them. Comparing across stores helps you spot the lowest price before you buy.`,
        links: [
          { href: '/amazon-kitchen-deals', label: 'Amazon kitchen deals' },
          { href: '/walmart-kitchen-deals', label: 'Walmart kitchen deals' },
          { href: '/best-buy-kitchen-deals', label: 'Best Buy kitchen deals' },
        ],
      },
      {
        heading: `Best ${hub.name} Today`,
        text: `See the newest offers on ${hub.targetKeyword} below. Deals change often, so the list is updated regularly to reflect current prices.`,
        links: [{ href: '/kitchen-deals', label: 'Browse all kitchen deals' }],
      },
      {
        heading: `How to Save on ${hub.name}`,
        text: `Track prices, wait for seasonal sales, and compare across retailers to get the best value on ${hub.targetKeyword}.`,
        links: [{ href: '/products', label: 'Track product prices' }],
      },
    ];
    kw.intro = hub.description || `Find the best ${hub.targetKeyword} from top retailers. Updated daily.`;
    kw.metaDescription = hub.description || `Compare ${hub.targetKeyword} from top retailers. Updated daily with the best discounts.`;
  }

  return kw;
}
