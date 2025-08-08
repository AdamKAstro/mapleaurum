// src/pages/RPSScoringPage/rps-scoring-engine.ts

import type { Company, CompanyStatus } from '@/lib/types';
import { getNestedValue } from '@/lib/utils';
import type { RPSScoringConfigs } from './rps-scoring-configs';
import { getMetricRationale } from './rps-scoring-configs';

// --- Constants ---
const MIN_PEER_GROUP_SIZE = 5;
const EPSILON = 1e-9;
const DEFAULT_NORMALIZED_SCORE = 50;

// --- Data Structures ---
export interface PeerGroupResult {
  rank: number;
  totalInGroup: number;
  medianValue: number | null;
  percentile: number | null;
}

export interface RPSMetricBreakdown {
  metricKey: string;
  theme: string;
  label: string;
  weight: number;
  rawValue: number | null;
  normalizedScore: number;
  contribution: number;
  statusPeers: PeerGroupResult;
  valuationPeers: PeerGroupResult;
  operationalPeers: PeerGroupResult;
}

export interface RPSScoringResult {
  company: Company;
  companyType: CompanyStatus;
  finalScore: number;
  breakdown: RPSMetricBreakdown[];
  statusRank: { rank: number; total: number };
  valuationRank: { rank: number; total: number };
  operationalRank: { rank: number; total: number };
}

export interface PrecomputedMetric {
  metricKey: string;
  theme: string;
  label: string;
  weight: number;
  rawValue: number | null;
  higherIsBetter: boolean;
  scoreVsStatus: number;
  scoreVsValuation: number;
  scoreVsOperational: number;
  statusPeers: PeerGroupResult;
  valuationPeers: PeerGroupResult;
  operationalPeers: PeerGroupResult;
}

export interface PrecomputedResult {
  company: Company;
  companyType: CompanyStatus;
  metrics: PrecomputedMetric[];
}

interface MetricStatistics {
  values: number[];
  mean: number;
  median: number;
  min: number;
  max: number;
}

interface PeerGroups {
  status: Company[];
  valuation: Company[];
  operational: Company[];
}

interface CalculationContext {
  companies: Company[];
  companyMap: Map<number, Company>;
  statusGroups: Record<CompanyStatus, Company[]>;
  operationalTiers: Record<string, Company[]>;
  peerGroupMap: Map<number, PeerGroups>;
}

/**
 * PHASE 1: Performs the initial, computationally expensive analysis.
 */
export function precomputeRPSData(companies: Company[], configs: RPSScoringConfigs): PrecomputedResult[] {
  if (!companies || companies.length < MIN_PEER_GROUP_SIZE) return [];

  const context = createCalculationContext(companies);
  buildAdvancedPeerGroups(context);

  const precomputedResults = companies.map(company => {
    const companyType = company.status || 'other';
    const companyConfig = configs[companyType] || configs.other;
    const companyPeers = context.peerGroupMap.get(company.company_id as number)!;
    const metrics: PrecomputedMetric[] = [];

    for (const theme in companyConfig) {
      for (const metricKey in companyConfig[theme]) {
        const weight = companyConfig[theme][metricKey];
        const rationale = getMetricRationale(companyType, metricKey);
        if (!rationale) continue;

        const rawValue = getMetricValue(company, metricKey);
        const vsStatus = normalizeValue(rawValue, metricKey, rationale.higherIsBetter, companyPeers.status);
        const vsValuation = normalizeValue(rawValue, metricKey, rationale.higherIsBetter, companyPeers.valuation);
        const vsOperational = normalizeValue(rawValue, metricKey, rationale.higherIsBetter, companyPeers.operational);

        metrics.push({
          metricKey,
          theme,
          weight,
          rawValue,
          label: rationale.label,
          higherIsBetter: rationale.higherIsBetter,
          scoreVsStatus: vsStatus.normalizedScore,
          scoreVsValuation: vsValuation.normalizedScore,
          scoreVsOperational: vsOperational.normalizedScore,
          statusPeers: { ...vsStatus.peerResult, totalInGroup: companyPeers.status.length },
          valuationPeers: { ...vsValuation.peerResult, totalInGroup: companyPeers.valuation.length },
          operationalPeers: { ...vsOperational.peerResult, totalInGroup: companyPeers.operational.length },
        });
      }
    }
    return { company, companyType, metrics };
  });

  return precomputedResults.filter(p => p.metrics.length > 0);
}

/**
 * PHASE 2: Applies new weights to pre-computed data.
 */
