'use client';

import Link from 'next/link';
import './pricing.css'; // Import the new CSS file

const tiers = [
  {
    name: 'Lite',
    price: '$0',
    priceFrequency: '/month',
    tagline: 'Basic features for individuals and small teams.',
    features: [
      'Automated Bookkeeping (Basic)',
      'Financial Forecasting (3-Month)',
      'Basic Reporting',
      'Community Support',
    ],
    cta: 'Get Started',
    href: '/auth/signup',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$49',
    priceFrequency: '/month',
    tagline: 'Advanced features for growing businesses.',
    features: [
      'Everything in Lite, plus:',
      'Advanced AI Insights',
      'Full Financial Forecasting',
      'Priority Support',
      'Compliance Automation',
      'AI CFO & Scout',
      'PBX/Payroll Integration',
    ],
    cta: 'Choose Pro',
    href: '/auth/signup',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Contact Us',
    priceFrequency: '',
    tagline: 'Custom solutions for large organizations.',
    features: [
      'Everything in Pro, plus:',
      'Dedicated Account Manager',
      'On-premise Deployment',
      'Custom Integrations',
      'White-glove Onboarding',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@insighthunter.com',
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-white">
      <div className="ih-section">
        <div className="ih-section-header">
          <h2>Plans That Grow With Your Business</h2>
          <p>From startups to enterprises, InsightHunter scales with you.</p>
        </div>

        <div className="ih-pricing-grid">
          {tiers.map((tier) => (
            <div key={tier.name} className={`ih-plan ${tier.featured ? 'ih-plan-featured' : ''}`}>
              {tier.featured && <div className="ih-plan-badge">Most Popular</div>}
              <h3>{tier.name}</h3>
              <p className="ih-plan-price">
                {tier.price} <span>{tier.priceFrequency}</span>
              </p>
              <p className="ih-plan-tagline">{tier.tagline}</p>
              <ul className="ih-plan-features">
                {tier.features.map((feature, i) => <li key={i}>{feature}</li>)}
              </ul>
              <Link href={tier.href} className={`ih-btn ${tier.featured ? 'ih-btn-primary' : 'ih-btn-outline'} ih-btn-full`}>
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
