import { html } from "hono/html";

export function securityBody() {
  return html`
<section>
  <h1>Security</h1>
  <p class="lede">Insight Hunter's public marketing site is intentionally isolated from tenant data, dashboard logic, and authentication credentials.</p>
</section>
<section aria-labelledby="boundary-heading">
  <h2 id="boundary-heading">Isolation Boundary</h2>
  <ul>
    <li>This site serves only public marketing content and a validated contact form &mdash; it holds no tenant financial data, session tokens, or billing secrets.</li>
    <li>Sign-in and account creation happen exclusively on the dedicated authentication gateway.</li>
    <li>The authenticated dashboard (Command Center) is a separate application that verifies sessions independently.</li>
  </ul>
</section>
<section aria-labelledby="practices-heading">
  <h2 id="practices-heading">Site-level Practices</h2>
  <div class="grid-3">
    <div class="card"><h3>Strict transport security</h3><p>HSTS, a locked-down Content-Security-Policy, and no third-party scripts.</p></div>
    <div class="card"><h3>Input validation</h3><p>Contact form submissions are validated and length-capped before use.</p></div>
    <div class="card"><h3>Privacy-safe logging</h3><p>Request logs record method, path, status, and duration only &mdash; never form contents.</p></div>
  </div>
</section>
<section aria-labelledby="report-heading">
  <h2 id="report-heading">Report a Vulnerability</h2>
  <p>If you believe you've found a security issue, please <a href="/contact">contact us</a> with details so we can investigate promptly.</p>
</section>
`;
}
