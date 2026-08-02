// services/csv-parser.ts
// Robust CSV parser: handles quoted fields, debit/credit split columns, OFX date formats.
// Supports: Chase, Bank of America, Wells Fargo, Stripe, generic bank CSV.

export type ParsedImportRow = {
  rowIndex: number;
  date?:        string;  // ISO YYYY-MM-DD
  description?: string;
  amount?:      number;  // positive = inflow, negative = outflow
};

function parseQuotedCsv(line: string): string[] {
  const cols: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function normalizeDate(raw: string): string | undefined {
  if (!raw) return undefined;
  // OFX: 20240115 or 20240115120000
  if (/^\d{8}/.test(raw)) {
    const y = raw.slice(0, 4), m = raw.slice(4, 6), d = raw.slice(6, 8);
    return `${y}-${m}-${d}`;
  }
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1]!.padStart(2,'0')}-${mdy[2]!.padStart(2,'0')}`;
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

function parseAmount(raw: string, debit: string, credit: string): number | undefined {
  // If separate debit/credit columns provided
  const d = parseFloat(debit.replace(/[^0-9.-]/g, ''));
  const cr = parseFloat(credit.replace(/[^0-9.-]/g, ''));
  if (!isNaN(d) && !isNaN(cr)) return cr - d; // net: positive = inflow
  if (!isNaN(cr)) return cr;
  if (!isNaN(d))  return -d;
  // Single amount column
  if (!raw) return undefined;
  const v = parseFloat(raw.replace(/[^0-9.-]/g, ''));
  return isNaN(v) ? undefined : v;
}

export async function parseCsv(text: string): Promise<ParsedImportRow[]> {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseQuotedCsv(lines[0]!).map(h => h.toLowerCase().replace(/["']/g, ''));

  const idx = (candidates: string[]) => candidates.reduce((f, c) => f >= 0 ? f : headers.findIndex(h => h.includes(c)), -1);

  const dateIdx  = idx(['date', 'posted', 'transaction date', 'trans date']);
  const descIdx  = idx(['description', 'memo', 'name', 'details', 'payee', 'merchant']);
  const amtIdx   = idx(['amount', 'value']);
  const debitIdx = idx(['debit']);
  const creditIdx= idx(['credit']);

  const results: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseQuotedCsv(lines[i]!);
    if (cols.every(c => !c)) continue; // blank line

    results.push({
      rowIndex: i,
      date:        dateIdx  >= 0 ? normalizeDate(cols[dateIdx]  ?? '') : undefined,
      description: descIdx  >= 0 ? cols[descIdx]  ?? undefined : undefined,
      amount: parseAmount(
        amtIdx   >= 0 ? (cols[amtIdx]   ?? '') : '',
        debitIdx >= 0 ? (cols[debitIdx] ?? '') : '',
        creditIdx>= 0 ? (cols[creditIdx]?? '') : '',
      ),
    });
  }

  return results;
}
