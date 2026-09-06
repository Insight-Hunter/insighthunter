import { describe, expect, it } from "vitest";
import type { Env } from "../src/env.js";
import app from "../src/index.js";
import { loginUrl, signupUrl } from "../src/lib/links.js";
import { isRateLimited } from "../src/lib/rate-limit.js";
import { validateContactForm } from "../src/lib/validate.js";

const baseEnv: Env = {
  CANONICAL_ORIGIN: "https://insighthunter.app",
  AUTH_ORIGIN: "https://auth.insighthunter.app",
  APP_ORIGIN: "https://app.insighthunter.app",
  CONTACT_TO_EMAIL: "sales@insighthunter.app",
  RATE_LIMIT: createFakeKv(),
};

function createFakeKv(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
}

describe("CTA links", () => {
  it("builds the exact required signup URL for each plan", () => {
    expect(signupUrl(baseEnv, "startup")).toBe(
      "https://auth.insighthunter.app/register?plan=startup",
    );
    expect(signupUrl(baseEnv, "standard")).toBe(
      "https://auth.insighthunter.app/register?plan=standard",
    );
    expect(signupUrl(baseEnv, "pro")).toBe("https://auth.insighthunter.app/register?plan=pro");
  });

  it("builds the exact required login URL", () => {
    expect(loginUrl(baseEnv)).toBe(
      "https://auth.insighthunter.app/login?return_to=https%3A%2F%2Fapp.insighthunter.app%2Fdashboard",
    );
  });

  it("never uses the misspelled domain", () => {
    expect(signupUrl(baseEnv, "startup")).not.toContain("insighthutner");
    expect(loginUrl(baseEnv)).not.toContain("insighthutner");
  });
});

describe("public routes", () => {
  it("serves the homepage with canonical and CTA links", async () => {
    const res = await app.fetch(new Request("https://insighthunter.app/"), baseEnv);
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).toContain('rel="canonical"');
    expect(bodyText).toContain("https://auth.insighthunter.app/register?plan=startup");
    expect(bodyText).toContain("https://auth.insighthunter.app/login?return_to=");
  });

  it("serves pricing with a signup CTA per plan", async () => {
    const res = await app.fetch(new Request("https://insighthunter.app/pricing"), baseEnv);
    const bodyText = await res.text();
    expect(bodyText).toContain("plan=startup");
    expect(bodyText).toContain("plan=standard");
    expect(bodyText).toContain("plan=pro");
  });

  it("serves robots.txt and sitemap.xml", async () => {
    const robots = await app.fetch(new Request("https://insighthunter.app/robots.txt"), baseEnv);
    expect(await robots.text()).toContain("Sitemap: https://insighthunter.app/sitemap.xml");

    const sitemap = await app.fetch(new Request("https://insighthunter.app/sitemap.xml"), baseEnv);
    expect(sitemap.headers.get("Content-Type")).toContain("xml");
    expect(await sitemap.text()).toContain("<loc>https://insighthunter.app/pricing</loc>");
  });

  it("applies strict security headers", async () => {
    const res = await app.fetch(new Request("https://insighthunter.app/"), baseEnv);
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain("script-src 'self'");
    expect(res.headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });

  it("returns 404 for unknown paths", async () => {
    const res = await app.fetch(new Request("https://insighthunter.app/nope"), baseEnv);
    expect(res.status).toBe(404);
  });
});

describe("contact form", () => {
  it("rejects invalid submissions with field errors", () => {
    const form = new FormData();
    form.set("name", "A");
    form.set("email", "not-an-email");
    form.set("message", "short");
    const result = validateContactForm(form);
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.message).toBeDefined();
  });

  it("accepts a valid submission", () => {
    const form = new FormData();
    form.set("name", "Jordan Rivera");
    form.set("email", "jordan@example.com");
    form.set("company", "Example Co");
    form.set("message", "We'd like a demo of the Hunter plan.");
    const result = validateContactForm(form);
    expect(result.ok).toBe(true);
  });

  it("rejects honeypot-filled submissions and flags them distinctly from field errors", () => {
    const form = new FormData();
    form.set("name", "Jordan Rivera");
    form.set("email", "jordan@example.com");
    form.set("message", "We'd like a demo of the Hunter plan.");
    form.set("website", "http://spam.example");
    const result = validateContactForm(form);
    expect(result.ok).toBe(false);
    expect(result.bot).toBe(true);
    expect(result.errors.message).toBeUndefined();
  });

  it("submits successfully end-to-end via the worker", async () => {
    const form = new FormData();
    form.set("name", "Jordan Rivera");
    form.set("email", "jordan@example.com");
    form.set("company", "Example Co");
    form.set("message", "We'd like a demo of the Hunter plan.");
    const res = await app.fetch(
      new Request("https://insighthunter.app/contact", { method: "POST", body: form }),
      baseEnv,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Thanks");
  });

  it("rate-limits repeated submissions from the same client", async () => {
    const env = { ...baseEnv, RATE_LIMIT: createFakeKv() };
    let limited = false;
    for (let i = 0; i < 10; i++) {
      limited = await isRateLimited(env, "1.2.3.4");
      if (limited) break;
    }
    expect(limited).toBe(true);
  });

  it("rejects bot submissions without consuming the rate-limit budget", async () => {
    const env = { ...baseEnv, RATE_LIMIT: createFakeKv() };

    for (let i = 0; i < 20; i++) {
      const spamForm = new FormData();
      spamForm.set("name", "Bot");
      spamForm.set("email", "bot@example.com");
      spamForm.set("message", "This is a spam submission from a bot.");
      spamForm.set("website", "http://spam.example");
      await app.fetch(
        new Request("https://insighthunter.app/contact", { method: "POST", body: spamForm }),
        env,
      );
    }

    // A real request right after 20 bot attempts should not be rate-limited,
    // since bot submissions never increment the counter.
    const realForm = new FormData();
    realForm.set("name", "Jordan Rivera");
    realForm.set("email", "jordan@example.com");
    realForm.set("message", "We'd like a demo of the Hunter plan.");
    const res = await app.fetch(
      new Request("https://insighthunter.app/contact", { method: "POST", body: realForm }),
      env,
    );
    expect(res.status).toBe(200);
  });
});
