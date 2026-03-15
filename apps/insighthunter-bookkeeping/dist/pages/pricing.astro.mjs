import { c as createComponent, d as renderHead, r as renderComponent, b as renderTemplate } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
/* empty css                                  */
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
import { c as FiCheck } from '../chunks/index_IorU0Hm2.mjs';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

const PRICING_PLANS = {
  starter: [
    {
      id: "starter-monthly",
      name: "Starter",
      tier: "starter",
      price: 29,
      currency: "USD",
      billingPeriod: "monthly",
      features: [
        "Up to 500 transactions/month",
        "2 bank account connections",
        "Basic financial reports",
        "Invoice management",
        "Email support",
        "5GB storage"
      ],
      limits: {
        transactions: 500,
        bankAccounts: 2,
        users: 1,
        storage: 5,
        aiReconciliations: 50
      },
      stripePriceId: "price_starter_monthly"
    },
    {
      id: "starter-yearly",
      name: "Starter",
      tier: "starter",
      price: 290,
      // 2 months free
      currency: "USD",
      billingPeriod: "yearly",
      features: [
        "Up to 500 transactions/month",
        "2 bank account connections",
        "Basic financial reports",
        "Invoice management",
        "Email support",
        "5GB storage",
        "2 months free"
      ],
      limits: {
        transactions: 500,
        bankAccounts: 2,
        users: 1,
        storage: 5,
        aiReconciliations: 50
      },
      stripePriceId: "price_starter_yearly"
    }
  ],
  professional: [
    {
      id: "professional-monthly",
      name: "Professional",
      tier: "professional",
      price: 79,
      currency: "USD",
      billingPeriod: "monthly",
      features: [
        "Unlimited transactions",
        "10 bank account connections",
        "Advanced financial reports",
        "AI-powered reconciliation",
        "Invoice & expense management",
        "QuickBooks integration",
        "Priority support",
        "50GB storage",
        "Multi-user access (up to 5)"
      ],
      limits: {
        transactions: -1,
        // unlimited
        bankAccounts: 10,
        users: 5,
        storage: 50,
        aiReconciliations: 500
      },
      stripePriceId: "price_professional_monthly"
    },
    {
      id: "professional-yearly",
      name: "Professional",
      tier: "professional",
      price: 790,
      currency: "USD",
      billingPeriod: "yearly",
      features: [
        "Unlimited transactions",
        "10 bank account connections",
        "Advanced financial reports",
        "AI-powered reconciliation",
        "Invoice & expense management",
        "QuickBooks integration",
        "Priority support",
        "50GB storage",
        "Multi-user access (up to 5)",
        "2 months free"
      ],
      limits: {
        transactions: -1,
        bankAccounts: 10,
        users: 5,
        storage: 50,
        aiReconciliations: 500
      },
      stripePriceId: "price_professional_yearly"
    }
  ],
  enterprise: [
    {
      id: "enterprise-monthly",
      name: "Enterprise",
      tier: "enterprise",
      price: 199,
      currency: "USD",
      billingPeriod: "monthly",
      features: [
        "Unlimited everything",
        "Unlimited bank connections",
        "Custom financial reports",
        "Unlimited AI reconciliation",
        "Full API access",
        "Dedicated account manager",
        "Custom integrations",
        "Unlimited storage",
        "Unlimited users",
        "SLA guarantee",
        "White-label option"
      ],
      limits: {
        transactions: -1,
        bankAccounts: -1,
        users: -1,
        storage: -1,
        aiReconciliations: -1
      },
      stripePriceId: "price_enterprise_monthly"
    },
    {
      id: "enterprise-yearly",
      name: "Enterprise",
      tier: "enterprise",
      price: 1990,
      currency: "USD",
      billingPeriod: "yearly",
      features: [
        "Unlimited everything",
        "Unlimited bank connections",
        "Custom financial reports",
        "Unlimited AI reconciliation",
        "Full API access",
        "Dedicated account manager",
        "Custom integrations",
        "Unlimited storage",
        "Unlimited users",
        "SLA guarantee",
        "White-label option",
        "2 months free"
      ],
      limits: {
        transactions: -1,
        bankAccounts: -1,
        users: -1,
        storage: -1,
        aiReconciliations: -1
      },
      stripePriceId: "price_enterprise_yearly"
    }
  ]
};

