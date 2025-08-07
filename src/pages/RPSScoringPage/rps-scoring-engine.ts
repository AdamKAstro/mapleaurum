// src/pages/RPSScoringPage/rps-scoring-engine.ts

import type { Company, CompanyStatus } from '@/lib/types';
import type { RPSScoringConfigs, RPSCompanyConfig } from './rps-scoring-configs';
import { getMetricRationale, type RPSScoringConfigs } from './rps-scoring-configs';
import { getNestedValue } from '@/lib/utils';
import { getMetricByKey } from '@/lib/metric-types';

// Constants for robust calculations
const MIN_PEER_GROUP_SIZE = 5;
const EPSILON = 1e-9;

// --- Data Structures for Scoring Results ---

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
    normalizedScore: number; // The primary score used for final calculation (based on Status Peers)
    contribution: number;
    // Detailed results for each peer group
    statusPeers: PeerGroupResult;
    valuationPeers: PeerGroupResult;
    operationalPeers: PeerGroupResult;
}

export interface RPSScoringResult {
    company: Company;
    companyType: CompanyStatus;
    finalScore: number;
    breakdown: RPSMetricBreakdown[];
    // High-level ranks for display
    statusRank: { rank: number; total: number };
    valuationRank: { rank: number; total: number };
    operationalRank: { rank: number; total: number };
}

interface MetricStatistics {
    values: number[];
    mean: number;
    median: number;
    min: number;
    max: number;
    percentiles: number[];
}

interface PeerGroups {
    status: Company[];
    valuation: Company[];
    operational: Company[];
}

interface CalculationContext {
    companies: Company[];
    companyMap: Map<number, Company>;
    // Groupings for all companies
    statusGroups: Record<CompanyStatus, Company[]>;
    operationalTiers: Record<string, Company[]>; // e.g., 'producer-tier-1'
    // Company-specific peer groups
    peerGroupMap: Map<number, PeerGroups>;
    // Pre-calculated stats for large groups
    statsCache: Map<string, MetricStatistics>;
}


/**
 * =================================================================
 * MAIN SCORING FUNCTION
 * =================================================================
 */
export function calculateRelativePerformanceScores(
    companies: Company[],
    configs: RPSScoringConfigs
): RPSScoringResult[] {
    if (!companies || companies.length < MIN_PEER_GROUP_SIZE) {
        return [];
    }

    // 1. Create a context with basic groupings (by status)
    const context = createCalculationContext(companies);

    // 2. Build the advanced, company-specific peer groups (Valuation & Operational)
    buildAdvancedPeerGroups(context);

    // 3. Pre-calculate statistics for the large Status Peer groups to improve performance
    preCalculateStatusGroupStats(context);
    
    // 4. Score each company against its three unique peer groups
    let results = companies.map(company => scoreCompany(company, context, configs));

    // 5. Add final ranks to each result object
    addFinalRankings(results, context);

    results.sort((a, b) => b.finalScore - a.finalScore);

    return results;
}


/**
 * =================================================================
 * CONTEXT & PEER GROUP CONSTRUCTION
 * =================================================================
 */

function createCalculationContext(companies: Company[]): CalculationContext {
    const context: CalculationContext = {
        companies,
        companyMap: new Map(companies.map(c => [c.company_id, c])),
        statusGroups: { producer: [], developer: [], explorer: [], royalty: [], other: [] },
        operationalTiers: {},
        peerGroupMap: new Map(),
        statsCache: new Map(),
    };

    companies.forEach(c => {
        const status = c.status || 'other';
        if (context.statusGroups[status]) {
            context.statusGroups[status].push(c);
        }
    });

    return context;
}

