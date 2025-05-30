// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
import { supabase } from '../lib/supabaseClient';
import type { SubscriptionTier, ProductKey } from '../stripe-config'; // Using ProductKey from stripe-config
import { useAuth } from './auth-context';
import { getPriceId, products as appProducts } from '../stripe-config';

// Price ID Constants from stripe-config.ts
const PRO_MONTHLY_PRICE_ID = getPriceId('pro', 'monthly');
const PRO_YEARLY_PRICE_ID = getPriceId('pro', 'yearly');
const PREMIUM_MONTHLY_PRICE_ID = getPriceId('premium', 'monthly');
const PREMIUM_YEARLY_PRICE_ID = getPriceId('premium', 'yearly');

// Detailed subscription information structure
export interface SubscriptionDetails {
  id: string; // Stripe Subscription ID or a generated ID for app trials
  status: string; // e.g., 'active', 'trialing', 'trialing_in_app', 'canceled'
  price_id?: string; // Stripe Price ID, may not exist for app trials
  current_period_end?: string; // Also used for app trial expiry date
  cancel_at_period_end?: boolean;
  // Add other relevant fields from your stripe_subscriptions table if needed
  // For app trials, tier can be derived from ProductKey
  tier?: ProductKey; 
}

interface SubscriptionContextType {
  currentUserSubscriptionTier: SubscriptionTier;
  actualTierFromDB: SubscriptionTier;
  subscriptionDetails: SubscriptionDetails | null; // To store more detailed info
  isLoading: boolean;
  error: string | null;
  refreshSubscriptionStatus: () => Promise<void>;
  setDebugTierOverride: (tier: SubscriptionTier | null) => void;
  debugTierOverrideActive: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DB_FETCH_TIMEOUT = 10 * 1000; // 10 seconds

async function getSubscriptionStatusFromDB(
  userId: string,
  currentSupabaseClient: SupabaseClient
): Promise<{ tier: SubscriptionTier; details: SubscriptionDetails | null }> {
  if (!userId) {
    console.log('[SubscriptionProvider] No userId provided, returning "free".');
    return { tier: 'free', details: null };
  }

  console.log(`[SubscriptionProvider] Fetching subscription status for user: ${userId}`);
  console.log('[SubscriptionProvider] Price ID Constants:', {
    PRO_MONTHLY_PRICE_ID, PRO_YEARLY_PRICE_ID, PREMIUM_MONTHLY_PRICE_ID, PREMIUM_YEARLY_PRICE_ID
  });
  let queryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    // --- Step 0: Check for active in-app trial first ---
    const now = new Date().toISOString();
    console.log(`[SubscriptionProvider] Checking for active app trial for user_id: ${userId}`);
    const appTrialPromise = currentSupabaseClient
      .from('user_app_trials')
      .select('tier, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const appTrialResult = (await Promise.race([
      appTrialPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => reject(new Error('Supabase query timed out fetching app trial')), DB_FETCH_TIMEOUT);
      }),
    ])) as { data: { tier: string; expires_at: string } | null; error: any };

    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    queryTimeoutId = null;

    if (appTrialResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching app trial:', appTrialResult.error.message);
      // Do not return 'free' yet; proceed to check Stripe subscriptions.
    }

    if (appTrialResult.data) {
      const { tier: appTrialTierString, expires_at: appTrialExpiresAt } = appTrialResult.data;
      const appTrialTier = appTrialTierString as ProductKey;

      // Validate if tierFromAppTrial is a recognized ProductKey
      if (appProducts[appTrialTier as keyof typeof appProducts] || appTrialTier === 'free') {
        console.log(`[SubscriptionProvider] Active app trial found for user ${userId}: Tier ${appTrialTier}, Expires: ${appTrialExpiresAt}`);
        return {
          tier: appTrialTier,
          details: {
            id: `app-trial-${userId}-${appTrialTier}`, // Composite ID for app trial
            status: 'trialing_in_app',
            current_period_end: appTrialExpiresAt,
            tier: appTrialTier,
          },
        };
      } else {
        console.warn(`[SubscriptionProvider] App trial tier "${appTrialTier}" not recognized. Proceeding to check Stripe.`);
      }
    }
    // --- End In-App Trial Check ---

    // Step 1: Get customer_id from stripe_customers table
    console.log(`[SubscriptionProvider] Fetching customer_id for user_id: ${userId}`);
    const customerPromise = currentSupabaseClient
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    const customerResult = (await Promise.race([
      customerPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => reject(new Error('Supabase query timed out fetching customer_id')), DB_FETCH_TIMEOUT);
      }),
    ])) as { data: { customer_id: string } | null; error: any };

    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    queryTimeoutId = null;

    if (customerResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching customer_id:', customerResult.error.message);
      return { tier: 'free', details: null };
    }

    if (!customerResult.data || !customerResult.data.customer_id) {
      console.log(`[SubscriptionProvider] No Stripe customer_id found for user_id: ${userId}. Defaulting to 'free'.`);
      return { tier: 'free', details: null };
    }

    const customerId = customerResult.data.customer_id;
    console.log(`[SubscriptionProvider] Found customer_id: ${customerId}. Fetching Stripe subscription details.`);

    // Step 2: Get Stripe subscription status using customer_id
    const subscriptionPromise = currentSupabaseClient
      .from('stripe_subscriptions')
      .select('subscription_id, status, price_id, current_period_end, cancel_at_period_end, trial_end') // Added trial_end
      .eq('customer_id', customerId)
      .in('status', ['active', 'trialing'])
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscriptionResult = (await Promise.race([
      subscriptionPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => reject(new Error('Supabase query timed out fetching Stripe subscription status')), DB_FETCH_TIMEOUT);
      }),
    ])) as { data: SubscriptionDetails & { trial_end?: string } | null; error: any }; // Adjusted type

    if (queryTimeoutId) clearTimeout(queryTimeoutId);

    if (subscriptionResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching Stripe subscription status:', subscriptionResult.error.message);
      return { tier: 'free', details: null };
    }

    if (subscriptionResult.data && subscriptionResult.data.price_id && (subscriptionResult.data.status === 'active' || subscriptionResult.data.status === 'trialing')) {
      const { subscription_id, price_id, status, current_period_end, cancel_at_period_end, trial_end } = subscriptionResult.data;
      console.log(`[SubscriptionProvider] DB Stripe Subscription Data for customer ${customerId}: id=${subscription_id}, status=${status}, price_id=${price_id}`);
      
      let determinedTier: SubscriptionTier = 'free';
      let tierProductKey: ProductKey = 'free';

      switch (price_id) {
        case PRO_MONTHLY_PRICE_ID:
        case PRO_YEARLY_PRICE_ID:
          determinedTier = 'pro';
          tierProductKey = 'pro';
          break;
        case PREMIUM_MONTHLY_PRICE_ID:
        case PREMIUM_YEARLY_PRICE_ID:
          determinedTier = 'premium';
          tierProductKey = 'premium';
          break;
        default:
          console.warn(`[SubscriptionProvider] Active/trialing Stripe subscription for customer ${customerId} found with UNRECOGNIZED Price ID: "${price_id}". Defaulting tier to free.`);
          determinedTier = 'free';
      }
      console.log(`[SubscriptionProvider] Mapped Price ID ${price_id} to '${determinedTier}' tier.`);
      return {
        tier: determinedTier,
        details: {
            id: subscription_id,
            status,
            price_id,
            current_period_end: status === 'trialing' && trial_end ? trial_end : current_period_end, // Prefer trial_end if trialing
            cancel_at_period_end,
            tier: tierProductKey,
        }
      };
    }
    
    console.log(`[SubscriptionProvider] No active/trialing Stripe subscription with recognized price_id found for customer ${customerId} (user ${userId}). Defaulting to 'free'.`);
    return { tier: 'free', details: null };

  } catch (err: any) {
    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    console.error('[SubscriptionProvider] Error or timeout in getSubscriptionStatusFromDB:', err.message);
    return { tier: 'free', details: null };
  }
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const [actualTierFromDB, setActualTierFromDB] = useState<SubscriptionTier>('free');
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [debugTierUserOverride, setDebugTierUserOverride] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoadingState] = useState(true); // Renamed to avoid conflict with prop
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
    if (isAuthLoading && isInitialLoad) {
      console.log('[SubscriptionProvider] Auth is loading, delaying initial subscription check.');
      setIsLoadingState(true);
      return;
    }

    if (!session || !user || !user.id) {
      console.log('[SubscriptionProvider] No session/user/userId, setting actualTierFromDB to free.');
      setActualTierFromDB('free');
      setSubscriptionDetails(null);
      if (isInitialLoad) setIsLoadingState(false);
      setError(null);
      return;
    }

    console.log(`[SubscriptionProvider] User session active (User ID: ${user.id}). Checking subscription status from DB.`);
    if (isInitialLoad) {
      setIsLoadingState(true);
    }
    setError(null); // Clear previous errors on new check

    try {
      const { tier: tierFromDB, details: detailsFromDB } = await getSubscriptionStatusFromDB(user.id, supabase);
      setActualTierFromDB(tierFromDB);
      setSubscriptionDetails(detailsFromDB);
      console.log(`[SubscriptionProvider] Tier from DB for user ${user.id}: ${tierFromDB}, Details:`, detailsFromDB);
      // Existing error logic based on tierFromDB can remain or be adjusted
      // if (tierFromDB === 'free' && (error?.includes('timed out') || error?.includes('does not exist'))) {
      //   setError('Failed to accurately fetch subscription status. Displaying free tier data as a fallback.');
      // }
    } catch (err: any) {
      console.error('[SubscriptionProvider] Error in checkSubscriptionStatus during DB fetch:', err.message);
      setError(err.message || 'Failed to check subscription status from DB.');
      if (isInitialLoad) { // Only default to free on initial load if there's an error
        setActualTierFromDB('free');
        setSubscriptionDetails(null);
      }
    } finally {
      if (isInitialLoad) setIsLoadingState(false);
    }
  }, [session, user, isAuthLoading, supabase]); // Added supabase to dependency array

  useEffect(() => {
    let isMounted = true;
    if (!isAuthLoading) {
      console.log('[SubscriptionProvider] Auth loading complete or not active. Initializing subscription check.');
      checkSubscriptionStatus(true); // isInitialLoad = true

      if (intervalRef.current) clearInterval(intervalRef.current);
      
      if (session && user) { // Only set interval if user is logged in
        console.log('[SubscriptionProvider] Setting up periodic subscription check interval.');
        intervalRef.current = window.setInterval(() => {
          if (isMounted && document.visibilityState === 'visible') { // Only check if tab is visible
            console.log('[SubscriptionProvider] Periodic interval check triggered.');
            checkSubscriptionStatus(false); // isInitialLoad = false
          }
        }, SUBSCRIPTION_CHECK_INTERVAL);
      }
    } else {
      console.log('[SubscriptionProvider] Waiting for Auth to complete before initial subscription check.');
      setIsLoadingState(true); 
    }

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        console.log('[SubscriptionProvider] Cleaning up interval on unmount.');
        clearInterval(intervalRef.current);
      }
    };
  }, [checkSubscriptionStatus, isAuthLoading, session, user]); // Added session, user to dependencies

  const refreshSubscriptionStatus = useCallback(async () => {
    console.log('[SubscriptionProvider] Manual refreshSubscriptionStatus triggered.');
    if (isAuthLoading) {
      console.log('[SubscriptionProvider] Auth still loading, refresh will run after auth.');
      setIsLoadingState(true);
      return;
    }
    if (!user || !user.id) {
      console.log('[SubscriptionProvider] No user for manual refresh, setting to free.');
      setActualTierFromDB('free');
      setSubscriptionDetails(null);
      setIsLoadingState(false);
      return;
    }
    setIsLoadingState(true); // Set loading true during manual refresh
    await checkSubscriptionStatus(false); // isInitialLoad = false
    setIsLoadingState(false); // Set loading false after manual refresh completes
  }, [checkSubscriptionStatus, user, isAuthLoading]);

  const setDebugTierOverride = useCallback((tier: SubscriptionTier | null) => {
    if (import.meta.env.MODE === 'development') { // Ensure this check works in your env
      console.warn(`[SubscriptionProvider] DEBUG TIER OVERRIDE set to: ${tier === null ? 'None (use actual)' : tier}`);
      setDebugTierUserOverride(tier);
    } else {
      console.warn("[SubscriptionProvider] Debug tier override is only available in development mode. Current mode:", import.meta.env.MODE);
    }
  }, []);

  const effectiveTierToUse = debugTierUserOverride !== null ? debugTierUserOverride : actualTierFromDB;
  const isDebugCurrentlyActive = debugTierUserOverride !== null;
  const combinedIsLoading = isAuthLoading || isLoading; // Use renamed isLoadingState

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