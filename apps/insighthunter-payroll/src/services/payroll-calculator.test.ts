// apps/insighthunter-payroll/src/services/payroll-calculator.test.ts
// NOTE: these tests cover the ESTIMATE-ONLY preview path only.
// Provider-adapter tests (check-provider.test.ts) cover the authoritative path.
import { describe, it, expect } from "vitest";
import { calculatePayrollLine } from "./payroll-calculator.js";

describe("payroll-calculator (estimate preview only)", () => {
  it("computes gross pay for salaried employees", () => {
    const result = calculatePayrollLine({
      payType: "salary",
      payRate: 60000,
      days: 14,
      state: "GA",
      filingStatus: "single",
      allowances: 0,
      deductions: [],
    });
    expect(result.grossPay).toBeGreaterThan(0);
    expect(result.netPay).toBeLessThan(result.grossPay);
  });

  it("applies zero state tax for no-income-tax states", () => {
    const tx = calculatePayrollLine({
      payType: "salary", payRate: 60000, days: 14, state: "TX",
      filingStatus: "single", allowances: 0, deductions: [],
    });
    expect(tx.stateTax).toBe(0);
  });

  it("never returns a negative net pay", () => {
    const result = calculatePayrollLine({
      payType: "hourly", payRate: 15, days: 1, state: "CA",
      filingStatus: "single", allowances: 0,
      deductions: [{ type: "garnishment", amount: 100000, is_percent: 0 }],
    });
    expect(result.netPay).toBeGreaterThanOrEqual(0);
  });
});
