import { html } from "hono/html";
import type { Env } from "../env.js";
import { signupUrl } from "../lib/links.js";
import { PLANS } from "../lib/plans.js";

export function pricingBody(env: Pick<Env, "AUTH_ORIGIN">) {
  return html`
<section>
  <p class="eyebrow">Straightforward plans for the next stage</p>
  <h1>Start free. Scale when you're ready.</h1>
  <p class="lede">Start with core bookkeeping, add reporting and payroll as you grow, and unlock the full module set when your operation needs it.</p>
  <div class="billing-control" role="group" aria-label="Billing frequency">
    <button type="button" data-billing="monthly" aria-pressed="true">Monthly</button>
    <button type="button" data-billing="annual" aria-pressed="false">Annual <span class="billing-savings">SAVE 20%</span></button>
  </div>
</section>

<section aria-labelledby="pricing-grid-heading">
  <h2 id="pricing-grid-heading">Choose the right starting point</h2>
  <div class="pricing-grid">
    ${PLANS.map(
      (plan) => {
        const annualEquivalent = (plan.priceUsd * 0.8).toFixed(2);
        const annualTotal = (plan.priceUsd * 12 * 0.8).toFixed(2);
        return html`
    <article class="price-card${plan.planId === "standard" ? " featured" : ""}">
      ${plan.planId === "standard" ? html`<span class="badge-ribbon">Most popular</span>` : ""}
      <h3>${plan.name}</h3>
      <p>${plan.tagline}</p>
      <div class="price" data-price data-monthly="${String(plan.priceUsd)}" data-annual="${annualEquivalent}" data-annual-total="${annualTotal}">${plan.priceUsd === 0 ? "Free" : `$${String(plan.priceUsd)}`}<span>${plan.priceUsd === 0 ? "forever" : "/mo"}</span></div>
      <p class="price-note" data-price-note>${plan.priceUsd === 0 ? "No card required" : "Billed monthly"}</p>
      <ul class="price-features">
        ${plan.features.map((feature) => html`<li>${feature}</li>`)}
      </ul>
      <a class="btn btn-primary" href="${signupUrl(env, plan.planId)}" rel="nofollow">${plan.priceUsd === 0 ? "Start free" : "Choose " + plan.name}</a>
    </article>`;
    )}
  </div>
  <p class="pricing-note">Annual billing is shown as a discounted monthly equivalent and billed yearly. Choose a plan at signup; add-ons are optional.</p>
</section>

<section aria-labelledby="pricing-addons-heading">
  <h2 id="pricing-addons-heading">Build a plan around your operation.</h2>
  <p class="lede">BizForma filings, PBX communications, payroll, and AI CFO assistance can be added independently. Preview a mix on the <a href="/addons">add-on marketplace</a>.</p>
</section>

<section aria-labelledby="pricing-enterprise-heading">
  <h2 id="pricing-enterprise-heading">Need help choosing?</h2>
  <p class="lede">Talk with our team about the workflows that fit your business.</p>
  <a class="btn btn-outline" href="/contact">Talk with our team</a>
</section>
`;
}
