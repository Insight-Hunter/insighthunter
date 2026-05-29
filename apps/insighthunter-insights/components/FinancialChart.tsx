"use client";
import { motion } from 'framer-motion';

const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const values = [84, 108, 93, 136, 148, 162];

export default function FinancialChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800 p-6 rounded-lg shadow-lg h-96"
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Cash flow</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Q1 forecast</h2>
        </div>
        <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
          Actual + trend
        </span>
      </div>
      <div className="grid h-[calc(100%-64px)] grid-cols-6 gap-3 items-end">
        {values.map((value, index) => (
          <div key={labels[index]} className="flex flex-col items-center gap-2">
            <div className="relative h-52 w-full overflow-hidden rounded-3xl bg-slate-950/60">
              <div
                className="absolute bottom-0 left-0 right-0 rounded-3xl bg-teal-400"
                style={{ height: `${Math.max(16, value)}%` }}
              />
            </div>
            <div className="text-sm text-slate-300">{labels[index]}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
