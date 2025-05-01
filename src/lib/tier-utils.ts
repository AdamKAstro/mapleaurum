//src/lib/tier-utils.ts
import type { ColumnTier, MetricConfig } from './types';

export const tierLevels: Record<ColumnTier, number> = {
  free: 0,
  medium: 1,
  premium: 2
};

export function isFeatureAccessible(requiredTier: ColumnTier, currentTier: ColumnTier): boolean {
  const userLevel = tierLevels[currentTier];
  const requiredLevel = tierLevels[requiredTier];
  
  if (userLevel === undefined || requiredLevel === undefined) {
    console.warn("Unknown tier encountered:", { currentTier, requiredTier });
    return false;
  }
  
  return userLevel >= requiredLevel;
}

export function getAccessibleFeatures<T extends { tier: ColumnTier }>(
  features: T[],
  currentTier: ColumnTier
): T[] {
  return features.filter(feature => isFeatureAccessible(feature.tier, currentTier));
}

export function getTierLabel(tier: ColumnTier): string {
  switch (tier) {
    case 'free':
      return 'Free';
    case 'medium':
      return 'Pro';
    case 'premium':
      return 'Premium';
    default:
      return 'Unknown';
  }
}

export function getTierDescription(tier: ColumnTier): string {
  switch (tier) {
    case 'free':
      return 'Basic access to company data';
    case 'medium':
      return 'Advanced analytics and insights';
    case 'premium':
      return 'Complete access and premium features';
    default:
      return '';
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
    case 'medium':
      return [
        'All Free features',
        'Advanced financial metrics',
        'Resource estimates',
        'Production data',
        'Custom watchlists',
        'Export capabilities'
      ];
    case 'premium':
      return [
        'All Pro features',
        'Real-time alerts',
        'API access',
        'Cost metrics',
        'Valuation models',
        'Priority support'
      ];
    default:
      return [];
  }
}