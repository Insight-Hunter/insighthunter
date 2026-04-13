import React from "react";

const cards = [
  "W-9 management",
  "Tax account setup",
  "S-Corp election tracking",
  "State and federal onboarding",
];

export default function TaxFormsHub() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">Tax forms hub</h2>
        <p className="text-slate-600">
          Central workspace for federal and state tax setup, guidance, and document preparation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">{card}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
