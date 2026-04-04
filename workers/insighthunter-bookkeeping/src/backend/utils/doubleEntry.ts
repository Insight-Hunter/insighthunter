// Validates that debits == credits (double-entry accounting invariant)
export function validateDoubleEntry(
  lines: Array<{ debit: number; credit: number }>
): { valid: boolean; error?: string; totalDebit: number; totalCredit: number } {
  const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  const diff = Math.abs(totalDebit - totalCredit);

  if (diff > 0.005) {
    return {
      valid: false,
      error: `Debits ($${totalDebit.toFixed(
        2
      )}) ≠ Credits ($${totalCredit.toFixed(2)}). Difference: $${diff.toFixed(
        2
      )}`,
      totalDebit,
      totalCredit,
    };
  }
  return { valid: true, totalDebit, totalCredit };
}

export function roundCurrency(n: number): number {
  return Math.round(n * 100) / 100;
}
