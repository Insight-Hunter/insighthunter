/**
 * Bizforma API client — used by Svelte components
 */

export interface NameSuggestion {
  name: string;
  rationale: string;
  domain: string;
}

export interface EntityRec {
  recommended: string;
  alternatives: string[];
  reasoning: string;
  pros: string[];
  cons: string[];
  taxNote: string;
}

export interface CalendarEvent {
  title: string;
  category: string;
  dueDate: string;
  description: string;
  penalty?: string;
  recurring?: string;
}

export async function getNameSuggestions(
  businessIdea: string,
  industry = 'general',
  style = 'modern and professional'
): Promise<NameSuggestion[]> {
  const res = await fetch('/api/ai/names', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ businessIdea, industry, style }),
  });
  const data = await res.json() as { suggestions: NameSuggestion[] };
  return data.suggestions ?? [];
}

export async function getEntityRec(params: {
  businessIdea: string;
  owners?: number;
  state?: string;
  revenue?: string;
  liabilityPriority?: boolean;
}): Promise<EntityRec | null> {
  const res = await fetch('/api/ai/entity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json() as { recommendation: EntityRec };
  return data.recommendation ?? null;
}

export async function getCalendar(params: {
  entityType: string;
  state: string;
  formationDate?: string;
  hasSalesTax?: boolean;
  taxElection?: string;
}): Promise<CalendarEvent[]> {
  const res = await fetch('/api/ai/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json() as { events: CalendarEvent[] };
  return data.events ?? [];
}

export async function* streamChat(params: {
  message: string;
  context?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): AsyncGenerator<string> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const json = JSON.parse(line.slice(6)) as { response?: string };
          if (json.response) yield json.response;
        } catch { /* skip */ }
      }
    }
  }
}
