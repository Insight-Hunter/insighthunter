import React from "react";

const steps = [
  "Confirm the legal name and formation state match your filing records.",
  "Verify the responsible party, SSN/ITIN, and business address before starting Form SS-4.",
  "Choose the correct tax classification and first date wages will be paid, if applicable.",
  "Download or review the prefilled SS-4 packet after completing intake.",
];

export default function EINGuide() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">EIN guide</h2>
      <p className="mt-2 text-slate-600">
        Walk through EIN prep, SS-4 requirements, and the data needed to avoid IRS rework.
      </p>

      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"
          >
            <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
              {index + 1}
            </span>
            <span className="text-sm text-slate-700">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
