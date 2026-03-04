import { Ai, VectorizeIndex } from "@cloudflare/workers-types";

export interface Env {
  AI: Ai;
  VECTORS: VectorizeIndex;
  DB: D1Database;
}

// ─── Embedding Model ──────────────────────────────────────────
const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

// ─── Types ────────────────────────────────────────────────────
interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

export interface FinancialDocument {
  id: string;
  userId: string;
  type: "transaction" | "invoice" | "report" | "forecast" | "note";
  text: string;       // the text to embed
  amount?: number;
  date?: string;
  category?: string;
}

// ─── Generate Embedding for a Single Text ─────────────────────
export async function generateEmbedding(
  ai: Ai,
  text: string
): Promise<number[]> {
  const response = await ai.run(EMBEDDING_MODEL, {
    text: [text],
  }) as EmbeddingResponse;
  return response.data[0];
}

// ─── Embed & Upsert Financial Documents into Vectorize ────────
export async function embedAndUpsert(
  env: Env,
  documents: FinancialDocument[]
): Promise<{ upserted: number }> {
  // Batch embed all documents in one AI call (more efficient)
  const texts = documents.map((doc) => buildEmbeddingText(doc));
  const response = await env.AI.run(EMBEDDING_MODEL, {
    text: texts,
  }) as EmbeddingResponse;

  // Build VectorizeVector array with metadata for filtering
  const vectors = documents.map((doc, i) => ({
    id: doc.id,
    values: response.data[i],
    metadata: {
      userId: doc.userId,
      type: doc.type,
      amount: doc.amount ?? 0,
      date: doc.date ?? "",
      category: doc.category ?? "uncategorized",
      text: doc.text.slice(0, 512), // store snippet for retrieval
    },
  }));

  const result = await env.VECTORS.upsert(vectors);
  return { upserted: vectors.length };
}

// ─── Semantic Search — Financial Data ─────────────────────────
export async function semanticSearch(
  env: Env,
  query: string,
  userId: string,
  options: {
    topK?: number;
    type?: FinancialDocument["type"];
    minScore?: number;
  } = {}
): Promise<{ id: string; score: number; metadata: Record<string, unknown> }[]> {
  const { topK = 5, type, minScore = 0.4 } = options;

  // Embed the user's query
  const queryVector = await generateEmbedding(env.AI, query);

  // Build metadata filter — always scope to userId
  const filter: Record<string, unknown> = { userId };
  if (type) filter["type"] = type;

  const matches = await env.VECTORS.query(queryVector, {
    topK,
    filter,
    returnMetadata: "all",
  });

  // Filter by minimum score threshold
  return matches.matches
    .filter((m) => m.score >= minScore)
    .map((m) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata ?? {},
    }));
}

// ─── Delete Vectors for a User (e.g. on account delete) ───────
export async function deleteUserVectors(
  env: Env,
  vectorIds: string[]
): Promise<void> {
  if (vectorIds.length > 0) {
    await env.VECTORS.deleteByIds(vectorIds);
  }
}

// ─── Build Rich Embedding Text from Financial Document ─────────
// The quality of embeddings depends on what text you embed.
// Combine all relevant fields into a descriptive sentence.
function buildEmbeddingText(doc: FinancialDocument): string {
  switch (doc.type) {
    case "transaction":
      return `Transaction on ${doc.date}: ${doc.category} for $${doc.amount}. ${doc.text}`;
    case "invoice":
      return `Invoice dated ${doc.date} for $${doc.amount}. ${doc.text}`;
    case "forecast":
      return `Cash flow forecast: ${doc.text}`;
    case "report":
      return `Financial report: ${doc.text}`;
    default:
      return doc.text;
  }
}
