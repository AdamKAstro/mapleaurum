import type { Company, CompanyStatus, MetricConfig } from '@/lib/types';
import { isValidNumber, getNestedValue } from '@/lib/utils';

// Defines the tiered structure for metric priorities
interface TieredMetric {
  key: string;
  tier: 1 | 2 | 3;
}

// Defines the priority of metrics for each company status using a tiered system.
export const COMPANY_TYPE_METRIC_PRIORITIES: Record<CompanyStatus, TieredMetric[]> = {
  producer: [
    { key: 'financials.enterprise_to_ebitda', tier: 1 },
    { key: 'costs.aisc_last_year', tier: 1 },
    { key: 'financials.free_cash_flow', tier: 1 },
    { key: 'production.current_production_total_aueq_koz', tier: 2 },
    { key: 'financials.ebitda', tier: 2 },
    { key: 'production.reserve_life_years', tier: 2 },
    { key: 'valuation_metrics.ev_per_production_oz', tier: 2 },
    { key: 'financials.debt_value', tier: 3 },
    { key: 'mineral_estimates.reserves_total_aueq_moz', tier: 3 },
  ],
  developer: [ { key: 'mineral_estimates.reserves_total_aueq_moz', tier: 1 }, { key: 'costs.construction_costs', tier: 1 }, { key: 'financials.cash_value', tier: 1 }, { key: 'financials.net_financial_assets', tier: 1 }, { key: 'costs.aisc_future', tier: 2 }, { key: 'production.future_production_total_aueq_koz', tier: 2 }, { key: 'valuation_metrics.ev_per_reserve_oz_all', tier: 2 }, { key: 'financials.debt_value', tier: 2 }, ],
  explorer: [ { key: 'financials.cash_value', tier: 1 }, { key: 'financials.net_financial_assets', tier: 1 }, { key: 'mineral_estimates.resources_total_aueq_moz', tier: 1 }, { key: 'financials.free_cash_flow', tier: 1 }, { key: 'mineral_estimates.measured_indicated_total_aueq_moz', tier: 2 }, { key: 'valuation_metrics.ev_per_resource_oz_all', tier: 2 }, { key: 'financials.enterprise_value_value', tier: 2 }, { key: 'financials.price_to_book', tier: 2 }, { key: 'mineral_estimates.potential_total_aueq_moz', tier: 3 }, { key: 'costs.aisc_future', tier: 3 }, ],
  royalty: [ { key: 'financials.revenue_value', tier: 1 }, { key: 'financials.free_cash_flow', tier: 1 }, { key: 'financials.ebitda', tier: 1 }, { key: 'financials.enterprise_to_revenue', tier: 2 }, { key: 'financials.net_income_value', tier: 2 }, { key: 'financials.price_to_book', tier: 3 }, { key: 'financials.debt_value', tier: 3 }, ],
  other: []
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
  normalizeByShares: boolean;
}

export interface MetricQualityScore {
  metricKey: string;
  coverage: number;
  variance: number;
  outlierScore: number;
  recommendation: 'exclude' | 'reduce' | 'use' | 'prioritize';
}

export interface AdvancedScoringResult {
  company: Company;
  finalScore: number;
  confidenceScore: number;
  breakdown: Record<string, {
    rawValue: any;
    normalizedValue: number;
    weight: number;
    contribution: number;
    wasImputed: boolean;
  }>;
}

export function calculateMetricQuality(companies: Company[], metric: MetricConfig): MetricQualityScore {
  const values = companies.map(c => getNestedValue(c, metric.nested_path)).filter(isValidNumber);
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
  const overallQuality = (coverage * 0.5 + (1 - outlierScore) * 0.5);
  let recommendation: MetricQualityScore['recommendation'] = 'use';
  if (coverage < 0.1) recommendation = 'exclude';
  else if (coverage < 0.4 || overallQuality < 0.6) recommendation = 'reduce';
  else if (coverage > 0.8 && overallQuality > 0.8) recommendation = 'prioritize';
  return { metricKey: metric.key, coverage, variance, outlierScore, recommendation };
}

export function definePeerGroups(companies: Company[], factors: ('companyType' | 'marketCap')[]) {
    const groups = new Map<string, number[]>();
    companies.forEach(company => {
        const groupKey = factors.map(factor => {
            if (factor === 'companyType') return company.status || 'other';
            if (factor === 'marketCap') {
                const mc = getNestedValue(company, 'financials.market_cap_value') || 0;
                if (mc < 50e6) return 'small';
                if (mc < 1e9) return 'mid';
                return 'large';
            }
            return '';
        }).join('-');
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey)!.push(company.company_id);
    });
    return groups;
}

