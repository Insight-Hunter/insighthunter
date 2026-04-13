import React from "react";

export default function DocumentUpload() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h2 className="text-2xl font-semibold">Upload documents</h2>
      <p className="mt-2 text-slate-600">
        Drop PDFs, IRS notices, formation receipts, and signed agreements here.
      </p>
      <button className="mt-5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white">
        Select files
      </button>
    </section>
  );
}
