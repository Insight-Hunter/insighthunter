import { html } from "hono/html";
import type { Env } from "../env.js";
import { signupUrl } from "../lib/links.js";

export function pricingBody(env: Pick<Env, "AUTH_ORIGIN">) {
  return html`
<section>
  <h1>Simple, Transparent Pricing</h1>
  <p class="lede">Three tiers built to scale from indie operators to enterprise data teams. Annual billing saves 20% &mdash; contact sales for an annual quote.</p>
</section>

<section aria-labelledby="pricing-grid-heading">
  <h2 id="pricing-grid-heading">Choose Your Plan</h2>
  <div class="pricing-grid">
    <div class="price-card">
      <h3>Scout</h3>
      <p>For indie operators who need the core monitoring tools.</p>
      <div class="price">$0<span>/mo</span></div>
      <ul class="price-features">
        <li>Autonomous trend monitoring (1 market)</li>
        <li>Weekly digest email</li>
        <li>1 user seat</li>
        <li>30-day data history</li>
      </ul>
      <a class="btn btn-primary" style="text-align:center;" href="${signupUrl(env, "startup")}" rel="nofollow">Start Free Trial</a>
    </div>
    <div class="price-card featured">
      <span class="badge-ribbon">Most Popular</span>
      <h3>Hunter</h3>
      <p>For scaling companies that need automated alerts and predictive models.</p>
      <div class="price">$49<span>/mo</span></div>
      <ul class="price-features">
        <li>Everything in Scout</li>
        <li>Competitor anomaly alerts</li>
        <li>Predictive demand scopes</li>
        <li>5 user seats + roles</li>
        <li>Unlimited data history</li>
      </ul>
      <a class="btn btn-primary" style="text-align:center;" href="${signupUrl(env, "standard")}" rel="nofollow">Start Free Trial</a>
    </div>
    <div class="price-card">
      <h3>Apex</h3>
      <p>For enterprise operations that need full API access and dedicated nodes.</p>
      <div class="price">$149<span>/mo</span></div>
      <ul class="price-features">
        <li>Everything in Hunter</li>
        <li>Full API access</li>
        <li>Dedicated scanning nodes</li>
        <li>Unlimited user seats</li>
        <li>Priority support</li>
      </ul>
      <a class="btn btn-primary" style="text-align:center;" href="${signupUrl(env, "pro")}" rel="nofollow">Start Free Trial</a>
    </div>
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
