//src/lib/scoringUtils.ts

import type { Company, ColumnTier } from './types'; // Ensure path is correct
import type { MetricConfig } from './metric-types'; // Ensure path is correct
import { getNestedValue, isValidNumber } from './utils'; // Ensure path is correct

// --- Helper function to convert string to Title Case ---
function toTitleCase(str: string | null | undefined): string {
    if (!str) return ''; // Handle null, undefined, or empty string input
    // Convert the whole string to lowercase, then capitalize the first letter of each word.
    // This handles cases like "AGNICO EAGLE MINES" and "franco-nevada corporation".
    // Note: More complex rules might be needed for specific acronyms (e.g., "LLC"),
    // but this covers most common cases.
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    /* Alternative multi-step approach:
     return str
         .toLowerCase()
         .split(' ')
         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
         .join(' ');
    */
}
// ----------------------------------------------------

// --- Updated CompanyScore Interface (remains the same) ---
export interface CompanyScore {
  companyId: number;
  companyName: string; // This will now be consistently cased
  code: string;
  headquarters?: string | null;
  description?: string | null;
  score: number | null;
  breakdown: Record<string, ScoreComponent>;
}

// --- ScoreComponent Interface (remains the same) ---
export interface ScoreComponent {
  metricLabel: string;
  rawValue: number | null;
  normalizedValue?: number;
  weight: number;
  weightedScore: number;
  isIncluded: boolean;
  isAccessible: boolean;
  error?: string;
}

interface MetricFullRanges { [db_column: string]: [number, number]; }

/**
 * Calculates scores for companies based on user weights and metric configurations.
 */
export function calculateScores(
  companies: Company[],
  weights: Record<string, number>,
  fullRanges: MetricFullRanges,
  metricConfigsMap: Record<string, MetricConfig>,
  currentUserTier: ColumnTier
): CompanyScore[] {
  const results: CompanyScore[] = [];
  const tierLevels: Record<ColumnTier, number> = { free: 0, medium: 1, premium: 2 };
  const userTierLevel = tierLevels[currentUserTier] ?? -1;

  // Basic input validation
  if (!Array.isArray(companies)) { console.warn("[calculateScores] Invalid companies array."); return []; }
  if (typeof weights !== 'object' || weights === null) { console.warn("[calculateScores] Invalid weights object."); return []; }
  if (typeof fullRanges !== 'object' || fullRanges === null) { console.warn("[calculateScores] Invalid fullRanges object."); return []; }
  if (typeof metricConfigsMap !== 'object' || metricConfigsMap === null) { console.warn("[calculateScores] Invalid metricConfigsMap object."); return []; }

  for (const company of companies) {
    // Check only for essential company_id
    if (!company || !company.company_id) {
        console.warn(`[calculateScores] Skipping company due to missing company_id: ${JSON.stringify(company)}`);
        continue;
    }

    let totalWeightedScore = 0;
    let totalEffectiveWeight = 0;
    const scoreBreakdown: Record<string, ScoreComponent> = {};

    // (Weight iteration and metric calculation logic remains the same)
      for (const [db_column, weight] of Object.entries(weights)) {
          // (Existing logic for handling weights, configs, accessibility, values, normalization...)
          if (!isValidNumber(weight) || weight <= 0) continue;
          const metricConfig = metricConfigsMap[db_column];
          const component: ScoreComponent = { metricLabel: metricConfig?.label || db_column, rawValue: null, weight: weight, weightedScore: 0, isIncluded: false, isAccessible: false };

          if (!metricConfig || !metricConfig.nested_path) { /* ... (handle missing config/path) */ scoreBreakdown[db_column] = component; continue; }

          const requiredTierLevel = tierLevels[metricConfig.tier] ?? 99;
          component.isAccessible = userTierLevel >= requiredTierLevel;
          if (!component.isAccessible) { /* ... (handle inaccessible) */ scoreBreakdown[db_column] = component; continue; }

          const rawValue = getNestedValue(company, metricConfig.nested_path);
          component.rawValue = isValidNumber(rawValue) ? rawValue : null;

          const range = fullRanges[db_column];
          if (component.rawValue === null) { /* ... (handle null value) */ scoreBreakdown[db_column] = component; continue; }
          if (!range || !isValidNumber(range[0]) || !isValidNumber(range[1])) { /* ... (handle invalid range) */ scoreBreakdown[db_column] = component; continue; }

          const [min, max] = range;
          const rangeWidth = max - min;
          let normalized = 0;
          if (rangeWidth > 1e-9) { normalized = (component.rawValue - min) / rangeWidth; }
          else if (component.rawValue === min) { normalized = 0.5; }
          normalized = Math.max(0, Math.min(1, normalized));
          if (metricConfig.higherIsBetter === false) { normalized = 1 - normalized; }
          component.normalizedValue = normalized;

          component.weightedScore = normalized * weight;
          totalWeightedScore += component.weightedScore;
          totalEffectiveWeight += weight;
          component.isIncluded = true;
          scoreBreakdown[db_column] = component;
      } // End weights loop

      const finalScore = totalEffectiveWeight > 0 ? (totalWeightedScore / totalEffectiveWeight) * 1000 : null;

      // --- Data Extraction & Standardization ---
      const companyId = company.company_id;
      // ** APPLY TITLE CASE **
      const companyName = toTitleCase(company.company_name) || 'Unknown Company'; // Use helper function
      // *********************
      const code = company.tsx_code ?? 'N/A';
      const headquarters = company.headquarters;
      const description = company.description;

      results.push({
          companyId,
          companyName, // This name will now be Title Cased
          code,
          headquarters,
          description,
          score: finalScore !== null ? Math.round(finalScore) : null,
          breakdown: scoreBreakdown
      });
  } // End companies loop

  results.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  // console.log(`[calculateScores] Finished processing ${companies.length} companies. Returning ${results.length} scores.`);
  return results;
}