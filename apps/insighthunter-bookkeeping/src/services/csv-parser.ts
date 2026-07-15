export type ParsedImportRow = {
  rowIndex: number;
  date?: string;
  description?: string;
  amount?: number;
};

export async function parseCsv(text: string): Promise<ParsedImportRow[]> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((v) => v.trim().toLowerCase());
  const dateIndex = headers.findIndex((h) => ['date', 'posted date', 'transaction date'].includes(h));
  const descriptionIndex = headers.findIndex((h) => ['description', 'memo', 'name', 'details'].includes(h));
  const amountIndex = headers.findIndex((h) => ['amount', 'value', 'debit', 'credit'].includes(h));

  return lines.slice(1).map((line, idx) => {
    const cols = line.split(',').map((v) => v.trim());
    return {
      rowIndex: idx + 1,
      date: dateIndex >= 0 ? cols[dateIndex] : undefined,
      description: descriptionIndex >= 0 ? cols[descriptionIndex] : undefined,
      amount: amountIndex >= 0 ? Number(cols[amountIndex].replace(/[^0-9.-]/g, '')) : undefined,
    };
  });
}

