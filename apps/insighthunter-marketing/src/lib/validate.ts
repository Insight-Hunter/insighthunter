export interface ContactSubmission {
  name: string;
  email: string;
  company: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  /** True when the honeypot field was filled in — treated as a bot, never a user-facing field error. */
  bot: boolean;
  errors: Partial<Record<keyof ContactSubmission, string>>;
  value: ContactSubmission;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trims and length-caps free text so oversized payloads can't be stored or relayed. */
function clean(value: ReturnType<FormData["get"]>, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function validateContactForm(form: FormData): ValidationResult {
  const value: ContactSubmission = {
    name: clean(form.get("name"), 120),
    email: clean(form.get("email"), 254),
    company: clean(form.get("company"), 120),
    message: clean(form.get("message"), 2000),
  };

  const errors: ValidationResult["errors"] = {};
  if (value.name.length < 2) errors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(value.email)) errors.email = "Enter a valid work email address.";
  if (value.message.length < 10) errors.message = "Tell us a bit more (at least 10 characters).";

  // Honeypot field: real users never fill in `website`, bots often do. Kept
  // as a distinct flag rather than a field error so it can be handled before
  // (and independently of) rate limiting and doesn't get conflated with a
  // genuine message-length error.
  const honeypot = clean(form.get("website"), 200);
  const bot = honeypot.length > 0;

  return { ok: !bot && Object.keys(errors).length === 0, bot, errors, value };
}