export function normalizeWithEnsemble(value: number, values: number[], metric: MetricConfig, method: ScoringStrategy['normalization']): number {
  if (values.length === 0) return 0.5;
  const sorted = [...values].sort((a, b) => a - b);
  const applyDirection = (v: number) => metric.higherIsBetter ? v : 1 - v;

  const percentileRank = () => {
      const rank = sorted.findIndex(v => v >= value);
      if (rank === -1) return 1; // Should not happen if value is in values
      return rank / (values.length -1 || 1);
  };
  const robustZScore = () => {
      const median = sorted[Math.floor(values.length / 2)];
      const deviations = values.map(v => Math.abs(v - median));
      const mad = deviations.sort((a,b)=>a-b)[Math.floor(deviations.length / 2)];
      if (mad === 0) return 0.5;
      const z = 0.6745 * (value - median) / mad; // 0.6745*z is approx percentile
      return 1 / (1 + Math.exp(-z)); // Sigmoid function
  };
  const minMax = () => {
    const p5 = sorted[Math.floor(values.length * 0.05)];
    const p95 = sorted[Math.floor(values.length * 0.95)];
    if (p95 === p5) return 0.5;
    const clamped = Math.max(p5, Math.min(p95, value));
    return (clamped - p5) / (p95 - p5);
  };

  switch (method) {
    case 'percentile': return applyDirection(percentileRank());
    case 'robust_zscore': return applyDirection(robustZScore());
    case 'min_max': return applyDirection(minMax());
    case 'ensemble':
      return 0.5 * applyDirection(percentileRank()) + 0.3 * applyDirection(robustZScore()) + 0.2 * applyDirection(minMax());
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

export function imputeWithPeerGroup(metric: MetricConfig, peerValues: number[]): number | null {
  if (peerValues.length === 0) return null;
  const sorted = [...peerValues].sort((a, b) => a - b);
  const quartileIndex = metric.higherIsBetter ? Math.floor(peerValues.length * 0.25) : Math.floor(peerValues.length * 0.75);
  return sorted[quartileIndex];
}

function selectMetricsForCompany(company: Company, allMetrics: MetricConfig[], weights: Record<string, number>, qualityMap: Map<string, MetricQualityScore>, strategy: ScoringStrategy): Array<{ metric: MetricConfig; adjustedWeight: number }> {
    const companyType = company.status || 'other';
    const priorityInfo = COMPANY_TYPE_METRIC_PRIORITIES[companyType] || [];
    const priorityMap = new Map<string, number>(priorityInfo.map(p => [p.key, p.tier]));
    
    return allMetrics.map(metric => {
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
    }).filter((m): m is { metric: MetricConfig; adjustedWeight: number } => m !== null);
}

function calculateConfidenceScore(breakdown: AdvancedScoringResult['breakdown']): number {
    const metricsUsed = Object.keys(breakdown).length;
    if (metricsUsed === 0) return 0;
    const imputedCount = Object.values(breakdown).filter(b => b.wasImputed).length;
    return 1 - (imputedCount / metricsUsed);
}

export function calculateAdvancedScores(
  companies: Company[],
  weights: Record<string, number>,
  metricConfigs: readonly MetricConfig[],
  scoringStrategies: Record<CompanyStatus, ScoringStrategy>
): AdvancedScoringResult[] {
  const qualityMap = new Map<string, MetricQualityScore>(metricConfigs.map(m => [m.key, calculateMetricQuality(companies, m)]));
  const peerGroups = definePeerGroups(companies, ['companyType', 'marketCap']);

  const results = companies.map(company => {
    const companyType = company.status || 'other';
    const strategy = scoringStrategies[companyType];
    const peerGroupKey = (strategy.peerGroupFactors || []).map(factor => {
        if (factor === 'companyType') return company.status || 'other';
        if (factor === 'marketCap') {
            const mc = getNestedValue(company, 'financials.market_cap_value') || 0;
            if (mc < 50e6) return 'small'; if (mc < 1e9) return 'mid'; return 'large';
        }
        return '';
    }).join('-');
    const peerGroupCompanyIds = peerGroups.get(peerGroupKey) || [];
    const peers = companies.filter(c => peerGroupCompanyIds.includes(c.company_id));
    
    const selectedMetrics = selectMetricsForCompany(company, [...metricConfigs], weights, qualityMap, strategy);
    const breakdown: AdvancedScoringResult['breakdown'] = {};
    let totalWeight = 0;
    let weightedSum = 0;
    
    selectedMetrics.forEach(({ metric, adjustedWeight }) => {
      let rawValue = getNestedValue(company, metric.nested_path);
      let wasImputed = false;

      const isAbsoluteFinancial = metric.format === 'currency' && metric.category === 'financials' && !metric.key.includes('_per_');
      if (strategy.normalizeByShares && isAbsoluteFinancial) {
          const shares = getNestedValue(company, 'financials.shares_outstanding');
          if (isValidNumber(rawValue) && isValidNumber(shares) && shares > 0) {
              rawValue = rawValue / shares;
          }
      }

      const peerValues = peers.map(p => {
          let peerRawValue = getNestedValue(p, metric.nested_path);
          if (strategy.normalizeByShares && isAbsoluteFinancial) {
              const peerShares = getNestedValue(p, 'financials.shares_outstanding');
              if (isValidNumber(peerRawValue) && isValidNumber(peerShares) && peerShares > 0) {
                  peerRawValue = peerRawValue / peerShares;
              }
          }
          return peerRawValue;
      }).filter(isValidNumber) as number[];

      if (!isValidNumber(rawValue)) {
        wasImputed = true;
        if (strategy.imputationStrategy === 'conservative') {
            rawValue = imputeWithPeerGroup(metric, peerValues);
        } else {
            rawValue = 0; 
        }
      }
      
      let normalizedValue = isValidNumber(rawValue) ? normalizeWithEnsemble(rawValue, peerValues, metric, strategy.normalization) : (metric.higherIsBetter ? 0 : 1);
      
      strategy.transformations.forEach(t => {
          normalizedValue = applyScoreTransformation(normalizedValue, t, strategy.transformationSteepness);
      });

      breakdown[metric.key] = { rawValue, normalizedValue, weight: adjustedWeight, contribution: normalizedValue * adjustedWeight, wasImputed };
      totalWeight += adjustedWeight;
      weightedSum += breakdown[metric.key].contribution;
    });

    return {
      company,
      finalScore: totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0,
      confidenceScore: calculateConfidenceScore(breakdown),
      breakdown,
    };
  }).sort((a, b) => b.finalScore - a.finalScore);

  return results;
}