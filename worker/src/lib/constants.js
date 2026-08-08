import clusters from '../data/clusters.json';

export const SITE = {
  name: 'Kitchen Deals',
  domain: 'kitchendeals.org',
  url: 'https://kitchendeals.org',
  description: 'Find the best kitchen appliance deals, discounts, and promo codes from top retailers.',
  ogImage: 'https://kitchendeals.org/og-image.png',
  email: 'contact@kitchendeals.org',
};

export const CLUSTERS = clusters;

export const YEAR = () => new Date().getFullYear();

export const LEGAL_PAGES = [
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'terms-of-service', title: 'Terms of Service' },
  { slug: 'contact', title: 'Contact' },
  { slug: 'disclaimer', title: 'Disclaimer' },
];