function PricingCards() {
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const handleSelectPlan = (planId) => {
    window.location.href = `/checkout?plan=${planId}`;
  };
  return /* @__PURE__ */ jsxs("div", { className: "pricing-container", children: [
    /* @__PURE__ */ jsxs("div", { className: "billing-toggle", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          className: billingPeriod === "monthly" ? "active" : "",
          onClick: () => setBillingPeriod("monthly"),
          children: "Monthly"
        }
      ),
      /* @__PURE__ */ jsxs(
        "button",
        {
          className: billingPeriod === "yearly" ? "active" : "",
          onClick: () => setBillingPeriod("yearly"),
          children: [
            "Yearly ",
            /* @__PURE__ */ jsx("span", { className: "badge", children: "Save 17%" })
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "pricing-cards", children: ["insight-lite", "standard", "pro"].map((tier) => {
      const plan = PRICING_PLANS[tier].find(
        (p) => p.billingPeriod === billingPeriod
      );
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: `pricing-card ${tier === "standard" ? "featured" : ""}`,
          children: [
            tier === "standard" && /* @__PURE__ */ jsx("div", { className: "featured-badge", children: "Most Popular" }),
            /* @__PURE__ */ jsxs("div", { className: "card-header", children: [
              /* @__PURE__ */ jsx("h3", { children: plan.name }),
              /* @__PURE__ */ jsxs("div", { className: "price", children: [
                /* @__PURE__ */ jsx("span", { className: "currency", children: "$" }),
                /* @__PURE__ */ jsx("span", { className: "amount", children: plan.price }),
                /* @__PURE__ */ jsxs("span", { className: "period", children: [
                  "/",
                  billingPeriod === "monthly" ? "mo" : "yr"
                ] })
              ] }),
              billingPeriod === "yearly" && /* @__PURE__ */ jsxs("p", { className: "savings", children: [
                "Save $",
                plan.price - plan.price / 10 * 12
              ] })
            ] }),
            /* @__PURE__ */ jsx("ul", { className: "features-list", children: plan.features.map((feature, index) => /* @__PURE__ */ jsxs("li", { children: [
              /* @__PURE__ */ jsx(FiCheck, { className: "check-icon" }),
              /* @__PURE__ */ jsx("span", { children: feature })
            ] }, index)) }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => handleSelectPlan(plan.id),
                className: `select-plan-btn ${tier === "standard" ? "primary" : "secondary"}`,
                children: plan.price === 0 ? "Get Started" : "Start Free Trial"
              }
            )
          ]
        },
        plan.id
      );
    }) }),
    /* @__PURE__ */ jsx("div", { className: "pricing-note", children: /* @__PURE__ */ jsx("p", { children: "All plans include a 14-day free trial, except for Insight-Lite which is always free." }) })
  ] });
}

const $$Pricing = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="en" data-astro-cid-lmkygsfs> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Pricing - InsightHunter Bookkeeping</title>${renderHead()}</head> <body data-astro-cid-lmkygsfs> <nav class="simple-nav" data-astro-cid-lmkygsfs> <div class="nav-container" data-astro-cid-lmkygsfs> <a href="/" class="logo" data-astro-cid-lmkygsfs>InsightHunter</a> <div class="nav-links" data-astro-cid-lmkygsfs> <a href="/" data-astro-cid-lmkygsfs>Home</a> <a href="/login" data-astro-cid-lmkygsfs>Log In</a> </div> </div> </nav> <section class="pricing-hero" data-astro-cid-lmkygsfs> <h1 data-astro-cid-lmkygsfs>Choose Your Plan</h1> <p data-astro-cid-lmkygsfs>Start with a 14-day free trial. No credit card required.</p> </section> ${renderComponent($$result, "PricingCards", PricingCards, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/payment/PricingCards", "client:component-export": "default", "data-astro-cid-lmkygsfs": true })} <section class="faq" data-astro-cid-lmkygsfs> <div class="container" data-astro-cid-lmkygsfs> <h2 data-astro-cid-lmkygsfs>Frequently Asked Questions</h2> <div class="faq-grid" data-astro-cid-lmkygsfs> <div class="faq-item" data-astro-cid-lmkygsfs> <h3 data-astro-cid-lmkygsfs>Can I change plans later?</h3> <p data-astro-cid-lmkygsfs>Yes! You can upgrade or downgrade at any time. Changes take effect immediately and we'll prorate the difference.</p> </div> <div class="faq-item" data-astro-cid-lmkygsfs> <h3 data-astro-cid-lmkygsfs>What happens after the free trial?</h3> <p data-astro-cid-lmkygsfs>Your card will be charged after 14 days. You can cancel anytime during the trial with no charge.</p> </div> <div class="faq-item" data-astro-cid-lmkygsfs> <h3 data-astro-cid-lmkygsfs>Do you offer refunds?</h3> <p data-astro-cid-lmkygsfs>Yes! We offer a 30-day money-back guarantee on all annual plans. Monthly plans can be cancelled anytime.</p> </div> <div class="faq-item" data-astro-cid-lmkygsfs> <h3 data-astro-cid-lmkygsfs>What payment methods do you accept?</h3> <p data-astro-cid-lmkygsfs>We accept all major credit cards (Visa, Mastercard, Amex) and ACH bank transfers for annual plans.</p> </div> <div class="faq-item" data-astro-cid-lmkygsfs> <h3 data-astro-cid-lmkygsfs>Is my data secure?</h3> <p data-astro-cid-lmkygsfs>Absolutely. We use bank-level 256-bit encryption and are SOC 2 Type II certified. Your data is backed up daily.</p> </div> <div class="faq-item" data-astro-cid-lmkygsfs> <h3 data-astro-cid-lmkygsfs>Can I import my existing data?</h3> <p data-astro-cid-lmkygsfs>Yes! We support imports from QuickBooks, Excel, CSV, and other major accounting platforms.</p> </div> </div> </div> </section> </body></html>`;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/pricing.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/pricing.astro";
const $$url = "/pricing";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Pricing,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
