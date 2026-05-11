import React from "react";

export default function FormationSummary() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Formation summary</h2>
      <p className="mt-2 text-slate-600">
        Download a consolidated summary of formation choices, filing tasks, EIN prep, and next actions.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">Included in the summary</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
            <li>Entity recommendation and rationale</li>
            <li>State filing tasks and estimated fees</li>
            <li>EIN preparation checklist</li>
            <li>Compliance deadlines and reminders</li>
          </ul>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-300 p-4">
          <button className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white">
            Generate summary PDF
          </button>
        </div>
      </div>
    </section>
  );
}
