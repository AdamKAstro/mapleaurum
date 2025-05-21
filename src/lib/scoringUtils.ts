// src/lib/scoringUtils.ts
import type { Company, ColumnTier, CompanyStatus, MetricConfig } from './types'; // Ensured MetricConfig is imported
import { getNestedValue, isValidNumber, logDebug as utilsLogDebug } from './utils'; // Assuming logDebug is EXPORTED from ./utils

// Helper function to convert string to Title Case (already present)
function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

// Normalization & Imputation Types (already present)
export type NormalizationMode = 'global_min_max' | 'dataset_min_max' | 'dataset_rank_percentile' | 'dataset_z_score';
export type ImputationMode = 'zero_worst' | 'dataset_mean' | 'dataset_median';

// Interfaces (already present)
export interface CompanyScore {
  companyId: number;
  companyName: string;
  code: string | null; // Changed from string to string | null to match Company.tsx_code
  status?: CompanyStatus | null;
  headquarters?: string | null;
  description?: string | null;
  score: number | null;
  breakdown: Record<string, ScoreComponent>; // Keyed by metricConfig.db_column
  debugLogs: string[];
}

export interface ScoreComponent {
  metricLabel: string;
  rawValue: number | string | null | undefined; // Made undefined possible as getNestedValue can return it
  processedValue: number | null;
  imputedValue?: number | null;
  valueUsedForNormalization: number | null;
  normalizedValue?: number | null;
  weight: number;
  weightedScore: number | null;
  isIncludedInScore: boolean;
  isAccessible: boolean;
  hasValidRange: boolean; // Indicates if the range (global or dataset) used for normalization was valid
  hasUsableValue: boolean; // Indicates if a finite numeric value was available/imputed for normalization
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
  validValues: number[]; // Storing all valid numeric values for ranking/percentile
}

const logScoringDebug = (message: string, data?: any) => {
  utilsLogDebug(`[ScoringUtil] ${message}`, data);
};

// calculateDatasetMetricStats function (remains as provided by user, verified for robustness)
// Minor refinement: Added fieldNameForError to logDebug in case of parsing issues.
function calculateDatasetMetricStats(
  companies: Company[],
  metricConfig: MetricConfig,
  allCompanyDebugLogs: Map<number, string[]> // For logging specific company issues during stats calculation
): MetricDatasetStats {
  const stats: MetricDatasetStats = { validValues: [] };
  const metricKeyForLog = metricConfig.label || metricConfig.db_column; // Use label for logs if available
  const firstCompanyId = companies.length > 0 ? companies[0].company_id : undefined;

  for (const company of companies) {
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
        // Log only once per metric for the first company if an issue occurs, to avoid flooding logs
        if (company.company_id === firstCompanyId && firstCompanyId !== undefined && (rawValueFromPath !== null && rawValueFromPath !== undefined)) {
             const companyLog = allCompanyDebugLogs.get(firstCompanyId);
             const logMsg = `[Stats][${metricKeyForLog}] Raw value '${rawValueFromPath}' (type: ${typeof rawValueFromPath}) for company ${firstCompanyId} is not a valid finite number; excluded from dataset stats for ${metricKeyForLog}.`;
             if (companyLog && !companyLog.some(l => l.includes(`excluded from dataset stats for ${metricKeyForLog}`))) { // Log only once
                companyLog.push(logMsg);
             }
        }
    }
  }

  if (stats.validValues.length > 0) {
    stats.validValues.sort((a, b) => a - b); // Sort for median and rank percentile
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
      stats.stdDev = 0; // StdDev is 0 if only one value
    }
    if (process.env.NODE_ENV === 'development') { // Conditional logging
        logScoringDebug(`Dataset stats for ${metricKeyForLog}: Min=${stats.min?.toFixed(2)}, Max=${stats.max?.toFixed(2)}, Mean=${stats.mean?.toFixed(2)}, Median=${stats.median?.toFixed(2)}, StdDev=${stats.stdDev?.toFixed(2)}, Count=${stats.validValues.length}`);
    }
  } else {
     if (process.env.NODE_ENV === 'development') {
        logScoringDebug(`Dataset stats for ${metricKeyForLog}: No valid finite values found in dataset.`);
     }
  }
  return stats;
}

