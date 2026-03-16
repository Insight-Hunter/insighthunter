import React from 'react';
import { HeroCard } from '../components/home/HeroCard';

const heroData = [
  {
    icon: 'https://i.imgur.com/3Z3jT3H.png',
    titlePrefix: 'BizForma',
    titleMain: 'Form Your Business<br />the Smart Way',
    description: 'LLC, Corp, EIN, State Registration, and Compliance — fully guided and automated.',
    ctaText: 'Start Formation',
    ctaLink: '/formation/new',
    image: 'https://i.imgur.com/vJcM0hl.png'
  },
  {
    icon: 'https://i.imgur.com/7b7g2zC.png',
    titlePrefix: 'Bookkeeping',
    titleMain: 'Your Books.<br />Always Clean.',
    description: 'Automated chart of accounts, transaction categorization, and real-time P&L — no accountant needed.',
    ctaText: 'See Bookkeeping',
    ctaLink: '#', // Update later
    image: 'https://i.imgur.com/hX0A5Q8.png'
  },
  {
    icon: 'https://i.imgur.com/T0bC0Ff.png',
    titlePrefix: 'CFO Intelligence',
    titleMain: 'CFO Intelligence.<br />On Demand.',
    description: 'AI-powered forecasting, P&L trends, cash flow projections, and exportable reports for your clients.',
    ctaText: 'Explore Insight Pro',
    ctaLink: '#', // Update later
    image: 'https://i.imgur.com/S5k2e38.png'
  },
    {
    icon: 'https://i.imgur.com/sVvL5hI.png',
    titlePrefix: 'CFO Intelligence',
    titleMain: 'CFO Intelligence.<br />On Demand.',
    description: 'AI-powered forecasting, P&L trends, cash flow projections, and exportable reports for your clients.',
    ctaText: 'Explore Insight',
    ctaLink: '#', // Update later
    image: 'https://i.imgur.com/JvabqVR.png'
  }
];

export const Home: React.FC = () => {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {heroData.map((data, index) => (
          <HeroCard key={index} {...data} />
        ))}
      </div>
    </div>
  );
};
