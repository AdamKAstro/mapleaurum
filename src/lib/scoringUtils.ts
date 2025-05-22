// src/lib/scoringUtils.ts
import type { Company, ColumnTier, CompanyStatus, MetricConfig, NormalizationMode, ImputationMode } from './types'; // Ensured MetricConfig, NormalizationMode, ImputationMode are imported
import { getNestedValue, isValidNumber, logDebug as utilsLogDebug } from './utils';

// Helper function to convert string to Title Case
function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

// Export Normalization & Imputation Types if they are defined here and used elsewhere,
// or ensure they are imported from './types' if defined there.
// Your provided snippet already exports them.
export type { NormalizationMode, ImputationMode };

// Interfaces
export interface CompanyScore {
  companyId: number;
  companyName: string;
  code: string | null;
  status?: CompanyStatus | null;
  headquarters?: string | null;
  description?: string | null;
  score: number | null;
  breakdown: Record<string, ScoreComponent>; // Keyed by metricConfig.db_column (in original calculateScores) or metricConfig.key (in calculateAxisSpecificScore)
  debugLogs: string[];
}

export interface ScoreComponent {
  metricLabel: string;
  rawValue: number | string | null | undefined;
  processedValue: number | null;
  imputedValue?: number | null;
  valueUsedForNormalization: number | null;
  normalizedValue?: number | null;
  weight: number;
  weightedScore: number | null;
  isIncludedInScore: boolean;
  isAccessible: boolean; // Specific to original calculateScores context
  hasValidRange: boolean;
  hasUsableValue: boolean;
  normalizationMethod?: string;
  imputationMethodApplied?: string;
  error?: string;
  log: string[];
}

// Local type alias for clarity within this module if needed, or use imported MetricFullRanges directly
type ScoringMetricFullRanges = Record<string, [number, number] | undefined>; // This matches MetricFullRanges from your original scoringUtils

export interface MetricDatasetStats { // Ensure this is exported if ScatterScoreProPage needs to type its state
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  validValues: number[];
}

const logScoringDebug = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    utilsLogDebug(`[ScoringUtil] ${message}`, data);
  }
};

export function calculateDatasetMetricStats( // EXPORT keyword added
  companies: Company[],
  metricConfig: MetricConfig,
  allCompanyDebugLogs?: Map<number, string[]>
): MetricDatasetStats {
  const stats: MetricDatasetStats = { validValues: [] };
  const metricKeyForLog = metricConfig.label || metricConfig.db_column;
  const firstCompanyId = companies.length > 0 ? companies[0]?.company_id : undefined;

  for (const company of companies) {
    if (!company) continue;
    const rawValueFromPath = getNestedValue(company, metricConfig.nested_path);
    let numericValue: number | null = null;

    if (typeof rawValueFromPath === 'string') {
      const lowerVal = rawValueFromPath.toLowerCase();
      if (lowerVal === 'infinity') numericValue = Infinity;
      else if (lowerVal === '-infinity') numericValue = -Infinity;
      else if (lowerVal === 'nan') numericValue = NaN;
      else {
        const parsed = parseFloat(lowerVal);
        if (isValidNumber(parsed)) numericValue = parsed;
      }
    } else if (typeof rawValueFromPath === 'number') {
      numericValue = rawValueFromPath;
    }

    if (isValidNumber(numericValue)) {
      stats.validValues.push(numericValue);
    } else {
        if (allCompanyDebugLogs && company.company_id === firstCompanyId && firstCompanyId !== undefined && (rawValueFromPath !== null && rawValueFromPath !== undefined)) {
             const companyLog = allCompanyDebugLogs.get(firstCompanyId);
             const logMsg = `[Stats][${metricKeyForLog}] Raw value '${rawValueFromPath}' (type: ${typeof rawValueFromPath}) for company ${firstCompanyId} is not valid finite; excluded from dataset stats for ${metricKeyForLog}.`;
             if (companyLog && !companyLog.some(l => l.includes(`excluded from dataset stats for ${metricKeyForLog}`))) {
                companyLog.push(logMsg);
             }
        }
    }
  }

  if (stats.validValues.length > 0) {
    stats.validValues.sort((a, b) => a - b);
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
      stats.stdDev = 0;
    }
    logScoringDebug(`Dataset stats for ${metricKeyForLog}: Min=${stats.min?.toFixed(2)}, Max=${stats.max?.toFixed(2)}, Mean=${stats.mean?.toFixed(2)}, Median=${stats.median?.toFixed(2)}, StdDev=${stats.stdDev?.toFixed(2)}, Count=${stats.validValues.length}`);
  } else {
     logScoringDebug(`Dataset stats for ${metricKeyForLog}: No valid finite values found in dataset.`);
  }
  return stats;
}

