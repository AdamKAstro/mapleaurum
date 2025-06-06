// src/lib/scoringUtilsAdvanced.ts
import type { Company, CompanyStatus, MetricConfig, NormalizationMode, ImputationMode } from './types';
import { isValidNumber, getNestedValue } from './utils';
import { calculateDatasetMetricStats, type MetricDatasetStats } from './scoringUtils';

// Constants for scoring configuration
export const METRIC_QUALITY_THRESHOLDS = {
  MINIMUM_COVERAGE: 0.05, // 5% minimum data coverage
  GOOD_COVERAGE: 0.50,    // 50% for "good" coverage
  EXCELLENT_COVERAGE: 0.80 // 80% for "excellent" coverage
};

export const COMPANY_TYPE_METRIC_PRIORITIES: Record<CompanyStatus, string[]> = {
  Explorer: [
    'me_resources_total_aueq_moz',
    'me_measured_indicated_total_aueq_moz',
    'f_cash_value',
    'f_net_financial_assets',
    'f_free_cash_flow',
    'f_enterprise_value_value',
    'vm_ev_per_resource_oz_all'
  ],
  Developer: [
    'me_reserves_total_aueq_moz',
    'c_construction_costs',
    'f_cash_value',
    'f_debt_value',
    'p_future_production_total_aueq_koz',
    'c_aisc_future',
    'vm_ev_per_reserve_oz_all'
  ],
  Producer: [
    'p_current_production_total_aueq_koz',
    'c_aisc_last_year',
    'f_ebitda',
    'f_free_cash_flow',
    'f_enterprise_to_ebitda',
    'p_reserve_life_years',
    'vm_ev_per_production_oz'
  ],
  Royalty: [
    'f_revenue_value',
    'f_free_cash_flow',
    'f_dividend_yield',
    'f_enterprise_to_revenue',
    'f_net_income_value'
  ],
  Other: [] // Will use a balanced approach
};

// Scoring strategy configuration
export interface ScoringStrategy {
  companyType: CompanyStatus;
  metricSelection: 'dynamic' | 'fixed';
  requiredCoverage: number;
  imputationStrategy: 'peer_group' | 'conservative' | 'none';
  normalization: 'percentile' | 'robust_zscore' | 'min_max' | 'ensemble';
  transformations: ('log' | 'sqrt' | 'sigmoid' | 'none')[];
  peerGroupFactors: ('companyType' | 'marketCap' | 'geography' | 'primaryCommodity')[];
}

export interface MetricQualityScore {
  metricKey: string;
  coverage: number;
  variance: number;
  outlierScore: number;
  dataFreshness: number;
  overallQuality: number;
  recommendation: 'exclude' | 'reduce' | 'use' | 'prioritize';
}

export interface PeerGroup {
  companyIds: number[];
  groupKey: string;
  factors: Record<string, any>;
  size: number;
}

export interface AdvancedScoringResult {
  company: Company;
  finalScore: number;
  confidenceScore: number;
  peerGroupRank: number;
  peerGroupSize: number;
  metricsUsed: number;
  metricsAvailable: number;
  scoringStrategy: ScoringStrategy;
  breakdown: Record<string, {
    rawValue: any;
    normalizedValue: number;
    weight: number;
    contribution: number;
    wasImputed: boolean;
    imputationMethod?: string;
  }>;
  warnings: string[];
}