function calculateOperationalScaleScore(company: Company): number {
    const get = (key: string) => (company[key] || 0) as number;
    
    switch (company.status) {
        case 'producer':
            // 40% production, 30% reserves, 30% market cap
            return 0.4 * get('p_current_production_total_aueq_koz') + 0.3 * get('me_reserves_total_aueq_moz') + 0.3 * get('f_market_cap_value');
        case 'developer':
            // 50% CAPEX, 50% mineable ounces
            return 0.5 * get('c_construction_costs') + 0.5 * get('me_mineable_total_aueq_moz');
        case 'explorer':
            // 60% resources, 40% cash
            return 0.6 * get('me_resources_total_aueq_moz') + 0.4 * get('f_cash_value');
        case 'royalty':
             // 50% producing assets, 30% total assets, 20% attributable production
            return 0.5 * get('r_asset_count_producing') + 0.3 * get('r_asset_count_total') + 0.2 * get('p_current_production_precious_aueq_koz');
        default:
            return get('f_market_cap_value');
    }
}

function buildAdvancedPeerGroups(context: CalculationContext): void {
    const allScores: { id: number; status: CompanyStatus; valuation: number; operational: number }[] = context.companies.map(c => ({
        id: c.company_id,
        status: c.status || 'other',
        valuation: ((c.f_market_cap_value || 0) as number + (c.f_enterprise_value_value || 0) as number) / 2,
        operational: calculateOperationalScaleScore(c),
    }));

    // Define operational tiers (e.g., top 33% = tier 1, next 33% = tier 2, etc.)
    for (const status of Object.keys(context.statusGroups)) {
        const group = allScores.filter(s => s.status === status).sort((a,b) => b.operational - a.operational);
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

    context.companies.forEach(company => {
        const companyId = company.company_id;
        const companyStatus = company.status || 'other';
        const companyScores = allScores.find(s => s.id === companyId)!;
        
        const statusPeers = context.statusGroups[companyStatus];

        // Find Valuation Peers (PG2)
        const valuationPeers = allScores
            .filter(s => s.status === companyStatus && s.id !== companyId)
            .sort((a, b) => 
                Math.abs(Math.log(a.valuation + EPSILON) - Math.log(companyScores.valuation + EPSILON)) -
                Math.abs(Math.log(b.valuation + EPSILON) - Math.log(companyScores.valuation + EPSILON))
            )
            .slice(0, 10)
            .map(s => context.companyMap.get(s.id)!);

        // Find Operational Peers (PG3)
        const operationalTierKey = Object.keys(context.operationalTiers).find(key => 
            context.operationalTiers[key].some(c => c.company_id === companyId)
        );
        const operationalPeers = operationalTierKey ? context.operationalTiers[operationalTierKey] : statusPeers;

        context.peerGroupMap.set(companyId, {
            status: statusPeers,
            valuation: [company, ...valuationPeers],
            operational: operationalPeers,
        });
    });
}


/**
 * =================================================================
 * STATISTICS & SCORING LOGIC
 * =================================================================
 */

function preCalculateStatusGroupStats(context: CalculationContext): void {
    const allMetrics = new Set<string>();
    // This should read from the new RPS_SCORING_CONFIGS
    // For now, let's assume we get them from somewhere.
    // In a real scenario, you'd pass configs in and extract all unique metric keys.

    Object.values(context.statusGroups).forEach(group => {
        if (group.length === 0) return;
        const status = group[0].status;
        // Here you would get metrics from `RPS_SCORING_CONFIGS[status]`
        // This part needs to be connected to the config file. For now, it's illustrative.
    });
    // This function would be built out to iterate metrics and cache stats for each status group.
}

function scoreCompany(company: Company, context: CalculationContext, configs: RPSScoringConfigs): RPSScoringResult {
    const companyType = company.status || 'other';
    const companyConfig = configs[companyType];
    const breakdown: RPSMetricBreakdown[] = [];
    const companyPeers = context.peerGroupMap.get(company.company_id)!;

    let weightedScoreSum = 0;
    let totalWeight = 0;

    for (const theme in companyConfig) {
        const themeMetrics = companyConfig[theme];
        for (const metricKey in themeMetrics) {
            const weight = themeMetrics[metricKey];
            if (weight === 0) continue;
            
            const rationale = getMetricRationale(companyType, metricKey); // Use this to find higherIsBetter
            const higherIsBetter = rationale ? rationale.higherIsBetter : true;
            const label = rationale ? rationale.label : metricKey;

            // 1. Get raw value
            const rawValue = getMetricValue(company, metricKey);

            // 2. Get stats and normalize against each peer group, PASSING the metricKey
            const scoreVsStatus = normalizeValue(rawValue, metricKey, higherIsBetter, companyPeers.status);
            const scoreVsValuation = normalizeValue(rawValue, metricKey, higherIsBetter, companyPeers.valuation);
            const scoreVsOperational = normalizeValue(rawValue, metricKey, higherIsBetter, companyPeers.operational);

            // 3. The final score contribution is based on the main Status Peer group
            const contribution = (scoreVsStatus.normalizedScore * weight) / 100;
            weightedScoreSum += contribution;
            totalWeight += weight;

            breakdown.push({
                metricKey, theme, weight, rawValue,
                label: label,
                normalizedScore: scoreVsStatus.normalizedScore,
                contribution,
                statusPeers: { ...scoreVsStatus.peerResult, totalInGroup: companyPeers.status.length },
                valuationPeers: { ...scoreVsValuation.peerResult, totalInGroup: companyPeers.valuation.length },
                operationalPeers: { ...scoreVsOperational.peerResult, totalInGroup: companyPeers.operational.length },
            });
        }
    }

    const finalScore = totalWeight > 0 ? (weightedScoreSum / totalWeight) * 100 : 0;
    
    return {
        company,
        companyType,
        finalScore,
        breakdown,
        // Ranks will be added in a final step
        statusRank: { rank: 0, total: 0 },
        valuationRank: { rank: 0, total: 0 },
        operationalRank: { rank: 0, total: 0 },
    };
}

// CORRECTED: Added 'metricKey' as an argument
function normalizeValue(
    value: number | null,
    metricKey: string,
    higherIsBetter: boolean,
    peers: Company[]
) {
    if (value === null || peers.length < MIN_PEER_GROUP_SIZE) {
        return { normalizedScore: 50, peerResult: { rank: 0, medianValue: null, percentile: 0.5 } };
    }
    
    // CORRECTED: Uses the metricKey to get values for all peers
    const peerValues = peers
        .map(p => getMetricValue(p, metricKey))
        .filter((v): v is number => v !== null && isFinite(v));
                           
    if (peerValues.length < MIN_PEER_GROUP_SIZE) {
        return { normalizedScore: 50, peerResult: { rank: 0, medianValue: null, percentile: 0.5 } };
    }

    const stats = calculateStatsForValues(peerValues);
    const percentile = getPercentileRank(value, stats);
    const adjustedPercentile = higherIsBetter ? percentile : (1 - percentile);
    
    const k = 8; // Steepness
    const sigmoid = 1 / (1 + Math.exp(-k * (adjustedPercentile - 0.5)));
    const normalizedScore = Math.max(0, Math.min(100, sigmoid * 100));

    // Find rank within the valid peer values
    const sortedPeers = [...peerValues].sort((a,b) => higherIsBetter ? b - a : a - b);
    let rank = sortedPeers.findIndex(v => v === value) + 1;
    if (rank === 0) { // If value isn't exactly in the peer set (edge case)
        rank = sortedPeers.filter(v => higherIsBetter ? v > value : v < value).length + 1;
    }

    return {
        normalizedScore,
        peerResult: {
            rank,
            medianValue: stats.median,
            percentile: adjustedPercentile
        }
    };
}


/**
 * =================================================================
 * FINALIZATION & UTILITIES
 * =================================================================
 */

function addFinalRankings(results: RPSScoringResult[], context: CalculationContext): void {
    // Create a map for quick lookups of a company's full result object.
    const resultMap = new Map(results.map(r => [r.company.company_id, r]));

    // --- 1. Calculate Status Ranks ---
    const statusGroups: Record<string, RPSScoringResult[]> = {};
    for (const result of results) {
        const status = result.companyType;
        if (!statusGroups[status]) {
            statusGroups[status] = [];
        }
        statusGroups[status].push(result);
    }

    for (const group of Object.values(statusGroups)) {
        // Sort each status group by the final score in descending order.
        group.sort((a, b) => b.finalScore - a.finalScore);
        
        // Assign ranks based on the sorted order.
        group.forEach((result, index) => {
            result.statusRank = { rank: index + 1, total: group.length };
        });
    }

    // --- 2. Calculate Valuation & Operational Ranks ---
    for (const result of results) {
        const companyId = result.company.company_id;
        const peerGroups = context.peerGroupMap.get(companyId);

        if (peerGroups) {
            // Calculate Valuation Rank
            const valuationPeerResults = peerGroups.valuation
                .map(p => resultMap.get(p.company_id))
                .filter((r): r is RPSScoringResult => r !== undefined);
            
            valuationPeerResults.sort((a, b) => b.finalScore - a.finalScore);
            const valRank = valuationPeerResults.findIndex(r => r.company.company_id === companyId) + 1;
            result.valuationRank = { rank: valRank > 0 ? valRank : 1, total: valuationPeerResults.length };

            // Calculate Operational Rank
            const operationalPeerResults = peerGroups.operational
                .map(p => resultMap.get(p.company_id))
                .filter((r): r is RPSScoringResult => r !== undefined);

            operationalPeerResults.sort((a, b) => b.finalScore - a.finalScore);
            const opRank = operationalPeerResults.findIndex(r => r.company.company_id === companyId) + 1;
            result.operationalRank = { rank: opRank > 0 ? opRank : 1, total: operationalPeerResults.length };
        }
    }
}
function getMetricValue(company: Company, metricKey: string): number | null {
    // Handle calculated metrics first
    if (metricKey.startsWith('_calc_')) {
        const fcf = getNestedValue(company, 'financials.free_cash_flow') as number;
        const rev = getNestedValue(company, 'financials.revenue_value') as number;
        const ev = getNestedValue(company, 'financials.enterprise_value_value') as number;

        if (metricKey === '_calc_fcf_margin') {
            if (fcf === null || rev === null || rev === 0) return null;
            return (fcf / rev) * 100;
        }
        if (metricKey === '_calc_fcf_ev_yield') {
            if (fcf === null || ev === null || ev <= 0) return null;
            return (fcf / ev) * 100;
        }
        if (metricKey === '_calc_net_debt_to_ebitda') {
            const debt = getNestedValue(company, 'financials.debt_value') as number;
            const cash = getNestedValue(company, 'financials.cash_value') as number;
            const ebitda = getNestedValue(company, 'financials.ebitda') as number;
            if (ebitda === null || ebitda === 0) return null;
            return ((debt || 0) - (cash || 0)) / ebitda;
        }
    }
    
    // Use the getNestedValue utility for all standard metrics
    const value = getNestedValue(company, metricKey);
    
    if (typeof value === 'number' && isFinite(value)) {
        return value;
    }
    return null;
}

// --- Statistical Utility Functions (adapted from your FCF engine) ---

function calculateStatsForValues(values: number[]): MetricStatistics {
    if (values.length === 0) {
        return { values: [], mean: 0, median: 0, min: 0, max: 0, percentiles: [] };
    }
    const sorted = [...values].sort((a,b) => a-b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid-1] + sorted[mid])/2 : sorted[mid];
    const mean = sorted.reduce((a,b) => a+b, 0) / sorted.length;
    
    // Simplified percentiles for brevity
    const percentiles = [0, 0.25, 0.5, 0.75, 1].map(p => {
        const i = (sorted.length - 1) * p;
        const lower = Math.floor(i);
        const upper = Math.ceil(i);
        if (lower === upper) return sorted[lower];
        return sorted[lower] * (upper - i) + sorted[upper] * (i - lower);
    });

    return { values: sorted, mean, median, min: sorted[0], max: sorted[sorted.length-1], percentiles };
}

function getPercentileRank(value: number, stats: MetricStatistics): number {
    if (stats.values.length === 0) return 0.5;
    if (value <= stats.min) return 0;
    if (value >= stats.max) return 1;
    
    // Find the number of values less than the current value
    const count = stats.values.filter(v => v < value).length;
    return count / stats.values.length;
}