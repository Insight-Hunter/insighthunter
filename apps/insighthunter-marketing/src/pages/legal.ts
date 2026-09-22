import { html } from "hono/html";

export function privacyBody() {
  return html`
<section>
  <h1>Privacy Policy</h1>
  <p class="lede">Last updated 2026-09-06. This policy covers the public marketing site only.</p>
</section>
<section aria-labelledby="collect-heading">
  <h2 id="collect-heading">What We Collect</h2>
  <p>The marketing site collects only what you submit through the <a href="/contact">contact form</a> (name, email, company, message) to respond to your inquiry. We do not use third-party analytics or advertising trackers on this site.</p>
</section>
<section aria-labelledby="use-heading">
  <h2 id="use-heading">How We Use It</h2>
  <p>Contact submissions are used solely to respond to your inquiry and are not shared with third parties except as required to operate our email and CRM tooling.</p>
</section>
<section aria-labelledby="rights-heading">
  <h2 id="rights-heading">Your Rights</h2>
  <p>You may request access to, correction of, or deletion of your contact submission at any time by emailing <a href="mailto:privacy@insighthunter.app">privacy@insighthunter.app</a>.</p>
</section>
`;
}

export function termsBody() {
  return html`
<section>
  <h1>Terms of Service</h1>
  <p class="lede">Last updated 2026-09-06. These terms cover use of the public marketing site.</p>
</section>
<section aria-labelledby="use-of-site-heading">
  <h2 id="use-of-site-heading">Use of This Site</h2>
  <p>This site is provided to help you evaluate the Insight Hunter platform. Subscription terms, service levels, and acceptable use for the product itself are presented during signup and in your account agreement.</p>
</section>
<section aria-labelledby="contact-heading">
  <h2 id="contact-heading">Questions</h2>
  <p>Reach out any time via <a href="/contact">our contact form</a>.</p>
</section>
`;
}
