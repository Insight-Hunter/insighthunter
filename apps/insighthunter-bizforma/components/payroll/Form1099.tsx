import React from "react";

export default function Form1099() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">1099 builder</h2>
      <p className="mt-2 text-slate-600">
        Prepare contractor payment records for 1099-NEC or 1099-MISC output.
      </p>
      <button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Generate 1099 package
      </button>
    </section>
  );
}