// Calculate metric quality scores
export function calculateMetricQuality(
  companies: Company[],
  metric: MetricConfig,
  globalRanges?: Record<string, { min: number; max: number }>
): MetricQualityScore {
  const values: number[] = [];
  
  companies.forEach(company => {
    const value = getNestedValue(company, metric.nested_path);
    if (isValidNumber(value)) {
      values.push(value as number);
    }
  });

  const coverage = values.length / companies.length;
  
  // Calculate variance (normalized)
  let variance = 0;
  if (values.length > 1) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const rawVariance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    variance = Math.min(rawVariance / (mean * mean + 1), 1); // Coefficient of variation, capped at 1
  }

  // Calculate outlier score (using IQR method)
  let outlierScore = 0;
  if (values.length > 4) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(values.length * 0.25)];
    const q3 = sorted[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const outliers = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
    outlierScore = outliers.length / values.length;
  }

  // Data freshness (placeholder - would need timestamp data)
  const dataFreshness = 1.0; // Assume all data is fresh for now

  // Overall quality score
  const overallQuality = (
    coverage * 0.4 +
    variance * 0.2 +
    (1 - outlierScore) * 0.2 +
    dataFreshness * 0.2
  );

  // Recommendation based on coverage and quality
  let recommendation: MetricQualityScore['recommendation'];
  if (coverage < METRIC_QUALITY_THRESHOLDS.MINIMUM_COVERAGE) {
    recommendation = 'exclude';
  } else if (coverage < METRIC_QUALITY_THRESHOLDS.GOOD_COVERAGE || overallQuality < 0.3) {
    recommendation = 'reduce';
  } else if (coverage > METRIC_QUALITY_THRESHOLDS.EXCELLENT_COVERAGE && overallQuality > 0.7) {
    recommendation = 'prioritize';
  } else {
    recommendation = 'use';
  }

  return {
    metricKey: metric.key,
    coverage,
    variance,
    outlierScore,
    dataFreshness,
    overallQuality,
    recommendation
  };
}

// Define peer groups based on multiple factors
export function definePeerGroups(
  companies: Company[],
  factors: ('companyType' | 'marketCap' | 'geography' | 'primaryCommodity')[]
): Map<string, PeerGroup> {
  const groups = new Map<string, PeerGroup>();

  companies.forEach(company => {
    const groupFactors: Record<string, any> = {};
    
    factors.forEach(factor => {
      switch (factor) {
        case 'companyType':
          groupFactors.companyType = company.status || 'Other';
          break;
        case 'marketCap':
          // Define market cap buckets
          const marketCap = company.f_market_cap_value || 0;
          if (marketCap < 10000000) groupFactors.marketCapBucket = 'micro';
          else if (marketCap < 50000000) groupFactors.marketCapBucket = 'small';
          else if (marketCap < 500000000) groupFactors.marketCapBucket = 'mid';
          else groupFactors.marketCapBucket = 'large';
          break;
        case 'geography':
          groupFactors.geography = company.headquarters?.continent || 'Unknown';
          break;
        case 'primaryCommodity':
          // Determine primary commodity based on percent_gold/silver
          if ((company.percent_gold || 0) > 80) groupFactors.primaryCommodity = 'gold';
          else if ((company.percent_silver || 0) > 50) groupFactors.primaryCommodity = 'silver';
          else groupFactors.primaryCommodity = 'mixed';
          break;
      }
    });

    const groupKey = JSON.stringify(groupFactors);
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        companyIds: [],
        groupKey,
        factors: groupFactors,
        size: 0
      });
    }

    const group = groups.get(groupKey)!;
    group.companyIds.push(company.company_id);
    group.size++;
  });

  return groups;
}