// --- NEW FUNCTION for ScatterScore Page ---
export interface AxisMetricScoreInput { // Export this interface if ScatterScoreProPage needs it
  key: string; // MetricConfig.key
  weight: number; // Percentage 0-100
  userHigherIsBetter: boolean; // User's override for MetricConfig.higherIsBetter for this axis
}

export function calculateAxisSpecificScore( // EXPORT keyword added
  company: Company,
  axisMetricsInputs: AxisMetricScoreInput[],
  allMetricDefinitions: MetricConfig[],
  normalizationMode: NormalizationMode,
  imputationMode: ImputationMode,
  globalFullRanges: ScoringMetricFullRanges, // Using local alias
  datasetStatsByMetricKey: Map<string, MetricDatasetStats>, // Keyed by MetricConfig.key
  parentCompanyLog?: string[]
): { score: number | null; breakdown: Record<string, Partial<ScoreComponent>> } {
  
  let totalWeightedScoreSum = 0;
  let totalEffectiveWeight = 0; // Sum of weights (should be 1 if weights are normalized 0-100%)
  const scoreBreakdown: Record<string, Partial<ScoreComponent>> = {}; // Keyed by metric key

  if (!company || typeof company.company_id !== 'number') {
    parentCompanyLog?.push("Error: Invalid company object provided to calculateAxisSpecificScore.");
    return { score: null, breakdown };
  }
  
  parentCompanyLog?.push(`--- Calculating Axis Score for Company ID: ${company.company_id} ---`);
  parentCompanyLog?.push(`Normalization: ${normalizationMode}, Imputation: ${imputationMode}`);

  for (const axisMetricInput of axisMetricsInputs) {
    const metricConfig = allMetricDefinitions.find(m => m.key === axisMetricInput.key);
    const componentLog: string[] = [];
    const metricKeyForLog = metricConfig?.label || axisMetricInput.key;

    componentLog.push(`-- Metric: ${metricKeyForLog} (Key: ${axisMetricInput.key}, Weight: ${axisMetricInput.weight}%, User HLB: ${axisMetricInput.userHigherIsBetter}) --`);

    const component: Partial<ScoreComponent> = {
      metricLabel: metricKeyForLog,
      weight: axisMetricInput.weight, // Store the percentage weight
      isIncludedInScore: false,
      log: componentLog,
    };

    if (!metricConfig) {
      component.error = "Metric configuration not found.";
      component.log.push(`Error: ${component.error}`);
      scoreBreakdown[axisMetricInput.key] = component;
      parentCompanyLog?.push(...component.log);
      continue;
    }

    component.rawValue = getNestedValue(company, metricConfig.nested_path);
    component.log.push(`Raw value from '${metricConfig.nested_path}': ${JSON.stringify(component.rawValue)}`);

    if (typeof component.rawValue === 'string') {
      const strVal = component.rawValue.toLowerCase();
      if (strVal === 'infinity') component.processedValue = Infinity;
      else if (strVal === '-infinity') component.processedValue = -Infinity;
      else if (strVal === 'nan') component.processedValue = NaN;
      else { const parsed = parseFloat(component.rawValue); component.processedValue = isValidNumber(parsed) ? parsed : null; }
    } else if (typeof component.rawValue === 'number') {
      component.processedValue = component.rawValue;
    } else { component.processedValue = null; }
    component.log.push(`Processed value: ${component.processedValue}`);
    component.valueUsedForNormalization = component.processedValue;

    if (!isValidNumber(component.valueUsedForNormalization)) {
      component.log.push(`Value unusable. Attempting imputation (Mode: ${imputationMode})`);
      component.imputationMethodApplied = imputationMode;
      const stats = datasetStatsByMetricKey.get(metricConfig.key);
      let imputed = false;
      if (imputationMode === 'dataset_mean' && stats && isValidNumber(stats.mean)) {
        component.valueUsedForNormalization = stats.mean; imputed = true;
      } else if (imputationMode === 'dataset_median' && stats && isValidNumber(stats.median)) {
        component.valueUsedForNormalization = stats.median; imputed = true;
      }
      if (imputed) {
        component.imputedValue = component.valueUsedForNormalization;
        component.log.push(`Imputed with ${imputationMode}: ${component.imputedValue?.toFixed(3)}`);
      } else {
        component.log.push(`Could not impute with ${imputationMode}.`);
      }
    }
    component.hasUsableValue = isValidNumber(component.valueUsedForNormalization);
    component.log.push(`Value for normalization: ${component.valueUsedForNormalization}, Usable: ${component.hasUsableValue}`);

    if (!component.hasUsableValue && imputationMode !== 'zero_worst') {
      component.error = "Value unusable after imputation attempts.";
      component.log.push(`Error: ${component.error}`);
      scoreBreakdown[axisMetricInput.key] = component;
      parentCompanyLog?.push(...component.log);
      continue;
    }

    let normalizedScore: number | null = null;
    const valueToNorm = component.valueUsedForNormalization;
    const useHigherIsBetterForThisMetric = axisMetricInput.userHigherIsBetter;
    component.normalizationMethod = normalizationMode;

    if (component.hasUsableValue) {
      const finiteValueToNorm = valueToNorm as number;
      switch (normalizationMode) {
        case 'global_min_max':
          const gRange = globalFullRanges[metricConfig.db_column];
          if (gRange && isValidNumber(gRange[0]) && isValidNumber(gRange[1])) {
            const [min, max] = gRange; component.hasValidRange = true;
            normalizedScore = (max - min) > 1e-9 ? (finiteValueToNorm - min) / (max - min) : 0.5;
          } else { component.error = `Global range for ${metricConfig.db_column} unavailable/invalid.`; component.log.push(`Error: ${component.error}`);}
          break;
        case 'dataset_min_max':
          const dStatsMM = datasetStatsByMetricKey.get(metricConfig.key); // Keyed by metricConfig.key
          if (dStatsMM && isValidNumber(dStatsMM.min) && isValidNumber(dStatsMM.max)) {
            const { min, max } = dStatsMM; component.hasValidRange = true;
            normalizedScore = (max! - min!) > 1e-9 ? (finiteValueToNorm - min!) / (max! - min!) : 0.5;
          } else { component.error = "Dataset Min-Max stats unavailable/invalid."; component.log.push(`Error: ${component.error}`);}
          break;
        case 'dataset_rank_percentile':
          const dStatsRank = datasetStatsByMetricKey.get(metricConfig.key);
          if (dStatsRank && dStatsRank.validValues.length > 0) {
            component.hasValidRange = true; 
            const sorted = dStatsRank.validValues;
            let rank = sorted.findIndex(v => v >= finiteValueToNorm);
            if (rank === -1) rank = finiteValueToNorm > sorted[sorted.length -1] ? sorted.length -1 : 0;
            normalizedScore = sorted.length > 1 ? rank / (sorted.length - 1) : 0.5;
          } else { component.error = "Dataset Rank/Percentile stats unavailable/invalid."; component.log.push(`Error: ${component.error}`);}
          break;
        case 'dataset_z_score':
          const dStatsZ = datasetStatsByMetricKey.get(metricConfig.key);
          if (dStatsZ && isValidNumber(dStatsZ.mean) && isValidNumber(dStatsZ.stdDev)) {
            component.hasValidRange = true; 
            const { mean, stdDev } = dStatsZ;
            normalizedScore = stdDev! > 1e-9 ? Math.min(1, Math.max(0, ((finiteValueToNorm - mean!) / stdDev! + 3) / 6)) : 0.5;
          } else { component.error = "Dataset Z-Score stats unavailable/invalid."; component.log.push(`Error: ${component.error}`);}
          break;
      }
      component.log.push(`Initial normalized score: ${normalizedScore?.toFixed(4)}`);
    } else if (imputationMode === 'zero_worst') {
        normalizedScore = useHigherIsBetterForThisMetric ? 0 : 1;
        component.imputationMethodApplied = 'zero_worst (applied as normalized score)';
        component.log.push(`Applied 'zero_worst' as normalized score: ${normalizedScore}`);
    }

    if (isValidNumber(normalizedScore)) {
      normalizedScore = Math.max(0, Math.min(1, normalizedScore as number));
      if (!useHigherIsBetterForThisMetric) { 
        normalizedScore = 1 - normalizedScore; 
        component.log.push(`Reversed for 'userHigherIsBetter=false'. New norm score: ${normalizedScore.toFixed(4)}`);
      }
      component.normalizedValue = normalizedScore;
      component.weightedScore = normalizedScore * (axisMetricInput.weight / 100.0); // Weight is 0-100
      totalWeightedScoreSum += component.weightedScore;
      totalEffectiveWeight += (axisMetricInput.weight / 100.0); // Sum of fractional weights
      component.isIncludedInScore = true;
      component.log.push(`Final Normalized: ${normalizedScore.toFixed(4)}, Weighted Component: ${component.weightedScore.toFixed(4)}.`);
    } else {
      if (!component.error) component.error = "Normalization failed or value unusable.";
      component.log.push(`Error: ${component.error}`);
    }
    scoreBreakdown[axisMetricInput.key] = component; // Key breakdown by metric.key
    parentCompanyLog?.push(...component.log);
  }
  
  // If totalEffectiveWeight is close to 1 (e.g., weights sum to 100%),
  // then totalWeightedScoreSum is already effectively the normalized score (0-1).
  // If weights don't sum to 100%, dividing by totalEffectiveWeight re-normalizes the sum.
  // The scaling by 1000 is arbitrary for display.
  const finalAxisScore = totalEffectiveWeight > 1e-6 ? (totalWeightedScoreSum / totalEffectiveWeight) * 1000 : null;
  
  parentCompanyLog?.push(`--- Axis Score Calculated: ${finalAxisScore !== null ? finalAxisScore.toFixed(2) : 'N/A'} (SumWeightedScores: ${totalWeightedScoreSum.toFixed(4)}, TotalEffectiveWeightFactor: ${totalEffectiveWeight.toFixed(2)}) ---`);
  
  return { score: isValidNumber(finalAxisScore) ? Math.round(finalAxisScore as number) : null, breakdown: scoreBreakdown };
}

