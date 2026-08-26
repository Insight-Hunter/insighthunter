import type { BookkeepingSummary } from "./types";

interface GeneratedInsight {
  title: string;
  body: string;
  severity: "info" | "watch" | "risk";
  category: string | null;
}

/** Runs the current period's summary (and, for "full" depth, prior periods
 * too) through Workers AI to produce a small set of plain-language flags.
 * This is advisory text, not a financial statement — always phrased as an
 * observation the owner should look into, never a directive. */
export async function generateInsights(
  ai: Ai,
  current: BookkeepingSummary,
  priorPeriods: BookkeepingSummary[],
  depth: "basic" | "full"
): Promise<GeneratedInsight[]> {
  const currentSummary = summarizeForPrompt(current);
  const historySummary = priorPeriods.length
    ? priorPeriods.map((p, i) => `Period -${priorPeriods.length - i}: ${summarizeForPrompt(p)}`).join("\n")
    : "No prior period data available.";

  const prompt = `You are a plain-language financial advisor for a small business owner who is not an accountant. Review this data and produce ${depth === "full" ? "up to 5" : "up to 3"} short, specific observations about their finances — flag risks (low cash runway, margin drift, concentrated spending) and notable positives. Do not give tax or legal advice. Do not invent numbers not present in the data.

Current period:
${currentSummary}

${depth === "full" ? `Trailing periods for trend comparison:\n${historySummary}` : ""}

Respond ONLY with a JSON array, no other text, in this exact shape:
[{"title": "short headline, under 8 words", "body": "1-2 sentence explanation in plain language", "severity": "info" | "watch" | "risk", "category": "category name or null"}]`;

  try {
    const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
    })) as { response?: string };

    const text = (result.response ?? "").trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedInsight[];
    return parsed
      .filter((i) => i.title && i.body)
      .map((i) => ({
        title: i.title,
        body: i.body,
        severity: (["info", "watch", "risk"].includes(i.severity) ? i.severity : "info") as GeneratedInsight["severity"],
        category: i.category ?? null,
      }));
  } catch (err) {
    console.error("insight generation error:", err);
    return [];
  }
}

function summarizeForPrompt(summary: BookkeepingSummary): string {
  const income = (summary.incomeCents / 100).toFixed(2);
  const expense = (Math.abs(summary.expenseCents) / 100).toFixed(2);
  const net = (summary.netCents / 100).toFixed(2);
  const categories = summary.byCategory
    .filter((c) => c.category)
    .map((c) => `${c.category}: $${(Math.abs(c.total_cents) / 100).toFixed(2)} (${c.count} txns)`)
    .join(", ");
  return `Income: $${income}, Expenses: $${expense}, Net: $${net}. By category: ${categories || "none recorded"}.`;
}
