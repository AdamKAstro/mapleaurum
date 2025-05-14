// src/pages/scoring/index.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFilters } from '../../contexts/filter-context';
import {
    calculateScores,
    CompanyScore,
    NormalizationMode,
    ImputationMode,
    ScoreComponent // For breakdown display
} from '../../lib/scoringUtils';
import { metrics as allMetricsFromTypes, MetricConfig, metricCategories, MetricCategory } from '../../lib/metric-types';
import { isFeatureAccessible } from '../../lib/tier-utils';
import { isValidNumber, cn } from '../../lib/utils'; // Assuming cn and isValidNumber are from your utils
import { Lock, Info, ChevronsUp, ChevronsDown, AlertTriangle, ListChecks, Microscope } from 'lucide-react';

// Corrected UI component import paths assuming an alias like '@/' pointing to 'src/'
// If your project uses a different alias (e.g., '~/' or direct relative paths that work elsewhere), adjust these.
import { PageContainer } from '@/components/ui/page-container';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CompanyNameBadge } from '@/components/company-name-badge';
import { Button } from '@/components/ui/button';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { StatusBadge } from '@/components/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import type { Company, CompanyStatus, ColumnTier } from '../../lib/types';

// Constants
const SHARE_PRICE_DB_COLUMN = 'share_price'; // Example, if you specifically exclude it from scoring
const EMPTY_COMPANY_ARRAY: Company[] = [];
const EMPTY_SCORE_ARRAY: CompanyScore[] = [];
const FILTERABLE_STATUSES: CompanyStatus[] = ['Producer', 'Developer', 'Explorer', 'Royalty', 'Other'];

// --- Normalization and Imputation Options for UI ---
const NORMALIZATION_MODES: { value: NormalizationMode; label: string; description: string }[] = [
    { value: 'global_min_max', label: 'Global Min-Max', description: 'Normalizes using the absolute min/max values for each metric across the entire database. Most stable but less sensitive to current dataset nuances.' },
    { value: 'dataset_min_max', label: 'Dataset Min-Max', description: 'Normalizes using min/max values from the currently filtered set of companies. Adapts to the peer group.' },
    { value: 'dataset_rank_percentile', label: 'Dataset Rank Percentile', description: 'Ranks companies within the current dataset and uses rank percentile. Good for non-linear data or outliers.' },
    { value: 'dataset_z_score', label: 'Dataset Z-Score (Scaled)', description: 'Uses Z-scores from the current dataset, then scales them to a 0-1 range. Highlights deviations from average.' },
];

const IMPUTATION_MODES: { value: ImputationMode; label: string; description: string }[] = [
    { value: 'zero_worst', label: 'Treat as Zero/Worst', description: 'Missing/invalid values get the worst possible normalized score (0 if higher is better, 1 if lower is better). Simple, can heavily penalize.' },
    { value: 'dataset_mean', label: 'Dataset Mean', description: 'Imputes missing/invalid values with the mean from the current dataset for that metric. Can be skewed by outliers.' },
    { value: 'dataset_median', label: 'Dataset Median', description: 'Imputes missing/invalid values with the median from the current dataset. More robust to outliers than mean.' },
];


