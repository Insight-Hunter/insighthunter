import React from "react";

const blocks = ["Short text", "Long text", "Email", "Date", "Select", "Checkbox"];

export default function FormBuilder() {
  return (
    <section className="grid gap-4 md:grid-cols-[280px,minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Field library</h3>
        <div className="mt-4 grid gap-3">
          {blocks.map((block) => (
            <button key={block} className="rounded-xl border border-slate-200 px-4 py-3 text-left">
              {block}
            </button>
          ))}
        </div>
      </aside>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Form builder canvas</h2>
        <p className="mt-2 text-slate-600">
          Drag fields here to compose a custom intake or compliance form.
        </p>
      </div>
    </section>
  );
}
