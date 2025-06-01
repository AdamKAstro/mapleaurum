// src/pages/scatter-score-pro/hooks/useScoreCalculation.ts
import { useState, useCallback } from 'react';
import type { Company, NormalizationMode, ImputationMode } from '../../../lib/types';
import type { MetricConfig } from '../../../lib/metric-types';
import type { 
  AxisMetricConfig, 
  ScatterScorePlotPoint 
} from '../types';
import { 
  calculateAxisSpecificScore, 
  calculateDatasetMetricStats, 
  type MetricDatasetStats,
  type AxisMetricScoreInput 
} from '../../../lib/scoringUtils';
import { isValidNumber, getNestedValue } from '../../../lib/utils';
import { DEBUG_SCATTER_SCORE } from '../constants';

interface UseScoreCalculationProps {
  getMetricConfigDetails: (key: string) => MetricConfig | undefined;
  allMetrics: MetricConfig[];
  globalMetricRangesFromContext: any; // Replace with proper type
}

interface UseScoreCalculationReturn {
  calculateScores: (
    companies: Company[],
    xMetrics: AxisMetricConfig[],
    yMetrics: AxisMetricConfig[],
    zMetricKey: string | null,
    normalizationMode: NormalizationMode,
    imputationMode: ImputationMode
  ) => Promise<ScatterScorePlotPoint[]>;
  datasetStatsCache: Map<string, MetricDatasetStats>;
}

export function useScoreCalculation({
  getMetricConfigDetails,
  allMetrics,
  globalMetricRangesFromContext
}: UseScoreCalculationProps): UseScoreCalculationReturn {
  const [datasetStatsCache, setDatasetStatsCache] = useState<Map<string, MetricDatasetStats>>(new Map());

  const calculateScores = useCallback(async (
    companies: Company[],
    xMetrics: AxisMetricConfig[],
    yMetrics: AxisMetricConfig[],
    zMetricKey: string | null,
    normalizationMode: NormalizationMode,
    imputationMode: ImputationMode
  ): Promise<ScatterScorePlotPoint[]> => {
    if (DEBUG_SCATTER_SCORE) {
      console.log('[useScoreCalculation] Starting score calculation for', companies.length, 'companies');
    }

    // Calculate dataset statistics if needed
    const uniqueMetricKeysForStats = new Set<string>();
    if (normalizationMode.startsWith('dataset_') || imputationMode.startsWith('dataset_')) {
      xMetrics.forEach(m => {
        const conf = getMetricConfigDetails(m.key);
        if (conf) uniqueMetricKeysForStats.add(conf.key);
      });
      yMetrics.forEach(m => {
        const conf = getMetricConfigDetails(m.key);
        if (conf) uniqueMetricKeysForStats.add(conf.key);
      });
    }

    const newDatasetStatsCache = new Map<string, MetricDatasetStats>();
    if (uniqueMetricKeysForStats.size > 0 && companies.length > 0) {
      for (const metricKey of uniqueMetricKeysForStats) {
        const metricConfig = getMetricConfigDetails(metricKey);
        if (metricConfig) {
          newDatasetStatsCache.set(
            metricKey,
            calculateDatasetMetricStats(companies, metricConfig)
          );
        }
      }
    }
    setDatasetStatsCache(newDatasetStatsCache);

    // Calculate scores for each company
    const newPlotDataPromises = companies.map(async (company) => {
      const companySpecificLogs: string[] = [];
      
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
      
      let xScoreResult = { score: null, breakdown: {} };
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
      
      let yScoreResult = { score: null, breakdown: {} };
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
      
      let zValueForPlot: number | null = null;
      if (zMetricKey) {
        const zConfig = getMetricConfigDetails(zMetricKey);
        if (zConfig) {
          const rawZ = getNestedValue(company, zConfig.nested_path);
          if (isValidNumber(rawZ)) zValueForPlot = rawZ as number;
        }
      }
      
      if (DEBUG_SCATTER_SCORE && companySpecificLogs.length > 0) {
        console.log(`[useScoreCalculation] Company ${company.company_name}:`, companySpecificLogs);
      }
      
      return {
        company,
        xScore: xScoreResult.score,
        yScore: yScoreResult.score,
        zValue: zValueForPlot
      };
    });
    
    const resolvedPlotData = await Promise.all(newPlotDataPromises);
    
    if (DEBUG_SCATTER_SCORE) {
      const validPoints = resolvedPlotData.filter(p => isValidNumber(p.xScore) && isValidNumber(p.yScore));
      console.log(`[useScoreCalculation] Calculated ${validPoints.length} valid points out of ${resolvedPlotData.length} total`);
    }
    
    return resolvedPlotData;
  }, [getMetricConfigDetails, allMetrics, globalMetricRangesFromContext]);

  return {
    calculateScores,
    datasetStatsCache
  };
}