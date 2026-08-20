import type { Category } from "./types";

/** Ask Workers AI to pick the best-fit category for a transaction. Falls
 * back to "Uncategorized" on any ambiguity or error — this is a suggestion
 * the user can always override, never a silent authoritative categorization. */
export async function suggestCategory(
  ai: Ai,
  description: string,
  amountCents: number,
  categories: Category[]
): Promise<string | null> {
  const uncategorized = categories.find((c) => c.name === "Uncategorized");
  const options = categories.filter((c) => c.name !== "Uncategorized");
  const direction = amountCents >= 0 ? "income" : "expense";
  const relevant = options.filter((c) => c.kind === direction);
  if (relevant.length === 0) return uncategorized?.id ?? null;

  const prompt = `You are categorizing one small-business ${direction} transaction for bookkeeping.
Transaction description: "${description}"
Amount: $${(Math.abs(amountCents) / 100).toFixed(2)}

Pick exactly one category from this list (respond with the category name only, nothing else):
${relevant.map((c) => `- ${c.name}`).join("\n")}`;

  try {
    const result = (await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 20,
    })) as { response?: string };

    const answer = result.response?.trim().toLowerCase() ?? "";
    const match = relevant.find((c) => answer.includes(c.name.toLowerCase()));
    return match?.id ?? uncategorized?.id ?? null;
  } catch (err) {
    console.error("categorization error:", err);
    return uncategorized?.id ?? null;
  }
}
