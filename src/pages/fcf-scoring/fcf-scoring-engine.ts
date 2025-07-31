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
    validCount: number;
    totalCount: number;
}

// Constants for robust metric handling
const EPSILON = 1e-10;
const MIN_PEER_GROUP_SIZE = 3;
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Enhanced statistical calculation with better null handling and outlier detection
 */
function calculateStatsForValues(values: number[], totalCount: number = values.length): MetricStatistics {
    if (values.length === 0) {
        return {
            values: [],
            mean: 0,
            median: 0,
            stdDev: 0,
            percentiles: Array(9).fill(0),
            min: 0,
            max: 0,
            validCount: 0,
            totalCount
        };
    }

    // Remove extreme outliers using IQR method
    const sortedValues = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedValues.length * 0.25);
    const q3Index = Math.floor(sortedValues.length * 0.75);
    const q1 = sortedValues[q1Index];
    const q3 = sortedValues[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // Keep outliers for financial data but flag them
    const cleanValues = sortedValues.filter(v => 
        v >= lowerBound && v <= upperBound || sortedValues.length < 10
    );

    const finalValues = cleanValues.length >= Math.max(3, sortedValues.length * 0.8) 
        ? cleanValues 
        : sortedValues;

    return {
        values: finalValues,
        mean: calculateMean(finalValues),
        median: calculateMedian(finalValues),
        stdDev: calculateStdDev(finalValues),
        percentiles: calculatePercentiles(finalValues),
        min: finalValues[0],
        max: finalValues[finalValues.length - 1],
        validCount: finalValues.length,
        totalCount
    };
}

