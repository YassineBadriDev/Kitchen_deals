const { load } = require('cheerio');
const axios = require('axios');
const { saveDeals } = require('../normalize');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function fetchPage(url) {
  const res = await axios.get(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
    timeout: 15000,
  });
  return res.data;
}

const sources = [
  {
    name: 'bestbuy',
    label: 'Best Buy',
    url: 'https://www.bestbuy.com/site/all-electronics-on-sale/all-appliances-on-sale/pcmcat1637009144989.c?id=pcmcat1637009144989',
    parse: ($) => {
      const deals = [];
      $('.sku-item, .product-item, [class*="product-card"], [class*="DealCard"]').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[class*="title"], [class*="name"], h4, h3').first().text().trim();
        const price = $el.find('[class*="price"], [class*="Price"]').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const img = $el.find('img').first().attr('src');
        if (title) {
          deals.push({
            title,
            price: price.replace(/[^0-9.]/g, '').split('.')[0] || null,
            url: link ? (link.startsWith('http') ? link : `https://www.bestbuy.com${link}`) : '',
            image: img || '',
            retailer: 'Best Buy',
          });
        }
      });
      return deals;
    },
  },
  {
    name: 'amazon',
    label: 'Amazon',
    url: 'https://www.amazon.com/b?node=120868611011',
    parse: ($) => {
      const deals = [];
      $('[class*="DealCard"], [class*="deal-card"], .a-section .a-link-normal').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[class*="title"], [class*="name"], .a-text-normal, span.a-size-base').first().text().trim();
        const priceWhole = $el.find('.a-price-whole').first().text().trim();
        const priceFrac = $el.find('.a-price-fraction').first().text().trim();
        const price = priceWhole ? `${priceWhole}${priceFrac}` : $el.find('[class*="price"]').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const img = $el.find('img').first().attr('src');
        if (title && title.length > 5) {
          deals.push({
            title,
            price: price.replace(/[^0-9.]/g, '').split(' ')[0] || null,
            url: link ? (link.startsWith('http') ? link : `https://www.amazon.com${link}`) : '',
            image: img || '',
            retailer: 'Amazon',
          });
        }
      });
      return deals;
    },
  },
  {
    name: 'walmart',
    label: 'Walmart',
    url: 'https://www.walmart.com/shop/deals/all-home/kitchen-appliances',
    parse: ($) => {
      const deals = [];
      $('[class*="product"], [data-testid], .search-result-griditem').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[class*="title"], [class*="name"], [data-automation-id="product-title"]').first().text().trim();
        const price = $el.find('[class*="price"], [itemprop="price"]').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const img = $el.find('img').first().attr('src');
        if (title && title.length > 5) {
          deals.push({
            title,
            price: price.replace(/[^0-9.]/g, '').split(' ')[0] || null,
            url: link ? (link.startsWith('http') ? link : `https://www.walmart.com${link}`) : '',
            image: img || '',
            retailer: 'Walmart',
          });
        }
      });
      return deals;
    },
  },
  {
    name: 'target',
    label: 'Target',
    url: 'https://www.target.com/c/kitchen-deals/-/N-5xtum',
    parse: ($) => {
      const deals = [];
      $('[data-test="product-card"], [class*="ProductCard"], [class*="product"]').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[data-test="product-title"], [class*="title"], h3').first().text().trim();
        const price = $el.find('[data-test="product-price"], [class*="price"]').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const img = $el.find('img').first().attr('src');
        if (title) {
          deals.push({
            title,
            price: price.replace(/[^0-9.]/g, '').split(' ')[0] || null,
            url: link ? (link.startsWith('http') ? link : `https://www.target.com${link}`) : '',
            image: img || '',
            retailer: 'Target',
          });
        }
      });
      return deals;
    },
  },
  {
    name: 'homedepot',
    label: 'Home Depot',
    url: 'https://www.homedepot.com/b/Appliances-Kitchen/N-5yc1vZc7pc',
    parse: ($) => {
      const deals = [];
      $('[class*="product"], [class*="plp-card"], [data-testid]').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[class*="title"], [class*="name"], h3, .product-title__text-overflow').first().text().trim();
        const price = $el.find('[class*="price"], [class*="Price"]').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const img = $el.find('img').first().attr('src');
        if (title && title.length > 5) {
          deals.push({
            title,
            price: price.replace(/[^0-9.]/g, '').split(' ')[0] || null,
            url: link ? (link.startsWith('http') ? link : `https://www.homedepot.com${link}`) : '',
            image: img || '',
            retailer: 'Home Depot',
          });
        }
      });
      return deals;
    },
  },
  {
    name: 'costco',
    label: 'Costco',
    url: 'https://www.costco.com/kitchen.html',
    parse: ($) => {
      const deals = [];
      $('.product-tile, [class*="product"], .col-xs-6').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[class*="title"], [class*="name"], .description, h3').first().text().trim();
        const price = $el.find('[class*="price"], .price').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const img = $el.find('img').first().attr('src');
        if (title && title.length > 5) {
          deals.push({
            title,
            price: price.replace(/[^0-9.]/g, '').split(' ')[0] || null,
            url: link ? (link.startsWith('http') ? link : `https://www.costco.com${link}`) : '',
            image: img || '',
            retailer: 'Costco',
          });
        }
      });
      return deals;
    },
  },
  {
    name: 'lowes',
    label: "Lowe's",
    url: 'https://www.lowes.com/pl/Kitchen-appliances/4294857975',
    parse: ($) => {
      const deals = [];
      $('[class*="product"], [class*="plp-card"]').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[class*="title"], [class*="name"], h3').first().text().trim();
        const price = $el.find('[class*="price"]').first().text().trim();
        const link = $el.find('a').first().attr('href');
        const img = $el.find('img').first().attr('src');
        if (title && title.length > 5) {
          deals.push({
            title,
            price: price.replace(/[^0-9.]/g, '').split(' ')[0] || null,
            url: link ? (link.startsWith('http') ? link : `https://www.lowes.com${link}`) : '',
            image: img || '',
            retailer: "Lowe's",
          });
        }
      });
      return deals;
    },
  },
];

module.exports = { sources, fetchPage, UA };
