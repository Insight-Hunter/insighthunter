import { html } from "hono/html";
import type { ContactSubmission, ValidationResult } from "../lib/validate.js";

export function contactBody(options: {
  success?: boolean;
  rateLimited?: boolean;
  errors?: ValidationResult["errors"];
  value?: ContactSubmission;
}) {
  const { success, rateLimited, errors = {}, value } = options;
  const field = (name: keyof ContactSubmission) => value?.[name] ?? "";

  return html`
<section>
  <h1>Contact Sales</h1>
  <p class="lede">Tell us about your team and we'll follow up within one business day.</p>
</section>
<section aria-labelledby="contact-form-heading">
  <h2 id="contact-form-heading">Get In Touch</h2>
  ${
    success
      ? html`<p class="alert alert-success" role="status">Thanks &mdash; your message has been received. We'll be in touch soon.</p>`
      : ""
  }
  ${
    rateLimited
      ? html`<p class="alert alert-error" role="alert">Too many submissions from this connection. Please try again in a minute.</p>`
      : ""
  }
  <form method="post" action="/contact" novalidate>
    <label>
      Name
      <input type="text" name="name" autocomplete="name" required maxlength="120" value="${field("name")}" />
      ${errors.name ? html`<span class="field-error">${errors.name}</span>` : ""}
    </label>
    <label>
      Work email
      <input type="email" name="email" autocomplete="email" required maxlength="254" value="${field("email")}" />
      ${errors.email ? html`<span class="field-error">${errors.email}</span>` : ""}
    </label>
    <label>
      Company
      <input type="text" name="company" autocomplete="organization" maxlength="120" value="${field("company")}" />
    </label>
    <label>
      Message
      <textarea name="message" required maxlength="2000">${field("message")}</textarea>
      ${errors.message ? html`<span class="field-error">${errors.message}</span>` : ""}
    </label>
    <label class="honeypot" aria-hidden="true">
      Website
      <input type="text" name="website" tabindex="-1" autocomplete="off" />
    </label>
    <button type="submit" class="btn btn-primary">Send Message</button>
  </form>
</section>
`;
}
