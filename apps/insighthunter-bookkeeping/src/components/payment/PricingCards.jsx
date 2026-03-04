import React, { useState, useEffect } from 'react';
import { PRICING_PLANS } from '@/backend/utils/pricing';

const PricingCards = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    console.log('PRICING_PLANS:', PRICING_PLANS);
  }, []);

  const handleCycleChange = (cycle) => {
    setBillingCycle(cycle);
  };

  return (
    <div className="pricing-container">
      <div className="billing-toggle">
        <button 
          onClick={() => handleCycleChange('monthly')} 
          className={billingCycle === 'monthly' ? 'active' : ''}>
          Monthly
        </button>
        <button 
          onClick={() => handleCycleChange('yearly')} 
          className={billingCycle === 'yearly' ? 'active' : ''}>
          Yearly
        </button>
        <span className="discount-badge">2 months free</span>
      </div>
      
      <div className="pricing-grid">
        {Object.keys(PRICING_PLANS).map((tier) => {
          const plan = PRICING_PLANS[tier].find(p => p.billingPeriod === billingCycle);
          if (!plan) return null;

          return (
            <div key={plan.id} className={`pricing-card ${tier}`}>
              <div className="card-header">
                <h2>{plan.name}</h2>
                <p className="price">
                  ${plan.price}<span className="billing-period">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </p>
              </div>
              <div className="card-body">
                <ul className="features-list">
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div className="card-footer">
                <a href="/signup" className="cta-button">Choose Plan</a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PricingCards;
