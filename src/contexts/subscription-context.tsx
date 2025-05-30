// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient'; // Assuming path
import type { SubscriptionTier, ProductKey as AppProductKey } from '../stripe-config'; // Using ProductKey from stripe-config
import { useAuth } from './auth-context'; // Assuming path
import { getPriceId, products as appProducts } from '../stripe-config'; // Import products for tier validation

// Use price IDs from stripe-config.ts to ensure consistency
const PRO_MONTHLY_PRICE_ID = getPriceId('pro', 'monthly');
const PRO_YEARLY_PRICE_ID = getPriceId('pro', 'yearly');
const PREMIUM_MONTHLY_PRICE_ID = getPriceId('premium', 'monthly');
const PREMIUM_YEARLY_PRICE_ID = getPriceId('premium', 'yearly');

interface SubscriptionContextType {
  currentUserSubscriptionTier: SubscriptionTier;
  actualTierFromDB: SubscriptionTier;
  isLoading: boolean;
  error: string | null;
  refreshSubscriptionStatus: () => Promise<void>;
  setDebugTierOverride: (tier: SubscriptionTier | null) => void;
  debugTierOverrideActive: boolean;
  subscriptionDetails: {
    id: string; // Stripe Subscription ID or generated app-trial ID
    status: string; // e.g., 'active', 'trialing' (from Stripe), 'trialing_in_app'
    price_id?: string; // Stripe Price ID, may be undefined for app trials
    current_period_end?: string; // Stripe's period end or app trial's expires_at
    cancel_at_period_end?: boolean; // From Stripe
  } | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DB_FETCH_TIMEOUT = 10 * 1000; // 10 seconds

async function getSubscriptionStatusFromDB(userId: string): Promise<{
  tier: SubscriptionTier,
  details: SubscriptionContextType['subscriptionDetails']
}> {
  if (!userId) {
    console.log('[SubscriptionProvider] No userId provided, returning "free".');
    return { tier: 'free' as SubscriptionTier, details: null };
  }

  console.log(`[SubscriptionProvider] Fetching subscription status for user: ${userId}`);
  console.log('[SubscriptionProvider] Price ID Constants used for mapping:', {
    PRO_MONTHLY_PRICE_ID, PRO_YEARLY_PRICE_ID, PREMIUM_MONTHLY_PRICE_ID, PREMIUM_YEARLY_PRICE_ID
  });
  let queryTimeoutId: ReturnType<typeof setTimeout> | null = null; // Use ReturnType for browser/Node.js compatibility

  try {
    // Step 0: Check for active in-app trial first
    const now = new Date().toISOString();
    console.log(`[SubscriptionProvider] Checking for active app trial for user_id: ${userId}`);
    const appTrialPromise = supabase
      .from('user_app_trials')
      .select('tier, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const appTrialResult = await Promise.race([
      appTrialPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => {
          reject(new Error('Supabase query timed out fetching app trial'));
        }, DB_FETCH_TIMEOUT);
      }),
    ]) as { data: { tier: string; expires_at: string } | null; error: any };

    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    queryTimeoutId = null;

    if (appTrialResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching app trial:', appTrialResult.error.message);
      // Don't return 'free' yet, proceed to check Stripe subscriptions
    }

    if (appTrialResult.data) {
      const { tier: appTrialTierString, expires_at: appTrialExpiresAt } = appTrialResult.data;
      const appTrialTier = appTrialTierString as AppProductKey; // Cast to your ProductKey type

      // Validate if appTrialTier is a recognized product key (pro, premium)
      if (appTrialTier === 'pro' || appTrialTier === 'premium') {
          console.log(`[SubscriptionProvider] Active app trial found for user ${userId}: Tier ${appTrialTier}, Expires: ${appTrialExpiresAt}`);
          return {
            tier: appTrialTier,
            details: {
              id: `app-trial-${userId}-${appTrialTier}`,
              status: 'trialing_in_app',
              current_period_end: appTrialExpiresAt,
            }
          };
      } else {
        console.warn(`[SubscriptionProvider] App trial tier "${appTrialTier}" is not a recognized paid tier. Proceeding to check Stripe.`);
      }
    }

    // Step 1: Get customer_id from stripe_customers table
    console.log(`[SubscriptionProvider] Fetching customer_id for user_id: ${userId}`);
    const customerPromise = supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    const customerResult = await Promise.race([
      customerPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => {
          reject(new Error('Supabase query timed out fetching customer_id'));
        }, DB_FETCH_TIMEOUT);
      }),
    ]) as { data: { customer_id: string } | null; error: any };

    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    queryTimeoutId = null;

    if (customerResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching customer_id:', customerResult.error.message);
      return { tier: 'free' as SubscriptionTier, details: null };
    }
    if (!customerResult.data || !customerResult.data.customer_id) {
      console.log(`[SubscriptionProvider] No Stripe customer_id found for user_id: ${userId}. Defaulting to 'free'.`);
      return { tier: 'free' as SubscriptionTier, details: null };
    }
    const customerId = customerResult.data.customer_id;
    console.log(`[SubscriptionProvider] Found customer_id: ${customerId}. Fetching Stripe subscription details.`);

    // Step 2: Get Stripe subscription status using customer_id
    const subscriptionPromise = supabase
      .from('stripe_subscriptions')
      .select('subscription_id, status, price_id, current_period_end, cancel_at_period_end, trial_start, trial_end') // Added trial_start, trial_end
      .eq('customer_id', customerId)
      .in('status', ['active', 'trialing'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscriptionResult = await Promise.race([
      subscriptionPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => {
          reject(new Error('Supabase query timed out fetching Stripe subscription status'));
        }, DB_FETCH_TIMEOUT);
      }),
    ]) as { data: { subscription_id: string; status: string; price_id: string; current_period_end: string; cancel_at_period_end: boolean; trial_start?: string; trial_end?: string; } | null; error: any };
    
    if (queryTimeoutId) clearTimeout(queryTimeoutId);

    if (subscriptionResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching Stripe subscription status:', subscriptionResult.error.message);
      return { tier: 'free' as SubscriptionTier, details: null };
    }

    if (subscriptionResult.data && subscriptionResult.data.price_id && (subscriptionResult.data.status === 'active' || subscriptionResult.data.status === 'trialing')) {
      const { subscription_id, price_id, status, current_period_end, cancel_at_period_end, trial_end } = subscriptionResult.data;
      console.log(`[SubscriptionProvider] DB Stripe Subscription Data for customer ${customerId}: id=${subscription_id}, status=${status}, price_id=${price_id}, trial_end=${trial_end}`);
      
      // If it's a Stripe trial ('trialing' status) and the trial_end date is in the past, treat as free.
      if (status === 'trialing' && trial_end && new Date(trial_end) < new Date()) {
        console.log(`[SubscriptionProvider] Stripe trial for sub ${subscription_id} has ended (${trial_end}). Defaulting to 'free'.`);
        return { tier: 'free' as SubscriptionTier, details: { ...subscriptionResult.data, status: 'ended_trial' } }; // Custom status
      }
      
      let determinedTier: SubscriptionTier = 'free' as SubscriptionTier;
      switch (price_id) {
        case PRO_MONTHLY_PRICE_ID:
        case PRO_YEARLY_PRICE_ID:
          determinedTier = 'pro';
          break;
        case PREMIUM_MONTHLY_PRICE_ID:
        case PREMIUM_YEARLY_PRICE_ID:
          determinedTier = 'premium';
          break;
        default:
          console.warn(`[SubscriptionProvider] Active/trialing Stripe subscription for customer ${customerId} found with UNRECOGNIZED Price ID: "${price_id}". Defaulting tier to free.`);
          determinedTier = 'free' as SubscriptionTier;
      }
      console.log(`[SubscriptionProvider] Mapped Price ID ${price_id} to '${determinedTier}' tier with status '${status}'.`);
      return {
        tier: determinedTier,
        details: {
            id: subscription_id,
            status,
            price_id,
            current_period_end,
            cancel_at_period_end
        }
      };
    }
    
    console.log(`[SubscriptionProvider] No active/trialing Stripe subscription with recognized price_id found for customer ${customerId} (user ${userId}). Defaulting to 'free'.`);
    return { tier: 'free' as SubscriptionTier, details: null };

  } catch (err: any) {
    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    console.error('[SubscriptionProvider] Error or timeout in getSubscriptionStatusFromDB:', err.message);
    return { tier: 'free' as SubscriptionTier, details: null };
  }
}


