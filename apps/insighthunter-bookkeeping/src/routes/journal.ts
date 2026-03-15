import type { Env, AuthContext } from '../types';
import type { JournalEntry, JournalLine } from '../types/accounting';
import { insertJournalEntry, getJournalEntries } from '../db/queries';
import { assertBalanced } from '../lib/doubleEntry';
import { trackEvent } from '../lib/analytics';

export async function handleJournal(
  request: Request, env: Env, auth: AuthContext, pathname: string
): Promise<Response> {
  const url    = new URL(request.url);
  const method = request.method;

  // GET /journal
  if (method === 'GET' && pathname === '/journal') {
    const entries = await getJournalEntries(
      env.DB,
      auth.orgId,
      url.searchParams.get('date_from') ?? undefined,
      url.searchParams.get('date_to')   ?? undefined,
      parseInt(url.searchParams.get('limit')  ?? '50'),
      parseInt(url.searchParams.get('offset') ?? '0'),
    );
    return Response.json({  entries });
  }

  // POST /journal
  if (method === 'POST' && pathname === '/journal') {
    const body = await request.json<any>();

    const lines: JournalLine[] = (body.lines as any[]).map((l: any, i: number) => ({
      id:        crypto.randomUUID(),
      entryId:   '', // filled below
      accountId: l.account_id,
      debit:     l.debit  ?? 0,
      credit:    l.credit ?? 0,
      memo:      l.memo   ?? null,
      lineOrder: i,
    }));

    try {
      assertBalanced(lines);
    } catch (err) {
      return Response.json({ error: (err as Error).message }, { status: 422 });
    }

    const entry: JournalEntry = {
      id:            crypto.randomUUID(),
      orgId:         auth.orgId,
      transactionId: body.transaction_id ?? null,
      date:          body.date,
      reference:     body.reference ?? null,
      memo:          body.memo      ?? null,
      isBalanced:    true,
      createdBy:     auth.userId,
      createdAt:     new Date().toISOString(),
      lines:         lines.map(l => ({ ...l, entryId: '' })), // entryId set after
    };

    // Assign real entryId to all lines
    entry.lines = lines.map(l => ({ ...l, entryId: entry.id }));
    await insertJournalEntry(env.DB, entry);
    trackEvent(env.ANALYTICS, 'journal_entry_created', auth.orgId);
    return Response.json({  entry }, { status: 201 });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
