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

export function calculateFCFScores(
    companies: Company[],
    weightConfigs: FCFScoringConfigs,
    normalizeByShares: Record<CompanyStatus, boolean>,
    accessibleMetrics: readonly MetricConfig[]
): FCFScoringResult[] {
    if (!companies || companies.length === 0) return [];

    // Create calculation context
    const context = createCalculationContext(companies);
    
    // Calculate statistics for all metrics
    calculateMetricStatistics(context, weightConfigs, normalizeByShares);
    
    // Score each company
    const results = companies.map(company => 
        scoreCompany(company, weightConfigs, normalizeByShares, context, accessibleMetrics)
    );
    
    // Sort by final score
    results.sort((a, b) => b.finalScore - a.finalScore);
    
    // Add peer group rankings
    addPeerGroupRankings(results, context);
    
    return results;
}

function createCalculationContext(companies: Company[]): CalculationContext {
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
        metricStats: new Map()
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
    
    // Calculate stats for each metric
    allMetrics.forEach(metricKey => {
        const values: number[] = [];
        
        context.companies.forEach(company => {
            let value = getMetricValue(company, metricKey);
            
            // Apply share normalization if needed
            if (shouldNormalizeByShares(metricKey, company.status, normalizeByShares)) {
                const shares = company.capital_structure?.fully_diluted_shares;
                if (shares && shares > 0 && value !== null) {
                    value = value / shares;
                }
            }
            
            if (value !== null && !isNaN(value) && isFinite(value)) {
                values.push(value);
            }
        });
        
        if (values.length > 0) {
            values.sort((a, b) => a - b);
            const stats: MetricStatistics = {
                values,
                mean: calculateMean(values),
                median: calculateMedian(values),
                stdDev: calculateStdDev(values),
                percentiles: calculatePercentiles(values),
                min: values[0],
                max: values[values.length - 1]
            };
            context.metricStats.set(metricKey, stats);
        }
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
        
        // Apply share normalization
        if (shouldNormalizeByShares(metricKey, companyType, normalizeByShares)) {
            const shares = company.capital_structure?.fully_diluted_shares;
            if (shares && shares > 0 && rawValue !== null) {
                rawValue = rawValue / shares;
            }
        }
        
        // Handle missing values with conservative imputation
        if (rawValue === null) {
            const stats = context.metricStats.get(metricKey);
            if (stats && stats.values.length > 0) {
                // Conservative imputation: use 25th percentile for positive metrics, 75th for negative
                if (metricConfig.higherIsBetter) {
                    rawValue = stats.percentiles[2]; // 25th percentile
                } else {
                    rawValue = stats.percentiles[6]; // 75th percentile
                }
            } else {
                rawValue = 0; // Fallback
            }
        } else {
            dataPoints++;
        }
        
        // Calculate normalized value (0-100 scale)
        const normalizedValue = normalizeMetricValue(
            rawValue,
            metricKey,
            metricConfig.higherIsBetter,
            context
        );
        
        // Calculate weighted score
        const weightedScore = (normalizedValue * weight) / 100;
        totalWeight += weight;
        weightedSum += weightedScore;
        
        // Track FCF component separately
        if (metricKey === 'financials.free_cash_flow') {
            fcfComponent = normalizedValue;
        }
        
        // Get peer group comparison
        const peerComparison = getPeerGroupComparison(
            company,
            metricKey,
            rawValue,
            context
        );
        
        breakdown[metricKey] = {
            metricKey,
            metricLabel: metricConfig.label,
            rawValue,
            normalizedValue,
            weight,
            weightedScore,
            contribution: weightedScore,
            percentileRank: getPercentileRank(rawValue, context.metricStats.get(metricKey)),
            peerGroupComparison: peerComparison,
            wasImputed,
            imputationMethod: wasImputed ? 'conservative_percentile' : undefined
        };
    });
    
    // Calculate final score
    const finalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
    
    // Calculate confidence based on data completeness
    const dataCompleteness = Object.keys(weights).length > 0 
        ? dataPoints / Object.keys(weights).length 
        : 0;
    const confidenceScore = Math.min(dataCompleteness + 0.2, 1); // Bonus for having data
    
    // Generate insights
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
            withinType: 0, // Will be set later
            totalInType: context.companyTypeGroups[companyType].length,
            withinMarketCap: 0, // Will be set later
            totalInMarketCap: 0 // Will be set later
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
    // Only normalize absolute financial metrics
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
    context: CalculationContext
): number {
    const stats = context.metricStats.get(metricKey);
    if (!stats || stats.values.length === 0) return 50; // Default to middle
    
    // Get percentile rank (0-1)
    const percentile = getPercentileRank(value, stats);
    
    // Invert if lower is better
    const adjustedPercentile = higherIsBetter ? percentile : (1 - percentile);
    
    // Apply sigmoid transformation for better score distribution
    const k = 10; // Steepness factor
    const midpoint = 0.5;
    const sigmoid = 1 / (1 + Math.exp(-k * (adjustedPercentile - midpoint)));
    
    return sigmoid * 100;
}

