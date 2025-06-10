// src/pages/scatter-score-pro/utils/normalizeWeights.ts
import type { AxisMetricConfig } from '../types';
import { DEBUG_SCATTER_SCORE, DEFAULT_WEIGHT_FOR_NEW_METRIC } from '../constants';

export const normalizeWeights = (
  metrics: AxisMetricConfig[],
  changedMetricKey?: string,
  userSetWeightForChangedMetric?: number,
  isNewMetric: boolean = false
): AxisMetricConfig[] => {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    if (DEBUG_SCATTER_SCORE) {
      console.log("[normalizeWeights] Input is not an array or is empty, returning empty.");
    }
    return [];
  }

  // Clone and ensure weights are valid numbers
  let workingMetrics = metrics.map(m => ({ 
    ...m, 
    weight: Math.max(0, Math.min(100, Number(m.weight) || 0)) 
  }));

  // Single metric case - always 100%
  if (workingMetrics.length === 1) {
    workingMetrics[0].weight = 100;
    if (DEBUG_SCATTER_SCORE) {
      console.log("[normalizeWeights] Single metric, set weight to 100:", workingMetrics);
    }
    return workingMetrics;
  }

  let totalTargetWeight = 100;
  let sumOfFixedWeights = 0;

  // Handle new metric addition
  if (isNewMetric && changedMetricKey) {
    const idx = workingMetrics.findIndex(m => m.key === changedMetricKey);
    if (idx !== -1) {
      workingMetrics[idx].weight = DEFAULT_WEIGHT_FOR_NEW_METRIC;
      userSetWeightForChangedMetric = DEFAULT_WEIGHT_FOR_NEW_METRIC;
    }
  }

  // Apply user-set weight for changed metric
  if (changedMetricKey && userSetWeightForChangedMetric !== undefined) {
    const idx = workingMetrics.findIndex(m => m.key === changedMetricKey);
    if (idx !== -1) {
      workingMetrics[idx].weight = userSetWeightForChangedMetric;
      sumOfFixedWeights = workingMetrics[idx].weight;
    }
  }

  // Get adjustable metrics (all except the changed one)
  const adjustableMetrics = workingMetrics.filter(m => m.key !== changedMetricKey);
  const sumOfOriginalAdjustableWeights = adjustableMetrics.reduce((sum, m) => sum + m.weight, 0);
  let weightToDistributeToAdjustable = totalTargetWeight - sumOfFixedWeights;

  if (adjustableMetrics.length > 0) {
    // Ensure we don't have negative weight to distribute
    if (weightToDistributeToAdjustable < 0) weightToDistributeToAdjustable = 0;

    if (sumOfOriginalAdjustableWeights === 0 || isNewMetric) {
      // Distribute equally if no existing weights or new metric
      const equalShare = weightToDistributeToAdjustable / adjustableMetrics.length;
      adjustableMetrics.forEach(m => {
        const idx = workingMetrics.findIndex(wm => wm.key === m.key);
        if (idx !== -1) workingMetrics[idx].weight = equalShare;
      });
    } else {
      // Scale proportionally based on existing weights
      const scaleFactor = weightToDistributeToAdjustable / sumOfOriginalAdjustableWeights;
      adjustableMetrics.forEach(m => {
        const idx = workingMetrics.findIndex(wm => wm.key === m.key);
        if (idx !== -1) workingMetrics[idx].weight = m.weight * scaleFactor;
      });
    }
  } else if (changedMetricKey && workingMetrics.length === 1) {
    // Only one metric and it's the changed one
    workingMetrics[0].weight = 100;
  }

  // Round weights to integers
  let roundedMetrics = workingMetrics.map(m => ({ 
    ...m, 
    weight: Math.round(m.weight) 
  }));

  // Fix rounding errors to ensure sum is exactly 100
  let currentSum = roundedMetrics.reduce((sum, m) => sum + m.weight, 0);

  if (roundedMetrics.length > 0 && currentSum !== 100) {
    const diff = 100 - currentSum;
    let adjustIdx = -1;

    // Try to adjust a metric that wasn't the changed one
    if (changedMetricKey) {
      const candidates = roundedMetrics
        .map((m, i) => ({ m, i, weight: m.weight }))
        .filter(item => item.m.key !== changedMetricKey)
        .sort((a, b) => b.weight - a.weight);

      if (candidates.length > 0) {
        // Find a candidate that can absorb the difference
        for (const cand of candidates) {
          if (cand.m.weight + diff >= 0 && cand.m.weight + diff <= 100) {
            adjustIdx = cand.i;
            break;
          }
        }
        // If no suitable candidate, use the highest weighted one
        if (adjustIdx === -1 && candidates.length > 0) {
          adjustIdx = candidates[0].i;
        }
      }
    }

    // Fallback: adjust the highest weighted metric
    if (adjustIdx === -1 && roundedMetrics.length > 0) {
      const maxWeightIdx = roundedMetrics.reduce((maxIdx, m, i) => 
        m.weight > roundedMetrics[maxIdx].weight ? i : maxIdx, 0
      );
      adjustIdx = maxWeightIdx;
    }

    // Apply the adjustment
    if (adjustIdx !== -1 && roundedMetrics[adjustIdx]) {
      roundedMetrics[adjustIdx].weight += diff;
    }
  }

  // Final validation - ensure all weights are in valid range
  return roundedMetrics.map(m => ({
    ...m, 
    weight: Math.max(0, Math.min(100, Math.round(m.weight)))
  }));
};