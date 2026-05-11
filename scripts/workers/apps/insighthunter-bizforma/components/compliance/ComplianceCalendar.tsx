import React from "react";

const dates = [
  { label: "Annual report", date: "Apr 22" },
  { label: "Sales tax filing", date: "May 01" },
  { label: "Registered agent renewal", date: "May 15" },
];

export default function ComplianceCalendar() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Compliance calendar</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {dates.map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-slate-500">{item.date}</div>
            <div className="mt-1 font-semibold text-slate-900">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