// Advanced normalization with multiple methods
export function normalizeWithEnsemble(
  value: number,
  values: number[],
  metric: MetricConfig,
  method: 'percentile' | 'robust_zscore' | 'min_max' | 'ensemble'
): number {
  if (values.length === 0) return 0.5;

  const sorted = [...values].sort((a, b) => a - b);
  
  switch (method) {
    case 'percentile': {
      // Percentile rank normalization
      const rank = sorted.findIndex(v => v >= value);
      const percentile = rank / values.length;
      return metric.higherIsBetter ? percentile : 1 - percentile;
    }
    
    case 'robust_zscore': {
      // Robust Z-score using median and MAD
      const median = sorted[Math.floor(values.length / 2)];
      const deviations = values.map(v => Math.abs(v - median));
      const mad = [...deviations].sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
      
      if (mad === 0) return 0.5;
      
      const robustZ = (value - median) / (1.4826 * mad); // 1.4826 is consistency factor
      const normalized = 1 / (1 + Math.exp(-robustZ / 2)); // Sigmoid to [0,1]
      
      return metric.higherIsBetter ? normalized : 1 - normalized;
    }
    
    case 'min_max': {
      // Standard min-max but with outlier handling
      const p5 = sorted[Math.floor(values.length * 0.05)];
      const p95 = sorted[Math.floor(values.length * 0.95)];
      
      if (p95 === p5) return 0.5;
      
      const clampedValue = Math.max(p5, Math.min(p95, value));
      const normalized = (clampedValue - p5) / (p95 - p5);
      
      return metric.higherIsBetter ? normalized : 1 - normalized;
    }
    
    case 'ensemble': {
      // Combine multiple methods
      const percentileScore = normalizeWithEnsemble(value, values, metric, 'percentile');
      const robustScore = normalizeWithEnsemble(value, values, metric, 'robust_zscore');
      const minMaxScore = normalizeWithEnsemble(value, values, metric, 'min_max');
      
      // Weighted average with emphasis on percentile
      return 0.5 * percentileScore + 0.3 * robustScore + 0.2 * minMaxScore;
    }
    
    default:
      return 0.5;
  }
}

// Apply non-linear transformations to spread scores
export function applyScoreTransformation(
  score: number,
  transformation: 'log' | 'sqrt' | 'sigmoid' | 'none'
): number {
  switch (transformation) {
    case 'log':
      // Log transformation with offset to avoid log(0)
      return Math.log(score + 0.1) / Math.log(1.1);
      
    case 'sqrt':
      // Square root transformation
      return Math.sqrt(score);
      
    case 'sigmoid':
      // S-curve transformation to spread middle values
      const k = 10; // Steepness factor
      return 1 / (1 + Math.exp(-k * (score - 0.5)));
      
    case 'none':
    default:
      return score;
  }
}

// Smart imputation using peer groups
export function imputeWithPeerGroup(
  company: Company,
  metric: MetricConfig,
  peerGroup: Company[],
  strategy: 'mean' | 'median' | 'conservative'
): number | null {
  const peerValues: number[] = [];
  
  peerGroup.forEach(peer => {
    if (peer.company_id === company.company_id) return;
    const value = getNestedValue(peer, metric.nested_path);
    if (isValidNumber(value)) {
      peerValues.push(value as number);
    }
  });

  if (peerValues.length === 0) return null;

  switch (strategy) {
    case 'mean':
      return peerValues.reduce((a, b) => a + b, 0) / peerValues.length;
      
    case 'median':
      const sorted = [...peerValues].sort((a, b) => a - b);
      return sorted[Math.floor(peerValues.length / 2)];
      
    case 'conservative':
      // Use worse quartile for conservative imputation
      const sortedCons = [...peerValues].sort((a, b) => a - b);
      const quartileIndex = metric.higherIsBetter 
        ? Math.floor(peerValues.length * 0.25)  // 25th percentile if higher is better
        : Math.floor(peerValues.length * 0.75); // 75th percentile if lower is better
      return sortedCons[quartileIndex];
      
    default:
      return null;
  }
}

