// src/lib/scoringUtils.ts

import type { Company, ColumnTier, CompanyStatus } from './types';
import type { MetricConfig } from './metric-types';
// Using your existing robust utilities
import { getNestedValue, isValidNumber, logDebug as utilsLogDebug } from './utils';

// --- Helper function to convert string to Title Case (remains the same) ---
function toTitleCase(str: string | null | undefined): string {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

// --- Normalization & Imputation Types (remains the same) ---
export type NormalizationMode = 'global_min_max' | 'dataset_min_max' | 'dataset_rank_percentile' | 'dataset_z_score';
export type ImputationMode = 'zero_worst' | 'dataset_mean' | 'dataset_median';

// --- Interfaces (remains the same, debugLogs and ScoreComponent details are important) ---
export interface CompanyScore {
    companyId: number;
    companyName: string;
    code: string;
    status?: CompanyStatus | null;
    headquarters?: string | null;
    description?: string | null; // Consider if needed in list, maybe only for detail
    score: number | null;
    breakdown: Record<string, ScoreComponent>;
    debugLogs: string[];
}

export interface ScoreComponent {
    metricLabel: string;
    rawValue: number | string | null; // Input value
    processedValue: number | null; // Value after initial processing (e.g. string "Infinity" to JS Infinity)
    imputedValue?: number | null; // Value after imputation (if any)
    valueUsedForNormalization: number | null; // The actual number passed to normalization
    normalizedValue?: number | null;
    weight: number;
    weightedScore: number | null;
    isIncludedInScore: boolean;
    isAccessible: boolean;
    hasValidRange: boolean;
    hasUsableValue: boolean; // Renamed from hasValidRawValue for clarity
    normalizationMethod?: string;
    imputationMethodApplied?: string;
    error?: string;
    log: string[];
}

interface MetricFullRanges { [db_column: string]: [number, number] | undefined; }
interface MetricDatasetStats {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    stdDev?: number;
    validValues: number[]; // Stores only finite numbers from the dataset for this metric
}

// Wrapper for util's logDebug to add a specific prefix for scoring utils
const logScoringDebug = (message: string, data?: any) => {
    utilsLogDebug(`[ScoringUtil] ${message}`, data);
};


/**
 * Pre-calculates statistics for each metric based on the current dataset.
 */
function calculateDatasetMetricStats(
    companies: Company[],
    metricConfig: MetricConfig,
    allCompanyDebugLogs: Map<number, string[]> // To log context-specific messages
): MetricDatasetStats {
    const stats: MetricDatasetStats = { validValues: [] };
    const metricKey = metricConfig.db_column;

    // Log only for the first company for brevity, if a company-specific log is needed
    const firstCompanyId = companies.length > 0 ? companies[0].company_id : undefined;

    for (const company of companies) {
        const rawValueFromPath = getNestedValue(company, metricConfig.nested_path);
        let numericValue: number | null = null;

        if (typeof rawValueFromPath === 'string') {
            const lowerVal = rawValueFromPath.toLowerCase();
            if (lowerVal === 'infinity') numericValue = Infinity;
            else if (lowerVal === '-infinity') numericValue = -Infinity;
            else if (lowerVal === 'nan') numericValue = NaN;
            else if (isValidNumber(parseFloat(lowerVal))) numericValue = parseFloat(lowerVal);
        } else if (typeof rawValueFromPath === 'number') {
            numericValue = rawValueFromPath;
        }

        if (isValidNumber(numericValue)) { // Your isValidNumber already checks for isFinite
            stats.validValues.push(numericValue);
        } else if (company.company_id === firstCompanyId && firstCompanyId !== undefined) {
            const companyLog = allCompanyDebugLogs.get(firstCompanyId);
            companyLog?.push(`[Stats][${metricKey}] Raw value '${rawValueFromPath}' (parsed as ${numericValue}) for company ${firstCompanyId} is not a valid finite number, excluded from dataset stats for ${metricKey}.`);
        }
    }

    if (stats.validValues.length > 0) {
        stats.validValues.sort((a, b) => a - b); // Essential for median and percentile
        stats.min = stats.validValues[0];
        stats.max = stats.validValues[stats.validValues.length - 1];
        stats.mean = stats.validValues.reduce((sum, val) => sum + val, 0) / stats.validValues.length;

        const mid = Math.floor(stats.validValues.length / 2);
        stats.median = stats.validValues.length % 2 !== 0
            ? stats.validValues[mid]
            : (stats.validValues[mid - 1] + stats.validValues[mid]) / 2;

        if (stats.validValues.length > 1) {
            const variance = stats.validValues.reduce((sumSqDiff, val) => sumSqDiff + Math.pow(val - (stats.mean as number), 2), 0) / (stats.validValues.length - 1);
            stats.stdDev = Math.sqrt(variance);
        } else {
            stats.stdDev = 0; // No variance if only one value or all values are the same
        }
        logScoringDebug(`Dataset stats for ${metricKey}: Min=${stats.min}, Max=${stats.max}, Mean=${stats.mean?.toFixed(2)}, Median=${stats.median}, StdDev=${stats.stdDev?.toFixed(2)}, Count=${stats.validValues.length}`);
    } else {
        logScoringDebug(`Dataset stats for ${metricKey}: No valid finite values found in dataset.`);
    }
    return stats;
}


export function calculateScores(
    companies: Company[],
    weights: Record<string, number>,
    globalFullRanges: MetricFullRanges,
    metricConfigsMap: Record<string, MetricConfig>,
    currentUserTier: ColumnTier,
    normalizationMode: NormalizationMode,
    imputationMode: ImputationMode
): CompanyScore[] {
    const results: CompanyScore[] = [];
    const tierLevels: Record<ColumnTier, number> = { free: 0, basic: 0, medium: 1, premium: 2 };
    const userTierLevel = tierLevels[currentUserTier] ?? -1;

    logScoringDebug(`Initiating scoring for ${companies.length} companies. Mode: ${normalizationMode}, Impute: ${imputationMode}, Tier: ${currentUserTier}`);

    if (!Array.isArray(companies) || companies.length === 0) {
        logScoringDebug("No companies provided. Returning empty scores.");
        return [];
    }

    const perCompanyAllLogs = new Map<number, string[]>();
    companies.forEach(c => perCompanyAllLogs.set(c.company_id, [`Scoring Log for ${c.company_name} (ID: ${c.company_id})`]));

    const datasetStatsCache = new Map<string, MetricDatasetStats>();
    if (normalizationMode.startsWith('dataset_') || imputationMode.startsWith('dataset_')) {
        logScoringDebug("Pre-calculating dataset statistics for relevant metrics...");
        for (const db_column in weights) {
            if ((weights[db_column] ?? 0) > 0) {
                const metricConfig = metricConfigsMap[db_column];
                if (metricConfig) {
                    datasetStatsCache.set(db_column, calculateDatasetMetricStats(companies, metricConfig, perCompanyAllLogs));
                }
            }
        }
    }

    for (const company of companies) {
        const companyId = company.company_id;
        const companyLog = perCompanyAllLogs.get(companyId) as string[]; // Should always exist

        if (!companyId) {
            companyLog.push("Error: Skipping company due to missing company_id.");
            continue;
        }

        let totalWeightedScoreSum = 0;
        let totalEffectiveWeight = 0;
        const scoreBreakdown: Record<string, ScoreComponent> = {};

        for (const [db_column, userWeight] of Object.entries(weights)) {
            if (!isValidNumber(userWeight) || userWeight <= 0) continue;

            const metricConfig = metricConfigsMap[db_column];
            const component: ScoreComponent = {
                metricLabel: metricConfig?.label || db_column,
                rawValue: null,
                processedValue: null,
                valueUsedForNormalization: null,
                weight: userWeight,
                weightedScore: null,
                isIncludedInScore: false,
                isAccessible: false,
                hasValidRange: false,
                hasUsableValue: false,
                log: [`--- Metric: ${metricConfig?.label || db_column} (Weight: ${userWeight}) ---`],
            };

            if (!metricConfig || !metricConfig.nested_path) {
                component.error = "Metric configuration or nested_path missing.";
                component.log.push(`Error: ${component.error}`);
                scoreBreakdown[db_column] = component;
                companyLog.push(`[${db_column}] ${component.error}`);
                continue;
            }

            const requiredTierLevel = tierLevels[metricConfig.tier] ?? 99;
            component.isAccessible = userTierLevel >= requiredTierLevel;

            if (!component.isAccessible) {
                component.error = `Access denied (Tier: ${metricConfig.tier} vs User: ${currentUserTier})`;
                component.log.push(component.error);
                scoreBreakdown[db_column] = component;
                companyLog.push(`[${db_column}] ${component.error}`);
                continue;
            }

            component.rawValue = getNestedValue(company, metricConfig.nested_path); // Uses your util
            component.log.push(`Raw value from path '${metricConfig.nested_path}': ${JSON.stringify(component.rawValue)}`);

            // Process raw value (handle strings like "Infinity", "NaN")
            if (typeof component.rawValue === 'string') {
                const strVal = component.rawValue.toLowerCase();
                if (strVal === 'infinity') component.processedValue = Infinity;
                else if (strVal === '-infinity') component.processedValue = -Infinity;
                else if (strVal === 'nan') component.processedValue = NaN;
                else { // Try to parse numbers that might be strings
                    const parsed = parseFloat(component.rawValue);
                    component.processedValue = !isNaN(parsed) ? parsed : null;
                }
            } else if (typeof component.rawValue === 'number') {
                component.processedValue = component.rawValue;
            } else {
                component.processedValue = null; // Not a string or number
            }
            component.log.push(`Processed value (standardized): ${component.processedValue}`);
            component.valueUsedForNormalization = component.processedValue;


            // Imputation for null or non-finite processed values
            if (!isValidNumber(component.valueUsedForNormalization)) { // isValidNumber checks for finite
                component.log.push(`Value '${component.valueUsedForNormalization}' is not valid/finite. Attempting imputation (Mode: ${imputationMode}).`);
                component.imputationMethodApplied = imputationMode;
                const stats = datasetStatsCache.get(db_column);
                let imputed = false;
                if (imputationMode === 'dataset_mean' && stats && isValidNumber(stats.mean)) {
                    component.valueUsedForNormalization = stats.mean;
                    imputed = true;
                } else if (imputationMode === 'dataset_median' && stats && isValidNumber(stats.median)) {
                    component.valueUsedForNormalization = stats.median;
                    imputed = true;
                }
                // For 'zero_worst', we handle it after normalization attempt fails or if value remains unusable.

                if (imputed) {
                    component.imputedValue = component.valueUsedForNormalization;
                    component.log.push(`Imputed with ${imputationMode}: ${component.valueUsedForNormalization?.toFixed(3)}`);
                } else if (imputationMode !== 'zero_worst') {
                     component.log.push(`Could not impute with ${imputationMode} (stats unavailable or invalid). Value remains: ${component.valueUsedForNormalization}`);
                }
            }

            // Check usability *after* potential imputation
            component.hasUsableValue = isValidNumber(component.valueUsedForNormalization);

            if (!component.hasUsableValue && imputationMode !== 'zero_worst') {
                component.error = `Value '${component.valueUsedForNormalization}' remains unusable after imputation attempts.`;
                component.log.push(`Error: ${component.error} Metric will not be scored.`);
                scoreBreakdown[db_column] = component;
                companyLog.push(`[${db_column}] ${component.error}`);
                continue;
            }


            // Normalization
            let normalizedScore: number | null = null;
            const valueToNorm = component.valueUsedForNormalization as number; // Cast, should be number if hasUsableValue or zero_worst path
            const higherIsBetter = metricConfig.higherIsBetter !== false;
            component.normalizationMethod = normalizationMode;
            component.log.push(`Normalizing value: ${valueToNorm?.toFixed(3)}. Mode: ${normalizationMode}. HigherIsBetter: ${higherIsBetter}`);

            try {
                if (component.hasUsableValue) { // Only attempt standard normalization if we have a usable number
                    switch (normalizationMode) {
                        case 'global_min_max':
                            const gRange = globalFullRanges[db_column];
                            if (gRange && isValidNumber(gRange[0]) && isValidNumber(gRange[1])) {
                                const [min, max] = gRange; component.hasValidRange = true;
                                normalizedScore = (max - min) > 1e-9 ? (valueToNorm - min) / (max - min) : (valueToNorm === min ? 0.5 : (valueToNorm > min ? 1 : 0));
                                component.log.push(`Global MinMax (Min:${min.toFixed(2)},Max:${max.toFixed(2)}): Score=${normalizedScore?.toFixed(4)}`);
                            } else component.error = "Global range invalid/missing.";
                            break;
                        case 'dataset_min_max':
                            const dStatsMinMax = datasetStatsCache.get(db_column);
                            if (dStatsMinMax && isValidNumber(dStatsMinMax.min) && isValidNumber(dStatsMinMax.max)) {
                                const { min, max } = dStatsMinMax; component.hasValidRange = true;
                                normalizedScore = (max - min) > 1e-9 ? (valueToNorm - min) / (max - min) : (valueToNorm === min ? 0.5 : (valueToNorm > min ? 1 : 0));
                                component.log.push(`Dataset MinMax (Min:${min.toFixed(2)},Max:${max.toFixed(2)}): Score=${normalizedScore?.toFixed(4)}`);
                            } else component.error = "Dataset range invalid/missing (empty dataset?).";
                            break;
                        case 'dataset_rank_percentile':
                            const dStatsRank = datasetStatsCache.get(db_column);
                            if (dStatsRank && dStatsRank.validValues.length > 0) {
                                component.hasValidRange = true;
                                const sorted = dStatsRank.validValues; // Already sorted
                                let rank = sorted.findIndex(v => v >= valueToNorm);
                                if (rank === -1) rank = valueToNorm > sorted[sorted.length - 1] ? sorted.length -1 : 0; // Handle edge cases
                                normalizedScore = sorted.length > 1 ? rank / (sorted.length - 1) : 0.5;
                                component.log.push(`Dataset Rank (Count:${sorted.length},Rank:${rank+1}): Score=${normalizedScore?.toFixed(4)}`);
                            } else component.error = "Dataset empty for ranking.";
                            break;
                        case 'dataset_z_score':
                            const dStatsZ = datasetStatsCache.get(db_column);
                            if (dStatsZ && isValidNumber(dStatsZ.mean) && isValidNumber(dStatsZ.stdDev)) {
                                component.hasValidRange = true;
                                const { mean, stdDev } = dStatsZ;
                                if (stdDev > 1e-9) {
                                    const z = (valueToNorm - mean) / stdDev;
                                    normalizedScore = (z + 3) / 6; // Scale -3SD to +3SD into 0-1
                                    component.log.push(`Dataset Z-Score (Mean:${mean.toFixed(2)},StdDev:${stdDev.toFixed(2)},Z:${z.toFixed(2)}): Score=${normalizedScore?.toFixed(4)}`);
                                } else normalizedScore = 0.5; // No variance
                            } else component.error = "Dataset mean/stdDev invalid for Z-score.";
                            break;
                    }
                }

                // Handle 'zero_worst' imputation if normalization failed or value was initially unusable
                if (!isValidNumber(normalizedScore) && imputationMode === 'zero_worst') {
                    normalizedScore = higherIsBetter ? 0 : 1; // Assign worst score
                    component.imputationMethodApplied = 'zero_worst (post-norm fallback)';
                    component.log.push(`Applied 'zero_worst' fallback. Normalized score: ${normalizedScore}`);
                }


                if (isValidNumber(normalizedScore)) {
                    normalizedScore = Math.max(0, Math.min(1, normalizedScore)); // Clamp
                    if (!higherIsBetter) {
                        normalizedScore = 1 - normalizedScore;
                        component.log.push(`Reversed for 'higherIsBetter=false': ${normalizedScore.toFixed(4)}`);
                    }
                    component.normalizedValue = normalizedScore;
                    component.weightedScore = normalizedScore * userWeight;
                    totalWeightedScoreSum += component.weightedScore;
                    totalEffectiveWeight += userWeight;
                    component.isIncludedInScore = true;
                    component.log.push(`Final Norm: ${normalizedScore.toFixed(4)}, Weighted: ${component.weightedScore.toFixed(3)}. Added to totals.`);
                } else {
                    if (!component.error) component.error = "Normalization resulted in unusable value.";
                    component.log.push(`Error: ${component.error} Metric not included.`);
                }

            } catch (e: any) {
                component.error = `Normalization critical error: ${e.message}`;
                component.log.push(`CRITICAL: ${component.error}`);
            }

            if(component.error) companyLog.push(`[${db_column}] Error: ${component.error}`);
            scoreBreakdown[db_column] = component;
        } // End metric loop

        const finalScoreValue = totalEffectiveWeight > 0 ? (totalWeightedScoreSum / totalEffectiveWeight) * 1000 : null;
        companyLog.push(`--- Company Summary ---`);
        companyLog.push(`Total Weighted Score Sum: ${totalWeightedScoreSum.toFixed(3)}, Total Effective Weight: ${totalEffectiveWeight.toFixed(3)}`);
        companyLog.push(`Final Calculated Score: ${finalScoreValue !== null ? finalScoreValue.toFixed(2) : 'N/A'}`);

        results.push({
            companyId,
            companyName: toTitleCase(company.company_name) || 'Unknown Company',
            code: company.tsx_code ?? 'N/A',
            status: company.status,
            headquarters: company.headquarters,
            description: company.description, // Keep for debug modal
            score: isValidNumber(finalScoreValue) ? Math.round(finalScoreValue) : null,
            breakdown: scoreBreakdown,
            debugLogs: companyLog,
        });
    } // End company loop

    results.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
    logScoringDebug(`Scoring complete. Processed ${results.length} companies.`);
    return results;
}