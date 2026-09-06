import { html } from "hono/html";
import type { Env } from "../env.js";
import { signupUrl } from "../lib/links.js";
import { PLANS } from "../lib/plans.js";

export function pricingBody(env: Pick<Env, "AUTH_ORIGIN">) {
  return html`
<section>
  <h1>Simple, Transparent Pricing</h1>
  <p class="lede">Three tiers built to scale from indie operators to enterprise data teams. Annual billing saves 20% &mdash; contact sales for an annual quote.</p>
</section>

<section aria-labelledby="pricing-grid-heading">
  <h2 id="pricing-grid-heading">Choose Your Plan</h2>
  <div class="pricing-grid">
    ${PLANS.map(
      (plan, index) => html`
    <div class="price-card${index === 1 ? " featured" : ""}">
      ${index === 1 ? html`<span class="badge-ribbon">Most Popular</span>` : ""}
      <h3>${plan.name}</h3>
      <p>${plan.tagline}</p>
      <div class="price">$${String(plan.priceUsd)}<span>/mo</span></div>
      <ul class="price-features">
        ${plan.features.map((feature) => html`<li>${feature}</li>`)}
      </ul>
      <a class="btn btn-primary" style="text-align:center;" href="${signupUrl(env, plan.planId)}" rel="nofollow">Start Free Trial</a>
    </div>`,
    )}
  </div>
</section>

<section aria-labelledby="pricing-addons-heading">
  <h2 id="pricing-addons-heading">Add-on Modules</h2>
  <p class="lede">Tack any of these onto your plan. See full details on the <a href="/addons">add-on marketplace</a>.</p>
  <div class="grid-3">
    <div class="card"><h3>Historical Data Vault Link</h3><p>Instant unlock of 5+ years of archive trend data.</p></div>
    <div class="card"><h3>Advanced API Pipeline</h3><p>Direct webhook access for custom CRMs.</p></div>
    <div class="card"><h3>Niche Industry Data Packs</h3><p>Deep-dives into specific micro-markets.</p></div>
  </div>
</section>

<section aria-labelledby="pricing-enterprise-heading">
  <h2 id="pricing-enterprise-heading">Need Something Custom?</h2>
  <p class="lede">Enterprise operations with compliance or dedicated-node requirements can talk to sales directly.</p>
  <a class="btn btn-outline" href="/contact">Contact Sales</a>
</section>
`;
}
