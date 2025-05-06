//src/contexts/subscription-context.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSubscriptionStatus } from '../lib/stripe';
import type { SubscriptionTier } from '../lib/types';

interface SubscriptionContextType {
  getEffectiveTier: () => SubscriptionTier;
  setTier: (tier: SubscriptionTier) => void;
  isLoading: boolean;
  error: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const SUBSCRIPTION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to check subscription status
  const checkSubscriptionStatus = async () => {
    try {
      const subscription = await getSubscriptionStatus();
      
      // Map subscription status to tier
      let newTier: SubscriptionTier = 'free';
      
      if (subscription?.subscription_status === 'active') {
        // Map price_id to tier
        switch (subscription.price_id) {
          case 'price_1RJVcCPMCIlIT9KEUaR6HP2J': // Pro tier price ID
            newTier = 'medium';
            break;
          case 'price_1RJVdHPMCIlIT9KE489wZrgI': // Premium tier price ID
            newTier = 'premium';
            break;
        }
      }
      
      setTier(newTier);
      setError(null);
    } catch (err: any) {
      console.error('Error checking subscription status:', err);
      setError(err.message || 'Failed to check subscription status');
      // Don't change tier on error - keep existing tier
    } finally {
      setIsLoading(false);
    }
  };

  // Check subscription status on mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  // Set up periodic subscription status check
  useEffect(() => {
    const intervalId = setInterval(checkSubscriptionStatus, SUBSCRIPTION_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const getEffectiveTier = () => tier;

  return (
    <SubscriptionContext.Provider value={{ getEffectiveTier, setTier, isLoading, error }}>
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