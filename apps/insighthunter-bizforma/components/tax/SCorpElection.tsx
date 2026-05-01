import React from "react";

export default function SCorpElection() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">S-Corp election</h2>
      <p className="mt-2 text-slate-600">
        Track Form 2553 timing, ownership eligibility, and reasonable compensation planning.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Election window</div>
          <div className="mt-1 text-lg font-semibold">75 days from formation</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Status</div>
          <div className="mt-1 text-lg font-semibold">Not started</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500">Next step</div>
          <div className="mt-1 text-lg font-semibold">Verify shareholders</div>
        </div>
      </div>
    </section>
  );
}
