import React from "react";

const tasks = [
  "Register for IRS EFTPS access",
  "Create state withholding account if payroll is planned",
  "Set up unemployment tax account with the state",
  "Confirm local sales tax registration where applicable",
];

export default function TaxAccountSetup() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Tax account setup</h2>
      <div className="mt-4 space-y-3">
        {tasks.map((task) => (
          <label key={task} className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <input type="checkbox" className="mt-1" />
            <span className="text-sm text-slate-700">{task}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
