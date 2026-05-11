"use client";
import { motion } from 'framer-motion';

export default function FinancialChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800 p-6 rounded-lg shadow-lg h-96 flex items-center justify-center"
    >
      <p className="text-gray-400">Financial Chart Placeholder</p>
    </motion.div>
  );
}
