// src/components/payment/PricingCards.tsx
import { useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import { PRICING_PLANS } from '@/backend/utils/pricing';
import type { PricingTier } from '@/types';
import './PricingCards.css';

export default function PricingCards() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelectPlan = (planId: string) => {
    window.location.href = `/checkout?plan=${planId}`;
  };

  return (
    <div className="pricing-container">
      <div className="billing-toggle">
        <button
          className={billingPeriod === 'monthly' ? 'active' : ''}
          onClick={() => setBillingPeriod('monthly')}
        >
          Monthly
        </button>
        <button
          className={billingPeriod === 'yearly' ? 'active' : ''}
          onClick={() => setBillingPeriod('yearly')}
        >
          Yearly <span className="badge">Save 17%</span>
        </button>
      </div>

      <div className="pricing-cards">
        {(['insight-lite', 'standard', 'pro'] as PricingTier[]).map((tier) => {
          const plan = PRICING_PLANS[tier].find(
            (p) => p.billingPeriod === billingPeriod
          )!;

          return (
            <div
              key={plan.id}
              className={`pricing-card ${tier === 'standard' ? 'featured' : ''}`}
            >
              {tier === 'standard' && (
                <div className="featured-badge">Most Popular</div>
              )}

              <div className="card-header">
                <h3>{plan.name}</h3>
                <div className="price">
                  <span className="currency">$</span>
                  <span className="amount">{plan.price}</span>
                  <span className="period">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className="savings">Save ${plan.price - (plan.price / 10 * 12)}</p>
                )}
              </div>

              <ul className="features-list">
                {plan.features.map((feature, index) => (
                  <li key={index}>
                    <FiCheck className="check-icon" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`select-plan-btn ${tier === 'standard' ? 'primary' : 'secondary'}`}
              >
                {plan.price === 0 ? 'Get Started' : 'Start Free Trial'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="pricing-note">
        <p>All plans include a 14-day free trial, except for Insight-Lite which is always free.</p>
      </div>
    </div>
  );
}
