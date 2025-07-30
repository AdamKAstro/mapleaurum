// src/pages/fcf-scoring/fcf-scoring-engine.ts
import type { Company, CompanyStatus } from '@/lib/types';
import type { MetricConfig } from '@/lib/metric-types';
import type { FCFScoringResult, FCFMetricBreakdown, FCFInsight, FCFScoringConfigs } from './types';
import { getMetricByKey } from '@/lib/metric-types';
import { getNestedValue } from '@/lib/utils';

interface CalculationContext {
    companies: Company[];
    companyTypeGroups: Record<CompanyStatus, Company[]>;
    marketCapGroups: Record<string, Company[]>;
    metricStats: Map<string, MetricStatistics>;
	normalizeByShares: Record<CompanyStatus, boolean>;
}

interface MetricStatistics {
    values: number[];
    mean: number;
    median: number;
    stdDev: number;
    percentiles: number[];
    min: number;
    max: number;
}

/**
 * Calculates all statistical benchmarks for a given array of numbers.
 */
function calculateStatsForValues(values: number[]): MetricStatistics {
    const sortedValues = [...values].sort((a, b) => a - b);
    return {
        values: sortedValues,
        mean: calculateMean(sortedValues),
        median: calculateMedian(sortedValues),
        stdDev: calculateStdDev(sortedValues),
        percentiles: calculatePercentiles(sortedValues),
        min: sortedValues[0],
        max: sortedValues[sortedValues.length - 1]
    };
}


export function calculateFCFScores(
    companies: Company[],
    weightConfigs: FCFScoringConfigs,
    normalizeByShares: Record<CompanyStatus, boolean>, // This is passed in
    accessibleMetrics: readonly MetricConfig[]
): FCFScoringResult[] {
    if (!companies || companies.length === 0) return [];

    // Create calculation context
    const context = createCalculationContext(companies, normalizeByShares); 
    
    // Calculate statistics for all metrics, both globally and for peer groups
    calculateMetricStatistics(context, weightConfigs, normalizeByShares);
    
    // Score each company
    let results = companies.map(company => 
        scoreCompany(company, weightConfigs, normalizeByShares, context, accessibleMetrics)
    );

    // Add a category adjustment bonus/penalty to balance the final scores
    const categoryAdjustment: Record<CompanyStatus, number> = {
        explorer: 15,   // Boost explorer scores by 15 points
        developer: 10,  // Boost developer scores by 10 points
        producer: 0,    // No adjustment
        royalty: -5,    // Slight penalty to balance
        other: 5
    };

    results.forEach(result => {
        const adjustment = categoryAdjustment[result.companyType] || 0;
        result.finalScore = Math.max(0, Math.min(100, result.finalScore + adjustment));
    });
    
    // Sort by final score after adjustments
    results.sort((a, b) => b.finalScore - a.finalScore);
    
    // Add peer group rankings
    addPeerGroupRankings(results, context);
    
    return results;
}

function createCalculationContext(
    companies: Company[],
    normalizeByShares: Record<CompanyStatus, boolean> 
): CalculationContext {
    const companyTypeGroups: Record<CompanyStatus, Company[]> = {
        producer: [],
        developer: [],
        explorer: [],
        royalty: [],
        other: []
    };
    
    const marketCapGroups: Record<string, Company[]> = {
        micro: [], // < $50M
        small: [], // $50M - $250M
        mid: [],   // $250M - $1B
        large: []  // > $1B
    };
    
    companies.forEach(company => {
        // Group by type
        const status = company.status || 'other';
        companyTypeGroups[status].push(company);
        
        // Group by market cap
        const marketCap = company.financials?.market_cap || 0;
        if (marketCap < 50) marketCapGroups.micro.push(company);
        else if (marketCap < 250) marketCapGroups.small.push(company);
        else if (marketCap < 1000) marketCapGroups.mid.push(company);
        else marketCapGroups.large.push(company);
    });
    
    return {
        companies,
        companyTypeGroups,
        marketCapGroups,
        metricStats: new Map(), // Added comma here
        normalizeByShares
    };
}

