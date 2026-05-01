import React from "react";

const docs = [
  "Articles of Organization.pdf",
  "Operating Agreement.pdf",
  "EIN Confirmation Letter.pdf",
];

export default function DocumentVault() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Document vault</h2>
      <p className="mt-2 text-slate-600">
        Store and organize formation, tax, and payroll files in R2-backed storage.
      </p>
      <div className="mt-4 space-y-3">
        {docs.map((doc) => (
          <div key={doc} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {doc}
          </div>
        ))}
      </div>
    </section>
  );
}
