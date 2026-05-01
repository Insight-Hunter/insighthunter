import React from "react";

export default function W9Form() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">W-9 request and fill</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="Business legal name" />
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="Tax classification" />
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="TIN / EIN" />
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="Address" />
      </div>
      <button className="mt-5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white">
        Save W-9 draft
      </button>
    </section>
  );
}