// calculateScores function (user's existing, for main scoring page)
export function calculateScores(
  companies: Company[],
  weights: Record<string, number>, // Keyed by db_column
  globalFullRanges: ScoringMetricFullRanges, // Keyed by db_column
  metricConfigsMap: Record<string, MetricConfig>, // Keyed by db_column
  currentUserTier: ColumnTier,
  normalizationMode: NormalizationMode,
  imputationMode: ImputationMode
): CompanyScore[] {
  const results: CompanyScore[] = [];
  const tierLevels: Record<ColumnTier, number> = { free: 0, pro: 1, premium: 2 };
  const userTierLevel = tierLevels[currentUserTier] ?? tierLevels.free;

  if (process.env.NODE_ENV === 'development') {
    logScoringDebug(`Initiating ORIGINAL calculateScores for ${companies.length} companies. Mode: ${normalizationMode}, Impute: ${imputationMode}, Tier: ${currentUserTier}`);
  }

  if (!Array.isArray(companies) || companies.length === 0) {
    logScoringDebug("No companies provided to original calculateScores. Returning empty scores.");
    return [];
  }

  const perCompanyAllLogs = new Map<number, string[]>();
  companies.forEach(c => {
    if (c && typeof c.company_id === 'number') {
        perCompanyAllLogs.set(c.company_id, [`Scoring Log for ${c.company_name || 'Unnamed Company'} (ID: ${c.company_id})`]);
    }
  });

  const datasetStatsCache = new Map<string, MetricDatasetStats>();
  if (normalizationMode.startsWith('dataset_') || imputationMode.startsWith('dataset_')) {
    if (process.env.NODE_ENV === 'development') {
        logScoringDebug("Pre-calculating dataset statistics for relevant metrics (original calculateScores)...");
    }
    for (const db_column in weights) {
      if ((weights[db_column] ?? 0) > 0) {
        const metricConfig = metricConfigsMap[db_column];
        if (metricConfig) {
          // Pass perCompanyAllLogs to calculateDatasetMetricStats
          datasetStatsCache.set(db_column, calculateDatasetMetricStats(companies, metricConfig, perCompanyAllLogs));
        } else {
           if (process.env.NODE_ENV === 'development') {
               logScoringDebug(`Warning: No MetricConfig found for weighted db_column '${db_column}' in original calculateScores during dataset stats pre-calculation.`);
           }
        }
      }
    }
  }

  for (const company of companies) {
    if (!company || typeof company.company_id !== 'number') continue;
    const companyId = company.company_id;
    const companyLog = perCompanyAllLogs.get(companyId);
    if (!companyLog) {
        console.error(`[ScoringUtil] CRITICAL: Log array missing for companyId ${companyId} in original calculateScores.`);
        continue;
    }

    let totalWeightedScoreSum = 0;
    let totalEffectiveWeight = 0;
    const scoreBreakdown: Record<string, ScoreComponent> = {};

    for (const [db_column, userWeightPercentage] of Object.entries(weights)) { // userWeight is 0-100
        const userWeight = userWeightPercentage / 100.0; // Convert to 0-1 for calculation if original code expected that, or adjust component.weightedScore calculation
                                                      // Your original ScoreComponent had `weight: number` and `weightedScore = normalizedScore * userWeight;`
                                                      // If userWeight in the `weights` Record is 0-100, then it should be divided by 100.
                                                      // The original calculateScores seems to treat weights as direct multipliers on a 0-1 normalized score,
                                                      // then divides by sum of weights. So if weights are 0-100, they effectively are % contributions.

        if (!isValidNumber(userWeight) || userWeight <= 0) continue;

        const metricConfig = metricConfigsMap[db_column];
        const componentLogLocal: string[] = [];
        const metricKeyForLog = metricConfig?.label || db_column;
        
        componentLogLocal.push(`--- Metric: ${metricKeyForLog} (DB: ${db_column}, Weight: ${userWeightPercentage}) ---`);

        const component: ScoreComponent = { /* ... as in your original file, with log: componentLogLocal ... */ 
            metricLabel: metricKeyForLog,
            rawValue: undefined, processedValue: null, valueUsedForNormalization: null,
            weight: userWeightPercentage, // Store as 0-100
            weightedScore: null, isIncludedInScore: false,
            isAccessible: false, hasValidRange: false, hasUsableValue: false,
            log: componentLogLocal,
        };


        if (!metricConfig || !metricConfig.nested_path) {
            component.error = "Metric config or path missing.";
            component.log.push(`Error: ${component.error}`);
            scoreBreakdown[db_column] = component;
            companyLog.push(...component.log);
            continue;
        }

        const requiredTierLevel = tierLevels[metricConfig.tier] ?? 99;
        component.isAccessible = userTierLevel >= requiredTierLevel;

        if (!component.isAccessible) {
            component.error = `Access denied (Tier: ${metricConfig.tier} vs User: ${currentUserTier})`;
            component.log.push(component.error);
            scoreBreakdown[db_column] = component;
            companyLog.push(...component.log);
            continue;
        }

        component.rawValue = getNestedValue(company, metricConfig.nested_path);
        component.log.push(`Raw value from path '${metricConfig.nested_path}': ${JSON.stringify(component.rawValue)}`);

        if (typeof component.rawValue === 'string') {
            const strVal = component.rawValue.toLowerCase();
            if (strVal === 'infinity') component.processedValue = Infinity;
            else if (strVal === '-infinity') component.processedValue = -Infinity;
            else if (strVal === 'nan') component.processedValue = NaN;
            else { const parsed = parseFloat(component.rawValue); component.processedValue = isValidNumber(parsed) ? parsed : null; }
        } else if (typeof component.rawValue === 'number') {
            component.processedValue = component.rawValue;
        } else { component.processedValue = null; }
        component.log.push(`Processed value: ${component.processedValue}`);
        component.valueUsedForNormalization = component.processedValue;

        if (!isValidNumber(component.valueUsedForNormalization)) {
            component.log.push(`Value '${component.valueUsedForNormalization}' invalid. Impute Mode: ${imputationMode}`);
            component.imputationMethodApplied = imputationMode;
            const stats = datasetStatsCache.get(db_column);
            let imputed = false;
            if (imputationMode === 'dataset_mean' && stats && isValidNumber(stats.mean)) {
                component.valueUsedForNormalization = stats.mean; imputed = true;
            } else if (imputationMode === 'dataset_median' && stats && isValidNumber(stats.median)) {
                component.valueUsedForNormalization = stats.median; imputed = true;
            }
            if (imputed) component.log.push(`Imputed: ${component.valueUsedForNormalization?.toFixed(3)}`);
            else if (imputationMode !== 'zero_worst') component.log.push(`Could not impute with ${imputationMode}.`);
            component.imputedValue = imputed ? component.valueUsedForNormalization : null;
        }

        component.hasUsableValue = isValidNumber(component.valueUsedForNormalization);

        if (!component.hasUsableValue && imputationMode !== 'zero_worst') {
            component.error = `Value '${component.valueUsedForNormalization}' unusable.`;
            component.log.push(`Error: ${component.error} Metric not scored.`);
            scoreBreakdown[db_column] = component;
            companyLog.push(...component.log);
            continue;
        }

        let normalizedScore: number | null = null;
        const valueToNorm = component.valueUsedForNormalization; // This is now a number or null
        const higherIsBetter = metricConfig.higherIsBetter;
        component.normalizationMethod = normalizationMode;
        // Ensure valueToNorm is treated as number if hasUsableValue is true
        const logValueToNorm = component.hasUsableValue ? (valueToNorm as number).toFixed(3) : String(valueToNorm);
        component.log.push(`Normalizing: ${logValueToNorm}. Mode: ${normalizationMode}. HigherIsBetter: ${higherIsBetter}`);


        try {
            if (component.hasUsableValue) {
                const finiteValueToNorm = valueToNorm as number; // Safe due to hasUsableValue
                switch (normalizationMode) {
                    case 'global_min_max':
                        const gRange = globalFullRanges[db_column];
                        if (gRange && isValidNumber(gRange[0]) && isValidNumber(gRange[1])) {
                            const [min, max] = gRange; component.hasValidRange = true;
                            normalizedScore = (max - min) > 1e-9 ? (finiteValueToNorm - min) / (max - min) : (finiteValueToNorm === min ? 0.5 : (finiteValueToNorm > min ? 1 : 0));
                        } else { component.error = "Global range invalid."; component.log.push(`Normalization Note: ${component.error}`);}
                        break;
                    case 'dataset_min_max':
                        const dStatsMM = datasetStatsCache.get(db_column);
                        if (dStatsMM && isValidNumber(dStatsMM.min) && isValidNumber(dStatsMM.max)) {
                            const { min, max } = dStatsMM; component.hasValidRange = true;
                            normalizedScore = (max! - min!) > 1e-9 ? (finiteValueToNorm - min!) / (max! - min!) : (finiteValueToNorm === min! ? 0.5 : (finiteValueToNorm > min! ? 1 : 0));
                        } else { component.error = "Dataset range invalid."; component.log.push(`Normalization Note: ${component.error}`);}
                        break;
                    case 'dataset_rank_percentile':
                        const dStatsRank = datasetStatsCache.get(db_column);
                        if (dStatsRank && dStatsRank.validValues.length > 0) {
                            component.hasValidRange = true; const sorted = dStatsRank.validValues;
                            let rank = sorted.findIndex(v => v >= finiteValueToNorm);
                            if (rank === -1) rank = finiteValueToNorm > sorted[sorted.length -1] ? sorted.length -1 : 0;
                            normalizedScore = sorted.length > 1 ? rank / (sorted.length - 1) : 0.5;
                        } else { component.error = "Dataset empty for ranking."; component.log.push(`Normalization Note: ${component.error}`);}
                        break;
                    case 'dataset_z_score':
                        const dStatsZ = datasetStatsCache.get(db_column);
                        if (dStatsZ && isValidNumber(dStatsZ.mean) && isValidNumber(dStatsZ.stdDev)) {
                            component.hasValidRange = true; const { mean, stdDev } = dStatsZ;
                            if (stdDev! > 1e-9) { const z = (finiteValueToNorm - mean!) / stdDev!; normalizedScore = (z + 3) / 6; } // Scale to ~0-1
                            else normalizedScore = 0.5; // All values are the same
                        } else { component.error = "Dataset mean/stdDev invalid for Z-score."; component.log.push(`Normalization Note: ${component.error}`);}
                        break;
                }
                 component.log.push(`Initial norm score: ${normalizedScore?.toFixed(4)}`);
            }

            if (!isValidNumber(normalizedScore) && imputationMode === 'zero_worst') {
                normalizedScore = higherIsBetter ? 0 : 1;
                component.imputationMethodApplied = 'zero_worst (post-norm fallback)';
                component.log.push(`Applied 'zero_worst' fallback. Norm score: ${normalizedScore}`);
            }

            if (isValidNumber(normalizedScore)) {
                normalizedScore = Math.max(0, Math.min(1, normalizedScore as number));
                if (!higherIsBetter) { normalizedScore = 1 - normalizedScore; component.log.push(`Reversed for 'lower is better': ${normalizedScore.toFixed(4)}`);}
                component.normalizedValue = normalizedScore;
                component.weightedScore = normalizedScore * userWeightPercentage; // Use original 0-100 weight for this calculation
                totalWeightedScoreSum += component.weightedScore;
                totalEffectiveWeight += userWeightPercentage; // Sum of original 0-100 weights
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
        if(component.error && !component.isIncludedInScore) {
             const companySpecificLog = perCompanyAllLogs.get(companyId);
             companySpecificLog?.push(`[${db_column}] Metric excluded for company ${companyId}. Error: ${component.error}`);
        }
        scoreBreakdown[db_column] = component;
        const companySpecificLogForComponent = perCompanyAllLogs.get(companyId);
        companySpecificLogForComponent?.push(...component.log);
    }

    const finalScoreValue = totalEffectiveWeight > 0 ? (totalWeightedScoreSum / totalEffectiveWeight) * 1000 : null;
    const companySpecificLogFinal = perCompanyAllLogs.get(companyId);
    companySpecificLogFinal?.push(`--- Company Score Summary ---`);
    companySpecificLogFinal?.push(`Total Weighted Score Sum (based on 0-100 weights): ${totalWeightedScoreSum.toFixed(3)}, Total Effective Weight (sum of 0-100 weights): ${totalEffectiveWeight.toFixed(0)}`);
    companySpecificLogFinal?.push(`Final Calculated Score: ${finalScoreValue !== null ? finalScoreValue.toFixed(2) : 'N/A'}`);

    results.push({
        companyId,
        companyName: toTitleCase(company.company_name) || 'Unknown Company',
        code: company.tsx_code ?? 'N/A',
        status: company.status, headquarters: company.headquarters, description: company.description,
        score: isValidNumber(finalScoreValue) ? Math.round(finalScoreValue as number) : null,
        breakdown: scoreBreakdown, debugLogs: companySpecificLogFinal || [],
    });
  }

  results.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  logScoringDebug(`Original calculateScores complete. Processed ${results.length} companies.`);
  return results;
}