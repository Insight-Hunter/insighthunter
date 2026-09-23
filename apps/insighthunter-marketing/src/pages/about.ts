import { html } from "hono/html";

export function aboutBody() {
  return html`
<section>
  <h1>About Insight Hunter</h1>
  <p class="lede">We build the business insight generator teams use to replace manual competitive research with automated, always-on market intelligence.</p>
</section>
<section aria-labelledby="mission-heading">
  <h2 id="mission-heading">Our Mission</h2>
  <p>Product, growth, and strategy teams lose days every month manually tracking competitors and market signals across dozens of sources. Insight Hunter automates that work so decisions can be made on current data instead of stale spreadsheets.</p>
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
