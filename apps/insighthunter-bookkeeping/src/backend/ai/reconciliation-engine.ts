// src/backend/ai/reconciliation-engine.ts
import { OpenAI } from "openai";

interface BookEntry {
  id: string;
  type: 'debit' | 'credit';
  amount: number;
  accountId: string;
}

interface BankTransaction {
  id: string;
  date: string; // ISO format recommended
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  status: 'pending' | 'matched' | 'reviewed';
}

interface BookTransaction {
  id: string;
  date: string; // ISO format recommended
  description: string;
  amount: number;
  entries: BookEntry[];
}

interface MatchResult {
  bankTxId: string;
  bookTxId: string;
  confidence: number; // 0-100
  reasoning: string;
  suggestedAction: 'auto-match' | 'review' | 'reject';
}

interface CategorizationResult {
  accountId: string;
  confidence: number;
  reasoning: string;
}

interface Anomaly {
  transaction: BankTransaction;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

type AIServiceError = {
  code: string;
  message: string;
  requestId?: string;
};

export class AIReconciliationEngine {
  private openai: OpenAI;
  private amountTolerance: number;
  private dateThresholdDays: number;

  constructor(apiKey: string, options?: { amountTolerance?: number; dateThresholdDays?: number }) {
    this.openai = new OpenAI({ apiKey });
    this.amountTolerance = options?.amountTolerance ?? 0.50; // configurable, more realistic
    this.dateThresholdDays = options?.dateThresholdDays ?? 7;
  }

  /**
   * AI-powered transaction matching
   */
  async matchTransactions(
    bankTransactions: BankTransaction[],
    bookTransactions: BookTransaction[]
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];

    for (const bankTx of bankTransactions) {
      const candidates = this.findCandidates(bankTx, bookTransactions);

      if (candidates.length === 0) {
        continue;
      }

      try {
        const bestMatch = await this.analyzeMatch(bankTx, candidates);
        if (bestMatch) {
          matches.push(bestMatch);
        }
      } catch (error) {
        console.warn(`Failed to analyze match for bankTx ${bankTx.id}:`, error);
        // Continue processing other transactions
      }
    }

    return matches;
  }

  /**
   * Find potential matching candidates using rule-based filtering
   */
  private findCandidates(
    bankTx: BankTransaction,
    bookTransactions: BookTransaction[]
  ): BookTransaction[] {
    const bankDate = new Date(bankTx.date).getTime();
    const tolerance = this.amountTolerance;

    return bookTransactions.filter((bookTx) => {
      const bookDate = new Date(bookTx.date).getTime();
      const daysDiff = Math.abs(bankDate - bookDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > this.dateThresholdDays) return false;

      // Net amount from book entries (debits - credits)
      const netBookAmount = bookTx.entries.reduce((net, entry) => {
        return entry.type === 'debit' ? net + entry.amount : net - entry.amount;
      }, 0);

      const amountDiff = Math.abs(bankTx.amount - Math.abs(netBookAmount));

      return amountDiff <= tolerance;
    });
  }

  /**
   * Use AI to analyze and score potential matches
   */
  private async analyzeMatch(
    bankTx: BankTransaction,
    candidates: BookTransaction[]
  ): Promise<MatchResult | null> {
    const prompt = `
You are an expert bookkeeper analyzing bank reconciliation matches.

Bank Transaction:
- ID: ${bankTx.id}
- Date: ${bankTx.date}
- Description: ${bankTx.description}
- Amount: $${bankTx.amount.toFixed(2)}

Candidate Book Transactions:
${candidates.map((c, i) => `
${i + 1}. ID: ${c.id}
   Date: ${c.date}
   Description: ${c.description}
   Net Amount: $${c.entries.reduce((net, e) => e.type === 'debit' ? net + e.amount : net - e.amount, 0).toFixed(2)}
`).join('\n')}

Analyze and determine:
1. Best matching candidate ID (or null if no good match)
2. Confidence score (0-100): 95+ for exact date/amount+strong desc match, 70-94 review, <70 reject
3. Reasoning
4. Suggested action: auto-match (>90), review (70-90), reject (<70)

Respond in JSON format only:
{
  "matchedCandidateId": "string or null",
  "confidence": number,
  "reasoning": "string",
  "suggestedAction": "auto-match" | "review" | "reject"
}
`;

    const result = await this.callOpenAI(prompt, {
      temperature: 0.3,
      model: "gpt-4o", // More recent model
    });

    const parsed = result as {
      matchedCandidateId: string | null;
      confidence: number;
      reasoning: string;
      suggestedAction: MatchResult['suggestedAction'];
    };

    if (!parsed.matchedCandidateId || parsed.confidence < 50) {
      return null;
    }

    return {
      bankTxId: bankTx.id,
      bookTxId: parsed.matchedCandidateId,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      suggestedAction: parsed.suggestedAction,
    };
  }