// Main advanced scoring function
export function calculateAdvancedScores(
  companies: Company[],
  weights: Record<string, number>,
  metricConfigs: MetricConfig[],
  scoringStrategies: Record<CompanyStatus, ScoringStrategy>,
  globalRanges?: Record<string, { min: number; max: number }>
): AdvancedScoringResult[] {
  // Step 1: Calculate metric quality scores
  const metricQualityMap = new Map<string, MetricQualityScore>();
  metricConfigs.forEach(metric => {
    if (weights[metric.key] && weights[metric.key] > 0) {
      const quality = calculateMetricQuality(companies, metric, globalRanges);
      metricQualityMap.set(metric.key, quality);
    }
  });

  // Step 2: Define peer groups
  const peerGroups = definePeerGroups(companies, ['companyType', 'marketCap']);
  
  // Step 3: Calculate scores for each company
  const results: AdvancedScoringResult[] = [];
  
  companies.forEach(company => {
    const companyType = (company.status as CompanyStatus) || 'Other';
    const strategy = scoringStrategies[companyType] || scoringStrategies['Other'];
    
    // Find peer group
    const peerGroupKey = JSON.stringify({
      companyType: company.status || 'Other',
      marketCapBucket: company.f_market_cap_value < 50000000 ? 'small' : 'large'
    });
    const peerGroup = peerGroups.get(peerGroupKey);
    const peers = peerGroup 
      ? companies.filter(c => peerGroup.companyIds.includes(c.company_id))
      : companies.filter(c => c.status === company.status);

    // Select metrics based on strategy and quality
    const selectedMetrics = selectMetricsForCompany(
      company,
      metricConfigs,
      weights,
      metricQualityMap,
      strategy
    );

    // Calculate normalized scores
    const breakdown: AdvancedScoringResult['breakdown'] = {};
    let totalWeight = 0;
    let weightedSum = 0;
    let metricsUsed = 0;
    const warnings: string[] = [];

    selectedMetrics.forEach(({ metric, adjustedWeight }) => {
      const rawValue = getNestedValue(company, metric.nested_path);
      let normalizedValue = 0;
      let wasImputed = false;
      let imputationMethod: string | undefined;

      if (isValidNumber(rawValue)) {
        // Use actual value
        const peerValues = peers
          .map(p => getNestedValue(p, metric.nested_path))
          .filter(isValidNumber) as number[];
        
        normalizedValue = normalizeWithEnsemble(
          rawValue as number,
          peerValues,
          metric,
          strategy.normalization as any
        );
      } else {
        // Impute value
        wasImputed = true;
        const imputedValue = imputeWithPeerGroup(
          company,
          metric,
          peers,
          strategy.imputationStrategy === 'peer_group' ? 'median' : 'conservative'
        );

        if (imputedValue !== null) {
          imputationMethod = strategy.imputationStrategy;
          const peerValues = peers
            .map(p => getNestedValue(p, metric.nested_path))
            .filter(isValidNumber) as number[];
          
          normalizedValue = normalizeWithEnsemble(
            imputedValue,
            peerValues,
            metric,
            strategy.normalization as any
          );
        } else {
          warnings.push(`Could not impute ${metric.label}`);
          normalizedValue = metric.higherIsBetter ? 0 : 1;
        }
      }

      // Apply transformations
      strategy.transformations.forEach(transform => {
        if (transform !== 'none') {
          normalizedValue = applyScoreTransformation(normalizedValue, transform);
        }
      });

      breakdown[metric.key] = {
        rawValue,
        normalizedValue,
        weight: adjustedWeight,
        contribution: normalizedValue * adjustedWeight,
        wasImputed,
        imputationMethod
      };

      totalWeight += adjustedWeight;
      weightedSum += normalizedValue * adjustedWeight;
      metricsUsed++;
    });

    // Calculate final score
    const finalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    
    // Calculate confidence score based on data coverage
    const confidenceScore = calculateConfidenceScore(breakdown, metricsUsed);
    
    // Calculate peer group rank
    const peerGroupRank = peers.filter(p => p.company_id !== company.company_id).length;

    results.push({
      company,
      finalScore,
      confidenceScore,
      peerGroupRank,
      peerGroupSize: peers.length,
      metricsUsed,
      metricsAvailable: selectedMetrics.length,
      scoringStrategy: strategy,
      breakdown,
      warnings
    });
  });

  // Step 4: Apply micro-adjustments to break ties
  return applyMicroAdjustments(results);
}

