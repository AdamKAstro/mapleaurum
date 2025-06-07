import type { Company, CompanyStatus, MetricConfig } from './types';
import { isValidNumber, getNestedValue } from './utils';

// Defines the tiered structure for metric priorities
interface TieredMetric {
  key: string;
  tier: 1 | 2 | 3;
}

// Defines the priority of metrics for each company status using a tiered system.
// This is UPDATED to use the 'key' format from your existing `metric-types.ts`.
export const COMPANY_TYPE_METRIC_PRIORITIES: Record<CompanyStatus, TieredMetric[]> = {
  Producer: [
    // --- Tier 1: Core Operations & Profitability ---
    { key: 'production.current_production_total_aueq_koz', tier: 1 },
    { key: 'costs.aisc_last_year', tier: 1 },
    { key: 'financials.ebitda', tier: 1 },
    { key: 'financials.free_cash_flow', tier: 1 },

    // --- Tier 2: Financial Health & Valuation ---
    { key: 'production.reserve_life_years', tier: 2 },
    { key: 'financials.enterprise_to_ebitda', tier: 2 },
    { key: 'valuation_metrics.ev_per_production_oz', tier: 2 },
    { key: 'financials.debt_value', tier: 2 },
    
    // --- Tier 3: Expansive Context ---
    { key: 'mineral_estimates.reserves_total_aueq_moz', tier: 3 },
    { key: 'financials.price_to_book', tier: 3 },
    { key: 'financials.revenue_value', tier: 3 },
  ],
  Developer: [
    // --- Tier 1: Core Project & Funding Metrics ---
    { key: 'mineral_estimates.reserves_total_aueq_moz', tier: 1 },
    { key: 'costs.construction_costs', tier: 1 },
    { key: 'financials.cash_value', tier: 1 },
    { key: 'financials.net_financial_assets', tier: 1 },

    // --- Tier 2: Future Economics & Valuation ---
    { key: 'costs.aisc_future', tier: 2 },
    { key: 'production.future_production_total_aueq_koz', tier: 2 },
    { key: 'valuation_metrics.ev_per_reserve_oz_all', tier: 2 },
    { key: 'financials.debt_value', tier: 2 },
  ],
  Explorer: [
    // --- Tier 1: Core Survival & Discovery Potential ---
    { key: 'financials.cash_value', tier: 1 },
    { key: 'financials.net_financial_assets', tier: 1 },
    { key: 'mineral_estimates.resources_total_aueq_moz', tier: 1 },
    { key: 'financials.free_cash_flow', tier: 1 },

    // --- Tier 2: Asset Quality & Market Perception ---
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', tier: 2 },
    { key: 'valuation_metrics.ev_per_resource_oz_all', tier: 2 },
    { key: 'financials.enterprise_value_value', tier: 2 },
    { key: 'financials.price_to_book', tier: 2 },
    
    // --- Tier 3: Expansive Milestone Metrics ---
    { key: 'mineral_estimates.potential_total_aueq_moz', tier: 3 },
    { key: 'costs.aisc_future', tier: 3 },
  ],
  Royalty: [
    // --- Tier 1: Core Business Model ---
    { key: 'financials.revenue_value', tier: 1 },
    { key: 'financials.free_cash_flow', tier: 1 },
    { key: 'financials.ebitda', tier: 1 },

    // --- Tier 2: Profitability & Valuation ---
    { key: 'financials.enterprise_to_revenue', tier: 2 },
    { key: 'financials.net_income_value', tier: 2 },
    
    // --- Tier 3: Expansive Financial Health ---
    { key: 'financials.price_to_book', tier: 3 },
    { key: 'financials.debt_value', tier: 3 },
  ],
  Other: []
};