export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const [actualTierFromDB, setActualTierFromDB] = useState<SubscriptionTier>('free' as SubscriptionTier);
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionContextType['subscriptionDetails']>(null);
  const [debugTierUserOverride, setDebugTierUserOverride] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Separate loading state for subscription checks
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
    if (isAuthLoading && isInitialLoad) {
      console.log('[SubscriptionProvider] Auth is loading, delaying initial subscription check.');
      setIsLoading(true); // Keep this provider loading if auth is loading initially
      return;
    }

    if (!session || !user || !user.id) {
      console.log('[SubscriptionProvider] No session/user/userId, setting actualTierFromDB to free.');
      setActualTierFromDB('free' as SubscriptionTier);
      setSubscriptionDetails(null);
      if (isInitialLoad) setIsLoading(false); // No longer loading subscription data
      setError(null);
      return;
    }

    console.log(`[SubscriptionProvider] User session active (User ID: ${user.id}). Checking subscription status from DB.`);
    if (isInitialLoad || !isLoading) { // Set loading true if it's initial or if it wasn't already loading
        setIsLoading(true);
    }
    setError(null); // Clear previous errors

    try {
      const { tier: tierFromDB, details: detailsFromDB } = await getSubscriptionStatusFromDB(user.id);
      setActualTierFromDB(tierFromDB);
      setSubscriptionDetails(detailsFromDB);
      console.log(`[SubscriptionProvider] Tier from DB for user ${user.id}: ${tierFromDB}, Details:`, detailsFromDB);
      // Example of specific error handling if needed based on details
      // if (tierFromDB === 'free' && detailsFromDB?.status === 'ended_trial') {
      //   setError('Your trial period has ended. Please subscribe to continue.');
      // }
    } catch (err: any) { // This catch is more for unexpected errors in this function itself
      console.error('[SubscriptionProvider] Error in checkSubscriptionStatus during DB fetch:', err.message);
      setError(err.message || 'Failed to check subscription status.');
      // Fallback, getSubscriptionStatusFromDB already defaults to free on error
      setActualTierFromDB('free' as SubscriptionTier); 
      setSubscriptionDetails(null);
    } finally {
      setIsLoading(false); // Always set loading to false after check completes or fails
    }
  }, [session, user, isAuthLoading]); // Removed isLoading from deps to avoid re-triggering checkSubscriptionStatus when it changes inside

  useEffect(() => {
    let isMounted = true;
    if (!isAuthLoading) {
      console.log('[SubscriptionProvider] Auth loading complete or not active. Initializing subscription check.');
      checkSubscriptionStatus(true); // isInitialLoad = true

      if (intervalRef.current) clearInterval(intervalRef.current);
      if (session && user) {
        console.log('[SubscriptionProvider] Setting up periodic subscription check interval.');
        intervalRef.current = window.setInterval(() => {
          if (isMounted && document.visibilityState === 'visible') {
            console.log('[SubscriptionProvider] Periodic interval check triggered.');
            checkSubscriptionStatus(false); // isInitialLoad = false
          }
        }, SUBSCRIPTION_CHECK_INTERVAL);
      }
    } else {
      console.log('[SubscriptionProvider] Waiting for Auth to complete before initial subscription check.');
      setIsLoading(true); 
    }

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        console.log('[SubscriptionProvider] Cleaning up interval on unmount.');
        clearInterval(intervalRef.current);
      }
    };
  }, [checkSubscriptionStatus, isAuthLoading, session, user]);

  const refreshSubscriptionStatus = useCallback(async () => {
    console.log('[SubscriptionProvider] Manual refreshSubscriptionStatus triggered.');
    if (isAuthLoading) {
      console.log('[SubscriptionProvider] Auth still loading, refresh will run after auth.');
      // Do not set isLoading true here, let checkSubscriptionStatus handle it if it runs
      return;
    }
    if (!user || !user.id) {
      console.log('[SubscriptionProvider] No user for manual refresh, setting to free.');
      setActualTierFromDB('free' as SubscriptionTier);
      setSubscriptionDetails(null);
      setIsLoading(false); // Explicitly set loading false here as checkSubscriptionStatus won't run
      return;
    }
    await checkSubscriptionStatus(false); // isInitialLoad = false
  }, [checkSubscriptionStatus, user, isAuthLoading]);

  const setDebugTierOverride = useCallback((tier: SubscriptionTier | null) => {
    if (import.meta.env.DEV) { // Use DEV for Vite, or a similar check for your env
      console.warn(`[SubscriptionProvider] DEBUG TIER OVERRIDE set to: ${tier === null ? 'None (use actual)' : tier}`);
      setDebugTierUserOverride(tier);
    } else {
      console.warn("[SubscriptionProvider] Debug tier override is only available in development mode. Current mode:", import.meta.env.MODE);
    }
  }, []);

  const effectiveTierToUse = debugTierUserOverride !== null ? debugTierUserOverride : actualTierFromDB;
  const isDebugCurrentlyActive = debugTierUserOverride !== null;
  
  // isLoading here refers to the subscription check loading, isAuthLoading is for auth.
  // Context consumer might want to know about both.
  const combinedIsLoading = isAuthLoading || isLoading; 

  const value: SubscriptionContextType = {
    currentUserSubscriptionTier: effectiveTierToUse,
    actualTierFromDB: actualTierFromDB,
    subscriptionDetails,
    isLoading: combinedIsLoading,
    error,
    refreshSubscriptionStatus,
    setDebugTierOverride,
    debugTierOverrideActive: isDebugCurrentlyActive,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider. Ensure it is wrapped.');
  }
  return context;
}