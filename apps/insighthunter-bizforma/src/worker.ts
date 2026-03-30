/**
 * BizForma - Business Formation App
 * Cloudflare Worker Backend
 *
 * Routes:
 *   GET  /api/health          - Health check
 *   POST /api/progress        - Save user's form progress
 *   GET  /api/progress/:id    - Load user's form progress
 *   POST /api/check-name      - Business name availability check
 *   POST /api/check-domain    - Domain availability check
 *   GET  /api/resources/:step - Get curated resources for a step
 *   POST /api/generate-doc    - AI-generated document (op agreement, etc.)
 *   GET  /api/deadlines       - Tax/compliance deadline calendar
 *   POST /api/export          - Export progress as PDF summary
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// ─── Environment Types ────────────────────────────────────────────────────────
export interface Env {
  // KV for session/progress storage
  BIZFORMA_KV: KVNamespace;
  // D1 for structured business data
  BIZFORMA_DB: D1Database;
  // AI for document generation
  AI: Ai;
  // Analytics
  ANALYTICS: AnalyticsEngineDataset;
  // Env vars
  ENVIRONMENT: string;
  CLAUDE_API_KEY: string;
}

// ─── Application ──────────────────────────────────────────────────────────────
const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["https://bizforma.insighthunter.app", "http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (c) =>
  c.json({ status: "ok", version: "1.0.0", env: c.env.ENVIRONMENT })
);

// ─── Progress: Save ───────────────────────────────────────────────────────────
app.post("/api/progress", async (c) => {
  try {
    const body = await c.req.json<{
      sessionId: string;
      businessName?: string;
      data: Record<string, unknown>;
    }>();

    if (!body.sessionId || !body.data) {
      return c.json({ error: "sessionId and data are required" }, 400);
    }

    // Sanitize sessionId - alphanumeric and hyphens only
    const sessionId = body.sessionId.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);

    const payload = {
      sessionId,
      businessName: (body.businessName || "").slice(0, 200),
      data: body.data,
      updatedAt: new Date().toISOString(),
    };

    await c.env.BIZFORMA_KV.put(
      `progress:${sessionId}`,
      JSON.stringify(payload),
      { expirationTtl: 60 * 60 * 24 * 90 } // 90 days
    );

    // Track analytics (non-blocking)
    c.env.ANALYTICS.writeDataPoint({
      blobs: ["progress_saved", sessionId],
      doubles: [Object.keys(body.data).length],
      indexes: [sessionId],
    });

    return c.json({ success: true, sessionId });
  } catch (err) {
    console.error("Save progress error:", err);
    return c.json({ error: "Failed to save progress" }, 500);
  }
});

// ─── Progress: Load ───────────────────────────────────────────────────────────
app.get("/api/progress/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);
    const raw = await c.env.BIZFORMA_KV.get(`progress:${sessionId}`);

    if (!raw) {
      return c.json({ found: false, data: {} });
    }

    const payload = JSON.parse(raw);
    return c.json({ found: true, ...payload });
  } catch (err) {
    console.error("Load progress error:", err);
    return c.json({ error: "Failed to load progress" }, 500);
  }
});

// ─── Business Name Check ──────────────────────────────────────────────────────
app.post("/api/check-name", async (c) => {
  try {
    const { name, state } = await c.req.json<{ name: string; state?: string }>();

    if (!name || name.length < 2) {
      return c.json({ error: "Name too short" }, 400);
    }

    const cleanName = name.slice(0, 100).trim();

    // Check our D1 cache for previously-checked names
    const cached = await c.env.BIZFORMA_DB
      .prepare("SELECT * FROM name_checks WHERE name = ? AND checked_at > datetime('now', '-1 day')")
      .bind(cleanName.toLowerCase())
      .first<{ name: string; available: number; similar_names: string }>();

    if (cached) {
      return c.json({
        name: cleanName,
        available: cached.available === 1,
        similarNames: JSON.parse(cached.similar_names || "[]"),
        cached: true,
      });
    }

    // Generate similar name suggestions using AI
    const aiResponse = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: `Given the business name "${cleanName}", suggest 5 alternative creative variations that would be unique and memorable. Return ONLY a JSON array of strings, no other text. Example: ["AlphaCo", "AlphaSolutions", "AlphaGroup"]`,
      max_tokens: 200,
    }) as { response: string };

    let similarNames: string[] = [];
    try {
      const cleaned = (aiResponse.response || "[]").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      similarNames = Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      similarNames = [`${cleanName} LLC`, `${cleanName} Co`, `${cleanName} Group`];
    }

    // Simulate availability check (in production, integrate with state SOS APIs)
    const available = !["Inc", "Corp", "LLC", "Company"].some(
      reserved => cleanName.toLowerCase() === reserved.toLowerCase()
    );

    // Cache result in D1
    await c.env.BIZFORMA_DB
      .prepare(
        "INSERT OR REPLACE INTO name_checks (name, available, similar_names, state, checked_at) VALUES (?, ?, ?, ?, datetime('now'))"
      )
      .bind(cleanName.toLowerCase(), available ? 1 : 0, JSON.stringify(similarNames), state || null)
      .run();

    return c.json({ name: cleanName, available, similarNames, cached: false });
  } catch (err) {
    console.error("Name check error:", err);
    return c.json({ error: "Name check failed" }, 500);
  }
});

// ─── Domain Check ─────────────────────────────────────────────────────────────
app.post("/api/check-domain", async (c) => {
  try {
    const { domain } = await c.req.json<{ domain: string }>();

    if (!domain) return c.json({ error: "Domain is required" }, 400);

    // Clean domain - remove protocol, www, TLD if included
    const baseDomain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\.[a-z]{2,}$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 63);

    const tlds = [
      { tld: ".com", registrar: "Namecheap", price: "$12.98/yr" },
      { tld: ".co", registrar: "Namecheap", price: "$29.98/yr" },
      { tld: ".io", registrar: "Namecheap", price: "$39.98/yr" },
      { tld: ".app", registrar: "Google Domains", price: "$14.00/yr" },
      { tld: ".net", registrar: "Namecheap", price: "$14.98/yr" },
      { tld: ".biz", registrar: "Namecheap", price: "$15.98/yr" },
      { tld: ".org", registrar: "Namecheap", price: "$13.98/yr" },
    ];

    // Check DNS for each TLD to determine availability
    const results = await Promise.all(
      tlds.map(async ({ tld, registrar, price }) => {
        const fullDomain = `${baseDomain}${tld}`;
        try {
          // Use Cloudflare DNS over HTTPS to check if domain resolves
          const dnsResponse = await fetch(
            `https://cloudflare-dns.com/dns-query?name=${fullDomain}&type=A`,
            { headers: { Accept: "application/dns-json" } }
          );
          const dnsData = await dnsResponse.json() as { Status: number; Answer?: unknown[] };
          // Status 3 = NXDOMAIN (not found = likely available)
          const available = dnsData.Status === 3 || !dnsData.Answer?.length;
          return { domain: fullDomain, tld, available, registrar, price };
        } catch {
          return { domain: fullDomain, tld, available: null, registrar, price };
        }
      })
    );

    // Track analytics
    c.env.ANALYTICS.writeDataPoint({
      blobs: ["domain_check", baseDomain],
      doubles: [results.filter(r => r.available).length],
      indexes: [baseDomain],
    });

    return c.json({ baseDomain, results });
  } catch (err) {
    console.error("Domain check error:", err);
    return c.json({ error: "Domain check failed" }, 500);
  }
});

// ─── Resources by Step ────────────────────────────────────────────────────────
app.get("/api/resources/:step", async (c) => {
  const step = c.req.param("step");

  const RESOURCES: Record<string, Array<{ label: string; url: string; type: string }>> = {
    structure: [
      { label: "SBA Choose a Business Structure", url: "https://www.sba.gov/business-guide/launch-your-business/choose-business-structure", type: "guide" },
      { label: "IRS Business Structures", url: "https://www.irs.gov/businesses/small-businesses-self-employed/business-structures", type: "official" },
      { label: "Nolo LLC vs. Corporation", url: "https://www.nolo.com/legal-encyclopedia/llc-vs-corporation-difference-30073.html", type: "article" },
    ],
    state_reg: [
      { label: "NASS State Business Services", url: "https://www.nass.org/business-services/forming-a-business", type: "official" },
      { label: "Delaware Division of Corporations", url: "https://corp.delaware.gov", type: "official" },
      { label: "Wyoming Secretary of State", url: "https://sos.wyo.gov/Business/", type: "official" },
    ],
    ein: [
      { label: "IRS Apply for EIN Online", url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online", type: "official" },
      { label: "IRS Form SS-4", url: "https://www.irs.gov/forms-pubs/about-form-ss-4", type: "form" },
    ],
    fed_tax: [
      { label: "IRS Small Business Tax Center", url: "https://www.irs.gov/businesses/small-businesses-self-employed", type: "official" },
      { label: "EFTPS Enrollment", url: "https://www.eftps.gov/eftps/", type: "tool" },
      { label: "IRS Tax Calendar", url: "https://www.irs.gov/businesses/small-businesses-self-employed/small-business-tax-calendar", type: "tool" },
    ],
    state_tax: [
      { label: "TaxJar State Sales Tax Guide", url: "https://www.taxjar.com/states/", type: "guide" },
      { label: "Avalara Tax Compliance", url: "https://www.avalara.com/us/en/learn/sales-tax.html", type: "tool" },
    ],
    funding: [
      { label: "SBA Loan Programs", url: "https://www.sba.gov/funding-programs/loans", type: "official" },
      { label: "SCORE Free Mentoring", url: "https://www.score.org", type: "resource" },
      { label: "Grants.gov Federal Grants", url: "https://www.grants.gov", type: "official" },
      { label: "AngelList Fundraising", url: "https://www.angellist.com", type: "platform" },
    ],
    domain: [
      { label: "Cloudflare Registrar (at-cost pricing)", url: "https://www.cloudflare.com/products/registrar/", type: "tool" },
      { label: "Namecheap", url: "https://www.namecheap.com", type: "tool" },
      { label: "Instant Domain Search", url: "https://instantdomainsearch.com", type: "tool" },
    ],
    seo: [
      { label: "Google Search Console", url: "https://search.google.com/search-console", type: "tool" },
      { label: "Google Business Profile", url: "https://business.google.com", type: "tool" },
      { label: "Ahrefs Free SEO Tools", url: "https://ahrefs.com/free-seo-tools", type: "tool" },
      { label: "Google PageSpeed Insights", url: "https://pagespeed.web.dev", type: "tool" },
    ],
  };

  const resources = RESOURCES[step] || [];
  return c.json({ step, resources });
});

// ─── AI Document Generation ───────────────────────────────────────────────────
app.post("/api/generate-doc", async (c) => {
  try {
    const { docType, businessData } = await c.req.json<{
      docType: "operating_agreement" | "business_plan_summary" | "marketing_strategy" | "launch_checklist";
      businessData: Record<string, unknown>;
    }>();

    if (!docType || !businessData) {
      return c.json({ error: "docType and businessData are required" }, 400);
    }

    const prompts: Record<string, string> = {
      operating_agreement: `Create a professional LLC Operating Agreement outline for:
Business Name: ${businessData.name || ""}
State: ${businessData.state || ""}
Members: ${businessData.member_count || 1}
Management: ${businessData.mgmt_type || "Member-Managed"}

Generate a structured outline with 8-10 key sections. Be specific and professional.`,
      business_plan_summary: `Create an executive summary for a business plan:
Business: ${businessData.name || ""}
Problem: ${businessData.problem || ""}
Solution: ${businessData.solution || ""}
Target Market: ${businessData.customers || ""}
Revenue Model: ${businessData.revenue || ""}
USP: ${businessData.usp || ""}

Write a compelling 300-word executive summary suitable for investors.`,
      marketing_strategy: `Create a 90-day marketing strategy for:
Business: ${businessData.name || ""}
Target Customers: ${businessData.customers || ""}
Selected Channels: ${JSON.stringify(businessData.channels || [])}
Budget: ${businessData.budget || ""}

Provide specific, actionable tactics for each selected channel.`,
      launch_checklist: `Create a comprehensive business launch checklist for:
Business Type: ${businessData.structure || "LLC"}
Industry: ${businessData.industry || ""}
Business Name: ${businessData.name || ""}

Organize into phases: Week 1, Weeks 2-4, Month 2-3, Month 4-6.`,
    };

    const prompt = prompts[docType];
    if (!prompt) {
      return c.json({ error: "Invalid document type" }, 400);
    }

    const result = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 1000,
    }) as { response: string };

    // Track analytics
    c.env.ANALYTICS.writeDataPoint({
      blobs: ["doc_generated", docType],
      doubles: [1],
      indexes: [docType],
    });

    return c.json({ docType, content: result.response });
  } catch (err) {
    console.error("Doc generation error:", err);
    return c.json({ error: "Document generation failed" }, 500);
  }
});

// ─── Tax Deadlines Calendar ───────────────────────────────────────────────────
app.get("/api/deadlines", async (c) => {
  const year = new Date().getFullYear();
  const nextYear = year + 1;

  const deadlines = [
    // Federal Tax
    { date: `${year}-01-15`, label: "Q4 Estimated Tax Payment Due (prev year)", category: "federal", form: "1040-ES", priority: "high" },
    { date: `${year}-01-31`, label: "W-2s and 1099-NECs must be sent to recipients", category: "federal", form: "W-2 / 1099-NEC", priority: "high" },
    { date: `${year}-02-28`, label: "1099s due to IRS (paper)", category: "federal", form: "1099", priority: "medium" },
    { date: `${year}-03-15`, label: "S-Corp and Partnership returns due", category: "federal", form: "1120-S / 1065", priority: "high" },
    { date: `${year}-03-31`, label: "1099s due to IRS (electronic)", category: "federal", form: "1099-E-file", priority: "medium" },
    { date: `${year}-04-15`, label: "Individual & C-Corp returns due / Q1 Estimated Tax", category: "federal", form: "1040 / 1120 / 1040-ES", priority: "critical" },
    { date: `${year}-06-16`, label: "Q2 Estimated Tax Payment Due", category: "federal", form: "1040-ES", priority: "high" },
    { date: `${year}-09-15`, label: "Q3 Estimated Tax Payment Due / Extended S-Corp due", category: "federal", form: "1040-ES / 1120-S Extended", priority: "high" },
    { date: `${year}-10-15`, label: "Extended Individual Returns Due", category: "federal", form: "1040 Extended", priority: "high" },
    // Payroll
    { date: "Ongoing", label: "Federal payroll tax deposits (semi-weekly or monthly)", category: "payroll", form: "Form 941 / 944", priority: "high" },
    { date: `${year}-04-30`, label: "Q1 Payroll Tax Return", category: "payroll", form: "Form 941", priority: "high" },
    { date: `${year}-07-31`, label: "Q2 Payroll Tax Return", category: "payroll", form: "Form 941", priority: "high" },
    { date: `${year}-10-31`, label: "Q3 Payroll Tax Return", category: "payroll", form: "Form 941", priority: "high" },
    { date: `${nextYear}-01-31`, label: "Q4 Payroll Tax Return + Annual FUTA", category: "payroll", form: "Form 941 / 940", priority: "high" },
    // State (general)
    { date: "Varies", label: "State income tax returns (usually same as federal)", category: "state", form: "State Form", priority: "high" },
    { date: "Monthly/Quarterly", label: "State sales tax returns", category: "state", form: "Sales Tax Return", priority: "high" },
    { date: "Varies", label: "Annual report / franchise tax (check your state)", category: "state", form: "Annual Report", priority: "medium" },
  ];

  return c.json({ year, deadlines });
});

// ─── Export Summary ───────────────────────────────────────────────────────────
app.post("/api/export", async (c) => {
  try {
    const { formData } = await c.req.json<{
      formData: Record<string, unknown>;
      sessionId: string;
    }>();

    // Generate a text summary using AI
    const businessName = (formData.name as Record<string, string>)?.name || "Your Business";
    const structure = (formData.structure as Record<string, string>)?.structure || "LLC";
    const state = (formData.structure as Record<string, string>)?.state || "";

    const summary = `
# ${businessName} — Business Formation Summary
Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

## Entity
- Structure: ${structure}
- Formation State: ${state}
- EIN: ${(formData.ein as Record<string, string>)?.ein || "Pending"}

## Business Overview
- Problem Solved: ${(formData.idea as Record<string, string>)?.problem || ""}
- Target Customers: ${(formData.idea as Record<string, string>)?.customers || ""}
- Revenue Model: ${(formData.idea as Record<string, string>)?.revenue || ""}

## Digital Presence
- Domain: ${(formData.domain as Record<string, string>)?.domain_name || ""}
- Website Platform: ${(formData.website as Record<string, string>)?.platform || ""}

## Key Actions Remaining
Review the BizForma checklist for outstanding items.

---
Generated by BizForma | insighthunter.app
    `.trim();

    return c.json({ summary, businessName, exportedAt: new Date().toISOString() });
  } catch (err) {
    console.error("Export error:", err);
    return c.json({ error: "Export failed" }, 500);
  }
});

// ─── Serve Static Assets (SPA fallback) ──────────────────────────────────────
app.get("*", async (c) => {
  // In production, Cloudflare Pages / Workers Assets handles this
  return c.text("BizForma API - visit /api/health", 200);
});

export default app;