function calculateMetricStatistics(
    context: CalculationContext,
    weightConfigs: FCFScoringConfigs,
    normalizeByShares: Record<CompanyStatus, boolean>
): void {
    // Get all unique metrics across all company types
    const allMetrics = new Set<string>();
    Object.values(weightConfigs).forEach(config => {
        Object.keys(config).forEach(metric => allMetrics.add(metric));
    });

    // Helper to get potentially normalized value
    const getNormalizedValue = (company: Company, metricKey: string) => {
        let value = getMetricValue(company, metricKey);
        if (shouldNormalizeByShares(metricKey, company.status, normalizeByShares)) {
            const shares = company.capital_structure?.fully_diluted_shares;
            if (shares && shares > 0 && value !== null) {
                value /= shares;
            }
        }
        return value;
    };
    
    // Calculate stats for each metric, both globally and per-type
    allMetrics.forEach(metricKey => {
        // 1. Calculate Global Stats
        const globalValues = context.companies
            .map(c => getNormalizedValue(c, metricKey))
            .filter((v): v is number => v !== null && isFinite(v));
        
        if (globalValues.length > 0) {
            context.metricStats.set(metricKey, calculateStatsForValues(globalValues));
        }

        // 2. Calculate Per-Company-Type Stats
        Object.entries(context.companyTypeGroups).forEach(([type, companiesInType]) => {
            if (companiesInType.length > 0) {
                const typeValues = companiesInType
                    .map(c => getNormalizedValue(c, metricKey))
                    .filter((v): v is number => v !== null && isFinite(v));

                if (typeValues.length > 0) {
                    const typeStatsKey = `${type}_${metricKey}`;
                    context.metricStats.set(typeStatsKey, calculateStatsForValues(typeValues));
                }
            }
        });
    });
}


function scoreCompany(
    company: Company,
    weightConfigs: FCFScoringConfigs,
    normalizeByShares: Record<CompanyStatus, boolean>,
    context: CalculationContext,
    accessibleMetrics: readonly MetricConfig[]
): FCFScoringResult {
    const companyType = company.status || 'other';
    const weights = weightConfigs[companyType];
    const breakdown: Record<string, FCFMetricBreakdown> = {};
    
    let totalWeight = 0;
    let weightedSum = 0;
    let dataPoints = 0;
    let fcfComponent = 0;
    
    // Process each metric
    Object.entries(weights).forEach(([metricKey, weight]) => {
        const metricConfig = getMetricByKey(metricKey);
        if (!metricConfig || !accessibleMetrics.includes(metricConfig)) {
            return; // Skip inaccessible metrics
        }
        
        let rawValue = getMetricValue(company, metricKey);
        const wasImputed = rawValue === null;
        
        // Apply share normalization to get the value used for scoring
        let scoringValue = rawValue;
        if (shouldNormalizeByShares(metricKey, companyType, normalizeByShares)) {
            const shares = company.capital_structure?.fully_diluted_shares;
            if (shares && shares > 0 && scoringValue !== null) {
                scoringValue = scoringValue / shares;
            }
        }
        
        // Handle missing values with conservative imputation (using peer-group stats)
        if (scoringValue === null) {
            const peerStatsKey = `${companyType}_${metricKey}`;
            const stats = context.metricStats.get(peerStatsKey) || context.metricStats.get(metricKey);

            if (stats && stats.values.length > 0) {
                if (metricConfig.higherIsBetter) {
                    scoringValue = stats.percentiles[2]; // 25th percentile
                } else {
                    scoringValue = stats.percentiles[6]; // 75th percentile
                }
            } else {
                scoringValue = 0; // Fallback
            }
        } else {
            dataPoints++;
        }
        
        // Calculate normalized value (0-100 scale)
        const normalizedValue = normalizeMetricValue(
            scoringValue,
            metricKey,
            metricConfig.higherIsBetter,
            companyType, // Pass company type for peer-relative scoring
            context
        );
        
        const weightedScore = (normalizedValue * weight) / 100;
        totalWeight += weight;
        weightedSum += weightedScore;
        
        if (metricKey === 'financials.free_cash_flow') {
            fcfComponent = normalizedValue;
        }
        
        const peerComparison = getPeerGroupComparison(
            company,
            metricKey,
            scoringValue,
            context
        );
        
        breakdown[metricKey] = {
            metricKey,
            metricLabel: metricConfig.label,
            rawValue: scoringValue, // Store the potentially normalized value
            normalizedValue,
            weight,
            weightedScore,
            contribution: weightedScore,
            percentileRank: getPercentileRank(scoringValue, context.metricStats.get(`${companyType}_${metricKey}`)),
            peerGroupComparison: peerComparison,
            wasImputed,
            imputationMethod: wasImputed ? 'conservative_percentile' : undefined
        };
    });
    
    const finalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    
    const dataCompleteness = Object.keys(weights).length > 0 
        ? dataPoints / Object.keys(weights).length 
        : 0;
    const confidenceScore = Math.min(dataCompleteness + 0.2, 1);
    
    const insights = generateInsights(company, breakdown, companyType);
    
    return {
        company,
        companyType,
        finalScore,
        fcfScore: fcfComponent,
        confidenceScore,
        dataCompleteness,
        breakdown,
        insights,
        peerGroupRank: {
            withinType: 0,
            totalInType: context.companyTypeGroups[companyType].length,
            withinMarketCap: 0,
            totalInMarketCap: 0
        }
    };
}

