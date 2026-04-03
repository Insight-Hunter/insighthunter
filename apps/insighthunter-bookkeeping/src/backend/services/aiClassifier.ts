import type { Ai } from "@cloudflare/workers-types";
import type { AIClassificationResult, AIAlternative } from "../types.js";

interface TxInput {
  id: string;
  description: string;
  amount: number;
  date: string;
  source: string;
}

interface AccountOption {
  id: string;
  name: string;
  type: string;
  subtype: string;
  code: string;
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are an expert bookkeeper. Given a financial transaction and a chart of accounts, classify the transaction into the most appropriate account. Return ONLY valid JSON matching the schema below. Never add commentary outside JSON.

Schema:
{
  "suggestedAccountId": string | null,
  "suggestedAccountName": string | null,
  "confidence": number (0.0-1.0),
  "reasoning": string,
  "needsHumanReview": boolean,
  "question": string | null,
  "alternatives": [{ "account_id": string, "account_name": string, "confidence": number, "reasoning": string }]
}

Rules:
- If confidence < 0.80, set needsHumanReview = true and provide a clear question for the business owner
- question should be plain English, e.g. "Was the $250 charge to Amazon for office supplies or personal use?"
- Provide 2-3 alternatives with confidence scores
- For payroll transactions, prefer payroll expense accounts
- For recurring subscriptions, prefer appropriate SaaS/software expense accounts`;

export async function classifyTransaction(
  tx: TxInput,
  accounts: AccountOption[],
  ai: Ai
): Promise<AIClassificationResult> {
  const accountList = accounts
    .map((a) => `${a.code}: ${a.name} (${a.type}/${a.subtype})`)
    .join("\n");

  const userPrompt = `Transaction:
- Date: ${tx.date}
- Description: "${tx.description}"
- Amount: $${tx.amount > 0 ? "+" : ""}${tx.amount.toFixed(2)} (${tx.amount > 0 ? "deposit/credit" : "payment/debit"})
- Source: ${tx.source}

Available Accounts:
${accountList}

Classify this transaction.`;

  try {
    const response = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: CLASSIFICATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 512,
      temperature: 0.1, // Low temperature for consistent financial classification
    });

    const text =
      typeof response === "object" && "response" in response
        ? (response as { response: string }).response
        : String(response);

    // Extract JSON from the model response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in model response");

    const parsed = JSON.parse(jsonMatch[0]) as AIClassificationResult;
    return {
      suggestedAccountId: parsed.suggestedAccountId ?? null,
      suggestedAccountName: parsed.suggestedAccountName ?? null,
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0)),
      reasoning: parsed.reasoning ?? "",
      needsHumanReview: parsed.needsHumanReview ?? true,
      question: parsed.question ?? null,
      alternatives: (parsed.alternatives ?? []) as AIAlternative[],
    };
  } catch (err) {
    console.error("AI classification error:", err);
    // Safe fallback — always ask human on error
    return {
      suggestedAccountId: null,
      suggestedAccountName: null,
      confidence: 0,
      reasoning: "Classification failed, please review manually.",
      needsHumanReview: true,
      question: `Could not automatically classify "${tx.description}" for $${Math.abs(tx.amount).toFixed(2)}. Please select the correct account.`,
      alternatives: [],
    };
  }
}
