import React from "react";

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`rounded-xl px-4 py-2 text-sm font-medium ${
            value === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
