import { html } from "hono/html";

export function aboutBody() {
  return html`
<section>
  <h1>About Insight Hunter</h1>
  <p class="lede">We build practical financial operations software for small businesses that need a clearer view of bookkeeping, cash flow, and the work ahead.</p>
</section>
<section aria-labelledby="mission-heading">
  <h2 id="mission-heading">Our Mission</h2>
  <p>Small businesses deserve useful financial visibility without enterprise overhead. Insight Hunter connects bookkeeping, reporting, and optional operating services so owners can spend less time reconciling fragmented information.</p>
</section>
<section aria-labelledby="how-heading">
  <h2 id="how-heading">How We Work</h2>
  <div class="grid-3">
    <div class="card"><h3>Data-first</h3><p>Every feature ships with a measurable outcome for the team using it.</p></div>
    <div class="card"><h3>Privacy by design</h3><p>The public site and marketing systems never touch tenant financial data or credentials.</p></div>
    <div class="card"><h3>Built for scale</h3><p>From indie operators to enterprise data teams on a single platform.</p></div>
  </div>
</section>
`;
}
