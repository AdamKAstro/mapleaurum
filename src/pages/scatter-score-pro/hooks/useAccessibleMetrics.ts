// src/pages/scatter-score-pro/hooks/useAccessibleMetrics.ts
import { useMemo } from 'react';
import { getAccessibleMetrics } from '../../../lib/metric-types';
import type { MetricConfig } from '../../../lib/metric-types'; // Ensure this path is correct
import { useSubscription } from '../../../contexts/subscription-context'; // Ensure this path is correct

/**
 * Hook to get metrics accessible to the current user based on their subscription tier
 * @returns Array of MetricConfig objects the user can access
 */
export function useAccessibleMetrics(): MetricConfig[] {
  const { currentUserSubscriptionTier, isLoading } = useSubscription();

  const accessibleMetrics = useMemo(() => {
    // Use the tier from subscription context, default to 'free' if not loaded or still loading
    const tier = !isLoading && currentUserSubscriptionTier ? currentUserSubscriptionTier : 'free';
    console.log(`%c[useAccessibleMetrics] useMemo recalculating. isLoading: ${isLoading}, DBTier: ${currentUserSubscriptionTier}, Effective Tier for getAccessibleMetrics: ${tier}`, 'color: blue; font-weight: bold;');;

    const metrics = getAccessibleMetrics(tier);
    console.log(`%c[useAccessibleMetrics] useMemo finished. Count from getAccessibleMetrics(${tier}): ${metrics.length}`, 'color: blue; font-weight: bold;');

    return metrics;
  }, [currentUserSubscriptionTier, isLoading]);

  return accessibleMetrics;
}

/**
 * Hook to check if a specific metric is accessible to the current user
 * @param metricKey The key of the metric to check
 * @returns boolean indicating if the metric is accessible
 */
export function useIsMetricAccessible(metricKey: string): boolean {
  const accessibleMetrics = useAccessibleMetrics();

  return useMemo(() => {
    return accessibleMetrics.some(metric => metric.key === metricKey);
  }, [accessibleMetrics, metricKey]);
}


