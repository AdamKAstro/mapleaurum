// src/pages/scatter-score-pro/hooks/useScoreCalculation.ts
import { useState, useCallback, useRef } from 'react';
import type { Company, NormalizationMode, ImputationMode } from '../../../lib/types';
import type { MetricConfig } from '../../../lib/metric-types';
import {
  AxisMetricConfig,
  ScatterScorePlotPoint // Import ScatterScorePlotPoint
} from '../types';
import {
  calculateAxisSpecificScore,
  calculateDatasetMetricStats,
  type MetricDatasetStats,
  type AxisMetricScoreInput
} from '../../../lib/scoringUtils';
import { isValidNumber, getNestedValue } from '../../../lib/utils';
import { DEBUG_SCATTER_SCORE } from '../constants';
import { normalizeValues as normalizeZValuesForChart } from '../../scatter-chart/chartUtils'; // Import normalization for Z-axis

interface UseScoreCalculationProps {
  getMetricConfigDetails: (key: string) => MetricConfig | undefined;
  allMetrics: MetricConfig[];
  globalMetricRangesFromContext: any; // TODO: Replace with proper type from FilterContext
}

interface UseScoreCalculationReturn {
  calculateScores: (
    companies: Company[],
    xMetrics: AxisMetricConfig[],
    yMetrics: AxisMetricConfig[],
    zMetricKey: string | null,
    zScale: 'linear' | 'log', // ADDED: Pass zScale here
    normalizationMode: NormalizationMode,
    imputationMode: ImputationMode
  ) => Promise<ScatterScorePlotPoint[]>;
  datasetStatsCache: Map<string, MetricDatasetStats>;
  clearCache: () => void;
}

// Performance constants
const BATCH_SIZE = 50; // Process companies in batches for better performance
const LOG_ERROR_THRESHOLD = 5; // Only log first N companies with errors to avoid spam
const DEFAULT_RADIUS_CONTRIBUTION = 0.3; // Default for non-valid Z-values

