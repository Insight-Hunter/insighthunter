import { html } from "hono/html";

export function addonsBody() {
  return html`
<section>
  <h1>Add-on Marketplace</h1>
  <p class="lede">Extend any core subscription with focused data modules. Toggle the checkboxes to preview your simulated monthly total &mdash; nothing is charged from this page.</p>
</section>

<section aria-labelledby="addons-heading">
  <h2 id="addons-heading">Available Add-ons</h2>
  <p style="color:var(--accent);font-weight:700;">Promo price for add-ons expires end of week.</p>
  <div class="grid-3" id="addon-list">
    <label class="card" style="cursor:pointer;">
      <input type="checkbox" class="addon-toggle" data-price="19" />
      <h3>Historical Data Vault Link</h3>
      <p>Instant unlock of 5+ years of archive trend data.</p>
      <p><strong>$19/mo</strong></p>
    </label>
    <label class="card" style="cursor:pointer;">
      <input type="checkbox" class="addon-toggle" data-price="29" />
      <h3>Advanced API Pipeline</h3>
      <p>Direct webhook access for custom CRMs.</p>
      <p><strong>$29/mo</strong></p>
    </label>
    <label class="card" style="cursor:pointer;">
      <input type="checkbox" class="addon-toggle" data-price="39" />
      <h3>Niche Industry Data Packs</h3>
      <p>Deep-dives into specific micro-markets.</p>
      <p><strong>$39/mo</strong></p>
    </label>
  </div>
  <p style="margin-top:1.5rem;font-size:1.1rem;">Estimated add-on total: <strong id="addon-total">$0/mo</strong></p>
  <div class="hero-ctas">
    <a class="btn btn-primary" href="/pricing">Choose a Plan &amp; Add-ons</a>
  </div>
</section>
`;
}
