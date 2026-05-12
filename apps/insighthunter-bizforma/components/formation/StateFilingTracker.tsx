import React from "react";

const items = [
  { task: "Name availability search", status: "Done", due: "Completed" },
  { task: "Articles of organization", status: "In progress", due: "Apr 18" },
  { task: "Registered agent setup", status: "Pending", due: "Apr 18" },
  { task: "State tax registration", status: "Pending", due: "Apr 25" },
];

export default function StateFilingTracker() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold">State filing tracker</h2>
        <p className="text-slate-600">
          Track state formation tasks, due dates, and filing readiness.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.task}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-medium text-slate-900">{item.task}</div>
              <div className="text-sm text-slate-500">Due: {item.due}</div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
