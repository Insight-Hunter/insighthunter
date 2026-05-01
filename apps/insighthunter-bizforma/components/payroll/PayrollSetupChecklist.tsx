import React from "react";

const checklist = [
  "EIN confirmed for payroll use",
  "State withholding account opened",
  "State unemployment registration complete",
  "Payroll provider selected",
  "First payroll date set",
];

export default function PayrollSetupChecklist() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Payroll setup checklist</h2>
      <div className="mt-4 space-y-3">
        {checklist.map((item) => (
          <label key={item} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <input type="checkbox" />
            <span className="text-sm text-slate-700">{item}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
