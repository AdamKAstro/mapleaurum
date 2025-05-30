// supabase/functions/_shared/app-config.ts

// Define ProductKey type (can be shared between frontend and backend if kept simple)
export type ProductKey = 'pro' | 'premium' | 'free'; // Added 'free' for completeness

// Define APP_TRIAL_PROMO_CODES (backend version)
// These codes and their mappings are managed here for the backend.
// Ensure these product keys match what you expect (e.g., 'premium', 'pro')
export const APP_TRIAL_PROMO_CODES = {
  PREMIUM_30_DAY_NO_CARD: {
    tier: 'premium' as ProductKey,
    durationDays: 30,
    description: '30-Day Premium Trial (No Card Required)',
  },
  PRO_7_DAY_NO_CARD: {
    tier: 'pro' as ProductKey,
    durationDays: 7,
    description: '7-Day Pro Trial (No Card Required)',
  },
  // Add more as needed
};
export type AppTrialPromoCodeKey = keyof typeof APP_TRIAL_PROMO_CODES;

export function isValidAppTrialPromoCode(code: string): code is AppTrialPromoCodeKey {
  return code in APP_TRIAL_PROMO_CODES;
}

// You can add other backend-specific shared configurations or simple helpers here.
// Avoid any browser-specific APIs (window, document) or Vite-specific features (import.meta.env).
// For FRONTEND_URL, if needed in backend (e.g. for emails), get it from Deno.env.get('YOUR_APP_URL_ENV_VAR')