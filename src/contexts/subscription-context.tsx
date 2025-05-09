// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { SubscriptionTier } from '../lib/types';
import { useAuth } from './auth-context';

const VALID_TIERS: SubscriptionTier[] = ['free', 'pro', 'premium'];

// --- Stripe Price IDs Provided by User ---
const PRO_MONTHLY_PRICE_ID = 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = 'price_1RMIBuAst4LlpL7pf1EFTmlk';
const PREMIUM_MONTHLY_PRICE_ID = 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = 'price_1RMIDFAst4LlpL7p8UInqh9P';
// --- End Price IDs ---

interface SubscriptionContextType {
  currentUserSubscriptionTier: SubscriptionTier;
  isLoading: boolean;
  error: string | null;
  refreshSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

// This function assumes your 'stripe_webhook' populates a table (e.g., 'user_subscriptions')
// linking user_id to their active subscription_status and Stripe price_id.
async function getSubscriptionStatusFromDB(userId: string): Promise<{ status: string; price_id: string | null } | null> {
  if (!userId) return null;

  console.log(`[SubscriptionProvider] Fetching DB status for user: ${userId}`);
  const { data, error } = await supabase
    .from('stripe_subscriptions') // IMPORTANT: Replace with your actual table name
    .select('subscription_status, price_id')
    .eq('user_id', userId) // IMPORTANT: Ensure your webhook correctly links/updates this user_id
    .in('subscription_status', ['active', 'trialing']) // Consider 'trialing' as active for tier purposes
    .is('deleted_at', null) // If you use soft deletes
    .order('created_at', { ascending: false }) // Get the most recent active record
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[SubscriptionProvider] Supabase DB Error fetching subscription:', error.message);
    throw error;
  }

  if (data) {
    console.log(`[SubscriptionProvider] DB Data for user ${userId}:`, data);
    return { status: data.subscription_status, price_id: data.price_id };
  }
  console.log(`[SubscriptionProvider] No active/trialing subscription found in DB for user ${userId}.`);
  return null;
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const [actualTier, setActualTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
    if (isAuthLoading) {
      if (isInitialLoad) setIsLoading(true); // Defer if auth is still loading
      return;
    }
    if (!session || !user) {
      console.log('[SubscriptionProvider] No session/user, setting tier to free.');
      setActualTier('free');
      if (isInitialLoad) setIsLoading(false);
      setError(null);
      return;
    }

    console.log('[SubscriptionProvider] Auth resolved, user present. Checking subscription status.');
    if (isInitialLoad) setIsLoading(true);
    setError(null);

    try {
      const subscription = await getSubscriptionStatusFromDB(user.id);
      let newActualTier: SubscriptionTier = 'free';

      if (subscription?.price_id && (subscription.status === 'active' || subscription.status === 'trialing')) {
        console.log(`[SubscriptionProvider] Mapping price_id: ${subscription.price_id} to tier.`);
        switch (subscription.price_id) {
          case PRO_MONTHLY_PRICE_ID:
          case PRO_YEARLY_PRICE_ID:
            newActualTier = 'pro';
            break;
          case PREMIUM_MONTHLY_PRICE_ID:
          case PREMIUM_YEARLY_PRICE_ID:
            newActualTier = 'premium';
            break;
          default:
            console.warn(`[SubscriptionProvider] Active subscription found in DB with UNRECOGNIZED Price ID: "${subscription.price_id}". Defaulting to free.`);
            newActualTier = 'free'; // Or perhaps an 'unknown' state if you prefer
            break;
        }
      } else {
        console.log('[SubscriptionProvider] No active/trialing subscription in DB or missing price_id. Defaulting to free.');
        newActualTier = 'free';
      }
      console.log(`[SubscriptionProvider] Determined tier: ${newActualTier}`);
      setActualTier(newActualTier);
    } catch (err: any) {
      console.error('[SubscriptionProvider] Error in checkSubscriptionStatus during DB fetch:', err.message);
      setError(err.message || 'Failed to check subscription status due to a database error.');
      if (isInitialLoad) setActualTier('free'); // Fallback on error
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [session, user, isAuthLoading]);

  useEffect(() => {
    let isMounted = true;
    // Only proceed if auth loading is complete
    if (!isAuthLoading) {
      console.log('[SubscriptionProvider] Auth loading complete. Initializing subscription check.');
      checkSubscriptionStatus(true); // Perform initial check

      if (intervalRef.current) clearInterval(intervalRef.current); // Clear any existing interval

      // Set up periodic check only if there's a user session
      if (session && user) {
        console.log('[SubscriptionProvider] Setting up periodic subscription check interval.');
        intervalRef.current = window.setInterval(() => {
          if (isMounted && document.visibilityState === 'visible') { // Be mindful of background tabs
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
  }, [checkSubscriptionStatus, isAuthLoading, session, user]); // Re-run if auth state or user changes

  const refreshSubscriptionStatus = useCallback(async () => {
    console.log('[SubscriptionProvider] Manual refreshSubscriptionStatus triggered.');
    if (!user || isAuthLoading) {
      console.log('[SubscriptionProvider] Refresh aborted: no user or auth loading.');
      setActualTier('free'); // Reset to free if no user
      setIsLoading(isAuthLoading); // Reflect auth loading state
      return;
    }
    setIsLoading(true);
    await checkSubscriptionStatus(true); // Treat as an initial load to show loading indicator
    // setIsLoading(false); // checkSubscriptionStatus will set it
  }, [checkSubscriptionStatus, user, isAuthLoading]);

  const value: SubscriptionContextType = {
    currentUserSubscriptionTier: actualTier,
    isLoading,
    error,
    refreshSubscriptionStatus,
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
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}