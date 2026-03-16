'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const campaigns = [
  {
    id: 1,
    name: 'Summer Sale',
    status: 'Active',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    budget: 5000,
  },
  {
    id: 2,
    name: 'Back to School',
    status: 'Inactive',
    startDate: '2024-08-15',
    endDate: '2024-09-15',
    budget: 7500,
  },
  {
    id: 3,
    name: 'Holiday Special',
    status: 'Active',
    startDate: '2024-11-20',
    endDate: '2024-12-25',
    budget: 10000,
  },
];

export default function CampaignsPage() {
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
        <h1 className="text-4xl font-bold text-white">Campaigns</h1>
        <Link href="/campaigns/new">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-accent text-white px-6 py-3 rounded-lg font-semibold shadow-lg"
          >
            New Campaign
          </motion.button>
        </Link>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className="bg-elevated-background rounded-2xl shadow-lg"
      >
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="p-6">Name</th>
              <th>Status</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Budget</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <motion.tr
                key={campaign.id}
                variants={FADE_IN}
                className="border-b border-border-subtle hover:bg-background transition-colors"
              >
                <td className="p-6 font-medium text-text">{campaign.name}</td>
                <td>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      campaign.status === 'Active'
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td className="text-muted-text">{campaign.startDate}</td>
                <td className="text-muted-text">{campaign.endDate}</td>
                <td className="text-muted-text">${campaign.budget}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
