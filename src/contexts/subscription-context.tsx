// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSubscriptionStatus } from '../lib/stripe'; // Assuming this calls your backend (supabase view)
import type { SubscriptionTier } from '../lib/types';
import { useAuth } from './auth-context'; // Import useAuth to check login status

// Define the tiers explicitly for clarity
const VALID_TIERS: SubscriptionTier[] = ['free', 'medium', 'premium'];

// --- Define Price IDs from your CSV ---
// Pro Tiers -> 'medium'
const PRO_MONTHLY_PRICE_ID = 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = 'price_1RMIBuAst4LlpL7pf1EFTmlk';
// Premium Tiers -> 'premium'
const PREMIUM_MONTHLY_PRICE_ID = 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = 'price_1RMIDFAst4LlpL7p8UInqh9P';
// --- End Price IDs ---


interface SubscriptionContextType {
    getEffectiveTier: () => SubscriptionTier;
    isLoading: boolean;
    error: string | null;
    refreshSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { user, session, isLoading: isAuthLoading } = useAuth();
    const [actualTier, setActualTier] = useState<SubscriptionTier>('free');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<number | null>(null);

    const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
        if (!session || isAuthLoading) {
            console.log('[SubscriptionProvider] No active session or auth loading, skipping subscription check. Effective tier: free.');
            setActualTier('free');
            if (isInitialLoad) setIsLoading(false);
            setError(null);
            return;
        }

        console.log('[SubscriptionProvider] User logged in. Checking real subscription status...');
        if (isInitialLoad) setIsLoading(true);
        setError(null);

        try {
            const subscription = await getSubscriptionStatus();
            console.log('[SubscriptionProvider DEBUG] Fetched subscription data:', JSON.stringify(subscription, null, 2));

            let newActualTier: SubscriptionTier = 'free';

            if (subscription?.subscription_status === 'active') {
                console.log('[SubscriptionProvider DEBUG] Status is active. Price ID:', subscription.price_id);

                // --- UPDATED TIER MAPPING ---
                switch (subscription.price_id) {
                    case PRO_MONTHLY_PRICE_ID:
                    case PRO_YEARLY_PRICE_ID: // Added yearly pro
                        newActualTier = 'medium'; // Pro tier
                        console.log(`[SubscriptionProvider DEBUG] Matched PRO Price ID (${subscription.price_id}). Tier set to medium.`);
                        break;
                    case PREMIUM_MONTHLY_PRICE_ID:
                    case PREMIUM_YEARLY_PRICE_ID: // Added yearly premium
                        newActualTier = 'premium'; // Premium tier
                        console.log(`[SubscriptionProvider DEBUG] Matched PREMIUM Price ID (${subscription.price_id}). Tier set to premium.`);
                        break;
                    default:
                        console.warn(`[SubscriptionProvider DEBUG] Active subscription found, but Price ID "${subscription.price_id}" did not match known Pro/Premium IDs. Defaulting to free.`);
                        newActualTier = 'free';
                        break;
                }
                // --- END UPDATED TIER MAPPING ---
            } else {
                console.log('[SubscriptionProvider DEBUG] Subscription status is NOT active:', subscription?.subscription_status, '(or no subscription found). Defaulting to free.');
                newActualTier = 'free';
            }

            setActualTier(newActualTier);
            setError(null);

        } catch (err: any) {
            console.error('[SubscriptionProvider] Error checking subscription status:', err);
            setError(err.message || 'Failed to check subscription status');
             if (isInitialLoad) {
                 setActualTier('free');
             }
        } finally {
            if (isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, [session, isAuthLoading]);

    useEffect(() => {
        let isMounted = true;
        console.log('[SubscriptionProvider] Initializing subscription check logic.');
        checkSubscriptionStatus(true);

        if (intervalRef.current) clearInterval(intervalRef.current);

        console.log('[SubscriptionProvider] Setting up periodic check interval.');
        intervalRef.current = window.setInterval(() => {
            if (isMounted) {
                 console.log('[SubscriptionProvider] Interval triggered check.');
                checkSubscriptionStatus(false);
            }
        }, SUBSCRIPTION_CHECK_INTERVAL);

        return () => {
            isMounted = false;
            console.log('[SubscriptionProvider] Cleaning up interval.');
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [checkSubscriptionStatus]);

    const getEffectiveTier = useCallback((): SubscriptionTier => {
         if (isLoading || !session) return 'free';
        return actualTier;
    }, [isLoading, session, actualTier]);

     const refreshSubscriptionStatus = useCallback(async () => {
         console.log('[SubscriptionProvider] Manual refresh triggered.');
         await checkSubscriptionStatus(true);
     }, [checkSubscriptionStatus]);

    const value: SubscriptionContextType = {
        getEffectiveTier,
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