export function calculateScores(
  companies: Company[],
  weights: Record<string, number>, // Keyed by MetricConfig.db_column
  globalFullRanges: MetricFullRanges, // Keyed by MetricConfig.db_column
  metricConfigsMap: Record<string, MetricConfig>, // Keyed by MetricConfig.db_column
  currentUserTier: ColumnTier,
  normalizationMode: NormalizationMode,
  imputationMode: ImputationMode
): CompanyScore[] {
  const results: CompanyScore[] = [];
  // UPDATED tierLevels for consistency
  const tierLevels: Record<ColumnTier, number> = { free: 0, pro: 1, premium: 2 };
  const userTierLevel = tierLevels[currentUserTier] ?? tierLevels.free; // Default to free if tier is undefined

  if (process.env.NODE_ENV === 'development') {
    logScoringDebug(`Initiating scoring for ${companies.length} companies. Mode: ${normalizationMode}, Impute: ${imputationMode}, Tier: ${currentUserTier} (Level: ${userTierLevel})`);
  }

  if (!Array.isArray(companies) || companies.length === 0) {
    logScoringDebug("No companies provided. Returning empty scores.");
    return [];
  }

  const perCompanyAllLogs = new Map<number, string[]>();
  companies.forEach(c => perCompanyAllLogs.set(c.company_id, [`Scoring Log for ${c.company_name} (ID: ${c.company_id}):`]));

  const datasetStatsCache = new Map<string, MetricDatasetStats>();
  if (normalizationMode.startsWith('dataset_') || imputationMode.startsWith('dataset_')) {
    if (process.env.NODE_ENV === 'development') {
        logScoringDebug("Pre-calculating dataset statistics for relevant metrics...");
    }
    for (const db_column in weights) { // weights are keyed by db_column
      if ((weights[db_column] ?? 0) > 0) {
        const metricConfig = metricConfigsMap[db_column];
        if (metricConfig) {
          datasetStatsCache.set(db_column, calculateDatasetMetricStats(companies, metricConfig, perCompanyAllLogs));
        } else {
            if (process.env.NODE_ENV === 'development') {
                logScoringDebug(`Warning: No MetricConfig found for weighted db_column '${db_column}' during dataset stats pre-calculation.`);
            }
        }
      }
    }
  }

  for (const company of companies) {
    const companyId = company.company_id;
    const companyLog = perCompanyAllLogs.get(companyId); // Should always exist due to pre-population

    if (!companyLog) { // Should not happen
        console.error(`[ScoringUtil] CRITICAL: Log array missing for companyId ${companyId}`);
        continue;
    }

    let totalWeightedScoreSum = 0;
    let totalEffectiveWeight = 0;
    const scoreBreakdown: Record<string, ScoreComponent> = {}; // Keyed by db_column

    for (const [db_column, userWeight] of Object.entries(weights)) {
      if (!isValidNumber(userWeight) || userWeight <= 0) continue;

      const metricConfig = metricConfigsMap[db_column];
      const componentLog: string[] = []; // Log for this specific component/metric
      const metricKeyForLog = metricConfig?.label || db_column;
      
      componentLog.push(`--- Processing Metric: ${metricKeyForLog} (DB: ${db_column}, Weight: ${userWeight}%) ---`);

      const component: ScoreComponent = {
        metricLabel: metricKeyForLog,
        rawValue: undefined, processedValue: null, valueUsedForNormalization: null,
        weight: userWeight, weightedScore: null, isIncludedInScore: false,
        isAccessible: false, hasValidRange: false, hasUsableValue: false,
        log: componentLog, // Reference the specific log array for this component
      };

      if (!metricConfig || !metricConfig.nested_path) {
        component.error = "Metric config or nested_path missing.";
        component.log.push(`Error: ${component.error}`);
        scoreBreakdown[db_column] = component;
        continue;
      }

      const requiredTierLevel = tierLevels[metricConfig.tier] ?? 99; // Default to a high level if tier is unknown
      component.isAccessible = userTierLevel >= requiredTierLevel;

      if (!component.isAccessible) {
        component.error = `Access denied (Required Tier: ${metricConfig.tier}, User Tier: ${currentUserTier})`;
        component.log.push(component.error);
        scoreBreakdown[db_column] = component;
        continue;
      }

      component.rawValue = getNestedValue(company, metricConfig.nested_path);
      component.log.push(`Raw value from path '${metricConfig.nested_path}': ${JSON.stringify(component.rawValue)} (Type: ${typeof component.rawValue})`);

      if (typeof component.rawValue === 'string') {
        const strVal = component.rawValue.toLowerCase();
        if (strVal === 'infinity') component.processedValue = Infinity;
        else if (strVal === '-infinity') component.processedValue = -Infinity;
        else if (strVal === 'nan') component.processedValue = NaN;
        else { const parsed = parseFloat(component.rawValue); component.processedValue = isValidNumber(parsed) ? parsed : null; }
      } else if (typeof component.rawValue === 'number') {
        component.processedValue = component.rawValue;
      } else { component.processedValue = null; }
      component.log.push(`Processed value (attempted numeric conversion): ${component.processedValue}`);
      component.valueUsedForNormalization = component.processedValue;

      if (!isValidNumber(component.valueUsedForNormalization)) {
        component.log.push(`Value '${component.valueUsedForNormalization}' is not finite/numeric. Attempting imputation (Mode: ${imputationMode}).`);
        component.imputationMethodApplied = imputationMode;
        const stats = datasetStatsCache.get(db_column);
        let imputed = false;

        if (imputationMode === 'dataset_mean' && stats && isValidNumber(stats.mean)) {
          component.valueUsedForNormalization = stats.mean; imputed = true;
        } else if (imputationMode === 'dataset_median' && stats && isValidNumber(stats.median)) {
          component.valueUsedForNormalization = stats.median; imputed = true;
        }
        
        if (imputed) {
            component.imputedValue = component.valueUsedForNormalization; // Store the imputed value
            component.log.push(`Successfully imputed with dataset ${imputationMode}: ${component.valueUsedForNormalization?.toFixed(3)}`);
        } else {
            component.log.push(`Could not impute with ${imputationMode} (stats unavailable or invalid). Fallback depends on 'zero_worst'.`);
            // valueUsedForNormalization remains null or non-finite here if imputation failed
        }
      }
      
      component.hasUsableValue = isValidNumber(component.valueUsedForNormalization);
      component.log.push(`Value for normalization (after potential imputation): ${component.valueUsedForNormalization}, Is Usable: ${component.hasUsableValue}`);


      if (!component.hasUsableValue && imputationMode !== 'zero_worst') {
        component.error = `Value after processing & imputation ('${component.valueUsedForNormalization}') remains unusable. Metric not scored.`;
        component.log.push(`Error: ${component.error}`);
        scoreBreakdown[db_column] = component;
        continue;
      }

      let normalizedScore: number | null = null;
      const valueToNorm = component.valueUsedForNormalization; // This is now either the original valid number or an imputed valid number
      const higherIsBetter = metricConfig.higherIsBetter; // Removed !== false, as boolean is direct.

      component.normalizationMethod = normalizationMode;
      component.log.push(`Normalizing: ${valueToNorm?.toFixed(3)}. Mode: ${normalizationMode}. HigherIsBetter: ${higherIsBetter}`);

      try {
        if (component.hasUsableValue) { // valueToNorm is guaranteed to be a finite number here
          const finiteValueToNorm = valueToNorm as number;
          switch (normalizationMode) {
            case 'global_min_max':
              const gRange = globalFullRanges[db_column];
              if (gRange && isValidNumber(gRange[0]) && isValidNumber(gRange[1])) {
                const [min, max] = gRange; component.hasValidRange = true;
                normalizedScore = (max - min) > 1e-9 ? (finiteValueToNorm - min) / (max - min) : (finiteValueToNorm === min ? 0.5 : (finiteValueToNorm > min ? 1 : 0));
              } else { component.error = "Global range for normalization invalid or missing."; component.log.push(`Error: ${component.error}`); }
              break;
            case 'dataset_min_max':
              const dStatsMM = datasetStatsCache.get(db_column);
              if (dStatsMM && isValidNumber(dStatsMM.min) && isValidNumber(dStatsMM.max)) {
                const { min, max } = dStatsMM; component.hasValidRange = true;
                normalizedScore = (max! - min!) > 1e-9 ? (finiteValueToNorm - min!) / (max! - min!) : (finiteValueToNorm === min! ? 0.5 : (finiteValueToNorm > min! ? 1 : 0));
              } else { component.error = "Dataset range for Min-Max normalization invalid or missing."; component.log.push(`Error: ${component.error}`);}
              break;
            case 'dataset_rank_percentile':
              const dStatsRank = datasetStatsCache.get(db_column);
              if (dStatsRank && dStatsRank.validValues.length > 0) {
                component.hasValidRange = true; 
                const sorted = dStatsRank.validValues; // Already sorted in calculateDatasetMetricStats
                let rank = sorted.findIndex(v => v >= finiteValueToNorm); // Find first rank equal or greater
                if (rank === -1) { // If value is greater than all in sorted list
                    rank = finiteValueToNorm > sorted[sorted.length -1] ? sorted.length -1 : 0; // Assign highest or lowest rank
                }
                normalizedScore = sorted.length > 1 ? rank / (sorted.length - 1) : 0.5; // Percentile
              } else { component.error = "Dataset empty or invalid for rank percentile normalization."; component.log.push(`Error: ${component.error}`);}
              break;
            case 'dataset_z_score':
              const dStatsZ = datasetStatsCache.get(db_column);
              if (dStatsZ && isValidNumber(dStatsZ.mean) && isValidNumber(dStatsZ.stdDev)) {
                component.hasValidRange = true; 
                const { mean, stdDev } = dStatsZ;
                if (stdDev! > 1e-9) { 
                    const z = (finiteValueToNorm - mean!) / stdDev!;
                    normalizedScore = Math.min(1, Math.max(0, (z + 3) / 6)); // Clamp Z-score to 0-1 (assuming +/- 3 std dev covers most)
                } else { normalizedScore = 0.5; } // All values are the same if stdDev is 0
              } else { component.error = "Dataset mean/stdDev invalid for Z-score normalization."; component.log.push(`Error: ${component.error}`);}
              break;
          }
           component.log.push(`Initial normalized score (before higherIsBetter adjust): ${normalizedScore?.toFixed(4)}`);
        } else if (imputationMode === 'zero_worst') { // Only apply zero_worst if value was NOT usable and this mode is selected
            normalizedScore = higherIsBetter ? 0 : 1; // This is the normalized score
            component.imputationMethodApplied = 'zero_worst (applied as normalized score)';
            component.log.push(`Applied 'zero_worst' directly as normalized score: ${normalizedScore}`);
        }


        if (isValidNumber(normalizedScore)) {
          normalizedScore = Math.max(0, Math.min(1, normalizedScore as number)); // Clamp 0-1
          if (!higherIsBetter) { 
            normalizedScore = 1 - normalizedScore; 
            component.log.push(`Reversed for 'lower is better'. New norm score: ${normalizedScore.toFixed(4)}`);
          }
          component.normalizedValue = normalizedScore;
          component.weightedScore = normalizedScore * userWeight;
          totalWeightedScoreSum += component.weightedScore;
          totalEffectiveWeight += userWeight;
          component.isIncludedInScore = true;
          component.log.push(`Final Normalized: ${normalizedScore.toFixed(4)}, Weighted Score: ${component.weightedScore.toFixed(3)}. Added to score totals.`);
        } else {
          if (!component.error) component.error = "Normalization resulted in unusable value, and not 'zero_worst'.";
          component.log.push(`Error: ${component.error} Metric not included in final score calculation.`);
        }
      } catch (e: any) {
        component.error = `CRITICAL Normalization/Scoring error: ${e.message}`;
        component.log.push(component.error);
         if (process.env.NODE_ENV === 'development') {
            console.error(`[ScoringUtil] Critical error during normalization for ${metricKeyForLog}, company ${companyId}:`, e);
         }
      }
      
      scoreBreakdown[db_column] = component;
      companyLog.push(...component.log); // Add component-specific logs to the main company log
    }

    const finalScoreValue = totalEffectiveWeight > 0 ? (totalWeightedScoreSum / totalEffectiveWeight) * 1000 : null;
    companyLog.push(`--- Company Score Summary for ${company.company_name} ---`);
    companyLog.push(`Total Weighted Score Sum: ${totalWeightedScoreSum.toFixed(3)}, Total Effective Weight Used: ${totalEffectiveWeight.toFixed(0)}`);
    companyLog.push(`Final Calculated Score (0-1000): ${finalScoreValue !== null ? Math.round(finalScoreValue) : 'N/A'}`);

    results.push({
      companyId,
      companyName: toTitleCase(company.company_name) || 'Unknown Company',
      code: company.tsx_code ?? 'N/A', // Use nullish coalescing
      status: company.status, headquarters: company.headquarters, description: company.description,
      score: isValidNumber(finalScoreValue) ? Math.round(finalScoreValue as number) : null,
      breakdown: scoreBreakdown, debugLogs: companyLog,
    });
  }

  results.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity)); // Sort by score descending
  if (process.env.NODE_ENV === 'development') {
    logScoringDebug(`Scoring complete. Processed ${results.length} companies. Example result:`, results.slice(0,1));
  }
  return results;
}