function getMetricValue(company: Company, metricKey: string): number | null {
    const value = getNestedValue(company, metricKey);
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) return value;
    return null;
}

function shouldNormalizeByShares(
    metricKey: string,
    companyType: CompanyStatus,
    normalizeByShares: Record<CompanyStatus, boolean>
): boolean {
    const normalizableMetrics = [
        'financials.free_cash_flow',
        'financials.cash_value',
        'financials.debt_value',
        'financials.enterprise_value_value',
        'financials.net_financial_assets'
    ];
    
    return normalizableMetrics.includes(metricKey) && 
           normalizeByShares[companyType];
}

function normalizeMetricValue(
    value: number,
    metricKey: string,
    higherIsBetter: boolean,
    companyType: CompanyStatus,
    context: CalculationContext
): number {
    // Prioritize peer-group stats, fallback to global if peer group is too small
    const peerStatsKey = `${companyType}_${metricKey}`;
    let stats = context.metricStats.get(peerStatsKey);
    if (!stats || stats.values.length < 5) {
        stats = context.metricStats.get(metricKey);
    }
    if (!stats || stats.values.length === 0) return 50; // Default to middle

    // SPECIAL LOGIC: Score FCF for non-producers based on burn rate efficiency
    if (metricKey === 'financials.free_cash_flow' && (companyType === 'explorer' || companyType === 'developer')) {
        if (value < 0) {
            // For negative FCF, less negative values are better.
            const mostNegativeBurn = stats.min;  // e.g., -50M
            const leastNegativeBurn = stats.max; // e.g., -5M
            
            // Handle cases where the whole peer group has positive FCF
            if (mostNegativeBurn >= 0) return 0;
            // Handle the case where the least negative burn is actually positive
            const effectiveMax = leastNegativeBurn > 0 ? 0 : leastNegativeBurn;

            if (mostNegativeBurn === effectiveMax) return 100; // Avoid division by zero
            
            // The closer the value is to the max (less negative), the higher the score
            const burnEfficiency = (value - mostNegativeBurn) / (effectiveMax - mostNegativeBurn);
            return Math.max(0, Math.min(100, burnEfficiency * 100));
        } else if (value >= 0) {
            // If an explorer/developer has positive FCF, that's a perfect score for this metric.
            return 100;
        }
    }

    // --- Standard Normalization Logic ---
    const percentile = getPercentileRank(value, stats);
    const adjustedPercentile = higherIsBetter ? percentile : (1 - percentile);
    
    const k = 10; // Steepness factor for sigmoid curve
    const midpoint = 0.5;
    const sigmoid = 1 / (1 + Math.exp(-k * (adjustedPercentile - midpoint)));
    
    return sigmoid * 100;
}

function getPercentileRank(value: number, stats: MetricStatistics | undefined): number {
    if (!stats || stats.values.length === 0) return 0.5;
    
    let left = 0;
    let right = stats.values.length - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (stats.values[mid] === value) {
            return (stats.values.length - 1) > 0 ? mid / (stats.values.length - 1) : 0.5;
        } else if (stats.values[mid] < value) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    if (right < 0) return 0;
    if (left >= stats.values.length) return 1;
    
    const lowerValue = stats.values[right];
    const upperValue = stats.values[left];
    
    if (upperValue === lowerValue) {
        return (stats.values.length - 1) > 0 ? left / (stats.values.length - 1) : 0.5;
    }
    
    const fraction = (value - lowerValue) / (upperValue - lowerValue);
    return (right + fraction) / (stats.values.length - 1);
}

function getPeerGroupComparison(
    company: Company,
    metricKey: string,
    value: number,
    context: CalculationContext
): FCFMetricBreakdown['peerGroupComparison'] {
    const peers = context.companyTypeGroups[company.status || 'other'];
    const peerValues: number[] = [];
    
    peers.forEach(peer => {
        if (peer.company_id !== company.company_id) {
            let peerValue = getMetricValue(peer, metricKey);
            if (shouldNormalizeByShares(metricKey, peer.status, context.normalizeByShares)) {
                 const shares = peer.capital_structure?.fully_diluted_shares;
                 if (shares && shares > 0 && peerValue !== null) {
                     peerValue /= shares;
                 }
            }
            if (peerValue !== null) {
                peerValues.push(peerValue);
            }
        }
    });
    
    if (peerValues.length === 0) {
        return { median: value, percentile: 0.5, totalInGroup: 1 };
    }
    
    const peerStats = calculateStatsForValues(peerValues);
    
    return {
        median: peerStats.median,
        percentile: getPercentileRank(value, peerStats),
        totalInGroup: peerValues.length + 1
    };
}