export function calculateFCFScores(
    companies: Company[],
    weightConfigs: FCFScoringConfigs,
    normalizeByShares: Record<CompanyStatus, boolean>,
    accessibleMetrics: readonly MetricConfig[]
): FCFScoringResult[] {
    if (!companies || companies.length === 0) {
        console.warn('[FCF Scoring] No companies provided for scoring');
        return [];
    }

    console.log(`[FCF Scoring] Starting calculation for ${companies.length} companies`);
    
    // Debug: Log the data structure for royalty companies
    const royaltyCompanies = companies.filter(c => c.status === 'royalty');
    if (royaltyCompanies.length > 0) {
        console.log('[FCF Debug] Royalty companies data structure inspection:');
        royaltyCompanies.slice(0, 2).forEach(company => {
            console.log(`[FCF Debug] ${company.company_name} data paths:`, {
                mineral_estimates_keys: company.mineral_estimates ? Object.keys(company.mineral_estimates) : 'null',
                production_keys: company.production ? Object.keys(company.production) : 'null',
                costs_keys: company.costs ? Object.keys(company.costs) : 'null',
                financials_keys: company.financials ? Object.keys(company.financials) : 'null',
                // Sample some actual values
                sample_reserves: company.mineral_estimates,
                sample_production: company.production,
                sample_costs: company.costs
            });
        });
    }
    
    // Create calculation context with enhanced validation
    const context = createCalculationContext(companies, normalizeByShares);
    
    // Calculate comprehensive statistics
    calculateMetricStatistics(context, weightConfigs, normalizeByShares);
    
    // Score each company with detailed logging
    let results = companies.map((company, index) => {
        try {
            const result = scoreCompany(company, weightConfigs, normalizeByShares, context, accessibleMetrics);
            
            // Debug logging for FCF issues
            if (result.fcfScore === 0) {
                console.warn(`[FCF Scoring] Company ${company.company_name} has FCF score = 0`, {
                    companyId: company.company_id,
                    rawFCF: getMetricValue(company, 'financials.free_cash_flow'),
                    fcfBreakdown: result.breakdown['financials.free_cash_flow'],
                    companyType: result.companyType
                });
            }
            
            return result;
        } catch (error) {
            console.error(`[FCF Scoring] Error scoring company ${company.company_name}:`, error);
            // Return a safe fallback result
            return createFallbackResult(company, weightConfigs);
        }
    });

    // Apply category adjustments with better balancing
    const categoryAdjustment: Record<CompanyStatus, number> = {
        explorer: 12,   // Reduced from 15
        developer: 8,   // Reduced from 10  
        producer: 0,    // Baseline
        royalty: -3,    // Reduced penalty
        other: 5
    };

    results.forEach(result => {
        const adjustment = categoryAdjustment[result.companyType] || 0;
        result.finalScore = Math.max(0, Math.min(100, result.finalScore + adjustment));
    });
    
    // Sort and rank
    results.sort((a, b) => b.finalScore - a.finalScore);
    addPeerGroupRankings(results, context);
    
    console.log(`[FCF Scoring] Completed calculation. ${results.length} results generated`);
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
        micro: [],   // < $50M
        small: [],   // $50M - $250M
        mid: [],     // $250M - $1B
        large: []    // > $1B
    };
    
    companies.forEach(company => {
        // Enhanced status validation
        const status = (company.status && ['producer', 'developer', 'explorer', 'royalty'].includes(company.status))
            ? company.status 
            : 'other';
        companyTypeGroups[status].push(company);
        
        // Market cap grouping with null safety
        const marketCap = company.financials?.market_cap || 0;
        if (marketCap < 50) marketCapGroups.micro.push(company);
        else if (marketCap < 250) marketCapGroups.small.push(company);
        else if (marketCap < 1000) marketCapGroups.mid.push(company);
        else marketCapGroups.large.push(company);
    });
    
    // Log group sizes for debugging
    Object.entries(companyTypeGroups).forEach(([type, group]) => {
        if (group.length > 0) {
            console.log(`[FCF Context] ${type}: ${group.length} companies`);
        }
    });
    
    return {
        companies,
        companyTypeGroups,
        marketCapGroups,
        metricStats: new Map(),
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

    console.log(`[FCF Stats] Calculating statistics for ${allMetrics.size} metrics`);

    // Enhanced value extraction with detailed logging
    const getNormalizedValue = (company: Company, metricKey: string): number | null => {
        let value = getMetricValue(company, metricKey);
        
        if (value === null) return null;
        
        if (shouldNormalizeByShares(metricKey, company.status, normalizeByShares)) {
            const shares = company.capital_structure?.fully_diluted_shares;
            if (shares && shares > EPSILON) {
                const normalizedValue = value / shares;
                
                // Debug FCF normalization specifically
                if (metricKey === 'financials.free_cash_flow') {
                    console.log(`[FCF Debug] ${company.company_name}: FCF ${value} / ${shares} shares = ${normalizedValue}`);
                }
                
                return normalizedValue;
            } else if (shares === null || shares === undefined) {
                console.warn(`[FCF Stats] Missing shares for ${company.company_name}, using raw value for ${metricKey}`);
                return value; // Use raw value if shares missing
            }
        }
        
        return value;
    };
    
    // Calculate stats for each metric
    allMetrics.forEach(metricKey => {
        // Global stats
        const globalValues = context.companies
            .map(c => getNormalizedValue(c, metricKey))
            .filter((v): v is number => v !== null && isFinite(v));
        
        if (globalValues.length > 0) {
            context.metricStats.set(metricKey, calculateStatsForValues(globalValues, context.companies.length));
            
            // Debug FCF specifically
            if (metricKey === 'financials.free_cash_flow') {
                const stats = context.metricStats.get(metricKey)!;
                console.log(`[FCF Stats] Global FCF stats:`, {
                    validCount: stats.validCount,
                    totalCount: stats.totalCount,
                    min: stats.min,
                    max: stats.max,
                    median: stats.median
                });
            }
        }

        // Per-company-type stats
        Object.entries(context.companyTypeGroups).forEach(([type, companiesInType]) => {
            if (companiesInType.length >= MIN_PEER_GROUP_SIZE) {
                const typeValues = companiesInType
                    .map(c => getNormalizedValue(c, metricKey))
                    .filter((v): v is number => v !== null && isFinite(v));

                if (typeValues.length >= MIN_PEER_GROUP_SIZE) {
                    const typeStatsKey = `${type}_${metricKey}`;
                    context.metricStats.set(typeStatsKey, calculateStatsForValues(typeValues, companiesInType.length));
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
    const companyType = (company.status && ['producer', 'developer', 'explorer', 'royalty'].includes(company.status))
        ? company.status 
        : 'other';
    const weights = weightConfigs[companyType];
    const breakdown: Record<string, FCFMetricBreakdown> = {};
    
    let totalWeight = 0;
    let weightedSum = 0;
    let dataPoints = 0;
    let fcfComponent = 0;
    
    console.log(`[FCF Scoring] Scoring ${company.company_name} as ${companyType}`);
    
    // Process each metric with enhanced error handling
    Object.entries(weights).forEach(([metricKey, weight]) => {
        const metricConfig = getMetricByKey(metricKey);
        if (!metricConfig || !accessibleMetrics.includes(metricConfig)) {
            console.log(`[FCF Scoring] Skipping inaccessible metric: ${metricKey}`);
            return;
        }
        
        let rawValue = getMetricValue(company, metricKey);
        let wasImputed = rawValue === null;
        let originalRawValue = rawValue; // Store the original raw value
        
        // Apply share normalization BEFORE checking for imputation
        let scoringValue = rawValue;
        if (shouldNormalizeByShares(metricKey, companyType, normalizeByShares)) {
            const shares = company.capital_structure?.fully_diluted_shares;
            if (shares && shares > EPSILON && scoringValue !== null) {
                scoringValue = scoringValue / shares;
                
                // Specific FCF debug logging
                if (metricKey === 'financials.free_cash_flow') {
                    console.log(`[FCF Debug] ${company.company_name}: Normalized FCF ${rawValue} / ${shares} = ${scoringValue}`);
                }
            }
        }
        
        // Smart imputation strategy - only if we truly have no data
        if (scoringValue === null) {
            scoringValue = imputeMetricValue(metricKey, metricConfig, companyType, context);
            wasImputed = true;
            console.log(`[FCF Scoring] Imputed ${metricKey} for ${company.company_name}: ${scoringValue}`);
        } else {
            dataPoints++;
        }
        
        // Additional validation - check if the value makes sense
        if (scoringValue !== null && !isFinite(scoringValue)) {
            console.warn(`[FCF Scoring] Invalid computed value for ${metricKey}:`, scoringValue);
            scoringValue = imputeMetricValue(metricKey, metricConfig, companyType, context);
            wasImputed = true;
        }
        
        // Calculate normalized score
        const normalizedValue = normalizeMetricValue(
            scoringValue,
            metricKey,
            metricConfig.higherIsBetter,
            companyType,
            context
        );
        
        const contribution = (normalizedValue * weight) / 100;
        totalWeight += weight;
        weightedSum += contribution;
        
        // Capture FCF component specifically
        if (metricKey === 'financials.free_cash_flow') {
            fcfComponent = normalizedValue;
            console.log(`[FCF Debug] ${company.company_name}: FCF component = ${fcfComponent} (from normalized value: ${normalizedValue})`);
        }
        
        const peerComparison = getPeerGroupComparison(company, metricKey, scoringValue, context);
        
        breakdown[metricKey] = {
            metricKey,
            metricLabel: metricConfig.label,
            rawValue: scoringValue, // Store the final scoring value (potentially normalized)
            normalizedValue: Math.round(normalizedValue * 10) / 10, // Round to 1 decimal
            weight,
            weightedScore: Math.round(contribution * 100) / 100, // Round to 2 decimals
            contribution: Math.round(contribution * 10) / 10, // Round to 1 decimal
            percentileRank: getPercentileRank(scoringValue, context.metricStats.get(`${companyType}_${metricKey}`)),
            peerGroupComparison: peerComparison,
            wasImputed,
            imputationMethod: wasImputed ? 'smart_conservative' : undefined
        };
        
        // Debug royalty companies specifically
        if (company.status === 'royalty' && wasImputed) {
            console.log(`[FCF Debug] IMPUTED ${company.company_name} - ${metricKey}:`, {
                originalValue: originalRawValue,
                finalValue: scoringValue,
                wasNull: originalRawValue === null,
                metricPath: metricKey
            });
        }
    });
    
    const finalScore = totalWeight > EPSILON ? Math.round((weightedSum / totalWeight) * 1000) / 10 : 0;
    const dataCompleteness = Object.keys(weights).length > 0 
        ? dataPoints / Object.keys(weights).length 
        : 0;
    const confidenceScore = Math.min(dataCompleteness + 0.2, 1);
    
    const insights = generateInsights(company, breakdown, companyType, dataCompleteness);
    
    return {
        company,
        companyType,
        finalScore,
        fcfScore: Math.round(fcfComponent * 10) / 10,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        dataCompleteness: Math.round(dataCompleteness * 100) / 100,
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
    try {
        let value = getNestedValue(company, metricKey);
        
        // Debug logging for royalty companies specifically
        if (company.status === 'royalty') {
            console.log(`[FCF Debug] ${company.company_name} - ${metricKey}:`, {
                rawValue: value,
                type: typeof value,
                path: metricKey
            });
        }
        
        if (value === null || value === undefined) {
            // Try alternative paths for common metric variations
            const alternativeValue = tryAlternativeMetricPaths(company, metricKey);
            if (alternativeValue !== null) {
                console.log(`[FCF Debug] Found alternative value for ${metricKey}:`, alternativeValue);
                return alternativeValue;
            }
            return null;
        }
        
        // Handle different value types
        if (typeof value === 'number') {
            if (!isNaN(value) && isFinite(value)) {
                return value;
            }
            return null;
        }
        
        if (typeof value === 'string') {
            // Clean and parse string values
            const cleaned = value.replace(/[,\s$%]/g, '');
            const parsed = parseFloat(cleaned);
            if (!isNaN(parsed) && isFinite(parsed)) {
                return parsed;
            }
            return null;
        }
        
        // Handle boolean values (convert to 1/0)
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }
        
        return null;
    } catch (error) {
        console.warn(`[FCF Scoring] Error getting value for ${metricKey}:`, error);
        return null;
    }
}

/**
 * Try alternative paths for metrics that might be stored under different keys
 */
function tryAlternativeMetricPaths(company: Company, metricKey: string): number | null {
    const alternatives: Record<string, string[]> = {
        'mineral_estimates.reserves_precious_aueq_moz': [
            'mineral_estimates.reserves_total_aueq_moz',
            'mineral_estimates.reserves_gold_moz',
            'mineral_estimates.measured_indicated_total_aueq_moz',
            'mineral_estimates.mineable_total_aueq_moz'
        ],
        'production.current_production_precious_aueq_koz': [
            'production.current_production_total_aueq_koz',
            'production.current_production_gold_koz',
            'production.future_production_total_aueq_koz',
            'production.last_year_production_total_aueq_koz'
        ],
        'costs.aisc_last_year': [
            'costs.aisc_current',
            'costs.aisc_avg',
            'costs.total_cash_costs',
            'costs.operating_costs'
        ],
        'financials.net_financial_assets': [
            'financials.cash_value',
            'financials.net_cash',
            'financials.working_capital'
        ]
    };
    
    const alternativePaths = alternatives[metricKey];
    if (!alternativePaths) return null;
    
    for (const altPath of alternativePaths) {
        try {
            const altValue = getNestedValue(company, altPath);
            if (altValue !== null && altValue !== undefined) {
                if (typeof altValue === 'number' && !isNaN(altValue) && isFinite(altValue)) {
                    console.log(`[FCF Debug] Alternative path found: ${metricKey} -> ${altPath} = ${altValue}`);
                    return altValue;
                }
                if (typeof altValue === 'string') {
                    const parsed = parseFloat(altValue.replace(/[,\s$%]/g, ''));
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        console.log(`[FCF Debug] Alternative path found: ${metricKey} -> ${altPath} = ${parsed}`);
                        return parsed;
                    }
                }
            }
        } catch (error) {
            // Continue to next alternative
            continue;
        }
    }
    
    return null;
}

function shouldNormalizeByShares(
    metricKey: string,
    companyType: CompanyStatus | undefined,
    normalizeByShares: Record<CompanyStatus, boolean>
): boolean {
    const normalizableMetrics = [
        'financials.free_cash_flow',
        'financials.cash_value',
        'financials.debt_value',
        'financials.enterprise_value_value',
        'financials.net_financial_assets'
    ];
    
    const effectiveType = (companyType && ['producer', 'developer', 'explorer', 'royalty'].includes(companyType))
        ? companyType 
        : 'other';
    
    return normalizableMetrics.includes(metricKey) && normalizeByShares[effectiveType];
}

function imputeMetricValue(
    metricKey: string,
    metricConfig: MetricConfig,
    companyType: CompanyStatus,
    context: CalculationContext
): number {
    // Get the best available stats (peer group preferred, fallback to global)
    const peerStatsKey = `${companyType}_${metricKey}`;
    let stats = context.metricStats.get(peerStatsKey);
    if (!stats || stats.validCount < MIN_PEER_GROUP_SIZE) {
        stats = context.metricStats.get(metricKey);
    }

    if (!stats || stats.validCount === 0) {
        // Ultimate fallback based on metric type
        if (metricKey.includes('cash') || metricKey.includes('debt')) return 0;
        if (metricKey.includes('shares')) return 100_000_000; // 100M shares
        if (metricKey.includes('price')) return 1.0;
        if (metricKey.includes('moz') || metricKey.includes('koz')) return 0.1;
        return 0;
    }

    // Smart imputation strategy
    if (metricConfig.higherIsBetter) {
        // For "higher is better" metrics, use 20th percentile (conservative)
        return stats.percentiles[1] || stats.min;
    } else {
        // For "lower is better" metrics, use 80th percentile (conservative)
        return stats.percentiles[6] || stats.max;
    }
}

function normalizeMetricValue(
    value: number,
    metricKey: string,
    higherIsBetter: boolean,
    companyType: CompanyStatus,
    context: CalculationContext
): number {
    // Get best available statistics
    const peerStatsKey = `${companyType}_${metricKey}`;
    let stats = context.metricStats.get(peerStatsKey);
    if (!stats || stats.validCount < MIN_PEER_GROUP_SIZE) {
        stats = context.metricStats.get(metricKey);
    }
    if (!stats || stats.validCount === 0) return 50; // Neutral score

    // Special FCF handling for non-producers (burn rate efficiency)
    if (metricKey === 'financials.free_cash_flow' && 
        (companyType === 'explorer' || companyType === 'developer')) {
        
        return normalizeFCFForNonProducers(value, stats);
    }

    // Standard percentile-based normalization with sigmoid transformation
    const percentile = getPercentileRank(value, stats);
    const adjustedPercentile = higherIsBetter ? percentile : (1 - percentile);
    
    // Enhanced sigmoid for better score distribution
    const k = 8; // Steepness
    const midpoint = 0.5;
    const sigmoid = 1 / (1 + Math.exp(-k * (adjustedPercentile - midpoint)));
    
    return Math.max(0, Math.min(100, sigmoid * 100));
}

function normalizeFCFForNonProducers(value: number, stats: MetricStatistics): number {
    if (value >= 0) {
        // Positive FCF for explorer/developer is excellent
        return 100;
    }

    // For negative FCF, evaluate burn rate efficiency
    const mostNegative = Math.min(stats.min, 0);
    const leastNegative = Math.min(stats.max, 0);
    
    if (mostNegative === leastNegative) return 75; // All same, decent score
    
    // Score based on how close to zero (less burning)
    const efficiency = (value - mostNegative) / (leastNegative - mostNegative);
    return Math.max(0, Math.min(100, efficiency * 90)); // Max 90 for negative FCF
}

function getPercentileRank(value: number, stats: MetricStatistics | undefined): number {
    if (!stats || stats.validCount === 0) return 0.5;
    
    // Handle edge cases
    if (stats.validCount === 1) return 0.5;
    if (value <= stats.min) return 0;
    if (value >= stats.max) return 1;
    
    // Binary search for position
    let left = 0;
    let right = stats.values.length - 1;
    
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (Math.abs(stats.values[mid] - value) < EPSILON) {
            return mid / (stats.values.length - 1);
        } else if (stats.values[mid] < value) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    
    // Interpolate between adjacent values
    if (right < 0) return 0;
    if (left >= stats.values.length) return 1;
    
    const lowerValue = stats.values[right];
    const upperValue = stats.values[left];
    
    if (Math.abs(upperValue - lowerValue) < EPSILON) {
        return left / (stats.values.length - 1);
    }
    
    const fraction = (value - lowerValue) / (upperValue - lowerValue);
    return Math.max(0, Math.min(1, (right + fraction) / (stats.values.length - 1)));
}

function getPeerGroupComparison(
    company: Company,
    metricKey: string,
    value: number,
    context: CalculationContext
): FCFMetricBreakdown['peerGroupComparison'] {
    const companyType = company.status || 'other';
    const peers = context.companyTypeGroups[companyType];
    const peerValues: number[] = [];
    
    peers.forEach(peer => {
        if (peer.company_id !== company.company_id) {
            let peerValue = getMetricValue(peer, metricKey);
            if (shouldNormalizeByShares(metricKey, peer.status, context.normalizeByShares)) {
                const shares = peer.capital_structure?.fully_diluted_shares;
                if (shares && shares > EPSILON && peerValue !== null) {
                    peerValue /= shares;
                }
            }
            if (peerValue !== null && isFinite(peerValue)) {
                peerValues.push(peerValue);
            }
        }
    });
    
    if (peerValues.length === 0) {
        return { 
            median: value, 
            percentile: 0.5, 
            totalInGroup: 1 
        };
    }
    
    const peerStats = calculateStatsForValues(peerValues, peers.length);
    
    return {
        median: Math.round(peerStats.median * 100) / 100,
        percentile: Math.round(getPercentileRank(value, peerStats) * 100) / 100,
        totalInGroup: peerValues.length + 1
    };
}

function generateInsights(
    company: Company,
    breakdown: Record<string, FCFMetricBreakdown>,
    companyType: CompanyStatus,
    dataCompleteness: number
): FCFInsight[] {
    const insights: FCFInsight[] = [];
    
    // FCF-specific insights
    const fcfBreakdown = breakdown['financials.free_cash_flow'];
    if (fcfBreakdown) {
        if (fcfBreakdown.normalizedValue > 85) {
            insights.push({
                type: 'strength',
                title: 'Outstanding Free Cash Flow',
                description: `Top-tier FCF performance within ${companyType} peer group. Strong cash generation ability.`,
                impactLevel: 'high',
                relatedMetrics: ['financials.free_cash_flow']
            });
        } else if (fcfBreakdown.normalizedValue < 15) {
            insights.push({
                type: 'weakness',
                title: 'Poor Free Cash Flow Performance',
                description: `FCF in bottom quintile of ${companyType} peers. May indicate operational challenges.`,
                impactLevel: 'high',
                relatedMetrics: ['financials.free_cash_flow']
            });
        }
    }
    
    // Company-type specific insights
    if (companyType === 'producer') {
        const aiscBreakdown = breakdown['costs.aisc_last_year'];
        if (aiscBreakdown && aiscBreakdown.normalizedValue > 80) {
            insights.push({
                type: 'strength',
                title: 'Excellent Cost Control',
                description: 'AISC in top quintile provides strong margin protection and competitive advantage.',
                impactLevel: 'high',
                relatedMetrics: ['costs.aisc_last_year']
            });
        }
        
        const reserveLifeBreakdown = breakdown['production.reserve_life_years'];
        if (reserveLifeBreakdown && reserveLifeBreakdown.normalizedValue < 25) {
            insights.push({
                type: 'risk',
                title: 'Limited Reserve Life',
                description: 'Short remaining mine life may impact long-term cash flow sustainability.',
                impactLevel: 'medium',
                relatedMetrics: ['production.reserve_life_years']
            });
        }
    }
    
    if (companyType === 'explorer') {
        const cashBreakdown = breakdown['financials.cash_value'];
        const fcfBurn = fcfBreakdown?.rawValue || 0;
        
        if (cashBreakdown && fcfBurn < 0) {
            const runwayMonths = (cashBreakdown.rawValue / Math.abs(fcfBurn)) * 12;
            if (runwayMonths < 18) {
                insights.push({
                    type: 'risk',
                    title: 'Limited Cash Runway',
                    description: `Estimated ${Math.round(runwayMonths)} months of cash runway based on current burn rate.`,
                    impactLevel: 'high',
                    relatedMetrics: ['financials.cash_value', 'financials.free_cash_flow']
                });
            }
        }
    }
    
    // Data quality insights
    if (dataCompleteness < CONFIDENCE_THRESHOLD) {
        insights.push({
            type: 'risk',
            title: 'Limited Data Availability',
            description: `${Math.round((1 - dataCompleteness) * 100)}% of metrics required estimation. Score reliability may be reduced.`,
            impactLevel: 'medium',
            relatedMetrics: Object.keys(breakdown).filter(k => breakdown[k].wasImputed)
        });
    }
    
    return insights;
}

function addPeerGroupRankings(results: FCFScoringResult[], context: CalculationContext): void {
    // Type-based rankings
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
    
    // Market cap rankings
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

function createFallbackResult(company: Company, weightConfigs: FCFScoringConfigs): FCFScoringResult {
    const companyType = company.status || 'other';
    return {
        company,
        companyType,
        finalScore: 0,
        fcfScore: 0,
        confidenceScore: 0,
        dataCompleteness: 0,
        breakdown: {},
        insights: [{
            type: 'risk',
            title: 'Scoring Error',
            description: 'Unable to calculate reliable score due to data or calculation issues.',
            impactLevel: 'high',
            relatedMetrics: []
        }],
        peerGroupRank: {
            withinType: 0,
            totalInType: 0,
            withinMarketCap: 0,
            totalInMarketCap: 0
        }
    };
}

// Utility functions
function calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
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
    
    for (let p = 0; p <= 100; p += 12.5) { // 0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100
        const index = (p / 100) * (values.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        
        if (lower === upper || upper >= values.length) {
            percentiles.push(values[lower] || 0);
        } else {
            const weight = index % 1;
            percentiles.push(values[lower] * (1 - weight) + values[upper] * weight);
        }
    }
    
    return percentiles;
}