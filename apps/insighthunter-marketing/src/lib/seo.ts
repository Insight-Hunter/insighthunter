import { PLANS } from "./plans.js";

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
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: canonicalOrigin,
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      price: String(plan.priceUsd),
      priceCurrency: "USD",
    })),
    description:
      "Insight Hunter is a small-business financial operations platform for bookkeeping, reporting, cash-flow visibility, and business support modules.",
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
        name: "BizForma filing support",
        url: `${canonicalOrigin}/addons`,
        description: "One-time business formation and filing support preview.",
      },
      {
        "@type": "Product",
        position: 2,
        name: "PBX communications",
        url: `${canonicalOrigin}/addons`,
        description: "Business phone, voicemail, SMS, and automessage workflows.",
      },
      {
        "@type": "Product",
        position: 3,
        name: "Payroll and AI CFO assistance",
        url: `${canonicalOrigin}/addons`,
        description: "Optional payroll workflows and automated advisory insights.",
      },
    ],
  });
}
