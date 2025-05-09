// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { SubscriptionTier } from '../lib/types'; // Should be 'free' | 'pro' | 'premium'
import { useAuth } from './auth-context';

// Ensure your SubscriptionTier type is 'free' | 'pro' | 'premium'
// const VALID_TIERS: SubscriptionTier[] = ['free', 'pro', 'premium']; // Not strictly needed here anymore

// --- Stripe Price IDs (from your previous input) ---
const PRO_MONTHLY_PRICE_ID = 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = 'price_1RMIBuAst4LlpL7pf1EFTmlk';
const PREMIUM_MONTHLY_PRICE_ID = 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = 'price_1RMIDFAst4LlpL7p8UInqh9P';
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

async function getSubscriptionStatusFromDB(userId: string): Promise<SubscriptionTier> {
  if (!userId) return 'free'; // Default to free if no user ID

  console.log(`[SubscriptionProvider] Fetching DB subscription status for user: ${userId}`);
  const { data, error } = await supabase
    .from('stripe_subscriptions') // YOUR TABLE NAME FOR USER SUBSCRIPTIONS
    .select('subscription_status, price_id')
    .eq('user_id', userId) // Assumes your webhook correctly links/updates this user_id
    .in('subscription_status', ['active', 'trialing'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[SubscriptionProvider] Supabase DB Error fetching subscription:', error.message);
    // Don't throw, just return 'free' and set error state in the provider
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
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const [actualTierFromDB, setActualTierFromDB] = useState<SubscriptionTier>('free');
  const [debugTierUserOverride, setDebugTierUserOverride] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
    if (isAuthLoading) {
      if (isInitialLoad) setIsLoading(true);
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
    if (isInitialLoad) setIsLoading(true);
    setError(null); // Clear previous errors

    try {
      const tierFromDB = await getSubscriptionStatusFromDB(user.id);
      setActualTierFromDB(tierFromDB);
    } catch (err: any) { // Catch errors from getSubscriptionStatusFromDB if it throws
      console.error('[SubscriptionProvider] Error in checkSubscriptionStatus during DB fetch:', err.message);
      setError(err.message || 'Failed to check subscription status from DB.');
      if (isInitialLoad) setActualTierFromDB('free'); // Fallback on error
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [session, user, isAuthLoading]);

  useEffect(() => {
    let isMounted = true;
    if (!isAuthLoading) {
      console.log('[SubscriptionProvider] Auth loading complete. Initializing subscription check.');
      checkSubscriptionStatus(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (session && user) { // Only set interval if user is logged in
        console.log('[SubscriptionProvider] Setting up periodic subscription check interval.');
        intervalRef.current = window.setInterval(() => {
          if (isMounted && document.visibilityState === 'visible') {
            console.log('[SubscriptionProvider] Periodic interval check triggered.');
            checkSubscriptionStatus(false);
          }
        }, SUBSCRIPTION_CHECK_INTERVAL);
      }
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
    if (!user || isAuthLoading) {
      setActualTierFromDB('free');
      setIsLoading(isAuthLoading); // Reflect ongoing auth loading
      return;
    }
    setIsLoading(true);
    await checkSubscriptionStatus(true); // This will set isLoading to false in its finally block
  }, [checkSubscriptionStatus, user, isAuthLoading]);

  const setDebugTierOverride = useCallback((tier: SubscriptionTier | null) => {
    // Ensure this only works in development for safety
    if (import.meta.env.MODE === 'development') { // Vite uses import.meta.env.MODE
    // if (process.env.NODE_ENV === 'development') { // For CRA or Node-based builds
      console.warn(`[SubscriptionProvider] DEBUG TIER OVERRIDE set to: ${tier === null ? 'None (use actual)' : tier}`);
      setDebugTierUserOverride(tier);
    } else {
      console.warn("[SubscriptionProvider] Debug tier override is only available in development mode. Current mode:", import.meta.env.MODE);
    }
  }, []);

  const effectiveTierToUse = debugTierUserOverride !== null ? debugTierUserOverride : actualTierFromDB;
  const isDebugCurrentlyActive = debugTierUserOverride !== null;

  const value: SubscriptionContextType = {
    currentUserSubscriptionTier: effectiveTierToUse,
    actualTierFromDB: actualTierFromDB,
    isLoading: isLoading || isAuthLoading, // Combine loading states
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