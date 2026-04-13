import React from "react";

export default function W4Form() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Employee W-4</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="Employee name" />
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="SSN" />
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="Filing status" />
        <input className="rounded-xl border border-slate-300 px-4 py-3" placeholder="Additional withholding" />
      </div>
      <button className="mt-5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white">
        Save W-4
      </button>
    </section>
  );
}