function generateInsights(
    company: Company,
    breakdown: Record<string, FCFMetricBreakdown>,
    companyType: CompanyStatus
): FCFInsight[] {
    const insights: FCFInsight[] = [];
    
    const fcfBreakdown = breakdown['financials.free_cash_flow'];
    if (fcfBreakdown) {
        if (fcfBreakdown.normalizedValue > 80) {
            insights.push({
                type: 'strength',
                title: 'Excellent Free Cash Flow',
                description: `Ranks highly for FCF generation or efficiency within its peer group (${companyType}).`,
                impactLevel: 'high',
                relatedMetrics: ['financials.free_cash_flow']
            });
        } else if (fcfBreakdown.normalizedValue < 20) {
            insights.push({
                type: 'weakness',
                title: 'Weak Free Cash Flow',
                description: `FCF generation or efficiency is in the bottom quintile of its peer group (${companyType}).`,
                impactLevel: 'high',
                relatedMetrics: ['financials.free_cash_flow']
            });
        }
    }
    
    if (companyType === 'producer') {
        const aiscBreakdown = breakdown['costs.aisc_last_year'];
        if (aiscBreakdown && aiscBreakdown.normalizedValue > 75) {
            insights.push({
                type: 'strength',
                title: 'Low-Cost Producer',
                description: 'AISC in the top quartile provides strong margins and downside protection.',
                impactLevel: 'high',
                relatedMetrics: ['costs.aisc_last_year']
            });
        }
    }
    
    if (companyType === 'explorer') {
        const sharesBreakdown = breakdown['capital_structure.fully_diluted_shares'];
        if (sharesBreakdown && sharesBreakdown.normalizedValue > 75) {
            insights.push({
                type: 'strength',
                title: 'Tight Share Structure',
                description: 'Low share count relative to peers reduces dilution risk and preserves upside.',
                impactLevel: 'medium',
                relatedMetrics: ['capital_structure.fully_diluted_shares']
            });
        }
    }
    
    const dataCompleteness = Object.values(breakdown).filter(b => !b.wasImputed).length / Object.values(breakdown).length;
    if (dataCompleteness < 0.7) {
        insights.push({
            type: 'risk',
            title: 'Limited Data Availability',
            description: 'A significant number of metrics required imputation, which may affect score reliability.',
            impactLevel: 'medium',
            relatedMetrics: Object.keys(breakdown).filter(k => breakdown[k].wasImputed)
        });
    }
    
    return insights;
}

function addPeerGroupRankings(results: FCFScoringResult[], context: CalculationContext): void {
    const typeGroups = new Map<CompanyStatus, FCFScoringResult[]>();
    results.forEach(result => {
        const type = result.companyType;
        if (!typeGroups.has(type)) typeGroups.set(type, []);
        typeGroups.get(type)!.push(result);
    });
    
    typeGroups.forEach((group) => {
        group.sort((a, b) => b.finalScore - a.finalScore);
        group.forEach((result, index) => {
            result.peerGroupRank.withinType = index + 1;
        });
    });
    
    const marketCapGroups = new Map<string, FCFScoringResult[]>();
    results.forEach(result => {
        const marketCap = result.company.financials?.market_cap || 0;
        let group: string;
        if (marketCap < 50) group = 'micro';
        else if (marketCap < 250) group = 'small';
        else if (marketCap < 1000) group = 'mid';
        else group = 'large';
        
        if (!marketCapGroups.has(group)) marketCapGroups.set(group, []);
        marketCapGroups.get(group)!.push(result);
    });
    
    marketCapGroups.forEach((group) => {
        group.sort((a, b) => b.finalScore - a.finalScore);
        group.forEach((result, index) => {
            result.peerGroupRank.withinMarketCap = index + 1;
            result.peerGroupRank.totalInMarketCap = group.length;
        });
    });
}

// --- Utility functions ---
function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    // Assumes values are pre-sorted
    return values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid];
}

function calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = calculateMean(squaredDiffs);
    return Math.sqrt(variance);
}

function calculatePercentiles(values: number[]): number[] {
    const percentiles: number[] = [];
    // Assumes values are pre-sorted
    
    for (let p = 0; p <= 100; p += 12.5) { // 0, 12.5, 25, 37.5, 50, ...
        const index = (p / 100) * (values.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper) {
            percentiles.push(values[lower]);
        } else {
            const weight = index % 1;
            percentiles.push(values[lower] * (1 - weight) + values[upper] * weight);
        }
    }
    
    return percentiles;
}