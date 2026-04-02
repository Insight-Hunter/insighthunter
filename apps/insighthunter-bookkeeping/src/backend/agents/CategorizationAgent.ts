import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';
import { logger } from '../lib/logger';

interface CachedEmbedding {
  categoryId: string;
  categoryName: string;
  embedding: number[];
}

interface ClassifyRequest {
  orgId: string;
  transactionId: string;
  description: string;
  amount: number;
  categoryLabels: { id: string; name: string }[];
}

interface ClassifyResponse {
  transactionId: string;
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  method: 'embedding' | 'zero_shot' | 'none';
}

export class CategorizationAgent extends DurableObject<Env> {
  private cachedEmbeddings: Map<string, CachedEmbedding[]> = new Map();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/classify' && request.method === 'POST') {
      const body = await request.json<ClassifyRequest>();
      const result = await this.classify(body);
      return Response.json(result);
    }

    if (url.pathname === '/invalidate' && request.method === 'POST') {
      const { orgId } = await request.json<{ orgId: string }>();
      this.cachedEmbeddings.delete(orgId);
      await this.ctx.storage.delete(`embeddings:${orgId}`);
      return Response.json({ ok: true });
    }

    return new Response('Not Found', { status: 404 });
  }

  private async classify(req: ClassifyRequest): Promise<ClassifyResponse> {
    if (!req.categoryLabels.length) {
      return { transactionId: req.transactionId, categoryId: null, categoryName: null, confidence: 0, method: 'none' };
    }

    try {
      // Embed the transaction description
      const txEmbeddingRes = await this.env.AI.run('@cf/baai/bge-small-en-v1.5', {
        text: [req.description],
      });
      const txVec = (txEmbeddingRes as any).data[0] as number[];

      // Load or compute category embeddings (cached per org in DO storage)
      let catEmbeddings = await this.getCachedEmbeddings(req.orgId, req.categoryLabels);

      // Cosine similarity
      let best: { id: string; name: string; score: number } | null = null;
      for (const cat of catEmbeddings) {
        const score = cosineSimilarity(txVec, cat.embedding);
        if (!best || score > best.score) best = { id: cat.categoryId, name: cat.categoryName, score };
      }

      if (best && best.score > 0.75) {
        return {
          transactionId: req.transactionId,
          categoryId:    best.id,
          categoryName:  best.name,
          confidence:    best.score,
          method:        'embedding',
        };
      }

      // Fall back to zero-shot classification
      const labels = req.categoryLabels.map(c => c.name);
      const zsResult = await this.env.AI.run('@cf/facebook/bart-large-mnli', {
        text: req.description,
        candidate_labels: labels,
      });

      const topLabel = (zsResult as any).labels?.[0] as string | undefined;
      const topScore = (zsResult as any).scores?.[0] as number | undefined;

      if (topLabel && topScore && topScore > 0.5) {
        const matched = req.categoryLabels.find(c => c.name === topLabel);
        return {
          transactionId: req.transactionId,
          categoryId:    matched?.id ?? null,
          categoryName:  topLabel,
          confidence:    topScore,
          method:        'zero_shot',
        };
      }
    } catch (err) {
      logger.warn('categorization_agent_error', { error: (err as Error).message });
    }

    return { transactionId: req.transactionId, categoryId: null, categoryName: null, confidence: 0, method: 'none' };
  }

  private async getCachedEmbeddings(
    orgId: string,
    labels: { id: string; name: string }[],
  ): Promise<CachedEmbedding[]> {
    const storageKey = `embeddings:${orgId}`;
    let cached = this.cachedEmbeddings.get(orgId)
      ?? (await this.ctx.storage.get<CachedEmbedding[]>(storageKey));

    if (cached) {
      const cachedIds = new Set(cached.map(c => c.categoryId));
      const missing = labels.filter(l => !cachedIds.has(l.id));
      if (!missing.length) return cached;
      // Compute embeddings for new categories only
      const newEmbeds = await this.computeEmbeddings(missing);
      cached = [...cached, ...newEmbeds];
    } else {
      cached = await this.computeEmbeddings(labels);
    }

    this.cachedEmbeddings.set(orgId, cached);
    await this.ctx.storage.put(storageKey, cached);
    return cached;
  }

  private async computeEmbeddings(
    labels: { id: string; name: string }[]
  ): Promise<CachedEmbedding[]> {
    const res = await this.env.AI.run('@cf/baai/bge-small-en-v1.5', {
      text: labels.map(l => l.name),
    });
    return (res as any).data.map((embedding: number[], i: number) => ({
      categoryId:   labels[i].id,
      categoryName: labels[i].name,
      embedding,
    }));
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot  = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}
