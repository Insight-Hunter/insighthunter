'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function NewCampaignPage() {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Handle form submission here
    router.push('/campaigns');
  };

  const FADE_IN = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={FADE_IN}
        className="flex justify-between items-center mb-8"
      >
        <h1 className="text-4xl font-bold text-white">New Campaign</h1>
      </motion.div>

      <motion.form
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.2,
            },
          },
        }}
        onSubmit={handleSubmit}
        className="space-y-6 max-w-lg mx-auto bg-elevated-background p-8 rounded-2xl shadow-lg"
      >
        <motion.div variants={FADE_IN}>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-muted-text"
          >
            Campaign Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="e.g., Summer Sale"
          />
        </motion.div>

        <motion.div variants={FADE_IN}>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-muted-text"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            required
            className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
          >
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </motion.div>

        <motion.div variants={FADE_IN} className="flex space-x-4">
          <div className="flex-1">
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-muted-text"
            >
              Start Date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              required
              className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-muted-text"
            >
              End Date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              required
              className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>
        </motion.div>

        <motion.div variants={FADE_IN}>
          <label
            htmlFor="budget"
            className="block text-sm font-medium text-muted-text"
          >
            Budget
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            required
            className="mt-1 block w-full px-4 py-3 bg-background border border-border-subtle rounded-md text-text placeholder-muted-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            placeholder="e.g., 5000"
          />
        </motion.div>

        <motion.div variants={FADE_IN} className="flex justify-end pt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => router.back()}
            className="mr-4 bg-background text-text px-6 py-3 rounded-lg font-semibold"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="bg-accent text-white px-6 py-3 rounded-lg font-semibold shadow-lg"
          >
            Create Campaign
          </motion.button>
        </motion.div>
      </motion.form>
    </div>
  );
}
