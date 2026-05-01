import React from "react";

export default function BOIFilingTracker() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">BOI filing tracker</h2>
      <p className="mt-2 text-slate-600">
        Track beneficial ownership information readiness, document collection, and filing status.
      </p>
      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        Current status: owner information collection in progress.
      </div>
    </section>
  );
}