function getPercentileRank(value: number, stats: MetricStatistics | undefined): number {
    if (!stats || stats.values.length === 0) return 0.5;
    
    // Binary search for position
    let left = 0;
    let right = stats.values.length - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (stats.values[mid] === value) {
            return mid / (stats.values.length - 1);
        } else if (stats.values[mid] < value) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    // Interpolate between positions
    if (right < 0) return 0;
    if (left >= stats.values.length) return 1;
    
    const lowerValue = stats.values[right];
    const upperValue = stats.values[left];
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
            const peerValue = getMetricValue(peer, metricKey);
            if (peerValue !== null) {
                peerValues.push(peerValue);
            }
        }
    });
    
    if (peerValues.length === 0) {
        return { median: value, percentile: 0.5, totalInGroup: 1 };
    }
    
    peerValues.sort((a, b) => a - b);
    const median = calculateMedian(peerValues);
    const percentile = getPercentileRank(value, {
        values: peerValues,
        mean: 0, median: 0, stdDev: 0, percentiles: [], min: 0, max: 0
    });
    
    return {
        median,
        percentile,
        totalInGroup: peerValues.length + 1
    };
}

function generateInsights(
    company: Company,
    breakdown: Record<string, FCFMetricBreakdown>,
    companyType: CompanyStatus
): FCFInsight[] {
    const insights: FCFInsight[] = [];
    
    // Check FCF performance
    const fcfBreakdown = breakdown['financials.free_cash_flow'];
    if (fcfBreakdown) {
        if (fcfBreakdown.normalizedValue > 75) {
            insights.push({
                type: 'strength',
                title: 'Strong Free Cash Flow Generation',
                description: 'Company ranks in the top quartile for FCF generation among peers.',
                impactLevel: 'high',
                relatedMetrics: ['financials.free_cash_flow']
            });
        } else if (fcfBreakdown.normalizedValue < 25) {
            insights.push({
                type: 'weakness',
                title: 'Weak Free Cash Flow',
                description: 'FCF generation is in the bottom quartile, indicating potential financial stress.',
                impactLevel: 'high',
                relatedMetrics: ['financials.free_cash_flow']
            });
        }
    }
    
    // Check cost efficiency for producers
    if (companyType === 'producer') {
        const aiscBreakdown = breakdown['costs.aisc_last_year'];
        if (aiscBreakdown && aiscBreakdown.normalizedValue > 70) {
            insights.push({
                type: 'strength',
                title: 'Low-Cost Producer',
                description: 'AISC in the top 30% provides strong margins and downside protection.',
                impactLevel: 'high',
                relatedMetrics: ['costs.aisc_last_year']
            });
        }
    }
    
    // Check dilution risk for explorers
    if (companyType === 'explorer') {
        const sharesBreakdown = breakdown['capital_structure.fully_diluted_shares'];
        if (sharesBreakdown && sharesBreakdown.normalizedValue > 70) {
            insights.push({
                type: 'strength',
                title: 'Tight Share Structure',
                description: 'Low share count reduces dilution risk and preserves upside potential.',
                impactLevel: 'medium',
                relatedMetrics: ['capital_structure.fully_diluted_shares']
            });
        }
    }
    
    // Data quality insight
    const dataCompleteness = Object.values(breakdown).filter(b => !b.wasImputed).length / Object.values(breakdown).length;
    if (dataCompleteness < 0.7) {
        insights.push({
            type: 'risk',
            title: 'Limited Data Availability',
            description: 'Over 30% of metrics required imputation, which may affect score reliability.',
            impactLevel: 'medium',
            relatedMetrics: Object.keys(breakdown).filter(k => breakdown[k].wasImputed)
        });
    }
    
    return insights;
}

function addPeerGroupRankings(results: FCFScoringResult[], context: CalculationContext): void {
    // Rank within company type
    const typeGroups = new Map<CompanyStatus, FCFScoringResult[]>();
    results.forEach(result => {
        const type = result.companyType;
        if (!typeGroups.has(type)) typeGroups.set(type, []);
        typeGroups.get(type)!.push(result);
    });
    
    typeGroups.forEach((group, type) => {
        group.sort((a, b) => b.finalScore - a.finalScore);
        group.forEach((result, index) => {
            result.peerGroupRank.withinType = index + 1;
        });
    });
    
    // Rank within market cap groups
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

// Utility functions
function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

function calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = calculateMean(squaredDiffs);
    return Math.sqrt(variance);
}

function calculatePercentiles(values: number[]): number[] {
    const percentiles: number[] = [];
    const sorted = [...values].sort((a, b) => a - b);
    
    for (let p = 0; p <= 100; p += 12.5) {
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;
        
        percentiles.push(
            lower === upper
                ? sorted[lower]
                : sorted[lower] * (1 - weight) + sorted[upper] * weight
        );
    }
    
    return percentiles;
}