// src/lib/scoringUtilsExtended.ts
// Extensions to the existing scoringUtils.ts for advanced scoring features

import type { Company, CompanyStatus } from './types';
import type { MetricConfig } from './metric-types';
import type { CompanyScore, MetricDatasetStats } from './scoringUtils';
import { isValidNumber, getNestedValue } from './utils';
import { calculateDatasetMetricStats } from './scoringUtils';

// Company type metric priorities based on your data analysis
export const COMPANY_TYPE_METRIC_PRIORITIES: Record<CompanyStatus, string[]> = {
    Explorer: [
        'me_resources_total_aueq_moz',
        'me_measured_indicated_total_aueq_moz', 
        'f_cash_value',
        'f_net_financial_assets',
        'f_enterprise_value_value',
        'vm_ev_per_resource_oz_all',
        'f_market_cap_value'
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
        'f_enterprise_to_revenue',
        'f_net_income_value',
        'f_price_to_book'
    ],
    Other: [] // Will use balanced approach
};

// Data coverage thresholds
export const COVERAGE_THRESHOLDS = {
    EXCLUDE: 0.02,      // < 2% coverage - exclude metric
    REDUCE_WEIGHT: 0.10, // < 10% coverage - reduce weight by 50%
    NORMAL: 0.20,       // >= 20% coverage - use normally
    BOOST: 0.50         // >= 50% coverage - boost weight by 20%
};

export interface MetricQualityScore {
    metricKey: string;
    coverage: number;
    uniqueValues: number;
    coefficientOfVariation: number;
    recommendation: 'exclude' | 'reduce' | 'normal' | 'boost';
}

export interface PeerGroup {
    companyIds: number[];
    groupKey: string;
    factors: {
        status: CompanyStatus;
        sizeCategory: 'micro' | 'small' | 'mid' | 'large';
        primaryMetal: 'gold' | 'silver' | 'mixed';
    };
}

export interface EnhancedScoringResult extends CompanyScore {
    adjustedScore: number;
    confidence: number;
    peerGroupRank: number;
    peerGroupSize: number;
    dataCompleteness: number;
    scoringStrategy: string;
}

// Calculate metric quality for a given dataset
export function calculateMetricQuality(
    companies: Company[],
    metric: MetricConfig,
    globalRanges?: Record<string, [number, number]>
): MetricQualityScore {
    const values: number[] = [];
    
    companies.forEach(company => {
        const value = getNestedValue(company, metric.nested_path);
        if (isValidNumber(value)) {
            values.push(value as number);
        }
    });

    const coverage = values.length / companies.length;
    const uniqueValues = new Set(values).size;
    
    // Calculate coefficient of variation (CV)
    let coefficientOfVariation = 0;
    if (values.length > 1) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;
    }

    // Determine recommendation
    let recommendation: MetricQualityScore['recommendation'];
    if (coverage < COVERAGE_THRESHOLDS.EXCLUDE) {
        recommendation = 'exclude';
    } else if (coverage < COVERAGE_THRESHOLDS.REDUCE_WEIGHT) {
        recommendation = 'reduce';
    } else if (coverage >= COVERAGE_THRESHOLDS.BOOST && coefficientOfVariation > 0.5) {
        recommendation = 'boost'; // Good coverage and variability
    } else {
        recommendation = 'normal';
    }

    return {
        metricKey: metric.db_column,
        coverage,
        uniqueValues,
        coefficientOfVariation,
        recommendation
    };
}

// Define peer groups for better imputation and comparison
export function definePeerGroups(companies: Company[]): Map<string, PeerGroup> {
    const groups = new Map<string, PeerGroup>();

    companies.forEach(company => {
        const status = company.status || 'Other';
        
        // Determine size category based on market cap
        let sizeCategory: PeerGroup['factors']['sizeCategory'];
        const marketCap = company.f_market_cap_value || 0;
        if (marketCap < 10_000_000) sizeCategory = 'micro';
        else if (marketCap < 50_000_000) sizeCategory = 'small';
        else if (marketCap < 500_000_000) sizeCategory = 'mid';
        else sizeCategory = 'large';

        // Determine primary metal
        let primaryMetal: PeerGroup['factors']['primaryMetal'];
        const goldPercent = company.percent_gold || 0;
        const silverPercent = company.percent_silver || 0;
        if (goldPercent > 80) primaryMetal = 'gold';
        else if (silverPercent > 50) primaryMetal = 'silver';
        else primaryMetal = 'mixed';

        const factors = { status, sizeCategory, primaryMetal };
        const groupKey = `${status}-${sizeCategory}-${primaryMetal}`;

        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                companyIds: [],
                groupKey,
                factors
            });
        }

        groups.get(groupKey)!.companyIds.push(company.company_id);
    });

    return groups;
}