export function useScoreCalculation({
  getMetricConfigDetails,
  allMetrics,
  globalMetricRangesFromContext
}: UseScoreCalculationProps): UseScoreCalculationReturn {
  const [datasetStatsCache, setDatasetStatsCache] = useState<Map<string, MetricDatasetStats>>(new Map());
  const errorCountRef = useRef<number>(0);

  // Helper function to safely get metric stats
  const getMetricStats = useCallback((
    metricKey: string,
    companies: Company[],
    newCache: Map<string, MetricDatasetStats>
  ): MetricDatasetStats | null => {
    try {
      if (newCache.has(metricKey)) {
        return newCache.get(metricKey)!;
      }

      const metricConfig = getMetricConfigDetails(metricKey);
      if (!metricConfig) {
        console.warn(`[useScoreCalculation] Metric config not found for key: ${metricKey}`);
        return null;
      }

      const stats = calculateDatasetMetricStats(companies, metricConfig);
      newCache.set(metricKey, stats);
      return stats;
    } catch (error) {
      console.error(`[useScoreCalculation] Error calculating stats for metric ${metricKey}:`, error);
      return null;
    }
  }, [getMetricConfigDetails]);

  const calculateScores = useCallback(async (
    companies: Company[],
    xMetrics: AxisMetricConfig[],
    yMetrics: AxisMetricConfig[],
    zMetricKey: string | null,
    zScale: 'linear' | 'log', // ADDED zScale parameter
    normalizationMode: NormalizationMode,
    imputationMode: ImputationMode
  ): Promise<ScatterScorePlotPoint[]> => {
    if (DEBUG_SCATTER_SCORE) {
      console.log(`[useScoreCalculation] Starting score calculation for ${companies.length} companies`);
      console.log(`[useScoreCalculation] Metrics - X: ${xMetrics.length}, Y: ${yMetrics.length}, Z: ${zMetricKey ? 'Yes' : 'No'}`);
      console.log(`[useScoreCalculation] Modes - Normalization: ${normalizationMode}, Imputation: ${imputationMode}, Z-Scale: ${zScale}`); // Log zScale
    }

    // Reset error counter for new calculation
    errorCountRef.current = 0;

    // Validate inputs
    if (!companies || companies.length === 0) {
      if (DEBUG_SCATTER_SCORE) {
        console.log('[useScoreCalculation] No companies provided for scoring');
      }
      return [];
    }

    if (xMetrics.length === 0 && yMetrics.length === 0) {
      if (DEBUG_SCATTER_SCORE) {
        console.log('[useScoreCalculation] No metrics selected for scoring');
      }
      return [];
    }

    try {
      // Build dataset stats cache if needed
      const newDatasetStatsCache = new Map<string, MetricDatasetStats>();
      const requiresDatasetStats = normalizationMode.startsWith('dataset_') || imputationMode.startsWith('dataset_');

      if (requiresDatasetStats && companies.length > 0) {
        const uniqueMetricKeys = new Set<string>();

        // Collect all unique metric keys
        [...xMetrics, ...yMetrics].forEach(m => {
          const conf = getMetricConfigDetails(m.key);
          if (conf) uniqueMetricKeys.add(conf.key);
        });
        if (zMetricKey) { // Also add Z-metric key if it exists
            const zConf = getMetricConfigDetails(zMetricKey);
            if (zConf) uniqueMetricKeys.add(zConf.key);
        }


        if (DEBUG_SCATTER_SCORE && uniqueMetricKeys.size > 0) {
          console.log(`[useScoreCalculation] Calculating dataset stats for ${uniqueMetricKeys.size} metrics`);
        }

        // Calculate stats for all metrics
        for (const metricKey of uniqueMetricKeys) {
          getMetricStats(metricKey, companies, newDatasetStatsCache);
        }
      }

      setDatasetStatsCache(newDatasetStatsCache);

      // Collect Z-values for global normalization if Z-metric is selected
      const zValues: number[] = [];
      const zMetricConfig = zMetricKey ? getMetricConfigDetails(zMetricKey) : null;
      if (zMetricConfig) {
          companies.forEach(company => {
              const rawZ = getNestedValue(company, zMetricConfig.nested_path);
              if (isValidNumber(rawZ)) {
                  zValues.push(rawZ as number);
              }
          });
      }
      const normalizedZValuesMap = new Map<number, number>();
      if (zValues.length > 0) {
          const normalizedZArray = normalizeZValuesForChart(zValues, zScale);
          zValues.forEach((val, index) => {
              // Map original z-value to its normalized counterpart.
              // Note: If multiple companies have the exact same raw Z-value,
              // they will share the same normalized value.
              normalizedZValuesMap.set(val, normalizedZArray[index]);
          });
      }


      // Process companies in batches for better performance
      const results: ScatterScorePlotPoint[] = [];
      const totalBatches = Math.ceil(companies.length / BATCH_SIZE);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, companies.length);
        const batchCompanies = companies.slice(start, end);

        if (DEBUG_SCATTER_SCORE && totalBatches > 1) {
          console.log(`[useScoreCalculation] Processing batch ${batchIndex + 1}/${totalBatches}`);
        }

        const batchPromises = batchCompanies.map(async (company) => {
          try {
            const companySpecificLogs: string[] = [];

            // Prepare inputs for scoring
            const axisXInputs: AxisMetricScoreInput[] = xMetrics.map(m => ({
              key: m.key,
              weight: m.weight,
              userHigherIsBetter: m.userHigherIsBetter
            }));

            const axisYInputs: AxisMetricScoreInput[] = yMetrics.map(m => ({
              key: m.key,
              weight: m.weight,
              userHigherIsBetter: m.userHigherIsBetter
            }));

            // Calculate X-axis score
            let xScoreResult = { score: null as number | null, breakdown: {} };
            if (axisXInputs.length > 0) {
              xScoreResult = calculateAxisSpecificScore(
                company,
                axisXInputs,
                allMetrics,
                normalizationMode,
                imputationMode,
                globalMetricRangesFromContext,
                newDatasetStatsCache,
                companySpecificLogs
              );
            }

            // Calculate Y-axis score
            let yScoreResult = { score: null as number | null, breakdown: {} };
            if (axisYInputs.length > 0) {
              yScoreResult = calculateAxisSpecificScore(
                company,
                axisYInputs,
                allMetrics,
                normalizationMode,
                imputationMode,
                globalMetricRangesFromContext,
                newDatasetStatsCache,
                companySpecificLogs
              );
            }

            // Get Z-axis value and its normalized equivalent for plot radius
            let zValueForPlot: number | null = null;
            let r_normalized: number = DEFAULT_RADIUS_CONTRIBUTION;
            if (zMetricKey && zMetricConfig) {
              const rawZ = getNestedValue(company, zMetricConfig.nested_path);
              if (isValidNumber(rawZ)) {
                zValueForPlot = rawZ as number;
                r_normalized = normalizedZValuesMap.get(zValueForPlot) ?? DEFAULT_RADIUS_CONTRIBUTION;
              }
            }

            // Log errors for debugging (with limit to avoid spam)
            if (DEBUG_SCATTER_SCORE && companySpecificLogs.length > 0) {
              const hasErrors = companySpecificLogs.some(log => log.includes('Error'));
              if (hasErrors && errorCountRef.current < LOG_ERROR_THRESHOLD) {
                console.log(`[useScoreCalculation] Logs for ${company.company_name}:`, companySpecificLogs);
                errorCountRef.current++;
              }
            }

            return {
              company,
              xScore: xScoreResult.score,
              yScore: yScoreResult.score,
              zValue: zValueForPlot,
              r_normalized: r_normalized // ADDED: normalized radius directly here
            };
          } catch (companyError) {
            console.error(`[useScoreCalculation] Error scoring company ${company.company_name}:`, companyError);
            return {
              company,
              xScore: null,
              yScore: null,
              zValue: null,
              r_normalized: DEFAULT_RADIUS_CONTRIBUTION // Default for failed companies
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      if (DEBUG_SCATTER_SCORE) {
        const validPoints = results.filter(p => isValidNumber(p.xScore) && isValidNumber(p.yScore));
        const partialPoints = results.filter(p =>
          (isValidNumber(p.xScore) && !isValidNumber(p.yScore)) ||
          (!isValidNumber(p.xScore) && isValidNumber(p.yScore))
        );
        console.log(`[useScoreCalculation] Calculation complete:`);
        console.log(`  - Valid points: ${validPoints.length}`);
        console.log(`  - Partial points: ${partialPoints.length}`);
        console.log(`  - Failed points: ${results.length - validPoints.length - partialPoints.length}`);

        if (errorCountRef.current >= LOG_ERROR_THRESHOLD) {
          console.log(`  - Additional errors suppressed (${errorCountRef.current} total)`);
        }
      }

      return results;
    } catch (error) {
      console.error('[useScoreCalculation] Fatal error during score calculation:', error);
      throw new Error(`Score calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [getMetricConfigDetails, allMetrics, globalMetricRangesFromContext, getMetricStats]); // Removed zScale from dependencies here since it's passed directly

  const clearCache = useCallback(() => {
    setDatasetStatsCache(new Map());
    if (DEBUG_SCATTER_SCORE) {
      console.log('[useScoreCalculation] Cache cleared');
    }
  }, []);

  return {
    calculateScores,
    datasetStatsCache,
    clearCache
  };
}