const ScoringPage: React.FC = () => {
    // --- Context Hooks ---
    const {
        metricFullRanges, // Globally observed min/max for each metric
        currentUserTier,
        filteredCompanyIds, // IDs from global filters (CompaniesPage, FilterPage)
        excludedCompanyIds, // IDs explicitly excluded by user
        loadingFilteredSet, // True when filteredCompanyIds are being fetched/updated
        error: contextError, // Errors from FilterContext
        fetchCompaniesByIds, // Function to fetch full company details for given IDs
        effectiveTotalCount, // Total companies matching global filters, minus exclusions
        loadingRanges, // True when metricFullRanges are being fetched
    } = useFilters();

    // --- Component State ---
    // State for company data used specifically for scoring (full objects)
    const [scoringCompanyData, setScoringCompanyData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
    // Loading state for fetching the full company objects for scoring
    const [isScoringDataLoading, setIsScoringDataLoading] = useState<boolean>(false);

    // Scoring strategy states
    const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>('global_min_max');
    const [imputationMode, setImputationMode] = useState<ImputationMode>('zero_worst');

    // Debugging modal states
    const [selectedDebugCompany, setSelectedDebugCompany] = useState<CompanyScore | null>(null);
    const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);

    // State for filtering ranked companies by status (UI only for the ranked list)
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');


    // --- Memoized Derived Data ---
    // Memoized list of metrics accessible to the current user's tier
    const metricsForScoring = useMemo(() => {
        if (!currentUserTier) {
            console.warn("[ScoringPage] currentUserTier is not yet available for metricsForScoring memo.");
            return [];
        }
        const accessible = allMetricsFromTypes.filter(metric =>
            metric.db_column !== SHARE_PRICE_DB_COLUMN && // Example: Exclude share price if not directly scorable
            isFeatureAccessible(metric.tier, currentUserTier)
        );
        console.log(`[ScoringPage] User Tier: ${currentUserTier}. Found ${accessible.length} accessible metrics for scoring panel.`);
        return accessible;
    }, [currentUserTier]);

    // State for metric weights, initialized/updated based on accessible metrics
    const [metricWeights, setMetricWeights] = useState<Record<string, number>>({});

    // Memoized map of all metric configurations for quick lookup
    const metricConfigsMap = useMemo(() => {
        const map: Record<string, MetricConfig> = {};
        allMetricsFromTypes.forEach(metric => { if (metric.db_column) map[metric.db_column] = metric; });
        return map;
    }, []); // allMetricsFromTypes is constant, so this runs once

    // Memoized grouping of metrics by category for UI rendering of weight sliders
    const groupedMetricsForUI = useMemo(() => {
        const groups: Record<string, MetricConfig[]> = {};
        const allPotentiallyScorableMetrics = allMetricsFromTypes.filter(metric => metric.db_column !== SHARE_PRICE_DB_COLUMN);
        allPotentiallyScorableMetrics.forEach(metric => {
            if (!metric.category) { // Should ideally always have a category if data is clean
                console.warn(`[ScoringPage] Metric ${metric.db_column} missing category, skipping in UI grouping.`);
                return;
            }
            if (!groups[metric.category]) groups[metric.category] = [];
            groups[metric.category].push(metric);
        });
        return groups;
    }, []); // allMetricsFromTypes is constant


    // --- Effects ---
    // Effect to initialize or update metric weights when accessible metrics change (e.g., tier change)
    useEffect(() => {
        console.log("[ScoringPage] Effect: Updating metricWeights based on accessible metrics. Count:", metricsForScoring.length);
        setMetricWeights(prevWeights => {
            const newWeights: Record<string, number> = {};
            let hasChanges = false; // Flag to see if a new object needs to be returned

            // Set weights for all currently accessible metrics
            metricsForScoring.forEach(metric => {
                if (prevWeights.hasOwnProperty(metric.db_column)) {
                    newWeights[metric.db_column] = prevWeights[metric.db_column]; // Preserve existing weight
                } else {
                    newWeights[metric.db_column] = 100; // Default to 100 for newly accessible metrics
                    hasChanges = true;
                }
            });

            // Check if any old weights need to be removed or if counts differ (simpler change detection)
            if (Object.keys(newWeights).length !== Object.keys(prevWeights).length) {
                hasChanges = true;
            } else {
                // More precise check if only values changed for existing keys
                for (const key in newWeights) {
                    if (newWeights[key] !== prevWeights[key]) {
                        hasChanges = true;
                        break;
                    }
                }
            }

            if (hasChanges) {
                console.log("[ScoringPage] Metric weights have been updated/initialized:", newWeights);
                return newWeights;
            }
            return prevWeights; // No actual change, return the same object to avoid re-renders
        });
    }, [metricsForScoring]);

    // Effect to fetch full company data when filteredCompanyIds from context changes
    useEffect(() => {
        let isMounted = true;
        const fetchDataForScoring = async () => {
            if (loadingFilteredSet) {
                setIsScoringDataLoading(true); // Indicate that scoring data will be loaded once IDs are ready
                console.log("[ScoringPage][DataFetchEffect] Waiting: filteredCompanyIds from context are still loading.");
                return;
            }

            // Ensure filteredCompanyIds is an array and has elements before proceeding
            const idsToFetch = filteredCompanyIds ? Array.from(new Set(filteredCompanyIds)) : []; // Deduplicate IDs

            if (idsToFetch.length === 0) {
                if (isMounted) {
                    console.log("[ScoringPage][DataFetchEffect] No filteredCompanyIds available. Clearing scoring data.");
                    setScoringCompanyData(EMPTY_COMPANY_ARRAY);
                    setIsScoringDataLoading(false); // No data to load
                }
                return;
            }

            // Proceed to fetch data
            setIsScoringDataLoading(true);
            setScoringCompanyData(EMPTY_COMPANY_ARRAY); // Clear previous data immediately
            console.log(`[ScoringPage][DataFetchEffect] Fetching full company details for ${idsToFetch.length} unique companies. Sample IDs: ${idsToFetch.slice(0, 5).join(', ')}...`);

            try {
                const data = await fetchCompaniesByIds(idsToFetch); // This function is from useFilters context
                if (isMounted) {
                    const fetchedData = Array.isArray(data) ? data : EMPTY_COMPANY_ARRAY;
                    setScoringCompanyData(fetchedData);
                    console.log(`[ScoringPage][DataFetchEffect] Successfully loaded details for ${fetchedData.length} companies.`);

                    // --- B2Gold specific logging example (replace ID or use name check) ---
                    const B2GOLD_COMPANY_ID_EXAMPLE = 25; // ** IMPORTANT: Replace with B2Gold's actual company_id if known **
                    const b2GoldData = fetchedData.find(c => c.company_id === B2GOLD_COMPANY_ID_EXAMPLE || c.company_name?.toLowerCase().includes("b2gold"));
                    if (b2GoldData) {
                        console.log(`[ScoringPage][DataFetchEffect][B2GoldCheck] B2Gold (or similar name match, ID: ${b2GoldData.company_id}) IS PRESENT in scoringCompanyData. Status: ${b2GoldData.status}`);
                    } else {
                        console.warn(`[ScoringPage][DataFetchEffect][B2GoldCheck] B2Gold (or similar name match, e.g., for ID ${B2GOLD_COMPANY_ID_EXAMPLE}) NOT FOUND in scoringCompanyData after fetch.`);
                    }
                }
            } catch (e: any) {
                console.error('[ScoringPage][DataFetchEffect] Error fetching company details for scoring:', e.message, e);
                if (isMounted) setScoringCompanyData(EMPTY_COMPANY_ARRAY); // Set to empty on error
            } finally {
                if (isMounted) setIsScoringDataLoading(false);
            }
        };

        fetchDataForScoring();
        return () => { isMounted = false; }; // Cleanup mounted flag
    }, [filteredCompanyIds, loadingFilteredSet, fetchCompaniesByIds]); // Dependencies for this effect

    // Effect to log when filteredCompanyIds from context changes, for easier debugging of upstream filtering
    useEffect(() => {
        console.log(`[ScoringPage][ContextWatchEffect] Global filteredCompanyIds updated. Count: ${filteredCompanyIds?.length ?? 'N/A'}. Sample IDs (first 3): ${filteredCompanyIds?.slice(0,3).join(',')}`);
        const B2GOLD_COMPANY_ID_EXAMPLE = 25; // ** IMPORTANT: Replace with B2Gold's actual company_id **
        if (filteredCompanyIds?.includes(B2GOLD_COMPANY_ID_EXAMPLE)) {
             console.log(`[ScoringPage][ContextWatchEffect][B2GoldCheck] B2Gold (ID ${B2GOLD_COMPANY_ID_EXAMPLE}) IS IN current filteredCompanyIds from context.`);
        } else if (filteredCompanyIds) { // Only warn if filteredCompanyIds is defined but doesn't include it
             console.warn(`[ScoringPage][ContextWatchEffect][B2GoldCheck] B2Gold (ID ${B2GOLD_COMPANY_ID_EXAMPLE}) IS NOT IN current filteredCompanyIds from context.`);
        }
    }, [filteredCompanyIds]);


    // --- Callbacks ---
    const handleWeightChange = useCallback((db_column: string, value: number[]) => {
        setMetricWeights(prev => ({ ...prev, [db_column]: value[0] }));
    }, []);

    const handleSetAllWeights = useCallback((value: 0 | 100) => {
        const newWeights: Record<string, number> = {};
        metricsForScoring.forEach(metric => { newWeights[metric.db_column] = value; });
        setMetricWeights(newWeights);
    }, [metricsForScoring]);

    const handleSetAllMax = useCallback(() => handleSetAllWeights(100), [handleSetAllWeights]);
    const handleSetAllMin = useCallback(() => handleSetAllWeights(0), [handleSetAllWeights]);

    // Callback to open the debug modal for a selected company
    const handleShowDebugModal = useCallback((scoreItem: CompanyScore) => {
        setSelectedDebugCompany(scoreItem);
        setIsDebugModalOpen(true);
        console.log(`[ScoringPage] Showing debug modal for ${scoreItem.companyName}`);
    }, []);


    // --- Main Score Calculation ---
    const calculatedScores: CompanyScore[] = useMemo(() => {
        console.log("[ScoringPage][CalcScoresMemo] Recalculating scores. Triggered by dependency change.");
        const idsToExcludeSet = excludedCompanyIds instanceof Set ? excludedCompanyIds : new Set<number>();
        const includedScoringData = Array.isArray(scoringCompanyData)
            ? scoringCompanyData.filter(company => !idsToExcludeSet.has(company.company_id))
            : EMPTY_COMPANY_ARRAY;

        console.log(`[ScoringPage][CalcScoresMemo] Scoring with ${includedScoringData.length} companies (after ${idsToExcludeSet.size} exclusions).`);

        if (isScoringDataLoading || loadingRanges || includedScoringData.length === 0 ||
            !metricFullRanges || Object.keys(metricFullRanges).length === 0 ||
            !metricConfigsMap || Object.keys(metricConfigsMap).length === 0 ||
            !currentUserTier) {
            console.warn("[ScoringPage][CalcScoresMemo] Pre-conditions for scoring not met. Returning empty scores. Loadings:",
                `scoringData=${isScoringDataLoading}, globalRanges=${loadingRanges}. Data availability:`,
                `companiesForScoring=${includedScoringData.length}, globalMetricRangesExist=${Object.keys(metricFullRanges || {}).length > 0},`,
                `metricConfigsExist=${Object.keys(metricConfigsMap || {}).length > 0}, currentUserTierExists=${!!currentUserTier}`);
            return EMPTY_SCORE_ARRAY;
        }

        const activeAndAccessibleWeights: Record<string, number> = {};
        metricsForScoring.forEach(metric => { // metricsForScoring is already tier-filtered
            if (metricWeights.hasOwnProperty(metric.db_column) &&
                isValidNumber(metricWeights[metric.db_column]) &&
                (metricWeights[metric.db_column] as number) > 0) { // Ensure weight is positive
                activeAndAccessibleWeights[metric.db_column] = metricWeights[metric.db_column] as number;
            }
        });

        if (Object.keys(activeAndAccessibleWeights).length === 0) {
            console.log("[ScoringPage][CalcScoresMemo] No active and accessible metric weights with value > 0. Returning empty scores.");
            return EMPTY_SCORE_ARRAY;
        }

        console.log(`[ScoringPage][CalcScoresMemo] Calling calculateScores. Companies: ${includedScoringData.length}, Active Weights Count: ${Object.keys(activeAndAccessibleWeights).length}, Normalization: ${normalizationMode}, Imputation: ${imputationMode}`);
        try {
            const scores = calculateScores(
                includedScoringData,
                activeAndAccessibleWeights,
                metricFullRanges,
                metricConfigsMap,
                currentUserTier,
                normalizationMode, // Pass selected normalization mode
                imputationMode    // Pass selected imputation mode
            );
            // --- B2Gold specific logging after scores are calculated ---
            const B2GOLD_COMPANY_ID_EXAMPLE = 25; // ** IMPORTANT: Replace with B2Gold's actual company_id **
            const b2GoldScoreData = scores.find(s => s.companyId === B2GOLD_COMPANY_ID_EXAMPLE || s.companyName?.toLowerCase().includes("b2gold"));
            if (b2GoldScoreData) {
                console.log(`[ScoringPage][CalcScoresMemo][B2GoldCheck] B2Gold (or similar name) IS PRESENT in calculatedScores output. Score: ${b2GoldScoreData.score}, Status: ${b2GoldScoreData.status}`);
            } else if (scores.length > 0) { // Only warn if other scores exist but B2Gold is missing
                 console.warn(`[ScoringPage][CalcScoresMemo][B2GoldCheck] B2Gold (or similar name) NOT FOUND in final calculatedScores list (Total scores returned: ${scores.length}). This implies it either had no usable data for weighted metrics or got a null score.`);
            } else {
                 console.log(`[ScoringPage][CalcScoresMemo][B2GoldCheck] No scores were produced by calculateScores for any company, so B2Gold (or similar) would not be present.`);
            }
            return Array.isArray(scores) ? scores : EMPTY_SCORE_ARRAY;
        } catch (error: any) {
            console.error('[ScoringPage][CalcScoresMemo] Critical error during calculateScores execution in memo:', error.message, error.stack);
            return EMPTY_SCORE_ARRAY;
        }
    }, [
        scoringCompanyData, excludedCompanyIds, isScoringDataLoading, loadingRanges,
        metricWeights, metricFullRanges, metricConfigsMap, currentUserTier, metricsForScoring,
        normalizationMode, imputationMode // Ensure these trigger re-calculation
    ]);

    // Memoized filtering of calculated scores by selected status (UI display only)
    const filteredScores = useMemo(() => {
        if (!Array.isArray(calculatedScores)) return EMPTY_SCORE_ARRAY;
        if (selectedStatusFilter === 'all') return calculatedScores;
        return calculatedScores.filter(score => {
            // The 'status' field is now directly available on the CompanyScore object from calculateScores
            return score.status?.toLowerCase() === selectedStatusFilter.toLowerCase();
        });
    }, [calculatedScores, selectedStatusFilter]);


    // --- UI Helper Variables ---
    // Combined loading state for more straightforward UI checks
    const overallLoading = loadingFilteredSet || isScoringDataLoading || loadingRanges;

    // Generates user-friendly messages for empty or loading states in the ranked list
    const getEmptyStateMessage = () => {
        if (overallLoading) return 'Loading data for scoring...';
        if (contextError) return `Error from data context: ${contextError}`;
        if (!loadingFilteredSet && (!filteredCompanyIds || filteredCompanyIds.length === 0)) return 'No companies found with current global filters. Please adjust filters on the Companies or Advanced Filter page.';
        if (!isScoringDataLoading && scoringCompanyData.length === 0 && filteredCompanyIds && filteredCompanyIds.length > 0) return 'Company details could not be loaded for the filtered set. This might be a temporary issue or indicate no matching companies were found after ID filtering.';
        if (effectiveTotalCount === 0 && !loadingFilteredSet) return 'No companies are available to score based on your current global filters and exclusions.';
        if (metricsForScoring.length === 0 && !overallLoading) return 'No metrics are accessible for your current subscription tier to perform scoring.';
        if (Object.values(metricWeights).every(w => w === 0) && metricsForScoring.length > 0 && !overallLoading) return 'No metrics are weighted. Please adjust metric weights to see scores, or use the "Set Max" button.';
        if (calculatedScores.length > 0 && filteredScores.length === 0 && selectedStatusFilter !== 'all') return `No ranked companies match the '${selectedStatusFilter}' status filter. Try selecting 'All Statuses'.`;
        if (calculatedScores.length === 0 && metricsForScoring.length > 0 && Object.values(metricWeights).some(w => w > 0) && !overallLoading) {
             return 'Scores could not be calculated for the current set of companies. This might be due to missing critical data for all selected metrics, invalid data ranges, or all included companies having non-finite values for weighted metrics. Try adjusting scoring settings or check debug logs for more details.';
        }
        return 'Adjust metric weights or change filters to begin scoring companies.';
    };

    // Page description text based on loading and data states
    const pageDescription = overallLoading ? 'Loading data...' : contextError ? `Context Error: ${contextError}` : `${effectiveTotalCount ?? 0} companies available based on global filters.`;


    // --- Render Logic ---
    return (
        <PageContainer title="Company Scoring Engine" description={pageDescription} className="relative isolate flex flex-col flex-grow">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: "url('/Background2.jpg')" }} aria-hidden="true" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0"> {/* Ensure grid takes up space */}
                {/* Metric Weights & Settings Card (Column 1) */}
                <div className="lg:col-span-1 space-y-6 flex flex-col min-h-0"> {/* Ensure this column can shrink/grow */}
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg overflow-hidden flex flex-col flex-grow"> {/* Card fills column */}
                        <CardHeader className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <CardTitle className="text-base sm:text-lg font-medium text-white">Metric Weights & Settings</CardTitle>
                                    <p className="text-xs sm:text-sm text-gray-400 pt-1">Adjust weights (0-100%). Higher score is better.</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                                    <Button onClick={handleSetAllMax} variant="secondary" size="xs" title="Set all accessible weights to 100%" disabled={metricsForScoring.length === 0 || overallLoading}><ChevronsUp className="h-3.5 w-3.5 mr-1" />Max</Button>
                                    <Button onClick={handleSetAllMin} variant="secondary" size="xs" title="Set all accessible weights to 0%" disabled={metricsForScoring.length === 0 || overallLoading}><ChevronsDown className="h-3.5 w-3.5 mr-1" />Min</Button>
                                </div>
                            </div>
                            {/* Normalization and Imputation Selectors */}
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="normalizationMode" className="block text-xs font-medium text-gray-300 mb-1">Normalization Mode</label>
                                    <Select value={normalizationMode} onValueChange={(value) => setNormalizationMode(value as NormalizationMode)} disabled={overallLoading}>
                                        <SelectTrigger id="normalizationMode" className="w-full bg-navy-700 border-navy-600 text-white text-xs focus:ring-cyan-500"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-navy-700 border-navy-600 text-white text-xs z-[51]">
                                            {NORMALIZATION_MODES.map(opt => (
                                                <TooltipProvider key={opt.value} delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><SelectItem value={opt.value}>{opt.label}</SelectItem></TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-xs text-xs z-[60] bg-navy-600 border-navy-500 shadow-lg px-2 py-1 text-gray-200"><p>{opt.description}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label htmlFor="imputationMode" className="block text-xs font-medium text-gray-300 mb-1">Imputation (Missing Data)</label>
                                    <Select value={imputationMode} onValueChange={(value) => setImputationMode(value as ImputationMode)} disabled={overallLoading}>
                                        <SelectTrigger id="imputationMode" className="w-full bg-navy-700 border-navy-600 text-white text-xs focus:ring-cyan-500"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-navy-700 border-navy-600 text-white text-xs z-[51]">
                                             {IMPUTATION_MODES.map(opt => (
                                                <TooltipProvider key={opt.value} delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><SelectItem value={opt.value}>{opt.label}</SelectItem></TooltipTrigger>
                                                        <TooltipContent side="right" className="max-w-xs text-xs z-[60] bg-navy-600 border-navy-500 shadow-lg px-2 py-1 text-gray-200"><p>{opt.description}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6 flex-grow overflow-y-auto custom-scrollbar"> {/* flex-grow for scroll area */}
                            {loadingRanges && <div className="text-center text-gray-400 p-3"><LoadingIndicator message="Loading Metric Ranges..." /></div>}
                            {!loadingRanges && Object.keys(groupedMetricsForUI).length === 0 && <p className="text-gray-400 p-3 text-center text-sm">No metric categories available for weighting.</p>}
                            {!loadingRanges && Object.entries(groupedMetricsForUI).map(([categoryKey, categoryMetricsInGroup]) => {
                                const accessibleMetricsToDisplay = categoryMetricsInGroup.filter(metric => isFeatureAccessible(metric.tier, currentUserTier || 'free'));
                                if (accessibleMetricsToDisplay.length === 0) return null; // Don't render category if no metrics are accessible
                                return (
                                    <div key={categoryKey} className="mb-3 border-b border-navy-700 pb-3 last:border-b-0 last:pb-0">
                                        <h3 className="text-sm lg:text-base font-semibold text-cyan-400 mb-2 capitalize">{metricCategories[categoryKey as MetricCategory] || categoryKey}</h3>
                                        {accessibleMetricsToDisplay.map(metric => {
                                            const weightValue = metricWeights[metric.db_column] ?? 0; // Default to 0 if somehow not in weights
                                            return (
                                                <div key={metric.db_column} className="mb-2.5">
                                                    <label className="flex items-center text-xs sm:text-sm font-medium text-gray-300 mb-1 space-x-1">
                                                        <span>{metric.label} ({weightValue}%)</span>
                                                        {metric.higherIsBetter ? (<span className="text-green-400/90">↑</span>) : (<span className="text-red-400/90">↓</span>)}
                                                        <TooltipProvider delayDuration={100}><Tooltip>
                                                            <TooltipTrigger asChild><button type="button" aria-label={`Info for ${metric.label}`} className="cursor-help text-gray-400 hover:text-cyan-300"><Info size={12} /></button></TooltipTrigger>
                                                            <TooltipContent side="top" align="start" className="max-w-xs text-xs z-50 bg-navy-600 border-navy-500 shadow-lg px-2 py-1 text-gray-200"><p>{metric.description || 'No description.'}</p></TooltipContent>
                                                        </Tooltip></TooltipProvider>
                                                    </label>
                                                    <div className="relative pl-0.5 pr-0.5"><Slider value={[weightValue]} onValueChange={(value) => handleWeightChange(metric.db_column, value)} max={100} step={1} aria-label={`${metric.label} weight`} disabled={loadingRanges || overallLoading} /></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Ranked Companies Section (Column 2) */}
                <div className="lg:col-span-2 space-y-4 flex flex-col min-h-0"> {/* Ensure this column can shrink/grow */}
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg flex flex-col flex-grow"> {/* Card fills column */}
                        <CardHeader className="p-4 sm:p-6 border-b border-navy-700">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <CardTitle className="text-base sm:text-lg font-medium text-white">Ranked Companies</CardTitle>
                                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter} disabled={overallLoading || (calculatedScores.length === 0 && !Object.values(metricWeights).some(w => w > 0))}>
                                    <SelectTrigger className="w-full sm:w-[180px] text-xs bg-navy-700 border-navy-600 text-white focus:ring-cyan-500 disabled:opacity-60"><SelectValue placeholder="Filter by status..." /></SelectTrigger>
                                    <SelectContent className="bg-navy-700 border-navy-600 text-white text-xs z-[51]">
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {FILTERABLE_STATUSES.map(statusValue => (<SelectItem key={statusValue} value={statusValue.toLowerCase()} className="capitalize">{statusValue}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-1.5 sm:px-3 md:px-4 pb-4 pt-3 flex-grow overflow-hidden"> {/* flex-grow for scroll area parent */}
                            <ScrollArea className="h-full w-full custom-scrollbar"> {/* ScrollArea takes full height of its parent */}
                                {(overallLoading && filteredScores.length === 0) ? (
                                    <div className="text-center text-gray-400 py-8 px-2 flex flex-col items-center justify-center h-full"><LoadingIndicator message={getEmptyStateMessage()} /></div>
                                ) : filteredScores.length > 0 ? (
                                    <ol className="space-y-0.5 text-gray-200">
                                        {filteredScores.map((item, index) => (
                                            <li key={item.companyId} className="flex justify-between items-center text-xs sm:text-sm border-b border-navy-700/30 py-2 px-1 rounded-sm hover:bg-navy-700/30 transition-colors duration-150 group">
                                                <span className="flex items-center space-x-1.5 min-w-0 flex-1 mr-1.5">
                                                    <span className="font-semibold text-gray-400 w-6 sm:w-7 text-right flex-shrink-0">{index + 1}.</span>
                                                    <span className="truncate flex items-center space-x-1">
                                                        <CompanyNameBadge name={item.companyName} code={item.code} headquarters={item.headquarters} description={item.description} />
                                                        {item.status && <StatusBadge status={item.status as CompanyStatus} />}
                                                    </span>
                                                </span>
                                                <span className="font-bold text-lg sm:text-xl text-cyan-300 pl-1.5 flex-shrink-0 mr-1">{item.score !== null ? Math.round(item.score) : 'N/A'}</span>
                                                <Button variant="ghost" size="iconSm" className="opacity-50 group-hover:opacity-100" onClick={() => handleShowDebugModal(item)} title={`Debug ${item.companyName}`}><Microscope size={14}/></Button>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <div className="text-center text-gray-400 py-8 px-2 flex flex-col items-center justify-center h-full space-y-1.5">
                                        <AlertTriangle size={24} className="text-amber-500/70 mb-1" />
                                        <p className="font-medium text-sm">{getEmptyStateMessage()}</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Debug Log Modal */}
            <Dialog open={isDebugModalOpen} onOpenChange={setIsDebugModalOpen}>
                <DialogContent className="max-w-3xl w-[90vw] md:w-full h-[85vh] bg-navy-850 border-navy-700 text-gray-300 flex flex-col p-0 shadow-2xl rounded-lg">
                    <DialogHeader className="p-3 sm:p-4 border-b border-navy-700 flex-shrink-0">
                        <DialogTitle className="text-sm sm:text-base font-medium text-amber-300 flex items-center">
                            <ListChecks size={16} className="mr-2 flex-shrink-0"/> Scoring Debug Log: {selectedDebugCompany?.companyName} ({selectedDebugCompany?.code})
                        </DialogTitle>
                        <DialogDescription className="text-xs text-gray-400">
                            Final Score: {selectedDebugCompany?.score ?? 'N/A'} | Status: {selectedDebugCompany?.status || 'N/A'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-hidden p-3 sm:p-4 pt-0"> {/* Content area for scroll */}
                        <ScrollArea className="h-full w-full pr-2 sm:pr-3 custom-scrollbar"> {/* Scroll within this div */}
                            <h4 className="text-xs font-semibold mt-2 mb-1 text-sky-400 sticky top-0 bg-navy-850 py-1 z-10">Calculation Trace:</h4>
                            <pre className="text-[0.65rem] sm:text-xs whitespace-pre-wrap break-all font-mono leading-relaxed bg-navy-900 p-2 rounded-sm mb-3">
                                {selectedDebugCompany?.debugLogs.join('\n')}
                            </pre>
                            <h4 className="text-xs font-semibold mt-3 mb-1 text-sky-400 sticky top-0 bg-navy-850 py-1 z-10">Metric Breakdown (Active & Weighted):</h4>
                            {selectedDebugCompany && Object.entries(selectedDebugCompany.breakdown)
                                .filter(([, comp]) => comp.isAccessible && comp.weight > 0) // Show only metrics that were accessible and had weight > 0
                                .map(([metricDbCol, compDetails]) => (
                                <div key={metricDbCol} className="mb-1.5 p-1.5 border-t border-navy-700/60 text-[0.6rem] sm:text-xs leading-snug bg-navy-900/30 rounded-sm">
                                    <p><strong>{compDetails.metricLabel}</strong> (User Wt: {compDetails.weight}%)</p>
                                    <p className="ml-2">Raw Value from Path: <span className="text-gray-400">{String(compDetails.rawValue)}</span></p>
                                    <p className="ml-2">Processed (Num/Inf/NaN): <span className="text-gray-400">{compDetails.processedValue?.toFixed(3) ?? String(compDetails.processedValue)}</span></p>
                                    {compDetails.imputedValue !== undefined && compDetails.imputedValue !== null && <p className="ml-2">Imputed ({compDetails.imputationMethodApplied || imputationMode}): <span className="text-orange-300">{compDetails.imputedValue?.toFixed(3)}</span></p>}
                                     <p className="ml-2">Value for Normalization: <span className="text-purple-400">{compDetails.valueUsedForNormalization?.toFixed(3) ?? String(compDetails.valueUsedForNormalization)}</span></p>
                                    <p className="ml-2">Normalized (<span className="text-purple-300">{compDetails.normalizationMethod || 'N/A'}</span>): <span className="text-cyan-300">{compDetails.normalizedValue?.toFixed(4) ?? 'N/A'}</span></p>
                                    <p className="ml-2">Weighted Score: <span className="text-green-300">{compDetails.weightedScore?.toFixed(3) ?? 'N/A'}</span> (Included: {compDetails.isIncludedInScore ? 'Yes' : <span className="text-red-400">No</span>})</p>
                                    {compDetails.error && <p className="ml-2 text-red-400">Note/Error: {compDetails.error}</p>}
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                    <DialogFooter className="p-3 sm:p-4 border-t border-navy-700 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => setIsDebugModalOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </PageContainer>
    );
};

export default ScoringPage;