export function applyWeightsToPrecomputedData(
  precomputedResults: PrecomputedResult[],
  metricWeights: RPSScoringConfigs,
  peerGroupWeights: { status: number; valuation: number; operational: number }
): RPSScoringResult[] {
  const results: RPSScoringResult[] = precomputedResults.map(precomputed => {
    let weightedScoreSum = 0;
    let totalWeight = 0;
    const breakdown: RPSMetricBreakdown[] = [];
    const companyType = precomputed.companyType;

    for (const metric of precomputed.metrics) {
      const newWeight = metricWeights[companyType]?.[metric.theme]?.[metric.metricKey] ?? metric.weight;
      if (newWeight === 0) continue;

      const blendedScore =
        (metric.scoreVsStatus * (peerGroupWeights.status / 100)) +
        (metric.scoreVsValuation * (peerGroupWeights.valuation / 100)) +
        (metric.scoreVsOperational * (peerGroupWeights.operational / 100));

      const contribution = (blendedScore * newWeight) / 100;
      weightedScoreSum += contribution;
      totalWeight += newWeight;

      breakdown.push({ ...metric, weight: newWeight, normalizedScore: blendedScore, contribution });
    }
    const finalScore = totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : 0;

    return {
      company: precomputed.company,
      companyType,
      finalScore,
      breakdown,
      statusRank: { rank: 0, total: 0 },
      valuationRank: { rank: 0, total: 0 },
      operationalRank: { rank: 0, total: 0 },
    };
  });

  const rankContext = createCalculationContext(precomputedResults.map(r => r.company));
  buildAdvancedPeerGroups(rankContext);
  addFinalRankings(results, rankContext);

  return results.sort((a, b) => b.finalScore - a.finalScore);
}

// --- HELPER FUNCTIONS ---

function createCalculationContext(companies: Company[]): CalculationContext {
  const context: CalculationContext = {
    companies,
    companyMap: new Map(companies.map((c) => [c.company_id as number, c])),
    statusGroups: { producer: [], developer: [], explorer: [], royalty: [], other: [] },
    operationalTiers: {},
    peerGroupMap: new Map(),
  };

  companies.forEach((c) => {
    const status = c.status || 'other';
    if (context.statusGroups[status]) {
      context.statusGroups[status].push(c);
    }
  });

  return context;
}

function calculateOperationalScaleScore(company: Company): number {
  const get = (key: string) => getNestedValue(company, key) as number | null ?? 0;

  switch (company.status) {
    case 'producer':
      return (
        0.4 * get('production.current_production_total_aueq_koz') +
        0.3 * get('mineral_estimates.reserves_total_aueq_moz') +
        0.3 * get('financials.market_cap_value')
      );
    case 'developer':
      return (
        0.5 * get('costs.construction_costs') +
        0.5 * get('mineral_estimates.mineable_total_aueq_moz')
      );
    case 'explorer':
      return (
        0.6 * get('mineral_estimates.resources_total_aueq_moz') +
        0.4 * get('financials.cash_value')
      );
    case 'royalty':
      return (
        0.5 * get('royalty_portfolios.r_asset_count_producing') +
        0.3 * get('royalty_portfolios.r_asset_count_total') +
        0.2 * get('production.current_production_precious_aueq_koz')
      );
    default:
      return get('financials.market_cap_value');
  }
}

function buildAdvancedPeerGroups(context: CalculationContext): void {
  const allScores = context.companies.map((c) => ({
    id: c.company_id as number,
    status: c.status || 'other',
    valuation: ((getNestedValue(c, 'financials.market_cap_value') as number | null ?? 0) + (getNestedValue(c, 'financials.enterprise_value_value') as number | null ?? 0)) / 2,
    operational: calculateOperationalScaleScore(c),
  }));

  for (const status of Object.keys(context.statusGroups)) {
    const group = allScores.filter((s) => s.status === status).sort((a, b) => b.operational - a.operational);
    const n = group.length;
    if (n === 0) continue;
    group.forEach((companyScore, i) => {
      let tier;
      if (i < n / 3) tier = 'tier-1';
      else if (i < (2 * n) / 3) tier = 'tier-2';
      else tier = 'tier-3';
      const tierKey = `${status}-${tier}`;
      if (!context.operationalTiers[tierKey]) context.operationalTiers[tierKey] = [];
      context.operationalTiers[tierKey].push(context.companyMap.get(companyScore.id)!);
    });
  }

  context.companies.forEach((company) => {
    const companyId = company.company_id as number;
    const companyStatus = company.status || 'other';
    const companyScores = allScores.find((s) => s.id === companyId)!;

    const statusPeers = context.statusGroups[companyStatus];
    const valuationPeers = allScores
      .filter((s) => s.status === companyStatus && s.id !== companyId)
      .sort((a, b) =>
        Math.abs(Math.log(a.valuation + EPSILON) - Math.log(companyScores.valuation + EPSILON)) -
        Math.abs(Math.log(b.valuation + EPSILON) - Math.log(companyScores.valuation + EPSILON))
      )
      .slice(0, 10)
      .map((s) => context.companyMap.get(s.id)!);

    const operationalTierKey = Object.keys(context.operationalTiers).find((key) =>
      context.operationalTiers[key].some((c) => c.company_id === companyId)
    );
    const operationalPeers = operationalTierKey ? context.operationalTiers[operationalTierKey] : statusPeers;

    context.peerGroupMap.set(companyId, {
      status: statusPeers,
      valuation: [company, ...valuationPeers],
      operational: operationalPeers,
    });
  });
}

