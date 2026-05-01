import React from "react";

const reminders = [
  "Annual report due in 9 days",
  "Registered agent renewal due next month",
  "Local business license renewal pending review",
];

export default function RenewalReminders() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Renewal reminders</h2>
      <div className="mt-4 space-y-3">
        {reminders.map((item) => (
          <div key={item} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
