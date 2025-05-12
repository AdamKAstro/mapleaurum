// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { SubscriptionTier } from '../lib/types'; // Should be 'free' | 'pro' | 'premium'
import { useAuth } from './auth-context';

// --- Stripe Price IDs (ensure these are correct and ideally from environment variables for production) ---
const PRO_MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID || 'price_1RMIBuAst4LlpL7pf1EFTmlk';
const PREMIUM_MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_1RMIDFAst4LlpL7p8UInqh9P';
// --- End Price IDs ---

interface SubscriptionContextType {
  currentUserSubscriptionTier: SubscriptionTier; // This is the EFFECTIVE tier (actual or debug override)
  actualTierFromDB: SubscriptionTier;          // The true tier fetched from DB, ignoring debug override
  isLoading: boolean;
  error: string | null;
  refreshSubscriptionStatus: () => Promise<void>;
  // Debugging features
  setDebugTierOverride: (tier: SubscriptionTier | null) => void; // null to clear override
  debugTierOverrideActive: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);
const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DB_FETCH_TIMEOUT = 10 * 1000; // 10 seconds for DB queries

async function getSubscriptionStatusFromDB(userId: string): Promise<SubscriptionTier> {
  if (!userId) return 'free'; // Default to free if no user ID

  console.log(`[SubscriptionProvider] Fetching DB subscription status for user: ${userId}`);
  let queryTimeoutId: NodeJS.Timeout | null = null;

  const queryPromise = supabase
    .from('stripe_subscriptions') // YOUR TABLE NAME FOR USER SUBSCRIPTIONS
    .select('subscription_status, price_id')
    .eq('user_id', userId) // Assumes your webhook correctly links/updates this user_id
    .in('subscription_status', ['active', 'trialing'])
    .is('deleted_at', null) // Ensure soft-deleted subscriptions are not considered active
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    const result = await Promise.race([
      queryPromise,
      new Promise((_, reject) => {
        queryTimeoutId = setTimeout(() => {
          reject(new Error('Supabase query timed out for getSubscriptionStatusFromDB'));
        }, DB_FETCH_TIMEOUT);
      }),
    ]) as { data: any; error: any }; // Cast needed because Promise.race loses specific type info

    if (queryTimeoutId) clearTimeout(queryTimeoutId);

    const { data, error } = result;

    if (error) {
      console.error('[SubscriptionProvider] Supabase DB Error fetching subscription:', error.message);
      // Don't throw, just return 'free' and let the provider handle error state
      return 'free';
    }

    if (data && data.price_id && (data.subscription_status === 'active' || data.subscription_status === 'trialing')) {
      console.log(`[SubscriptionProvider] DB Data for user ${userId}:`, data);
      switch (data.price_id) {
        case PRO_MONTHLY_PRICE_ID:
        case PRO_YEARLY_PRICE_ID:
          console.log(`[SubscriptionProvider] Mapped Price ID ${data.price_id} to 'pro' tier.`);
          return 'pro';
        case PREMIUM_MONTHLY_PRICE_ID:
        case PREMIUM_YEARLY_PRICE_ID:
          console.log(`[SubscriptionProvider] Mapped Price ID ${data.price_id} to 'premium' tier.`);
          return 'premium';
        default:
          console.warn(`[SubscriptionProvider] Active DB subscription for user ${userId} found with UNRECOGNIZED Price ID: "${data.price_id}". Defaulting tier to free.`);
          return 'free';
      }
    }
    console.log(`[SubscriptionProvider] No active/trialing subscription with recognized price_id found in DB for user ${userId}. Defaulting to 'free'.`);
    return 'free';
  } catch (err: any) {
    if (queryTimeoutId) clearTimeout(queryTimeoutId);
    console.error('[SubscriptionProvider] Error or timeout in getSubscriptionStatusFromDB:', err.message);
    return 'free'; // Fallback on any error including timeout
  }
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const [actualTierFromDB, setActualTierFromDB] = useState<SubscriptionTier>('free');
  const [debugTierUserOverride, setDebugTierUserOverride] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true); // True until initial check completes
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
    if (isAuthLoading && isInitialLoad) {
      console.log('[SubscriptionProvider] Auth is loading, delaying initial subscription check.');
      setIsLoading(true); // Ensure loading is true if auth is still loading
      return;
    }

    if (!session || !user) {
      console.log('[SubscriptionProvider] No session/user, setting actualTierFromDB to free.');
      setActualTierFromDB('free');
      if (isInitialLoad) setIsLoading(false);
      setError(null);
      return;
    }

    console.log('[SubscriptionProvider] User session active. Checking subscription status from DB.');
    if (!isLoading) setIsLoading(true); // Set loading true for this specific DB fetch, unless it's already true from initial load
    setError(null); // Clear previous errors

    try {
      const tierFromDB = await getSubscriptionStatusFromDB(user.id);
      setActualTierFromDB(tierFromDB);
      if (tierFromDB === 'free' && error === 'Supabase query timed out for getSubscriptionStatusFromDB') {
         // If the timeout specifically caused a 'free' tier, set an error message.
         setError('Failed to fetch subscription status due to a timeout. Displaying free tier data.');
      }
    } catch (err: any) { // Should be caught by getSubscriptionStatusFromDB, but as a fallback
      console.error('[SubscriptionProvider] Error in checkSubscriptionStatus during DB fetch:', err.message);
      setError(err.message || 'Failed to check subscription status from DB.');
      if (isInitialLoad) setActualTierFromDB('free'); // Fallback on error during initial load
    } finally {
      // Only set isLoading to false if it's the initial load completing.
      // Subsequent refreshes might not affect the global "initial" loading state.
      if (isInitialLoad) setIsLoading(false);
      else setIsLoading(false); // For manual refresh or interval, ensure loading is reset
    }
  }, [session, user, isAuthLoading, error, isLoading]); // Added isLoading to dependencies to avoid stale closure

  useEffect(() => {
    let isMounted = true;
    if (!isAuthLoading) { // Only proceed if auth has loaded (or attempted to load)
      console.log('[SubscriptionProvider] Auth loading complete or not active. Initializing subscription check.');
      checkSubscriptionStatus(true); // Pass true for initial load

      if (intervalRef.current) clearInterval(intervalRef.current);
      if (session && user) { // Only set interval if user is logged in
        console.log('[SubscriptionProvider] Setting up periodic subscription check interval.');
        intervalRef.current = window.setInterval(() => {
          if (isMounted && document.visibilityState === 'visible') {
            console.log('[SubscriptionProvider] Periodic interval check triggered.');
            checkSubscriptionStatus(false); // Not initial load
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
  }, [checkSubscriptionStatus, isAuthLoading, session, user]); // isAuthLoading, session, user trigger re-evaluation

  const refreshSubscriptionStatus = useCallback(async () => {
    console.log('[SubscriptionProvider] Manual refreshSubscriptionStatus triggered.');
    if (isAuthLoading) {
        console.log('[SubscriptionProvider] Auth still loading, refresh will run after auth.');
        setIsLoading(true); // Show loading if auth is in progress
        return;
    }
    if (!user) { // If no user even after auth check, set to free
      setActualTierFromDB('free');
      setIsLoading(false); // No active fetch, so not loading
      return;
    }
    // setIsLoading(true); // Set loading before the async call
    await checkSubscriptionStatus(false); // Treat as a non-initial load, this will handle its own isLoading
  }, [checkSubscriptionStatus, user, isAuthLoading]);

  const setDebugTierOverride = useCallback((tier: SubscriptionTier | null) => {
    // Ensure this only works in development for safety
    if (import.meta.env.MODE === 'development') { // Vite uses import.meta.env.MODE
      console.warn(`[SubscriptionProvider] DEBUG TIER OVERRIDE set to: ${tier === null ? 'None (use actual)' : tier}`);
      setDebugTierUserOverride(tier);
    } else {
      console.warn("[SubscriptionProvider] Debug tier override is only available in development mode. Current mode:", import.meta.env.MODE);
    }
  }, []);

  const effectiveTierToUse = debugTierUserOverride !== null ? debugTierUserOverride : actualTierFromDB;
  const isDebugCurrentlyActive = debugTierUserOverride !== null;

  // isLoading should be true if either auth is loading OR subscription is actively being checked/re-checked initially.
  // For subsequent refreshes, individual components might show their own spinners.
  // The main `isLoading` state here primarily reflects the initial setup.
  const combinedIsLoading = isAuthLoading || isLoading;

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