function normalizeValue(
  value: number | null,
  metricKey: string,
  higherIsBetter: boolean,
  peers: Company[]
): { normalizedScore: number; peerResult: PeerGroupResult } {
  if (value === null || peers.length < MIN_PEER_GROUP_SIZE) {
    return { normalizedScore: DEFAULT_NORMALIZED_SCORE, peerResult: { rank: 0, medianValue: null, percentile: 0.5 } };
  }

  const peerValues = peers
    .map((p) => getMetricValue(p, metricKey))
    .filter((v): v is number => v !== null && isFinite(v));

  if (peerValues.length < MIN_PEER_GROUP_SIZE) {
    return { normalizedScore: DEFAULT_NORMALIZED_SCORE, peerResult: { rank: 0, medianValue: null, percentile: 0.5 } };
  }

  const stats = calculateStatsForValues(peerValues);
  const percentile = getPercentileRank(value, stats);
  const adjustedPercentile = higherIsBetter ? percentile : 1 - percentile;

  const k = 8;
  const sigmoid = 1 / (1 + Math.exp(-k * (adjustedPercentile - 0.5)));
  const normalizedScore = Math.max(0, Math.min(100, sigmoid * 100));

  const sortedPeers = [...peerValues].sort((a, b) => (higherIsBetter ? b - a : a - b));
  let rank = sortedPeers.findIndex((v) => v === value) + 1;
  if (rank === 0) {
    rank = sortedPeers.filter((v) => (higherIsBetter ? v > value : v < value)).length + 1;
  }

  return {
    normalizedScore,
    peerResult: { rank, medianValue: stats.median, percentile: adjustedPercentile },
  };
}

function addFinalRankings(results: RPSScoringResult[], context: CalculationContext): void {
  const resultMap = new Map(results.map((r) => [r.company.company_id, r]));

  const statusGroups: Record<string, RPSScoringResult[]> = {};
  results.forEach(result => {
    const status = result.companyType;
    if (!statusGroups[status]) statusGroups[status] = [];
    statusGroups[status].push(result);
  });

  for (const group of Object.values(statusGroups)) {
    group.sort((a, b) => b.finalScore - a.finalScore);
    group.forEach((result, index) => {
      result.statusRank = { rank: index + 1, total: group.length };
    });
  }

  for (const result of results) {
    const companyId = result.company.company_id as number;
    const peerGroups = context.peerGroupMap.get(companyId);
    if (peerGroups) {
      const valuationPeerResults = peerGroups.valuation
        .map((p) => resultMap.get(p.company_id as number))
        .filter((r): r is RPSScoringResult => r !== undefined);
      valuationPeerResults.sort((a, b) => b.finalScore - a.finalScore);
      const valRank = valuationPeerResults.findIndex((r) => r.company.company_id === companyId) + 1;
      result.valuationRank = { rank: valRank > 0 ? valRank : 1, total: valuationPeerResults.length };

      const operationalPeerResults = peerGroups.operational
        .map((p) => resultMap.get(p.company_id as number))
        .filter((r): r is RPSScoringResult => r !== undefined);
      operationalPeerResults.sort((a, b) => b.finalScore - a.finalScore);
      const opRank = operationalPeerResults.findIndex((r) => r.company.company_id === companyId) + 1;
      result.operationalRank = { rank: opRank > 0 ? opRank : 1, total: operationalPeerResults.length };
    }
  }
}

function getMetricValue(company: Company, metricKey: string): number | null {
  if (metricKey.startsWith('_calc_')) {
    const fcf = getNestedValue(company, 'financials.free_cash_flow') as number | null;
    const rev = getNestedValue(company, 'financials.revenue_value') as number | null;
    const ev = getNestedValue(company, 'financials.enterprise_value_value') as number | null;

    if (metricKey === '_calc_fcf_margin') {
      if (fcf === null || rev === null || rev === 0) return null;
      return (fcf / rev) * 100;
    }
    if (metricKey === '_calc_fcf_ev_yield') {
      if (fcf === null || ev === null || ev <= 0) return null;
      return (fcf / ev) * 100;
    }
    if (metricKey === '_calc_net_debt_to_ebitda') {
      const debt = getNestedValue(company, 'financials.debt_value') as number | null;
      const cash = getNestedValue(company, 'financials.cash_value') as number | null;
      const ebitda = getNestedValue(company, 'financials.ebitda') as number | null;
      if (ebitda === null || ebitda === 0) return null;
      return ((debt || 0) - (cash || 0)) / ebitda;
    }
  }

  const value = getNestedValue(company, metricKey);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function calculateStatsForValues(values: number[]): MetricStatistics {
  if (values.length === 0) {
    return { values: [], mean: 0, median: 0, min: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return { values: sorted, mean, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

function getPercentileRank(value: number, stats: MetricStatistics): number {
  if (stats.values.length === 0) return 0.5;
  if (value <= stats.min) return 0;
  if (value >= stats.max) return 1;
  const count = stats.values.filter((v) => v < value).length;
  return count / stats.values.length;
}