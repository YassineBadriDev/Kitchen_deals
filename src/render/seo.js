function seoMiddleware(hub, site, kw) {
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
      logo: {
        '@type': 'ImageObject',
        url: `${site.url}/logo.svg`,
      },
    },
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Kitchen Deals',
        item: site.url,
      },
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

    if (entityType === 'Brand') {
      hubSchema['@type'] = 'Brand';
      hubSchema.name = hub.name;
    }

    breadcrumbs.itemListElement.push({
      '@type': 'ListItem',
      position: 2,
      name: hub.name,
      item: url,
    });

    return [webSite, hubSchema, breadcrumbs];
  }

  return [webSite, breadcrumbs];
}

module.exports = { seoMiddleware };
