import { html } from "hono/html";

export function addonsBody() {
  return html`
<section>
  <p class="eyebrow">Build your own mix</p>
  <h1>Add the modules your business needs.</h1>
  <p class="lede">Preview a plan plus optional services. This is a calculator only&mdash;it does not create a subscription or charge a payment method.</p>
</section>

<section aria-labelledby="addons-heading">
  <h2 id="addons-heading">Choose a base plan</h2>
  <div class="billing-control" role="group" aria-label="Choose a base plan" id="addon-plan">
    <button type="button" data-base-plan data-price="0" aria-pressed="true">Lite</button>
    <button type="button" data-base-plan data-price="49" aria-pressed="false">Standard</button>
    <button type="button" data-base-plan data-price="149" aria-pressed="false">Pro</button>
  </div>
  <h2 class="addons-subheading">Optional modules</h2>
  <div class="addon-list" id="addon-list">
    <label class="addon-card">
      <input type="checkbox" class="addon-toggle" data-price="199" data-interval="once" />
      <span><h3>BizForma filing support</h3><p>One-time guided formation and filing support, based on your business needs.</p><span class="addon-price">$199 one time <span class="price-preview">preview</span></span></span>
    </label>
    <label class="addon-card">
      <input type="checkbox" class="addon-toggle" data-price="29" data-interval="month" />
      <span><h3>PBX communications</h3><p>Business phone, voicemail, SMS, and automessage workflows.</p><span class="addon-price">$29 / month <span class="price-preview">preview</span></span></span>
    </label>
    <label class="addon-card">
      <input type="checkbox" class="addon-toggle" data-price="49" data-interval="month" />
      <span><h3>Payroll</h3><p>Add payroll workflows to Lite or Standard; availability can depend on your service setup.</p><span class="addon-price">$49 / month <span class="price-preview">preview</span></span></span>
    </label>
    <label class="addon-card">
      <input type="checkbox" class="addon-toggle" data-price="39" data-interval="month" />
      <span><h3>AI CFO assistance</h3><p>Automated advisory insights to support planning conversations, not replace professional advice.</p><span class="addon-price">$39 / month <span class="price-preview">preview</span></span></span>
    </label>
  </div>
  <div class="addon-summary" aria-live="polite">
    <span>Monthly estimate <strong id="addon-monthly-total">$0/mo</strong></span>
    <span>One-time estimate <strong id="addon-once-total">$0</strong></span>
    <a class="btn btn-primary" href="/pricing">Review plans</a>
  </div>
  <p class="addon-disclaimer">Preview prices are illustrative and subject to confirmation. No checkout or payment is initiated here.</p>
</section>
`;
}
