// src/stripe-config.ts - COMPLETE VERSION
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

export const products = {
  pro: {
    name: 'Maple Aurum Pro',
    description: 'Advanced analytics and insights for Canadian precious metals companies',
    mode: 'subscription' as const,
    successUrl: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=Pro`,
    cancelUrl: `${FRONTEND_URL}/subscribe`,
    prices: {
      monthly: {
        priceId: 'price_1RTylqAst4LlpL7pTIvN18rF', // ✅ NEW Pro Monthly $15 CAD
        amount: 15,
        currency: 'CAD',
        interval: 'month'
      },
      yearly: {
        priceId: 'price_1RTysEAst4LlpL7pM2Kvc3dw', // ✅ NEW Pro Yearly $110 CAD  
        amount: 110,
        currency: 'CAD',
        interval: 'year'
      }
    },
    features: [
      'Advanced financial metrics',
      'Resource estimates and production data', 
      'Market analysis tools',
      'Custom watchlists (coming soon)',
      'Email support'
    ],
    popular: true
  },
  premium: {
    name: 'Maple Aurum Premium',
    description: 'Complete access with premium features and priority support',
    mode: 'subscription' as const,
    successUrl: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=Premium`,
    cancelUrl: `${FRONTEND_URL}/subscribe`,
    prices: {
      monthly: {
        priceId: 'price_1RTyi3Ast4LlpL7pv6DnpcKS', // ✅ NEW Premium Monthly $30 CAD
        amount: 30,
        currency: 'CAD', 
        interval: 'month'
      },
      yearly: {
        priceId: 'price_1RTyppAst4LlpL7pC47N3jPT', // ✅ NEW Premium Yearly $260 CAD
        amount: 260,
        currency: 'CAD',
        interval: 'year'
      }
    },
    features: [
      'All Pro features included',
      'Advanced valuation models',
      'Priority customer support',
      'Exclusive market insights',
      'API access (coming soon)',
      'Custom reporting tools'
    ],
    popular: false
  }
} as const;

// Free trial coupons - create these in your Stripe Dashboard
export const FREE_TRIAL_COUPONS = {
  'PRO_TRIAL_1M': 'Free Pro Trial - 1 Month',
  'PREMIUM_TRIAL_1M': 'Free Premium Trial - 1 Month',
  'BETA_TESTER': 'Beta Tester Access'
};

// Helper functions
export const getPriceId = (plan: 'pro' | 'premium', interval: 'monthly' | 'yearly') => {
  return products[plan].prices[interval].priceId;
};

export const getProduct = (plan: 'pro' | 'premium') => {
  return products[plan];
};

export const getPrice = (plan: 'pro' | 'premium', interval: 'monthly' | 'yearly') => {
  return products[plan].prices[interval];
};

// Calculate yearly savings
export const getYearlySavings = (plan: 'pro' | 'premium') => {
  const product = products[plan];
  const monthlyTotal = product.prices.monthly.amount * 12;
  const yearlyPrice = product.prices.yearly.amount;
  const savings = monthlyTotal - yearlyPrice;
  const savingsPercent = Math.round((savings / monthlyTotal) * 100);
  
  return {
    amount: savings,
    percentage: savingsPercent,
    monthlyEquivalent: Math.round((yearlyPrice / 12) * 100) / 100
  };
};

// Types
export type ProductKey = 'pro' | 'premium';
export type PriceInterval = 'monthly' | 'yearly';
export type SubscriptionTier = 'free' | 'pro' | 'premium';