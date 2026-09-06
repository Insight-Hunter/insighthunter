export interface SeoMeta {
  title: string;
  description: string;
  /** Path only, e.g. "/pricing" — the canonical origin is applied by the layout. */
  path: string;
}

export function softwareApplicationJsonLd(canonicalOrigin: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Insight Hunter",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: canonicalOrigin,
    offers: [
      { "@type": "Offer", name: "Startup", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "Standard", price: "49", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro", price: "149", priceCurrency: "USD" },
    ],
    description:
      "Insight Hunter is a SaaS market intelligence platform for automated data mining and predictive market trend analysis.",
  });
}

export function addOnsProductJsonLd(canonicalOrigin: string): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      {
        "@type": "Product",
        position: 1,
        name: "Historical Data Vault Link",
        url: `${canonicalOrigin}/addons`,
        description: "Instant unlock of 5+ years of archive trend data.",
      },
      {
        "@type": "Product",
        position: 2,
        name: "Advanced API Pipeline",
        url: `${canonicalOrigin}/addons`,
        description: "Direct webhook access for custom CRMs and data pipelines.",
      },
      {
        "@type": "Product",
        position: 3,
        name: "Niche Industry Data Packs",
        url: `${canonicalOrigin}/addons`,
        description: "Deep-dive datasets for specific micro-markets.",
      },
    ],
  });
}