// Select metrics dynamically based on company type and data quality
function selectMetricsForCompany(
  company: Company,
  allMetrics: MetricConfig[],
  weights: Record<string, number>,
  qualityMap: Map<string, MetricQualityScore>,
  strategy: ScoringStrategy
): Array<{ metric: MetricConfig; adjustedWeight: number }> {
  const companyType = (company.status as CompanyStatus) || 'Other';
  const priorityMetrics = COMPANY_TYPE_METRIC_PRIORITIES[companyType] || [];
  
  const selectedMetrics: Array<{ metric: MetricConfig; adjustedWeight: number }> = [];
  
  allMetrics.forEach(metric => {
    const baseWeight = weights[metric.key] || 0;
    if (baseWeight === 0) return;
    
    const quality = qualityMap.get(metric.key);
    if (!quality) return;
    
    // Check if metric meets coverage requirements
    if (quality.coverage < strategy.requiredCoverage) return;
    
    // Calculate adjusted weight based on quality and priority
    let adjustedWeight = baseWeight;
    
    // Boost priority metrics
    if (priorityMetrics.includes(metric.key)) {
      adjustedWeight *= 1.5;
    }
    
    // Adjust based on quality recommendation
    switch (quality.recommendation) {
      case 'exclude':
        return; // Skip this metric
      case 'reduce':
        adjustedWeight *= 0.5;
        break;
      case 'prioritize':
        adjustedWeight *= 1.2;
        break;
    }
    
    selectedMetrics.push({ metric, adjustedWeight });
  });
  
  // Normalize weights to sum to original total
  const totalAdjusted = selectedMetrics.reduce((sum, m) => sum + m.adjustedWeight, 0);
  const totalOriginal = Object.values(weights).reduce((sum, w) => sum + w, 0);
  
  if (totalAdjusted > 0) {
    const scaleFactor = totalOriginal / totalAdjusted;
    selectedMetrics.forEach(m => {
      m.adjustedWeight *= scaleFactor;
    });
  }
  
  return selectedMetrics;
}

// Calculate confidence score based on data completeness
function calculateConfidenceScore(
  breakdown: AdvancedScoringResult['breakdown'],
  metricsUsed: number
): number {
  if (metricsUsed === 0) return 0;
  
  const imputedCount = Object.values(breakdown).filter(b => b.wasImputed).length;
  const imputationPenalty = imputedCount / metricsUsed;
  
  const avgWeight = Object.values(breakdown).reduce((sum, b) => sum + b.weight, 0) / metricsUsed;
  const weightBalance = Math.min(avgWeight / 100, 1); // Penalize if weights are too concentrated
  
  return (1 - imputationPenalty * 0.5) * (0.7 + weightBalance * 0.3);
}

// Apply micro-adjustments to break ties
function applyMicroAdjustments(results: AdvancedScoringResult[]): AdvancedScoringResult[] {
  // Group by similar scores
  const scoreGroups = new Map<number, AdvancedScoringResult[]>();
  
  results.forEach(result => {
    const roundedScore = Math.round(result.finalScore * 10) / 10; // Round to 0.1
    if (!scoreGroups.has(roundedScore)) {
      scoreGroups.set(roundedScore, []);
    }
    scoreGroups.get(roundedScore)!.push(result);
  });
  
  // Apply micro-adjustments to groups with ties
  scoreGroups.forEach((group, baseScore) => {
    if (group.length > 1) {
      // Sort by confidence score and other factors
      group.sort((a, b) => {
        // First by confidence
        if (a.confidenceScore !== b.confidenceScore) {
          return b.confidenceScore - a.confidenceScore;
        }
        // Then by number of metrics used
        if (a.metricsUsed !== b.metricsUsed) {
          return b.metricsUsed - a.metricsUsed;
        }
        // Finally by company name for stability
        return a.company.company_name.localeCompare(b.company.company_name);
      });
      
      // Apply micro-adjustments
      group.forEach((result, index) => {
        result.finalScore = baseScore + (index * 0.01); // 0.01 point increments
      });
    }
  });
  
  return results;
}