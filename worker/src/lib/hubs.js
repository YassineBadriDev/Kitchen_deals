import { CLUSTERS } from './constants.js';

export function buildHubMap() {
  const hubs = {};
  const add = (hub) => { hubs[hub.slug] = hub; };
  add(CLUSTERS.pillar);
  CLUSTERS.seasonal.forEach(add);
  CLUSTERS.brands.forEach(add);
  CLUSTERS.retailers.forEach(add);
  CLUSTERS.categories.forEach(add);
  CLUSTERS.combined.forEach(add);
  return hubs;
}

export function filterDeals(deals, hub) {
  if (!hub) return deals;
  const keyword = hub.targetKeyword.toLowerCase();
  const brand = (hub.parentBrand || hub.key || '').toLowerCase();
  const retailer = (hub.parentRetailer || '').toLowerCase();
  const category = (hub.parentCategory || '').toLowerCase();
  const seasonal = (hub.parentSeasonal || '').toLowerCase();

  return deals.filter((d) => {
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

function candidateStems(word) {
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
}

function matchesCategory(cat, pCat) {
  const cStems = candidateStems(cat);
  const pStems = candidateStems(pCat);
  for (const c of cStems) {
    for (const p of pStems) {
      if (p === c || p.includes(c) || c.includes(p)) return true;
    }
  }
  return false;
}

export function hubProducts(products, hub) {
  if (!hub) return [];
  return products
    .filter((p) => {
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
          const brandName = (CLUSTERS.brands.find((b) => b.key === hub.parentBrand) || {}).name || '';
          if (brandName && !(p.brand || '').toLowerCase().includes(brandName.toLowerCase())) return false;
        }
        if (hub.parentRetailer) {
          const retailerName = (CLUSTERS.retailers.find((r) => r.key === hub.parentRetailer) || {}).name || '';
          if (retailerName && !(p.retailer || '').toLowerCase().includes(retailerName.toLowerCase())) return false;
        }
        if (hub.parentCategory) {
          const catName = (CLUSTERS.categories.find((c) => c.key === hub.parentCategory) || {}).name || hub.parentCategory;
          if (!p.category || !matchesCategory(catName, p.category)) return false;
        }
        return true;
      }
      if (hub.entityType === 'Seasonal' || hub.entityType === 'Pillar') {
        return true;
      }
      return false;
    })
    .slice(0, 8);
}

export function relatedHubsFor(hub, hubDeals) {
  const relatedHubs = [];
  if (hub.entityType === 'Brand') {
    relatedHubs.push(...CLUSTERS.retailers.slice(0, 5));
    relatedHubs.push(
      ...CLUSTERS.categories.filter((c) => hubDeals.some((d) => (d.category || '').toLowerCase().includes(c.key))).slice(0, 4),
    );
    relatedHubs.push(...CLUSTERS.combined.filter((c) => c.parentBrand === hub.key));
  } else if (hub.entityType === 'Retailer') {
    relatedHubs.push(...CLUSTERS.brands.slice(0, 6));
    relatedHubs.push(...CLUSTERS.categories.slice(0, 4));
  } else if (hub.entityType === 'Category') {
    relatedHubs.push(...CLUSTERS.brands.slice(0, 6));
    relatedHubs.push(...CLUSTERS.retailers.slice(0, 4));
  } else if (hub.entityType === 'Seasonal') {
    relatedHubs.push(...CLUSTERS.brands.slice(0, 5));
    relatedHubs.push(...CLUSTERS.retailers.slice(0, 5));
  } else if (hub.entityType === 'Combined') {
    if (hub.parentBrand) relatedHubs.push(...CLUSTERS.brands.filter((b) => b.key === hub.parentBrand));
    if (hub.parentRetailer) relatedHubs.push(...CLUSTERS.retailers.filter((r) => r.key === hub.parentRetailer));
    if (hub.parentCategory) relatedHubs.push(...CLUSTERS.categories.filter((c) => c.key === hub.parentCategory));
    if (hub.parentSeasonal) relatedHubs.push(...CLUSTERS.seasonal.filter((s) => s.key === hub.parentSeasonal));
  }
  return relatedHubs.filter(Boolean).slice(0, 12);
}

export function allHubs() {
  return [
    CLUSTERS.pillar,
    ...CLUSTERS.seasonal,
    ...CLUSTERS.brands,
    ...CLUSTERS.retailers,
    ...CLUSTERS.categories,
    ...CLUSTERS.combined,
  ];
}
