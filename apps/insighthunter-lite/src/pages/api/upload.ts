// apps/insighthunter-lite/src/pages/api/upload.ts
import type { APIRoute } from 'astro';

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

// Lightweight CSV parser — no native deps, edge-safe
function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const dateIdx   = headers.findIndex(h => h.includes('date'));
  const descIdx   = headers.findIndex(h => h.includes('desc') || h.includes('memo') || h.includes('narration'));
  const amtIdx    = headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit'));

  if (dateIdx < 0 || descIdx < 0 || amtIdx < 0) {
    throw new Error('CSV must contain date, description/memo, and amount columns');
  }

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
      const raw  = parseFloat(cols[amtIdx]?.replace(/[^0-9.-]/g, '') ?? '0');
      return {
        date:        cols[dateIdx] ?? '',
        description: cols[descIdx] ?? '',
        amount:      Math.abs(raw),
        type:        raw >= 0 ? 'income' : 'expense',
        category:    categorize(cols[descIdx] ?? ''),
      };
    })
    .filter(r => r.date && r.amount > 0);
}

function categorize(description: string): string {
  const d = description.toLowerCase();
  if (d.includes('payroll') || d.includes('salary') || d.includes('wage')) return 'Payroll';
  if (d.includes('rent') || d.includes('lease'))   return 'Rent';
  if (d.includes('aws') || d.includes('cloudflare') || d.includes('software') || d.includes('saas')) return 'Software';
  if (d.includes('stripe') || d.includes('revenue') || d.includes('invoice') || d.includes('payment received')) return 'Revenue';
  if (d.includes('ads') || d.includes('marketing') || d.includes('google') || d.includes('meta')) return 'Marketing';
  if (d.includes('travel') || d.includes('hotel') || d.includes('flight')) return 'Travel';
  if (d.includes('utilities') || d.includes('electric') || d.includes('internet')) return 'Utilities';
  return 'Other';
}

function buildReport(transactions: ParsedRow[]) {
  const income   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net      = income - expenses;
  const margin   = income > 0 ? ((net / income) * 100).toFixed(1) : '0';

  const byCategory = transactions.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});

  // Simple 3-month cash flow projection using average monthly spend
  const months   = new Set(transactions.map(t => t.date.slice(0, 7))).size || 1;
  const avgMonthlyIncome   = income / months;
  const avgMonthlyExpenses = expenses / months;

  const forecast = Array.from({ length: 3 }, (_, i) => ({
    month:    `Month +${i + 1}`,
    income:   +(avgMonthlyIncome * 1.02 ** (i + 1)).toFixed(2),
    expenses: +(avgMonthlyExpenses).toFixed(2),
    net:      +((avgMonthlyIncome * 1.02 ** (i + 1)) - avgMonthlyExpenses).toFixed(2),
  }));

  return { income, expenses, net, margin: parseFloat(margin), byCategory, forecast, transactionCount: transactions.length };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const userId = locals.userId;
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const env = locals.runtime.env;

  try {
    const formData  = await request.formData();
    const file      = formData.get('file') as File | null;
    if (!file) return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    if (!file.name.endsWith('.csv')) return new Response(JSON.stringify({ error: 'Only CSV files accepted' }), { status: 400 });
    if (file.size > 5 * 1024 * 1024) return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }), { status: 400 });

    const csvText = await file.text();
    const transactions = parseCSV(csvText);

    if (transactions.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid transactions found in CSV' }), { status: 422 });
    }
    if (transactions.length > parseInt(env.MAX_CSV_ROWS)) {
      return new Response(JSON.stringify({ error: `CSV exceeds max row limit (${env.MAX_CSV_ROWS})` }), { status: 422 });
    }

    // 1. Store raw CSV in R2
    const uploadId = crypto.randomUUID();
    const r2Key    = `uploads/${userId}/${uploadId}/${file.name}`;
    await env.STORAGE.put(r2Key, csvText, {
      httpMetadata: { contentType: 'text/csv' },
      customMetadata: { userId, uploadId, filename: file.name },
    });

    // 2. Write upload record to D1
    await env.DB.prepare(
      `INSERT INTO uploads (id, user_id, filename, r2_key, row_count, status) VALUES (?, ?, ?, ?, ?, 'processing')`
    ).bind(uploadId, userId, file.name, r2Key, transactions.length).run();

    // 3. Batch insert transactions into D1
    const stmts = transactions.map(t =>
      env.DB.prepare(
        `INSERT INTO transactions (upload_id, user_id, txn_date, description, amount, type, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(uploadId, userId, t.date, t.description, t.amount, t.type, t.category)
    );
    await env.DB.batch(stmts);

    // 4. Build report data
    const reportData = buildReport(transactions);

    // 5. AI summary via Workers AI
    let aiSummary = '';
    try {
      const prompt = `You are a CFO assistant. Summarize this financial data in 3 concise bullet points for a small business owner.
Income: $${reportData.income.toFixed(2)}, Expenses: $${reportData.expenses.toFixed(2)}, Net: $${reportData.net.toFixed(2)}, Margin: ${reportData.margin}%.
Top categories: ${Object.entries(reportData.byCategory).sort((a,b) => b[1]-a[1]).slice(0,3).map(([k,v]) => `${k}: $${v.toFixed(2)}`).join(', ')}.
Keep each bullet under 15 words. Start each bullet with •`;

      const aiResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }) as { response: string };
      aiSummary = aiResult.response;
    } catch {
      aiSummary = `• Net ${reportData.net >= 0 ? 'profit' : 'loss'} of $${Math.abs(reportData.net).toFixed(2)} across ${transactions.length} transactions.\n• Largest expense category: ${Object.entries(reportData.byCategory).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? 'N/A'}.\n• Profit margin: ${reportData.margin}%.`;
    }

    // 6. Store report in D1
    const reportId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO reports (id, upload_id, user_id, report_type, data_json, ai_summary) VALUES (?, ?, ?, 'summary', ?, ?)`
    ).bind(reportId, uploadId, userId, JSON.stringify(reportData), aiSummary).run();

    // 7. Mark upload as done
    await env.DB.prepare(`UPDATE uploads SET status = 'done', updated_at = datetime('now') WHERE id = ?`)
      .bind(uploadId).run();

    // 8. Track event (non-blocking)
    env.ANALYTICS.writeDataPoint({
      blobs: ['csv_upload', userId, file.name],
      doubles: [transactions.length, reportData.income, reportData.expenses],
      indexes: [userId],
    });

    return new Response(JSON.stringify({ uploadId, reportId, report: reportData, aiSummary }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
