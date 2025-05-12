// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { SubscriptionTier } from '../lib/types';
import { useAuth } from './auth-context';

const PRO_MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID || 'price_1RMIBuAst4LlpL7pf1EFTmlk';
const PREMIUM_MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_1RMIDFAst4LlpL7p8UInqh9P';

interface SubscriptionContextType {
  currentUserSubscriptionTier: SubscriptionTier;
  actualTierFromDB: SubscriptionTier;
  isLoading: boolean;
  error: string | null;
  refreshSubscriptionStatus: () => Promise<void>;
  setDebugTierOverride: (tier: SubscriptionTier | null) => void;
  debugTierOverrideActive: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000;
const DB_FETCH_TIMEOUT = 10 * 1000;

async function getSubscriptionStatusFromDB(userId: string): Promise<SubscriptionTier> {
  if (!userId) {
    console.log('[SubscriptionProvider] No userId provided, returning "free".');
    return 'free';
  }

  console.log(`[SubscriptionProvider] Fetching subscription status for user: ${userId}`);
  let queryTimeoutId: NodeJS.Timeout | null = null;

  try {
    // Step 1: Get customer_id from stripe_customers table
    console.log(`[SubscriptionProvider] Fetching customer_id for user_id: ${userId}`);
    const customerPromise = supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .is('deleted_at', null) // Ensure customer record is not deleted
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
    queryTimeoutId = null; // Reset for next potential timeout

    if (customerResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching customer_id:', customerResult.error.message);
      return 'free';
    }

    if (!customerResult.data || !customerResult.data.customer_id) {
      console.log(`[SubscriptionProvider] No Stripe customer_id found for user_id: ${userId}. Defaulting to 'free'.`);
      return 'free';
    }

    const customerId = customerResult.data.customer_id;
    console.log(`[SubscriptionProvider] Found customer_id: ${customerId}. Fetching subscription details.`);

    // Step 2: Get subscription status using customer_id
    const subscriptionPromise = supabase
      .from('stripe_subscriptions')
      .select('status, price_id') // Corrected column name to 'status'
      .eq('customer_id', customerId) // Query by customer_id
      .in('status', ['active', 'trialing']) // Use the correct 'status' column
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const subscriptionResult = await Promise.race([
      subscriptionPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => {
          reject(new Error('Supabase query timed out fetching subscription status'));
        }, DB_FETCH_TIMEOUT);
      }),
    ]) as { data: { status: string; price_id: string } | null; error: any };

    if (queryTimeoutId) clearTimeout(queryTimeoutId);

    if (subscriptionResult.error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching subscription status:', subscriptionResult.error.message);
      return 'free';
    }

    if (subscriptionResult.data && subscriptionResult.data.price_id && (subscriptionResult.data.status === 'active' || subscriptionResult.data.status === 'trialing')) {
      const { price_id, status } = subscriptionResult.data;
      console.log(`[SubscriptionProvider] DB Subscription Data for customer ${customerId}: status=${status}, price_id=${price_id}`);
      switch (price_id) {
        case PRO_MONTHLY_PRICE_ID:
        case PRO_YEARLY_PRICE_ID:
          console.log(`[SubscriptionProvider] Mapped Price ID ${price_id} to 'pro' tier.`);
          return 'pro';
        case PREMIUM_MONTHLY_PRICE_ID:
        case PREMIUM_YEARLY_PRICE_ID:
          console.log(`[SubscriptionProvider] Mapped Price ID ${price_id} to 'premium' tier.`);
          return 'premium';
        default:
          console.warn(`[SubscriptionProvider] Active/trialing subscription for customer ${customerId} found with UNRECOGNIZED Price ID: "${price_id}". Defaulting tier to free.`);
          return 'free';
      }
    }
    console.log(`[SubscriptionProvider] No active/trialing subscription with recognized price_id found in DB for customer ${customerId} (user ${userId}). Defaulting to 'free'.`);
    return 'free';

  } catch (err: any) {
    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    console.error('[SubscriptionProvider] Error or timeout in getSubscriptionStatusFromDB:', err.message);
    return 'free';
  }
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const [actualTierFromDB, setActualTierFromDB] = useState<SubscriptionTier>('free');
  const [debugTierUserOverride, setDebugTierUserOverride] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
    if (isAuthLoading && isInitialLoad) {
      console.log('[SubscriptionProvider] Auth is loading, delaying initial subscription check.');
      setIsLoading(true);
      return;
    }

    if (!session || !user || !user.id) { // Added check for user.id
      console.log('[SubscriptionProvider] No session/user/userId, setting actualTierFromDB to free.');
      setActualTierFromDB('free');
      if (isInitialLoad) setIsLoading(false); // Only set initial loading to false
      setError(null);
      return;
    }

    console.log(`[SubscriptionProvider] User session active (User ID: ${user.id}). Checking subscription status from DB.`);
    // Set loading to true for this specific fetch operation
    // Avoid setting setIsLoading(true) if !isInitialLoad to prevent full page loader on background refresh
    if (isInitialLoad) {
        setIsLoading(true);
    }
    setError(null);

    try {
      const tierFromDB = await getSubscriptionStatusFromDB(user.id);
      setActualTierFromDB(tierFromDB);
      console.log(`[SubscriptionProvider] Tier from DB for user ${user.id}: ${tierFromDB}`);
      if (tierFromDB === 'free' && (error?.includes('timed out') || error?.includes('does not exist'))) {
         setError('Failed to accurately fetch subscription status. Displaying free tier data as a fallback.');
      }
    } catch (err: any) {
      console.error('[SubscriptionProvider] Error in checkSubscriptionStatus during DB fetch:', err.message);
      setError(err.message || 'Failed to check subscription status from DB.');
      if (isInitialLoad) setActualTierFromDB('free');
    } finally {
      if (isInitialLoad) setIsLoading(false);
      // For non-initial loads (manual refresh, interval), isLoading is not the primary concern for the overall provider state.
      // Individual components might show their own loading for refresh.
    }
  }, [session, user, isAuthLoading, error]); // Removed isLoading from here to prevent loop, error to prevent loop on setTier->setError

  useEffect(() => {
    let isMounted = true;
    if (!isAuthLoading) {
      console.log('[SubscriptionProvider] Auth loading complete or not active. Initializing subscription check.');
      checkSubscriptionStatus(true);

      if (intervalRef.current) clearInterval(intervalRef.current);
      if (session && user) {
        console.log('[SubscriptionProvider] Setting up periodic subscription check interval.');
        intervalRef.current = window.setInterval(() => {
          if (isMounted && document.visibilityState === 'visible') {
            console.log('[SubscriptionProvider] Periodic interval check triggered.');
            checkSubscriptionStatus(false);
          }
        }, SUBSCRIPTION_CHECK_INTERVAL);
      }
    } else {
      console.log('[SubscriptionProvider] Waiting for Auth to complete before initial subscription check.');
      setIsLoading(true); // Keep loading true while waiting for auth
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
        setIsLoading(true); // Indicate loading if auth isn't done
        return;
    }
    if (!user || !user.id) {
      console.log('[SubscriptionProvider] No user for manual refresh, setting to free.');
      setActualTierFromDB('free');
      setIsLoading(false);
      return;
    }
    // For a manual refresh, it's good to indicate some loading activity.
    // Setting the main `isLoading` might be too broad if only a small part needs refresh indication.
    // For now, we rely on `checkSubscriptionStatus` to manage its internal perception of loading for initial vs subsequent.
    // A dedicated `isRefreshing` state could be added if finer-grained UI feedback is needed.
    await checkSubscriptionStatus(false); // Treat as a non-initial, explicit refresh
  }, [checkSubscriptionStatus, user, isAuthLoading]);

  const setDebugTierOverride = useCallback((tier: SubscriptionTier | null) => {
    if (import.meta.env.MODE === 'development') {
      console.warn(`[SubscriptionProvider] DEBUG TIER OVERRIDE set to: ${tier === null ? 'None (use actual)' : tier}`);
      setDebugTierUserOverride(tier);
    } else {
      console.warn("[SubscriptionProvider] Debug tier override is only available in development mode. Current mode:", import.meta.env.MODE);
    }
  }, []);

  const effectiveTierToUse = debugTierUserOverride !== null ? debugTierUserOverride : actualTierFromDB;
  const isDebugCurrentlyActive = debugTierUserOverride !== null;
  const combinedIsLoading = isAuthLoading || isLoading; // isLoading reflects the initial fetch state.

  const value: SubscriptionContextType = {
    currentUserSubscriptionTier: effectiveTierToUse,
    actualTierFromDB: actualTierFromDB,
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