  /**
   * Categorize transactions using AI
   */
  async categorizeTransaction(
    transaction: BankTransaction,
    chartOfAccounts: { id: string; name: string; type: string }[]
  ): Promise<CategorizationResult> {
    const prompt = `
Categorize this bank transaction:
- Description: ${transaction.description}
- Amount: $${transaction.amount.toFixed(2)}
- Type: ${transaction.type}

Available accounts (select the most specific match):
${chartOfAccounts.map((acc) => `- ${acc.id}: ${acc.name} (${acc.type})`).join('\n')}

Respond in JSON format only:
{
  "accountId": "string",
  "confidence": number (0-100),
  "reasoning": "string"
}
`;

    const result = await this.callOpenAI(prompt, {
      temperature: 0.3,
      model: "gpt-4o",
    });

    const parsed = result as CategorizationResult;
    if (!parsed.accountId) {
      throw new Error(`AI failed to categorize transaction: ${transaction.description}`);
    }
    return parsed;
  }

  /**
   * Detect anomalies in transactions
   */
  async detectAnomalies(
    transactions: BankTransaction[],
    historicalData: { category: string; avgAmount: number; stdDev: number }[]
  ): Promise<{ anomalies: Anomaly[] }> {
    const anomalies: Anomaly[] = [];

    for (const tx of transactions) {
      // Statistical anomaly detection
      const historical = historicalData.find((h) =>
        tx.description.toLowerCase().includes(h.category.toLowerCase())
      );

      if (historical && historical.stdDev > 0) {
        const zScore = Math.abs((tx.amount - historical.avgAmount) / historical.stdDev);
        if (zScore > 3) {
          anomalies.push({
            transaction: tx,
            reason: `Amount is ${zScore.toFixed(1)}σ from historical average`,
            severity: zScore > 5 ? 'high' : zScore > 4 ? 'medium' : 'low',
          });
        }
      }

      // Duplicate detection
      const duplicates = transactions.filter(
        (t) =>
          t.id !== tx.id &&
          t.description === tx.description &&
          Math.abs(t.amount - tx.amount) < 0.01 &&
          Math.abs(new Date(t.date).getTime() - new Date(tx.date).getTime()) < 24 * 60 * 60 * 1000
      );

      if (duplicates.length > 0) {
        anomalies.push({
          transaction: tx,
          reason: `${duplicates.length} potential duplicates found`,
          severity: 'high',
        });
      }
    }

    return { anomalies };
  }

  /**
   * Generate reconciliation report with AI insights
   */
  async generateReconciliationReport(
    matches: MatchResult[],
    unmatchedBank: BankTransaction[],
    unmatchedBook: BookTransaction[]
  ): Promise<string> {
    const autoMatches = matches.filter((m) => m.confidence > 90).length;
    const reviewMatches = matches.filter((m) => m.confidence >= 70 && m.confidence <= 90).length;

    const prompt = `
Generate a professional reconciliation report:

SUMMARY:
- Auto-matched (${autoMatches} txns, >90% confidence)
- Need review (${reviewMatches} txns, 70-90% confidence) 
- Unmatched bank txns: ${unmatchedBank.length}
- Unmatched book txns: ${unmatchedBook.length}

Unmatched Bank (top 5):
${unmatchedBank.slice(0, 5).map((tx) => `- ${tx.description}: $${tx.amount.toFixed(2)}`).join('\n')}

Unmatched Book (top 5):
${unmatchedBook.slice(0, 5).map((tx) => `- ${tx.description}: $${tx.amount.toFixed(2)}`).join('\n')}

Provide:
1. Executive summary (2-3 sentences)
2. Key findings & statistics
3. Recommended next actions
4. Risk areas to investigate manually
`;

    const response = await this.callOpenAI(prompt, {
      temperature: 0.5,
      model: "gpt-4o",
    });

    return typeof response === 'string' ? response : JSON.stringify(response);
  }

  /**
   * Learn from user corrections (event emitter stub)
   */
  async learnFromUserActions(
    action: {
      bankTxId: string;
      bookTxId: string;
      userMatched: boolean;
      aiSuggestion: MatchResult | null;
    }
  ): Promise<void> {
    // Emit to training pipeline, analytics, etc.
    console.log('📚 Learning from user action:', {
      ...action,
      timestamp: new Date().toISOString(),
    });
  }

  // === PRIVATE HELPERS ===

  private async callOpenAI(
    prompt: string,
    options: { temperature: number; model: string }
  ): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: options.model,
        messages: [
          {
            role: "system",
            content: "You are an expert bookkeeper specializing in transaction reconciliation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: options.temperature,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return JSON.parse(content);
    } catch (error: any) {
      const errorData: AIServiceError = {
        code: error.code || 'unknown',
        message: error.message || 'OpenAI call failed',
        requestId: error.requestId,
      };
      console.error('AI service error:', errorData);
      throw errorData;
    }
  }
}
