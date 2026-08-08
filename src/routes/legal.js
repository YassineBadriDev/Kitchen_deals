const express = require('express');
const router = express.Router();

const legalPages = {
  'privacy-policy': {
    title: 'Privacy Policy | Kitchen Deals',
    h1: 'Privacy Policy',
    content: `
<p><strong>Last updated:</strong> August 8, 2026</p>
<p>This Privacy Policy describes how Kitchen Deals ("we," "our," or "us") collects, uses, and shares information about you when you visit our website at kitchendeals.org.</p>
<h2>Information We Collect</h2>
<p>We automatically collect certain information when you visit our website, including your IP address, browser type, operating system, referral URLs, and pages visited. We use cookies and similar technologies to collect this information.</p>
<h2>How We Use Your Information</h2>
<p>We use the information we collect to operate and improve our website, to understand how visitors use our site, to detect and prevent fraud, and to comply with legal obligations.</p>
<h2>Third-Party Services</h2>
<p>We use third-party services such as Google Analytics to collect usage data. These services may use cookies and collect information about your online activities over time and across different websites. We also participate in affiliate programs, meaning we may earn a commission on purchases made through links on our site.</p>
<h2>Cookies</h2>
<p>We use cookies to improve your experience on our site. You can set your browser to refuse cookies, but some features of our site may not function properly without them.</p>
<h2>Data Security</h2>
<p>We take reasonable measures to protect your personal information from unauthorized access, alteration, or destruction. However, no method of internet transmission is completely secure.</p>
<h2>Children's Privacy</h2>
<p>Our website is not intended for children under 13. We do not knowingly collect personal information from children.</p>
<h2>Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.</p>
<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us at <a href="/contact">contact@kitchendeals.org</a>.</p>
`,
  },
  'terms-of-service': {
    title: 'Terms of Service | Kitchen Deals',
    h1: 'Terms of Service',
    content: `
<p><strong>Last updated:</strong> August 8, 2026</p>
<p>Welcome to Kitchen Deals. By accessing or using our website at kitchendeals.org, you agree to be bound by these Terms of Service.</p>
<h2>Use of the Website</h2>
<p>You may use our website for lawful purposes only. You agree not to use our website in any way that could damage, disable, or impair the website or interfere with any other party's use of the website.</p>
<h2>Intellectual Property</h2>
<p>All content on this website, including text, graphics, logos, and software, is the property of Kitchen Deals or its content suppliers and is protected by copyright and trademark laws.</p>
<h2>Accuracy of Information</h2>
<p>We strive to provide accurate and up-to-date information about deals, prices, and availability. However, we cannot guarantee that all information is always accurate, complete, or current. Prices and availability are subject to change without notice.</p>
<h2>Affiliate Disclosure</h2>
<p>Kitchen Deals participates in affiliate marketing programs. This means we may earn a commission on purchases made through links on our website, at no additional cost to you. We only recommend products and services we believe in.</p>
<h2>Limitation of Liability</h2>
<p>Kitchen Deals shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the website.</p>
<h2>Indemnification</h2>
<p>You agree to indemnify and hold harmless Kitchen Deals and its affiliates from any claims, losses, or damages arising from your use of the website.</p>
<h2>Governing Law</h2>
<p>These Terms of Service are governed by the laws of the United States.</p>
<h2>Changes to These Terms</h2>
<p>We reserve the right to modify these Terms of Service at any time. Changes will be posted on this page with an updated effective date.</p>
<h2>Contact Us</h2>
<p>If you have questions about these Terms of Service, please contact us at <a href="/contact">contact@kitchendeals.org</a>.</p>
`,
  },
  'contact': {
    title: 'Contact Us | Kitchen Deals',
    h1: 'Contact Us',
    content: `
<p>Have a question, suggestion, or feedback? We'd love to hear from you.</p>
<h2>Email</h2>
<p>You can reach us at: <a href="mailto:contact@kitchendeals.org">contact@kitchendeals.org</a></p>
<h2>Response Time</h2>
<p>We typically respond within 24-48 hours during business days.</p>
<h2>Partnerships & Advertising</h2>
<p>For partnership inquiries or advertising opportunities, please email us at <a href="mailto:contact@kitchendeals.org">contact@kitchendeals.org</a> with "Partnership" in the subject line.</p>
<h2>Report a Deal</h2>
<p>Found an incorrect price or a broken link? Let us know and we'll fix it as soon as possible.</p>
`,
  },
  'disclaimer': {
    title: 'Disclaimer | Kitchen Deals',
    h1: 'Disclaimer',
    content: `
<p><strong>Last updated:</strong> August 8, 2026</p>
<h2>General Information</h2>
<p>The information provided on Kitchen Deals (kitchendeals.org) is for general informational purposes only. All information on the website is provided in good faith; however, we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the website.</p>
<h2>Affiliate Disclosure</h2>
<p>Kitchen Deals is a participant in affiliate advertising programs. This means we may earn a commission when you click on links to retailer websites and make a purchase. This comes at no additional cost to you and helps support our website.</p>
<p>We only link to products and retailers we genuinely recommend based on quality, price, and value. Our editorial opinions are our own and are not influenced by affiliate partnerships.</p>
<h2>Price and Availability</h2>
<p>Prices and product availability are subject to change without notice. While we do our best to keep information current, deals may expire or prices may change at any time. Always verify the current price and availability on the retailer's website before making a purchase.</p>
<h2>External Links</h2>
<p>Our website may contain links to external websites that are not operated by us. We have no control over the content and practices of these sites and cannot accept responsibility for their privacy policies or content.</p>
<h2>No Professional Advice</h2>
<p>The content on Kitchen Deals is not intended to be a substitute for professional advice. You should consult with qualified professionals before making any purchasing decisions.</p>
<h2>Testimonials</h2>
<p>Any testimonials or reviews on this website reflect the personal experiences and opinions of individual users. Your results may vary.</p>
<h2>Changes to This Disclaimer</h2>
<p>We reserve the right to update this disclaimer at any time. Changes will be posted on this page with an updated effective date.</p>
<h2>Contact Us</h2>
<p>If you have any questions about this disclaimer, please contact us at <a href="/contact">contact@kitchendeals.org</a>.</p>
`,
  },
};

