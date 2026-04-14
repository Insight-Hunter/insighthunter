import type { Env } from "../types/env";
import { upsertPayrollSetup } from "../db/queries";

export function determine1099Required(totalPaidCents: number) {
  return totalPaidCents >= 60000;
}

export function buildPayrollSetupChecklist(hasEmployees: boolean, stateCode: string) {
  const tasks = [
    "Apply for EIN",
    `Register payroll withholding in ${stateCode}`,
    `Register unemployment insurance in ${stateCode}`,
  ];

  if (hasEmployees) {
    tasks.push("Collect Form W-4", "Set payroll schedule", "Set up payroll software");
  }

  return tasks;
}

export async function savePayrollSetup(
  env: Env,
  input: {
    id: string;
    tenantId: string;
    businessId: string;
    setupStatus: string;
    payload: Record<string, unknown>;
  },
) {
  await upsertPayrollSetup(env.DB, {
    id: input.id,
    tenantId: input.tenantId,
    businessId: input.businessId,
    setupStatus: input.setupStatus,
    payloadJson: JSON.stringify(input.payload),
  });

  return {
    ok: true,
    ...input,
  };
}
