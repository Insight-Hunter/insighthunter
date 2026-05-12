import React from "react";

export default function DocumentViewer() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Document viewer</h2>
        <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Download
        </button>
      </div>
      <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        PDF preview placeholder
      </div>
    </section>
  );
}
