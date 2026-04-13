import React from "react";

type Props = {
  title?: string;
  dueDate?: string;
  status?: string;
};

export default function DeadlineCard({
  title = "Annual report filing",
  dueDate = "Apr 22",
  status = "Upcoming",
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{dueDate}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{title}</div>
      <span className="mt-3 inline-flex rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-700">
        {status}
      </span>
    </div>
  );
}
