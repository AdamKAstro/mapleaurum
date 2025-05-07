// src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSubscriptionStatus } from '../lib/stripe'; // Assuming this calls your backend (supabase view)
import type { SubscriptionTier } from '../lib/types';
import { useAuth } from './auth-context'; // Import useAuth to check login status

// Define the tiers explicitly for clarity
const VALID_TIERS: SubscriptionTier[] = ['free', 'medium', 'premium'];
// Define Price IDs (Ensure these EXACTLY match your Stripe setup)
const PRO_PRICE_ID = 'price_1RJVcCPMCIlIT9KEUaR6HP2J';
const PREMIUM_PRICE_ID = 'price_1RJVdHPMCIlIT9KE489wZrgI';


interface SubscriptionContextType {
    // Provides the tier ('free', 'medium', 'premium') based on auth status and subscription data
    getEffectiveTier: () => SubscriptionTier;
    // Indicates if the subscription status is currently being fetched
    isLoading: boolean;
    // Holds any error message from the fetch attempt
    error: string | null;
    // Manually trigger a refresh of the subscription status
    refreshSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const { user, session, isLoading: isAuthLoading } = useAuth(); // Get user/session status from AuthContext
    const [actualTier, setActualTier] = useState<SubscriptionTier>('free'); // Tier based on DB data
    const [isLoading, setIsLoading] = useState(true); // Loading state for subscription check
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<number | null>(null);

    // Function to check subscription status ONLY IF a user is logged in
    const checkSubscriptionStatus = useCallback(async (isInitialLoad = false) => {
        // Only proceed if we have an active session and auth isn't still loading
        if (!session || isAuthLoading) {
            console.log('[SubscriptionProvider] No active session or auth loading, skipping subscription check. Effective tier: free.');
            setActualTier('free'); // Default to free if not logged in
            if (isInitialLoad) setIsLoading(false); // Stop loading if this was the initial check
            setError(null);
            return;
        }

        console.log('[SubscriptionProvider] User logged in. Checking real subscription status...');
        if (isInitialLoad) {
            setIsLoading(true);
        }
        setError(null);

        try {
            // getSubscriptionStatus reads the stripe_user_subscriptions view (using RLS)
            const subscription = await getSubscriptionStatus();

            // ---- START DEBUG LOGS ----
            console.log('[SubscriptionProvider DEBUG] Fetched subscription data:', JSON.stringify(subscription, null, 2));
            // ---- END DEBUG LOGS ----

            let newActualTier: SubscriptionTier = 'free'; // Default assumption

            // Check if the status from the database is 'active'
            if (subscription?.subscription_status === 'active') {
                // ---- START DEBUG LOGS ----
                console.log('[SubscriptionProvider DEBUG] Status is active. Price ID:', subscription.price_id);
                 // ---- END DEBUG LOGS ----

                // Check the price_id to determine the tier
                switch (subscription.price_id) {
                    case PRO_PRICE_ID:
                        newActualTier = 'medium'; // Pro tier
                         console.log('[SubscriptionProvider DEBUG] Matched PRO_PRICE_ID. Tier set to medium.');
                        break;
                    case PREMIUM_PRICE_ID:
                        newActualTier = 'premium'; // Premium tier
                         console.log('[SubscriptionProvider DEBUG] Matched PREMIUM_PRICE_ID. Tier set to premium.');
                        break;
                    default:
                        // ---- START DEBUG LOGS ----
                        console.warn(`[SubscriptionProvider DEBUG] Active subscription found, but Price ID "${subscription.price_id}" did not match known Pro/Premium IDs. Defaulting to free.`);
                         // ---- END DEBUG LOGS ----
                        newActualTier = 'free'; // Unknown active plan, treat as free
                        break;
                }
            } else {
                 // ---- START DEBUG LOGS ----
                 console.log('[SubscriptionProvider DEBUG] Subscription status is NOT active:', subscription?.subscription_status, '(or no subscription found). Defaulting to free.');
                 // ---- END DEBUG LOGS ----
                newActualTier = 'free'; // No active subscription found for the user
            }

            setActualTier(newActualTier);
            setError(null);

        } catch (err: any) {
            console.error('[SubscriptionProvider] Error checking subscription status:', err);
            setError(err.message || 'Failed to check subscription status');
            // Keep the existing tier on background refresh errors, but default to free on initial load error?
             if (isInitialLoad) {
                 setActualTier('free');
             }
        } finally {
            if (isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, [session, isAuthLoading]); // Re-run check if session changes or auth loading completes


    // Effect for Initial Load & Setting up Interval
    useEffect(() => {
        let isMounted = true;
        console.log('[SubscriptionProvider] Initializing subscription check logic.');

        // Perform the initial check. It will wait for auth status internally.
        checkSubscriptionStatus(true);

        // Clear previous interval on re-render/ HMR
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Setup interval for periodic checks ONLY if user is logged in
        // Note: checkSubscriptionStatus internally checks session again, so this is safe
        console.log('[SubscriptionProvider] Setting up periodic check interval.');
        intervalRef.current = window.setInterval(() => {
            if (isMounted) { // Check if component is still mounted
                 console.log('[SubscriptionProvider] Interval triggered check.');
                checkSubscriptionStatus(false); // Pass false for background checks
            }
        }, SUBSCRIPTION_CHECK_INTERVAL);


        // Cleanup function
        return () => {
            isMounted = false;
            console.log('[SubscriptionProvider] Cleaning up interval.');
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [checkSubscriptionStatus]); // Rerun effect if the check function instance changes

    // --- Getter for Context Value ---
    // This determines the tier shown to the app. Defaults to 'free' if loading or no user.
    const getEffectiveTier = useCallback((): SubscriptionTier => {
         if (isLoading || !session) {
            return 'free';
         }
        return actualTier;
    }, [isLoading, session, actualTier]);

     // Function to manually trigger a refresh
     const refreshSubscriptionStatus = useCallback(async () => {
         console.log('[SubscriptionProvider] Manual refresh triggered.');
         await checkSubscriptionStatus(true); // Treat manual refresh like an initial load for loading state
     }, [checkSubscriptionStatus]);


    // --- Context Value ---
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

// --- Custom Hook ---
export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}