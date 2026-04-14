import { describe, expect, it } from "vitest";
import { buildPayrollSetupChecklist, determine1099Required } from "../../services/payrollService";

describe("payrollService", () => {
  it("flags 1099 threshold at $600+", () => {
    expect(determine1099Required(60000)).toBe(true);
    expect(determine1099Required(59999)).toBe(false);
  });

  it("builds payroll checklist with employee tasks", () => {
    const result = buildPayrollSetupChecklist(true, "GA");
    expect(result).toContain("Collect Form W-4");
  });
});