router.get('/privacy-policy', (req, res, next) => {
  const page = legalPages['privacy-policy'];
  res.render('legal', {
    site: req.app.locals?.site || require('../config'),
    hub: { name: page.h1, slug: 'privacy-policy', entityType: 'Page', description: page.h1 },
    content: page.content,
    deals: [],
    relatedHubs: [],
    kw: { targetKeyword: 'privacy policy', pageTitle: page.title, metaDescription: page.h1, h1: page.h1 },
    seo: { title: page.title, description: page.h1, canonical: 'https://kitchendeals.org/privacy-policy', jsonLd: [] },
  });
});

router.get('/terms-of-service', (req, res, next) => {
  const page = legalPages['terms-of-service'];
  res.render('legal', {
    site: req.app.locals?.site || require('../config'),
    hub: { name: page.h1, slug: 'terms-of-service', entityType: 'Page', description: page.h1 },
    content: page.content,
    deals: [],
    relatedHubs: [],
    kw: { targetKeyword: 'terms of service', pageTitle: page.title, metaDescription: page.h1, h1: page.h1 },
    seo: { title: page.title, description: page.h1, canonical: 'https://kitchendeals.org/terms-of-service', jsonLd: [] },
  });
});

router.get('/contact', (req, res, next) => {
  const page = legalPages['contact'];
  res.render('legal', {
    site: req.app.locals?.site || require('../config'),
    hub: { name: page.h1, slug: 'contact', entityType: 'Page', description: page.h1 },
    content: page.content,
    deals: [],
    relatedHubs: [],
    kw: { targetKeyword: 'contact', pageTitle: page.title, metaDescription: page.h1, h1: page.h1 },
    seo: { title: page.title, description: page.h1, canonical: 'https://kitchendeals.org/contact', jsonLd: [] },
  });
});

router.get('/disclaimer', (req, res, next) => {
  const page = legalPages['disclaimer'];
  res.render('legal', {
    site: req.app.locals?.site || require('../config'),
    hub: { name: page.h1, slug: 'disclaimer', entityType: 'Page', description: page.h1 },
    content: page.content,
    deals: [],
    relatedHubs: [],
    kw: { targetKeyword: 'disclaimer', pageTitle: page.title, metaDescription: page.h1, h1: page.h1 },
    seo: { title: page.title, description: page.h1, canonical: 'https://kitchendeals.org/disclaimer', jsonLd: [] },
  });
});

module.exports = router;
