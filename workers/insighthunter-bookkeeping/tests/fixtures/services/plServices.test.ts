import { describe, it, expect } from 'vitest';
import { mockPL } from '../fixtures/mockStatements';

describe('P&L Statement', () => {
  it('gross profit = revenue - cogs', () => {
    expect(mockPL.grossProfit).toBe(mockPL.totalRevenue - mockPL.totalCogs);
  });

  it('net income = operating income + other income - other expenses', () => {
    const expected = mockPL.operatingIncome
      + mockPL.otherIncome.reduce((s, i) => s + i.amount, 0)
      - mockPL.otherExpenses.reduce((s, i) => s + i.amount, 0);
    expect(mockPL.netIncome).toBe(expected);
  });

  it('gross margin pct is within 0-100', () => {
    expect(mockPL.grossMarginPct).toBeGreaterThanOrEqual(0);
    expect(mockPL.grossMarginPct).toBeLessThanOrEqual(100);
  });
});
