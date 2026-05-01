import React from "react";

export default function AIFormFill() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">AI form fill</h2>
      <p className="mt-2 text-slate-600">
        Suggest likely field values based on existing business data and prior submissions.
      </p>
      <button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Generate suggestions
      </button>
    </section>
  );
}