// Constants for scoring configuration
export const METRIC_QUALITY_THRESHOLDS = {
  MINIMUM_COVERAGE: 0.05,
  GOOD_COVERAGE: 0.50,
  EXCELLENT_COVERAGE: 0.80
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
  transformationSteepness?: number;
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

export function calculateMetricQuality(
  companies: Company[],
  metric: MetricConfig,
  globalRanges?: Record<string, { min: number; max: number }>
): MetricQualityScore {
  const values: number[] = companies.map(c => getNestedValue(c, metric.nested_path)).filter(isValidNumber);
  const coverage = values.length / companies.length;

  let variance = 0;
  if (values.length > 1) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const rawVariance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    variance = Math.min(rawVariance / (mean * mean + 1), 1);
  }

  let outlierScore = 0;
  if (values.length > 4) {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(values.length * 0.25)];
    const q3 = sorted[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const outliers = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
    outlierScore = outliers.length / values.length;
  }

  const dataFreshness = 1.0;
  const overallQuality = (coverage * 0.4 + variance * 0.2 + (1 - outlierScore) * 0.2 + dataFreshness * 0.2);

  let recommendation: MetricQualityScore['recommendation'] = 'use';
  if (coverage < METRIC_QUALITY_THRESHOLDS.MINIMUM_COVERAGE) recommendation = 'exclude';
  else if (coverage < METRIC_QUALITY_THRESHOLDS.GOOD_COVERAGE || overallQuality < 0.3) recommendation = 'reduce';
  else if (coverage > METRIC_QUALITY_THRESHOLDS.EXCELLENT_COVERAGE && overallQuality > 0.7) recommendation = 'prioritize';

  return { metricKey: metric.key, coverage, variance, outlierScore, dataFreshness, overallQuality, recommendation };
}

export function definePeerGroups(
  companies: Company[],
  factors: ('companyType' | 'marketCap' | 'geography' | 'primaryCommodity')[]
): Map<string, PeerGroup> {
  const groups = new Map<string, PeerGroup>();
  companies.forEach(company => {
    const groupFactors: Record<string, any> = {};
    factors.forEach(factor => {
      switch (factor) {
        case 'companyType': groupFactors.companyType = company.status || 'Other'; break;
        case 'marketCap':
          const mc = company.financials?.market_cap_value || 0;
          if (mc < 10e6) groupFactors.marketCapBucket = 'micro';
          else if (mc < 50e6) groupFactors.marketCapBucket = 'small';
          else if (mc < 500e6) groupFactors.marketCapBucket = 'mid';
          else groupFactors.marketCapBucket = 'large';
          break;
        case 'geography':
          // This section is a placeholder for when you add geographical data.
          // To use it, add 'geography' to the `peerGroupFactors` array in your ScoringStrategy.
          // Example logic:
          // const risk = company.sovereign_risk_rating;
          // if (risk > 80) groupFactors.geography = 'top_tier';
          // else if (risk > 60) groupFactors.geography = 'mid_tier';
          // else groupFactors.geography = 'high_risk';
          break;
        case 'primaryCommodity':
          if ((company.percent_gold || 0) > 80) groupFactors.primaryCommodity = 'gold';
          else if ((company.percent_silver || 0) > 50) groupFactors.primaryCommodity = 'silver';
          else groupFactors.primaryCommodity = 'mixed';
          break;
      }
    });
    const groupKey = JSON.stringify(groupFactors);
    if (!groups.has(groupKey)) groups.set(groupKey, { companyIds: [], groupKey, factors: groupFactors, size: 0 });
    const group = groups.get(groupKey)!;
    group.companyIds.push(company.company_id);
    group.size++;
  });
  return groups;
}

