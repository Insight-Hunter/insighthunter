import React from "react";

const submissions = [
  "Vendor packet - Apr 10",
  "State permit renewal - Apr 08",
  "Client intake - Apr 05",
];

export default function FormSubmissionViewer() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Submission viewer</h2>
      <ul className="mt-4 space-y-3">
        {submissions.map((item) => (
          <li key={item} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