// Get peer companies for imputation
export function getPeerCompanies(
    targetCompany: Company,
    allCompanies: Company[],
    peerGroups: Map<string, PeerGroup>,
    relaxFactors: boolean = false
): Company[] {
    const targetStatus = targetCompany.status || 'Other';
    const targetMarketCap = targetCompany.f_market_cap_value || 0;
    const targetGoldPercent = targetCompany.percent_gold || 0;
    const targetSilverPercent = targetCompany.percent_silver || 0;

    // Determine target's factors
    let targetSize: PeerGroup['factors']['sizeCategory'];
    if (targetMarketCap < 10_000_000) targetSize = 'micro';
    else if (targetMarketCap < 50_000_000) targetSize = 'small';
    else if (targetMarketCap < 500_000_000) targetSize = 'mid';
    else targetSize = 'large';

    let targetMetal: PeerGroup['factors']['primaryMetal'];
    if (targetGoldPercent > 80) targetMetal = 'gold';
    else if (targetSilverPercent > 50) targetMetal = 'silver';
    else targetMetal = 'mixed';

    // Try exact match first
    const exactKey = `${targetStatus}-${targetSize}-${targetMetal}`;
    const exactGroup = peerGroups.get(exactKey);
    
    if (exactGroup && exactGroup.companyIds.length > 5) {
        return allCompanies.filter(c => 
            exactGroup.companyIds.includes(c.company_id) && 
            c.company_id !== targetCompany.company_id
        );
    }

    // If no exact match or too few peers, relax criteria
    if (relaxFactors) {
        // Just match by company type
        const peers = allCompanies.filter(c => 
            c.status === targetStatus && 
            c.company_id !== targetCompany.company_id
        );
        if (peers.length > 3) return peers;
        
        // If still not enough, return all companies of same general category
        const generalCategory = ['Producer', 'Developer'].includes(targetStatus) ? 'operating' : 'exploring';
        return allCompanies.filter(c => {
            const cCategory = ['Producer', 'Developer'].includes(c.status || '') ? 'operating' : 'exploring';
            return cCategory === generalCategory && c.company_id !== targetCompany.company_id;
        });
    }

    // Return companies with same status at minimum
    return allCompanies.filter(c => 
        c.status === targetStatus && 
        c.company_id !== targetCompany.company_id
    );
}

// Enhanced imputation using peer groups
export function imputeWithPeerGroup(
    company: Company,
    metric: MetricConfig,
    peerCompanies: Company[],
    method: 'conservative' | 'median' | 'optimistic' = 'conservative'
): number | null {
    const peerValues: number[] = [];
    
    peerCompanies.forEach(peer => {
        const value = getNestedValue(peer, metric.nested_path);
        if (isValidNumber(value)) {
            peerValues.push(value as number);
        }
    });

    if (peerValues.length === 0) return null;

    peerValues.sort((a, b) => a - b);

    switch (method) {
        case 'conservative':
            // Use 25th percentile if higher is better, 75th if lower is better
            const conservativeIndex = metric.higherIsBetter 
                ? Math.floor(peerValues.length * 0.25)
                : Math.floor(peerValues.length * 0.75);
            return peerValues[conservativeIndex] || peerValues[0];
            
        case 'median':
            const midIndex = Math.floor(peerValues.length / 2);
            return peerValues.length % 2 === 0
                ? (peerValues[midIndex - 1] + peerValues[midIndex]) / 2
                : peerValues[midIndex];
                
        case 'optimistic':
            // Use 75th percentile if higher is better, 25th if lower is better
            const optimisticIndex = metric.higherIsBetter
                ? Math.floor(peerValues.length * 0.75)
                : Math.floor(peerValues.length * 0.25);
            return peerValues[optimisticIndex] || peerValues[peerValues.length - 1];
    }
}

// Adjust weights based on company type and data quality
export function adjustWeightsForCompanyType(
    baseWeights: Record<string, number>,
    companyType: CompanyStatus,
    metricQualityScores: Map<string, MetricQualityScore>,
    metricConfigs: Record<string, MetricConfig>
): Record<string, number> {
    const adjustedWeights: Record<string, number> = {};
    const priorityMetrics = COMPANY_TYPE_METRIC_PRIORITIES[companyType] || [];
    
    // First pass: apply quality-based adjustments
    Object.entries(baseWeights).forEach(([dbColumn, weight]) => {
        if (weight <= 0) {
            adjustedWeights[dbColumn] = 0;
            return;
        }

        let adjustedWeight = weight;
        const quality = metricQualityScores.get(dbColumn);
        
        if (quality) {
            switch (quality.recommendation) {
                case 'exclude':
                    adjustedWeight = 0;
                    break;
                case 'reduce':
                    adjustedWeight *= 0.5;
                    break;
                case 'boost':
                    adjustedWeight *= 1.2;
                    break;
            }
        }
        
        // Boost priority metrics for this company type
        if (priorityMetrics.includes(dbColumn)) {
            adjustedWeight *= 1.5;
        }
        
        adjustedWeights[dbColumn] = adjustedWeight;
    });
    
    // Normalize to maintain total weight sum
    const totalOriginal = Object.values(baseWeights).reduce((sum, w) => sum + w, 0);
    const totalAdjusted = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
    
    if (totalAdjusted > 0) {
        const scaleFactor = totalOriginal / totalAdjusted;
        Object.keys(adjustedWeights).forEach(key => {
            adjustedWeights[key] *= scaleFactor;
        });
    }
    
    return adjustedWeights;
}

