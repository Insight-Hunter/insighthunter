"use client";
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export default function MetricCard({ title, value, icon }: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center space-x-4"
    >
      <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}
