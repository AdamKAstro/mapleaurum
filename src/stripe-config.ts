// src/stripe-config.ts - FIXED with your real coupon IDs
//const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
// src/stripe-config.ts

// Ensure VITE_FRONTEND_URL is set in your .env for development,
// and as an environment variable in your hosting (Netlify/Vercel) for production.
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://mapleaurum.com');

// Define ProductKey type first for use in products object
export type ProductKey = 'pro' | 'premium' | 'free'; // 'free' can be a valid tier

export const products = {
  pro: {
    key: 'pro' as Exclude<ProductKey, 'free'>, // Ensure key matches the actual key
    name: 'Maple Aurum Pro',
    description: 'Advanced analytics and insights for Canadian precious metals companies',
    mode: 'subscription' as const,
    successUrl: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=Pro&tier=pro`,
    cancelUrl: `${FRONTEND_URL}/subscribe`,
    prices: {
      monthly: {
        priceId: 'price_1RTylqAst4LlpL7pTIvN18rF', // Pro Monthly $15 CAD
        amount: 15,
        currency: 'CAD',
        interval: 'month' as const,
      },
      yearly: {
        priceId: 'price_1RTysEAst4LlpL7pM2Kvc3dw', // Pro Yearly $110 CAD
        amount: 110,
        currency: 'CAD',
        interval: 'year' as const,
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
    key: 'premium' as Exclude<ProductKey, 'free'>, // Ensure key matches the actual key
    name: 'Maple Aurum Premium',
    description: 'Complete access with premium features and priority support',
    mode: 'subscription' as const,
    successUrl: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=Premium&tier=premium`,
    cancelUrl: `${FRONTEND_URL}/subscribe`,
    prices: {
      monthly: {
        priceId: 'price_1RTyi3Ast4LlpL7pv6DnpcKS', // Premium Monthly $30 CAD
        amount: 30,
        currency: 'CAD', 
        interval: 'month' as const,
      },
      yearly: {
        priceId: 'price_1RTyppAst4LlpL7pC47N3jPT', // Premium Yearly $260 CAD
        amount: 260,
        currency: 'CAD',
        interval: 'year' as const,
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

// For Stripe Coupons (card usually required trials)
export const FREE_TRIAL_COUPONS: Record<string, string> = {
  'ldoCcm3N': 'Free Pro Trial - 1 Month (Stripe)',     // Your Pro trial coupon
  'SKtE1p9l': 'Free Premium Trial - 1 Month (Stripe)', // Your Premium trial coupon
  'jyL3Vqu8': 'Beta Tester Access (Stripe)'            // Your Beta tester coupon
};

// --- START: In-App Trial Configuration (NO CARD REQUIRED TRIALS) ---
export const APP_TRIAL_PROMO_CODES = {
  PREMIUM_30_DAY_NO_CARD: {
    tier: 'premium' as Exclude<ProductKey, 'free'>, // Maps to 'premium' product key
    durationDays: 30,
    description: '30-Day Premium Access (No Card)',
  },
  PRO_7_DAY_NO_CARD: {
    tier: 'pro' as Exclude<ProductKey, 'free'>, // Maps to 'pro' product key
    durationDays: 7,
    description: '7-Day Pro Access (No Card)',
  },
  // Example: BETA_VIP_ACCESS can be added here if needed for in-app trials
  // BETA_VIP_APP_TRIAL: {
  //   tier: 'premium' as Exclude<ProductKey, 'free'>,
  //   durationDays: 90, // Or however long
  //   description: 'VIP Beta Access In-App Trial',
  // }
};
export type AppTrialPromoCodeKey = keyof typeof APP_TRIAL_PROMO_CODES;

export function isValidAppTrialPromoCode(code: string | null | undefined): code is AppTrialPromoCodeKey {
  if (!code) return false;
  return code in APP_TRIAL_PROMO_CODES;
}

export function generateAppTrialLink(promoCodeKey: AppTrialPromoCodeKey): string {
  const trialDetails = APP_TRIAL_PROMO_CODES[promoCodeKey];
  return `${FRONTEND_URL}/subscribe?promo_code=${promoCodeKey}&plan=${trialDetails.tier}`;
}
// --- END: In-App Trial Configuration ---


// Helper functions for Stripe products/prices
export const getPriceId = (plan: keyof typeof products, interval: 'monthly' | 'yearly') => {
  return products[plan].prices[interval].priceId;
};

export const getProduct = (plan: keyof typeof products) => {
  return products[plan];
};

export const getPrice = (plan: keyof typeof products, interval: 'monthly' | 'yearly') => {
  return products[plan].prices[interval];
};

export const getYearlySavings = (plan: keyof typeof products) => {
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

// Renamed for clarity: for Stripe Coupons
export const generateStripeCouponLink = (plan: keyof typeof products, couponType: 'trial' | 'beta' = 'trial') => {
  const couponId = couponType === 'trial' 
    ? (plan === 'pro' ? 'ldoCcm3N' : 'SKtE1p9l') // Using your actual Stripe Coupon IDs
    : 'jyL3Vqu8'; // Your Beta tester Stripe Coupon ID
    
  return `${FRONTEND_URL}/subscribe?coupon=${couponId}&plan=${plan}&admin=true`;
};

export type PriceIntervalKey = 'monthly' | 'yearly';
// ProductKey type is now defined higher up
export type SubscriptionTier = ProductKey; // 'free' | 'pro' | 'premium'