export function normalizeWithEnsemble(value: number, values: number[], metric: MetricConfig, method: 'percentile' | 'robust_zscore' | 'min_max' | 'ensemble'): number {
  if (values.length === 0) return 0.5;
  const sorted = [...values].sort((a, b) => a - b);
  const applyDirection = (v: number) => metric.higherIsBetter ? v : 1 - v;

  switch (method) {
    case 'percentile':
      return applyDirection(sorted.findIndex(v => v >= value) / values.length);
    case 'robust_zscore':
      const median = sorted[Math.floor(values.length / 2)];
      const mad = [...values.map(v => Math.abs(v - median))].sort((a,b)=>a-b)[Math.floor(values.length / 2)];
      if (mad === 0) return 0.5;
      const robustZ = (value - median) / (1.4826 * mad);
      return applyDirection(1 / (1 + Math.exp(-robustZ / 2)));
    case 'min_max':
      const p5 = sorted[Math.floor(values.length * 0.05)];
      const p95 = sorted[Math.floor(values.length * 0.95)];
      if (p95 === p5) return 0.5;
      const clamped = Math.max(p5, Math.min(p95, value));
      return applyDirection((clamped - p5) / (p95 - p5));
    case 'ensemble':
      return (
        0.5 * normalizeWithEnsemble(value, values, metric, 'percentile') +
        0.3 * normalizeWithEnsemble(value, values, metric, 'robust_zscore') +
        0.2 * normalizeWithEnsemble(value, values, metric, 'min_max')
      );
    default: return 0.5;
  }
}

export function applyScoreTransformation(score: number, transformation: 'log' | 'sqrt' | 'sigmoid' | 'none', k: number = 10): number {
  switch (transformation) {
    case 'log': return Math.log(score + 0.1) / Math.log(1.1);
    case 'sqrt': return Math.sqrt(score);
    case 'sigmoid': return 1 / (1 + Math.exp(-k * (score - 0.5)));
    default: return score;
  }
}

export function imputeWithPeerGroup(company: Company, metric: MetricConfig, peerGroup: Company[], strategy: 'mean' | 'median' | 'conservative'): number | null {
  const peerValues = peerGroup.map(p => getNestedValue(p, metric.nested_path)).filter(isValidNumber);
  if (peerValues.length === 0) return null;
  const sorted = [...peerValues].sort((a, b) => a - b);
  switch (strategy) {
    case 'mean': return peerValues.reduce((a, b) => a + b, 0) / peerValues.length;
    case 'median': return sorted[Math.floor(sorted.length / 2)];
    case 'conservative':
      const idx = metric.higherIsBetter ? Math.floor(sorted.length * 0.25) : Math.floor(sorted.length * 0.75);
      return sorted[idx];
    default: return null;
  }
}

function selectMetricsForCompany(company: Company, allMetrics: MetricConfig[], weights: Record<string, number>, qualityMap: Map<string, MetricQualityScore>, strategy: ScoringStrategy): Array<{ metric: MetricConfig; adjustedWeight: number }> {
    const companyType = company.status || 'Other';
    const priorityInfo = COMPANY_TYPE_METRIC_PRIORITIES[companyType] || [];
    const priorityMap = new Map<string, number>(priorityInfo.map(p => [p.key, p.tier]));
  
    const selectedMetrics = allMetrics.map(metric => {
        const baseWeight = weights[metric.key] || 0;
        if (baseWeight === 0) return null;

        const quality = qualityMap.get(metric.key);
        if (!quality || quality.coverage < strategy.requiredCoverage || quality.recommendation === 'exclude') return null;

        let adjustedWeight = baseWeight;
        const tier = priorityMap.get(metric.key);

        if (tier === 1) adjustedWeight *= 2.0;
        else if (tier === 2) adjustedWeight *= 1.5;
        else if (tier === 3) adjustedWeight *= 1.2;

        if (quality.recommendation === 'reduce') adjustedWeight *= 0.5;
        else if (quality.recommendation === 'prioritize') adjustedWeight *= 1.2;

        return { metric, adjustedWeight };
    }).filter(m => m !== null) as Array<{ metric: MetricConfig; adjustedWeight: number }>;

    const totalAdjusted = selectedMetrics.reduce((sum, m) => sum + m.adjustedWeight, 0);
    const totalOriginal = Object.values(weights).reduce((sum, w) => sum + w, 0);

    if (totalAdjusted > 0) {
        const scaleFactor = totalOriginal / totalAdjusted;
        selectedMetrics.forEach(m => { m.adjustedWeight *= scaleFactor; });
    }
    return selectedMetrics;
}

