
# Insight Hunter Main App Structure

`apps/insighthunter-main` is the public marketing and conversion application for `https://insighthunter.app`.

It uses **Astro SSR** deployed as a **single Cloudflare Worker**. The build outputs both static assets and the Worker entry point, so one build and one deployment handle the public site, server-rendered pages, middleware, and API routes. [cite:35]

> **Responsibility boundary:** This app owns marketing, SEO, public pricing, content, lead capture, and secure checkout handoff. Authentication, tenant provisioning, customer entitlements, billing webhooks, and private financial data belong to dedicated applications such as `insighthunter-auth` and `insighthunter-dispatch`. [cite:31][cite:33]

---

## File Tree

```text
apps/
└── insighthunter-main/
    │
    ├── package.json
    ├── astro.config.mjs
    ├── tsconfig.json
    ├── vite.config.ts
    ├── wrangler.toml
    ├── .dev.vars.example
    ├── .gitignore
    ├── README.md
    ├── STRUCTURE.md
    │
    ├── public/
    │   ├── favicon.svg
    │   ├── robots.txt
    │   ├── og/
    │   │   └── homepage.png
    │   ├── images/
    │   │   ├── logo-mark.svg
    │   │   ├── logo-wordmark.svg
    │   │   ├── hero-command-center.webp
    │   │   ├── bookkeeping-preview.webp
    │   │   ├── reporting-preview.webp
    │   │   └── integrations-preview.webp
    │   └── fonts/
    │       └── README.md
    │
    ├── src/
    │   │
    │   ├── pages/
    │   │   ├── index.astro
    │   │   ├── features.astro
    │   │   ├── pricing.astro
    │   │   ├── about.astro
    │   │   ├── contact.astro
    │   │   ├── security.astro
    │   │   ├── integrations.astro
    │   │   ├── 404.astro
    │   │   ├── 500.astro
    │   │   │
    │   │   ├── resources/
    │   │   │   ├── index.astro
    │   │   │   ├── cash-flow-forecasting.astro
    │   │   │   ├── small-business-financial-dashboard.astro
    │   │   │   ├── automated-financial-reporting.astro
    │   │   │   └── fractional-cfo-tools.astro
    │   │   │
    │   │   ├── bookkeeping/
    │   │   │   └── index.astro
    │   │   ├── bizforma/
    │   │   │   └── index.astro
    │   │   ├── payroll/
    │   │   │   └── index.astro
    │   │   ├── reports/
    │   │   │   └── index.astro
    │   │   ├── insights/
    │   │   │   └── index.astro
    │   │   ├── pbx/
    │   │   │   └── index.astro
    │   │   │
    │   │   ├── legal/
    │   │   │   ├── privacy.astro
    │   │   │   ├── terms.astro
    │   │   │   ├── cookies.astro
    │   │   │   ├── acceptable-use.astro
    │   │   │   └── data-processing.astro
    │   │   │
    │   │   └── api/
    │   │       ├── health.ts
    │   │       ├── contact.ts
    │   │       ├── waitlist.ts
    │   │       ├── pricing.ts
    │   │       └── checkout/
    │   │           └── start.ts
    │   │
    │   ├── layouts/
    │   │   ├── Layout.astro
    │   │   ├── MarketingLayout.astro
    │   │   ├── LegalLayout.astro
    │   │   └── ResourceLayout.astro
    │   │
    │   ├── components/
    │   │   ├── HeroGlow.astro
    │   │   ├── SeoHead.astro
    │   │   ├── JsonLd.astro
    │   │   ├── SkipLink.astro
    │   │   │
    │   │   ├── navigation/
    │   │   │   ├── Header.astro
    │   │   │   ├── MobileMenu.astro
    │   │   │   ├── Footer.astro
    │   │   │   └── CommandCenterLink.astro
    │   │   │
    │   │   ├── marketing/
    │   │   │   ├── Hero.astro
    │   │   │   ├── PainPoint.astro
    │   │   │   ├── StatBar.astro
    │   │   │   ├── FeatureGrid.astro
    │   │   │   ├── HowItWorks.astro
    │   │   │   ├── PricingGrid.astro
    │   │   │   ├── AddonMarketplace.astro
    │   │   │   ├── TrustSection.astro
    │   │   │   ├── CommandCenterGateway.astro
    │   │   │   ├── FinalCta.astro
    │   │   │   └── Faq.astro
    │   │   │
    │   │   ├── cards/
    │   │   │   ├── FeatureCard.astro
    │   │   │   ├── PricingCard.astro
    │   │   │   ├── AddonCard.astro
    │   │   │   ├── ModuleCard.astro
    │   │   │   └── ResourceCard.astro
    │   │   │
    │   │   ├── forms/
    │   │   │   ├── ContactForm.astro
    │   │   │   ├── NewsletterForm.astro
    │   │   │   └── WaitlistForm.astro
    │   │   │
    │   │   └── islands/
    │   │       ├── PlanSelector.svelte
    │   │       ├── MobileNav.svelte
    │   │       └── ContactForm.svelte
    │   │
    │   ├── content/
    │   │   ├── config.ts
    │   │   ├── resources/
    │   │   │   ├── cash-flow-forecasting.md
    │   │   │   ├── automated-financial-reporting.md
    │   │   │   └── financial-dashboard-guide.md
    │   │   └── faq/
    │   │       └── marketing-faq.md
    │   │
    │   ├── data/
    │   │   ├── modules.ts
    │   │   ├── pricing.ts
    │   │   ├── addons.ts
    │   │   ├── features.ts
    │   │   ├── navigation.ts
    │   │   ├── faqs.ts
    │   │   └── integrations.ts
    │   │
    │   ├── lib/
    │   │   ├── env.ts
    │   │   ├── constants.ts
    │   │   ├── urls.ts
    │   │   ├── stripe.ts
    │   │   ├── turnstile.ts
    │   │   ├── rate-limit.ts
    │   │   ├── validation.ts
    │   │   ├── analytics.ts
    │   │   └── schema.ts
    │   │
    │   ├── middleware.ts
    │   │
    │   ├── styles/
    │   │   ├── global.css
    │   │   ├── tokens.css
    │   │   ├── reset.css
    │   │   ├── typography.css
    │   │   ├── utilities.css
    │   │   └── animations.css
    │   │
    │   ├── types/
    │   │   ├── env.d.ts
    │   │   ├── pricing.ts
    │   │   ├── modules.ts
    │   │   ├── api.ts
    │   │   └── globals.d.ts
    │   │
    │   └── worker/
    │       ├── index.ts
    │       ├── router.ts
    │       ├── security.ts
    │       ├── cors.ts
    │       ├── cache.ts
    │       ├── errors.ts
    │       └── observability.ts
    │
    ├── tests/
    │   ├── unit/
    │   │   ├── pricing.test.ts
    │   │   ├── urls.test.ts
    │   │   ├── validation.test.ts
    │   │   └── schema.test.ts
    │   ├── integration/
    │   │   ├── contact-api.test.ts
    │   │   ├── checkout-start.test.ts
    │   │   └── security-headers.test.ts
    │   └── e2e/
    │       ├── homepage.spec.ts
    │       ├── pricing.spec.ts
    │       └── authentication-links.spec.ts
    │
    └── scripts/
        ├── verify-env.mjs
        ├── generate-sitemap.mjs
        └── check-links.mjs