// Apply score spreading to reduce clustering
export function applyScoreSpreading(
    scores: CompanyScore[],
    spreadFactor: number = 0.1
): EnhancedScoringResult[] {
    // Group by similar scores (within 1 point)
    const scoreGroups = new Map<number, CompanyScore[]>();
    
    scores.forEach(score => {
        if (score.score === null) return;
        const roundedScore = Math.round(score.score);
        if (!scoreGroups.has(roundedScore)) {
            scoreGroups.set(roundedScore, []);
        }
        scoreGroups.get(roundedScore)!.push(score);
    });
    
    const enhancedResults: EnhancedScoringResult[] = [];
    
    scoreGroups.forEach((group, baseScore) => {
        if (group.length === 1) {
            // No clustering, keep original score
            const company = group[0];
            enhancedResults.push({
                ...company,
                adjustedScore: company.score || 0,
                confidence: calculateConfidence(company),
                peerGroupRank: 0,
                peerGroupSize: 0,
                dataCompleteness: calculateDataCompleteness(company),
                scoringStrategy: 'standard'
            });
        } else {
            // Apply micro-adjustments to spread clustered scores
            group.sort((a, b) => {
                // Sort by data completeness, then by company name for stability
                const compA = calculateDataCompleteness(a);
                const compB = calculateDataCompleteness(b);
                if (Math.abs(compA - compB) > 0.01) {
                    return compB - compA;
                }
                return a.companyName.localeCompare(b.companyName);
            });
            
            group.forEach((company, index) => {
                const microAdjustment = (index - (group.length - 1) / 2) * spreadFactor;
                const adjustedScore = baseScore + microAdjustment;
                
                enhancedResults.push({
                    ...company,
                    adjustedScore: Math.max(0, Math.min(1000, adjustedScore)),
                    confidence: calculateConfidence(company),
                    peerGroupRank: index + 1,
                    peerGroupSize: group.length,
                    dataCompleteness: calculateDataCompleteness(company),
                    scoringStrategy: 'spread'
                });
            });
        }
    });
    
    // Sort by adjusted score
    enhancedResults.sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    return enhancedResults;
}

// Calculate confidence score based on data quality and imputation
function calculateConfidence(score: CompanyScore): number {
    const components = Object.values(score.breakdown);
    if (components.length === 0) return 0;
    
    const includedComponents = components.filter(c => c.isIncludedInScore);
    if (includedComponents.length === 0) return 0;
    
    // Calculate based on:
    // 1. Percentage of metrics with actual data (not imputed)
    // 2. Percentage of metrics included in score
    // 3. Average weight of included metrics
    
    const nonImputedCount = includedComponents.filter(c => !c.imputedValue).length;
    const dataQuality = nonImputedCount / includedComponents.length;
    
    const inclusionRate = includedComponents.length / components.length;
    
    const avgWeight = includedComponents.reduce((sum, c) => sum + c.weight, 0) / includedComponents.length;
    const weightBalance = Math.min(avgWeight / 100, 1);
    
    return dataQuality * 0.5 + inclusionRate * 0.3 + weightBalance * 0.2;
}

// Calculate data completeness for tie-breaking
function calculateDataCompleteness(score: CompanyScore): number {
    const components = Object.values(score.breakdown);
    if (components.length === 0) return 0;
    
    const validDataCount = components.filter(c => 
        c.isAccessible && c.hasUsableValue && !c.imputedValue
    ).length;
    
    return validDataCount / components.length;
}

// Advanced normalization with non-linear transformations
export function applyNonLinearTransform(
    normalizedValue: number,
    method: 'sigmoid' | 'log' | 'sqrt' | 'none' = 'none',
    strength: number = 1.0
): number {
    if (method === 'none') return normalizedValue;
    
    // Ensure value is in [0, 1]
    const clampedValue = Math.max(0, Math.min(1, normalizedValue));
    
    switch (method) {
        case 'sigmoid':
            // S-curve to spread middle values
            const k = 10 * strength; // Steepness
            const sigmoid = 1 / (1 + Math.exp(-k * (clampedValue - 0.5)));
            return sigmoid;
            
        case 'log':
            // Logarithmic to spread lower values
            const logValue = Math.log(clampedValue + 0.1) / Math.log(1.1);
            return Math.max(0, Math.min(1, logValue));
            
        case 'sqrt':
            // Square root to spread higher values
            return Math.sqrt(clampedValue);
            
        default:
            return clampedValue;
    }
}