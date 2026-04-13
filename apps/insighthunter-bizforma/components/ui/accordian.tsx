import React, { useState } from "react";

export function Accordion({
  items,
}: {
  items: Array<{ title: string; content: React.ReactNode }>;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.title} className="rounded-xl border border-slate-200 bg-white">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left font-medium"
            onClick={() => setOpen(open === index ? null : index)}
          >
            {item.title}
            <span>{open === index ? "−" : "+"}</span>
          </button>
          {open === index && <div className="px-4 pb-4 text-sm text-slate-600">{item.content}</div>}
        </div>
      ))}
    </div>
  );
}
