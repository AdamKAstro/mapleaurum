// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { SubscriptionTier } from '../lib/types';
import { useAuth } from './auth-context';
import { getPriceId } from '../stripe-config'; // Import getPriceId

// Use price IDs from stripe-config.ts to ensure consistency
const PRO_MONTHLY_PRICE_ID = getPriceId('pro', 'monthly'); // price_1RTylqAst4LlpL7pTIvN18rF
const PRO_YEARLY_PRICE_ID = getPriceId('pro', 'yearly'); // price_1RTysEAst4LlpL7pM2Kvc3dw
const PREMIUM_MONTHLY_PRICE_ID = getPriceId('premium', 'monthly'); // price_1RTyi3Ast4LlpL7pv6DnpcKS
const PREMIUM_YEARLY_PRICE_ID = getPriceId('premium', 'yearly'); // price_1RTyppAst4LlpL7pC47N3jPT

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
  console.log('[SubscriptionProvider] Price ID Constants:', {
    PRO_MONTHLY_PRICE_ID,
    PRO_YEARLY_PRICE_ID,
    PREMIUM_MONTHLY_PRICE_ID,
    PREMIUM_YEARLY_PRICE_ID
  });
  let queryTimeoutId: NodeJS.Timeout | null = null;

  try {
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
      .select('status, price_id')
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
      console.log(`[SubscriptionProvider] Comparing price_id: ${price_id} with PREMIUM_MONTHLY_PRICE_ID: ${PREMIUM_MONTHLY_PRICE_ID}`);
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

    if (!session || !user || !user.id) {
      console.log('[SubscriptionProvider] No session/user/userId, setting actualTierFromDB to free.');
      setActualTierFromDB('free');
      if (isInitialLoad) setIsLoading(false);
      setError(null);
      return;
    }

    console.log(`[SubscriptionProvider] User session active (User ID: ${user.id}). Checking subscription status from DB.`);
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
    }
  }, [session, user, isAuthLoading, error]);

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
      setIsLoading(true);
      return;
    }
    if (!user || !user.id) {
      console.log('[SubscriptionProvider] No user for manual refresh, setting to free.');
      setActualTierFromDB('free');
      setIsLoading(false);
      return;
    }
    await checkSubscriptionStatus(false);
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