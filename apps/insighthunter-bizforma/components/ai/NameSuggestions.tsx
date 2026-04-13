import React from "react";

const names = ["Northfield Ledger", "Signal Peak Advisors", "Blue Oak BizWorks"];

export default function NameSuggestions() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">AI name suggestions</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {names.map((name) => (
          <div key={name} className="rounded-xl bg-slate-50 p-4 text-sm font-medium text-slate-800">
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
