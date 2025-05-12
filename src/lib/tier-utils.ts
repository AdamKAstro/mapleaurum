// src/lib/tier-utils.ts
import type { ColumnTier } from './types'; // ColumnTier is 'free' | 'pro' | 'premium'

// Corrected tierLevels to use 'pro'
export const tierLevels: Record<ColumnTier, number> = {
  free: 0,
  pro: 1,    // CHANGED from 'medium'
  premium: 2
};

export function isFeatureAccessible(requiredTier: ColumnTier, currentTier: ColumnTier): boolean {
  const userLevel = tierLevels[currentTier];
  const requiredLevel = tierLevels[requiredTier];
  
  // This check is now more robust as 'pro' is a valid key
  if (userLevel === undefined || requiredLevel === undefined) {
    // This warning should ideally not appear now if inputs are always valid ColumnTier types
    console.warn("[tier-utils] isFeatureAccessible: Unknown tier value provided. Current:", currentTier, "Required:", requiredTier);
    return false; 
  }
  
  return userLevel >= requiredLevel;
}

export function getAccessibleFeatures<T extends { tier: ColumnTier }>(
  features: T[],
  currentTier: ColumnTier
): T[] {
  // This function will now work correctly with the updated isFeatureAccessible
  return features.filter(feature => isFeatureAccessible(feature.tier, currentTier));
}

export function getTierLabel(tier: ColumnTier): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'pro': // CHANGED from 'medium'
      return 'Pro';
    case 'premium':
      return 'Premium';
    default:
      // This case should ideally not be reached if 'tier' is always a valid ColumnTier
      const exhaustiveCheck: never = tier; 
      console.warn(`[tier-utils] getTierLabel: Unknown tier encountered: ${exhaustiveCheck}`);
      return 'Unknown Tier';
  }
}

export function getTierDescription(tier: ColumnTier): string {
  switch (tier) {
    case 'free':
      return 'Basic access to company data';
    case 'pro': // CHANGED from 'medium'
      return 'Advanced analytics and insights';
    case 'premium':
      return 'Complete access and premium features';
    default:
      const exhaustiveCheck: never = tier;
      console.warn(`[tier-utils] getTierDescription: Unknown tier encountered: ${exhaustiveCheck}`);
      return 'Description not available.';
  }
}

export function getTierFeatures(tier: ColumnTier): string[] {
  switch (tier) {
    case 'free':
      return [
        'Basic company information',
        'Limited financial metrics',
        'Public company profiles',
        'Daily updates'
      ];
    case 'pro': // CHANGED from 'medium'
      return [
        'All Free features', // Ensure this reflects actual offering
        'Advanced financial metrics',
        'Resource estimates',
        'Production data',
        'Custom watchlists (coming)',
        'Export capabilities (basic)' // Example
      ];
    case 'premium':
      return [
        'All Pro features', // Ensure this reflects actual offering
        'Real-time alerts (coming)',
        'API access (coming)',
        'Cost metrics',
        'Valuation models',
        'Priority support',
        'Advanced export capabilities' // Example
      ];
    default:
      const exhaustiveCheck: never = tier;
      console.warn(`[tier-utils] getTierFeatures: Unknown tier encountered: ${exhaustiveCheck}`);
      return [];
  }
}