function calculateConfidenceScore(breakdown: AdvancedScoringResult['breakdown'], metricsUsed: number): number {
    if (metricsUsed === 0) return 0;
    const imputedCount = Object.values(breakdown).filter(b => b.wasImputed).length;
    return 1 - (imputedCount / metricsUsed);
}

function applyMicroAdjustments(results: AdvancedScoringResult[]): AdvancedScoringResult[] {
    results.sort((a, b) => b.finalScore - a.finalScore || b.confidenceScore - a.confidenceScore || a.company.company_name.localeCompare(b.company.company_name));
    return results;
}

export function calculateAdvancedScores(companies: Company[], weights: Record<string, number>, metricConfigs: MetricConfig[], scoringStrategies: Record<CompanyStatus, ScoringStrategy>): AdvancedScoringResult[] {
  const metricQualityMap = new Map<string, MetricQualityScore>(metricConfigs.map(m => [m.key, calculateMetricQuality(companies, m)]));
  const peerGroups = definePeerGroups(companies, ['companyType', 'marketCap']);

  const results = companies.map(company => {
    const companyType = company.status || 'Other';
    const strategy = scoringStrategies[companyType];
    const peerGroupKey = JSON.stringify({ companyType, marketCapBucket: (company.financials?.market_cap_value || 0) < 50e6 ? 'small' : 'large' });
    const peerGroup = peerGroups.get(peerGroupKey);
    const peers = peerGroup ? companies.filter(c => peerGroup.companyIds.includes(c.company_id)) : companies;
    
    const selectedMetrics = selectMetricsForCompany(company, metricConfigs, weights, metricQualityMap, strategy);
    const breakdown: AdvancedScoringResult['breakdown'] = {};
    let totalWeight = 0;
    let weightedSum = 0;
    
    selectedMetrics.forEach(({ metric, adjustedWeight }) => {
        const rawValue = getNestedValue(company, metric.nested_path);
        let normalizedValue = 0;
        let wasImputed = false;
        let imputationMethod: string | undefined;

        const peerValues = peers.map(p => getNestedValue(p, metric.nested_path)).filter(isValidNumber);

        if (isValidNumber(rawValue)) {
            normalizedValue = normalizeWithEnsemble(rawValue, peerValues, metric, strategy.normalization);
        } else {
            wasImputed = true;
            imputationMethod = strategy.imputationStrategy;
            const imputedValue = imputeWithPeerGroup(company, metric, peers, imputationMethod === 'peer_group' ? 'median' : 'conservative');
            normalizedValue = imputedValue !== null ? normalizeWithEnsemble(imputedValue, peerValues, metric, strategy.normalization) : (metric.higherIsBetter ? 0 : 1);
        }
        
        strategy.transformations.forEach(t => {
            normalizedValue = applyScoreTransformation(normalizedValue, t, strategy.transformationSteepness);
        });

        breakdown[metric.key] = { rawValue, normalizedValue, weight: adjustedWeight, contribution: normalizedValue * adjustedWeight, wasImputed, imputationMethod };
        totalWeight += adjustedWeight;
        weightedSum += normalizedValue * adjustedWeight;
    });

    return {
      company,
      finalScore: totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0,
      confidenceScore: calculateConfidenceScore(breakdown, selectedMetrics.length),
      peerGroupRank: 0, // Placeholder, can be calculated later if needed
      peerGroupSize: peers.length,
      metricsUsed: selectedMetrics.length,
      metricsAvailable: selectedMetrics.length, // Simplified for now
      scoringStrategy: strategy,
      breakdown,
      warnings: []
    };
  });

  return applyMicroAdjustments(results);
}