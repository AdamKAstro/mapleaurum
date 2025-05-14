// src/pages/scoring/index.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFilters } from '../../contexts/filter-context';
import {
    calculateScores,
    CompanyScore,
    NormalizationMode,
    ImputationMode,
    ScoreComponent
} from '../../lib/scoringUtils';
import { metrics as allMetricsFromTypes, MetricConfig, metricCategories, MetricCategory } from '../../lib/metric-types';
import { isFeatureAccessible } from '../../lib/tier-utils';
import { isValidNumber, cn } from '../../lib/utils';
import { Lock, Info, ChevronsUp, ChevronsDown, AlertTriangle, ListChecks, Microscope, ChevronDown } from 'lucide-react';

// Using relative paths as confirmed by your working scatter chart examples and git ls-files
import { PageContainer } from '../../components/ui/page-container';
import { Slider } from '../../components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { CompanyNameBadge } from '../../components/company-name-badge';
import { Button } from '../../components/ui/button';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { StatusBadge } from '../../components/status-badge';
import { ScrollArea } from '../../components/ui/scroll-area'; // Using your created component

import type { Company, CompanyStatus, ColumnTier } from '../../lib/types';

// Constants
const SHARE_PRICE_DB_COLUMN = 'share_price';
const EMPTY_COMPANY_ARRAY: Company[] = [];
const EMPTY_SCORE_ARRAY: CompanyScore[] = [];
const FILTERABLE_STATUSES: CompanyStatus[] = ['Producer', 'Developer', 'Explorer', 'Royalty', 'Other'];

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
    const {
        metricFullRanges,
        currentUserTier,
        filteredCompanyIds,
        excludedCompanyIds,
        loadingFilteredSet,
        error: contextError,
        fetchCompaniesByIds,
        effectiveTotalCount,
        loadingRanges,
    } = useFilters();

    const [scoringCompanyData, setScoringCompanyData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
    const [isScoringDataLoading, setIsScoringDataLoading] = useState<boolean>(false);
    const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>('global_min_max');
    const [imputationMode, setImputationMode] = useState<ImputationMode>('zero_worst');
    const [showDebugForCompanyId, setShowDebugForCompanyId] = useState<number | null>(null);
    const [selectedDebugCompany, setSelectedDebugCompany] = useState<CompanyScore | null>(null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

    const B2GOLD_ID = 68; // B2Gold Corp company_id

    const metricsForScoring = useMemo(() => {
        if (!currentUserTier) {
            console.warn("[ScoringPage] currentUserTier not available for metricsForScoring memo.");
            return [];
        }
        const accessible = allMetricsFromTypes.filter(metric =>
            metric.db_column !== SHARE_PRICE_DB_COLUMN &&
            isFeatureAccessible(metric.tier, currentUserTier)
        );
        console.log(`[ScoringPage] User Tier: ${currentUserTier}. Found ${accessible.length} accessible metrics for scoring panel.`);
        return accessible;
    }, [currentUserTier]);

    const [metricWeights, setMetricWeights] = useState<Record<string, number>>({});

    useEffect(() => {
        console.log("[ScoringPage] Effect: Updating metricWeights based on accessible metrics. Count:", metricsForScoring.length);
        setMetricWeights(prevWeights => {
            const newWeights: Record<string, number> = {};
            let hasChanges = false;
            metricsForScoring.forEach(metric => {
                newWeights[metric.db_column] = prevWeights.hasOwnProperty(metric.db_column)
                    ? prevWeights[metric.db_column] : 100;
                if (newWeights[metric.db_column] !== prevWeights[metric.db_column]) hasChanges = true;
            });
            if (Object.keys(prevWeights).some(key => !newWeights.hasOwnProperty(key)) ||
                Object.keys(newWeights).length !== Object.keys(prevWeights).length) {
                hasChanges = true;
            }
            if (hasChanges) {
                console.log("[ScoringPage] Metric weights have been updated/initialized:", newWeights);
                return newWeights;
            }
            return prevWeights;
        });
    }, [metricsForScoring]);

    const metricConfigsMap = useMemo(() => {
        const map: Record<string, MetricConfig> = {};
        allMetricsFromTypes.forEach(metric => { if (metric.db_column) map[metric.db_column] = metric; });
        return map;
    }, []);

    const groupedMetricsForUI = useMemo(() => {
        const groups: Record<string, MetricConfig[]> = {};
        const allPotentiallyScorableMetrics = allMetricsFromTypes.filter(metric => metric.db_column !== SHARE_PRICE_DB_COLUMN);
        allPotentiallyScorableMetrics.forEach(metric => {
            if (!metric.category) {
                console.warn(`[ScoringPage] Metric ${metric.db_column} missing category, skipping in UI grouping.`);
                return;
            }
            if (!groups[metric.category]) groups[metric.category] = [];
            groups[metric.category].push(metric);
        });
        return groups;
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchDataForScoring = async () => {
            if (loadingFilteredSet) {
                setIsScoringDataLoading(true);
                console.log("[ScoringPage][DataFetchEffect] Waiting: filteredCompanyIds from context are still loading.");
                return;
            }
            const idsToFetch = filteredCompanyIds ? Array.from(new Set(filteredCompanyIds)) : [];
            if (idsToFetch.length === 0) {
                if (isMounted) {
                    console.log("[ScoringPage][DataFetchEffect] No filteredCompanyIds available. Clearing scoring data.");
                    setScoringCompanyData(EMPTY_COMPANY_ARRAY);
                    setIsScoringDataLoading(false);
                }
                return;
            }
            setIsScoringDataLoading(true);
            setScoringCompanyData(EMPTY_COMPANY_ARRAY);
            console.log(`[ScoringPage][DataFetchEffect] Fetching full company details for ${idsToFetch.length} unique companies. Sample IDs: ${idsToFetch.slice(0, 5).join(', ')}...`);
            try {
                const data = await fetchCompaniesByIds(idsToFetch);
                if (isMounted) {
                    const fetchedData = Array.isArray(data) ? data : EMPTY_COMPANY_ARRAY;
                    setScoringCompanyData(fetchedData);
                    console.log(`[ScoringPage][DataFetchEffect] Success: Loaded details for ${fetchedData.length} companies.`);
                    const b2GoldData = fetchedData.find(c => c.company_id === B2GOLD_ID);
                    if (b2GoldData) {
                        console.log(`[ScoringPage][DataFetchEffect][B2GoldCheck] B2Gold (ID: ${B2GOLD_ID}) IS PRESENT in scoringCompanyData. Status: ${b2GoldData.status}`);
                    } else {
                        console.warn(`[ScoringPage][DataFetchEffect][B2GoldCheck] B2Gold (ID: ${B2GOLD_ID}) NOT FOUND in scoringCompanyData after fetch.`);
                    }
                }
            } catch (e: any) {
                console.error('[ScoringPage][DataFetchEffect] Error fetching company details for scoring:', e.message, e);
                if (isMounted) setScoringCompanyData(EMPTY_COMPANY_ARRAY);
            } finally {
                if (isMounted) setIsScoringDataLoading(false);
            }
        };
        fetchDataForScoring();
        return () => { isMounted = false; };
    }, [filteredCompanyIds, loadingFilteredSet, fetchCompaniesByIds, B2GOLD_ID]);

     useEffect(() => {
        console.log(`[ScoringPage][ContextWatchEffect] Global filteredCompanyIds updated. Count: ${filteredCompanyIds?.length ?? 'N/A'}. Sample IDs (first 3): ${filteredCompanyIds?.slice(0,3).join(',')}`);
        if (filteredCompanyIds?.includes(B2GOLD_ID)) {
             console.log(`[ScoringPage][ContextWatchEffect][B2GoldCheck] B2Gold (ID ${B2GOLD_ID}) IS IN current filteredCompanyIds from context.`);
        } else if (filteredCompanyIds) {
             console.warn(`[ScoringPage][ContextWatchEffect][B2GoldCheck] B2Gold (ID ${B2GOLD_ID}) IS NOT IN current filteredCompanyIds from context.`);
        }
    }, [filteredCompanyIds, B2GOLD_ID]);

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
    
    const handleToggleDebugLog = useCallback((scoreItem: CompanyScore) => {
        if (showDebugForCompanyId === scoreItem.companyId) {
            setShowDebugForCompanyId(null);
            setSelectedDebugCompany(null);
        } else {
            setShowDebugForCompanyId(scoreItem.companyId);
            setSelectedDebugCompany(scoreItem);
            console.log(`[ScoringPage] Toggled inline debug for ${scoreItem.companyName} (ID: ${scoreItem.companyId})`);
        }
    }, [showDebugForCompanyId]);

    const calculatedScores: CompanyScore[] = useMemo(() => {
        console.log("[ScoringPage][CalcScoresMemo] Recalculating scores. Triggered.");
        const idsToExcludeSet = excludedCompanyIds instanceof Set ? excludedCompanyIds : new Set<number>();
        const includedScoringData = Array.isArray(scoringCompanyData)
            ? scoringCompanyData.filter(company => !idsToExcludeSet.has(company.company_id))
            : EMPTY_COMPANY_ARRAY;
        console.log(`[ScoringPage][CalcScoresMemo] Scoring ${includedScoringData.length} companies (after ${idsToExcludeSet.size} exclusions).`);
        if (isScoringDataLoading || loadingRanges || includedScoringData.length === 0 ||
            !metricFullRanges || Object.keys(metricFullRanges).length === 0 ||
            !metricConfigsMap || Object.keys(metricConfigsMap).length === 0 ||
            !currentUserTier) {
            console.warn("[ScoringPage][CalcScoresMemo] Pre-conditions for scoring not met. Loadings:",
                `data=${isScoringDataLoading}, ranges=${loadingRanges}. Data:`,
                `companies=${includedScoringData.length}, globalRanges=${Object.keys(metricFullRanges || {}).length > 0},`,
                `configs=${Object.keys(metricConfigsMap || {}).length > 0}, tier=${!!currentUserTier}`);
            return EMPTY_SCORE_ARRAY;
        }
        const activeAndAccessibleWeights: Record<string, number> = {};
        metricsForScoring.forEach(metric => {
            if (metricWeights.hasOwnProperty(metric.db_column) &&
                isValidNumber(metricWeights[metric.db_column]) &&
                (metricWeights[metric.db_column] as number) > 0) {
                activeAndAccessibleWeights[metric.db_column] = metricWeights[metric.db_column] as number;
            }
        });
        if (Object.keys(activeAndAccessibleWeights).length === 0) {
            console.log("[ScoringPage][CalcScoresMemo] No active weights > 0. Returning empty scores.");
            return EMPTY_SCORE_ARRAY;
        }
        console.log(`[ScoringPage][CalcScoresMemo] Calling calculateScores. NormMode: ${normalizationMode}, ImputeMode: ${imputationMode}`);
        try {
            const scores = calculateScores(
                includedScoringData, activeAndAccessibleWeights,
                metricFullRanges, metricConfigsMap, currentUserTier,
                normalizationMode, imputationMode
            );
            const b2GoldScoreData = scores.find(s => s.companyId === B2GOLD_ID);
            if (b2GoldScoreData) {
                console.log(`[ScoringPage][CalcScoresMemo][B2GoldCheck] B2Gold (ID: ${B2GOLD_ID}) IS PRESENT in calculatedScores output. Score: ${b2GoldScoreData.score}, Status: ${b2GoldScoreData.status}`);
            } else if (scores.length > 0) {
                 console.warn(`[ScoringPage][CalcScoresMemo][B2GoldCheck] B2Gold (ID: ${B2GOLD_ID}) NOT FOUND in final calculatedScores list (Total scores: ${scores.length}).`);
            } else {
                 console.log(`[ScoringPage][CalcScoresMemo][B2GoldCheck] No scores produced, so B2Gold (ID: ${B2GOLD_ID}) would not be present.`);
            }
            return Array.isArray(scores) ? scores : EMPTY_SCORE_ARRAY;
        } catch (error: any) {
            console.error('[ScoringPage][CalcScoresMemo] Error in calculateScores:', error.message, error.stack);
            return EMPTY_SCORE_ARRAY;
        }
    }, [
        scoringCompanyData, excludedCompanyIds, isScoringDataLoading, loadingRanges,
        metricWeights, metricFullRanges, metricConfigsMap, currentUserTier, metricsForScoring,
        normalizationMode, imputationMode, B2GOLD_ID
    ]);

    const filteredScores = useMemo(() => {
        if (!Array.isArray(calculatedScores)) return EMPTY_SCORE_ARRAY;
        if (selectedStatusFilter === 'all') return calculatedScores;
        return calculatedScores.filter(score => score.status?.toLowerCase() === selectedStatusFilter.toLowerCase());
    }, [calculatedScores, selectedStatusFilter]);

    const overallLoading = loadingFilteredSet || isScoringDataLoading || loadingRanges;

    const getEmptyStateMessage = () => {
        if (overallLoading) return 'Loading data for scoring...';
        if (contextError) return `Error from data context: ${contextError}`;
        if (!loadingFilteredSet && (!filteredCompanyIds || filteredCompanyIds.length === 0)) return 'No companies found with global filters. Adjust filters on other pages.';
        if (!isScoringDataLoading && scoringCompanyData.length === 0 && filteredCompanyIds && filteredCompanyIds.length > 0) return 'Company details could not be loaded for the filtered set.';
        if (effectiveTotalCount === 0 && !loadingFilteredSet) return 'No companies available to score based on global filters/exclusions.';
        if (metricsForScoring.length === 0 && !overallLoading) return 'No metrics accessible for your current tier.';
        if (Object.values(metricWeights).every(w => w === 0) && metricsForScoring.length > 0 && !overallLoading) return 'No metrics weighted. Adjust weights or use "Set Max".';
        if (calculatedScores.length > 0 && filteredScores.length === 0 && selectedStatusFilter !== 'all') return `No ranked companies match '${selectedStatusFilter}'. Try 'All Statuses'.`;
        if (calculatedScores.length === 0 && metricsForScoring.length > 0 && Object.values(metricWeights).some(w => w > 0) && !overallLoading) {
             return 'Scores could not be calculated. Check metric data availability or debug logs.';
        }
        return 'Adjust weights or filters to begin scoring.';
    };
    
    const pageDescription = overallLoading ? 'Loading data...' : contextError ? `Context Error: ${contextError}` : `${effectiveTotalCount ?? 0} companies available from global filters.`;

    // Function to extract summary from debug logs
    const getDebugSummary = (logs: string[]): string => {
        const summaryLines = logs.filter(log => 
            log.includes("--- Company Score Summary ---") ||
            log.includes("Total Weighted Score Sum:") ||
            log.includes("Final Calculated Score:")
        );
        if (summaryLines.length > 0) {
            // Find the summary block and return it
            const startIndex = logs.findIndex(log => log.includes("--- Company Score Summary ---"));
            if (startIndex !== -1) {
                return logs.slice(startIndex).join('\n');
            }
        }
        return "Summary not found in logs.";
    };


    return (
        <PageContainer title="Company Scoring Engine" description={pageDescription} className="relative isolate flex flex-col flex-grow">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: "url('/Background2.jpg')" }} aria-hidden="true" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow min-h-0">
                <div className="lg:col-span-1 space-y-6 flex flex-col min-h-0">
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg overflow-hidden flex flex-col flex-grow">
                        <CardHeader className="p-4 sm:p-6 flex-shrink-0">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <CardTitle className="text-base sm:text-lg font-medium text-white">Metric Weights & Settings</CardTitle>
                                    <p className="text-xs sm:text-sm text-gray-400 pt-1">Adjust weights (0-100%). Higher score is better.</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 mt-2 sm:mt-0">
                                    <Button onClick={handleSetAllMax} variant="secondary" size="xs" title="Set all weights to 100%" disabled={metricsForScoring.length === 0 || overallLoading}><ChevronsUp className="h-3.5 w-3.5 mr-1" />Max</Button>
                                    <Button onClick={handleSetAllMin} variant="secondary" size="xs" title="Set all weights to 0%" disabled={metricsForScoring.length === 0 || overallLoading}><ChevronsDown className="h-3.5 w-3.5 mr-1" />Min</Button>
                                </div>
                            </div>
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
                        <CardContent className="flex-grow overflow-hidden p-0">
                           <ScrollArea className="h-full w-full">
                                <div className="space-y-3 p-4 sm:p-6">
                                    {loadingRanges && <div className="text-center text-gray-400 p-3"><LoadingIndicator message="Loading Metric Ranges..." /></div>}
                                    {!loadingRanges && Object.keys(groupedMetricsForUI).length === 0 && <p className="text-gray-400 p-3 text-center text-sm">No metric categories.</p>}
                                    {!loadingRanges && Object.entries(groupedMetricsForUI).map(([categoryKey, categoryMetricsInGroup]) => {
                                        const accessibleMetricsToDisplay = categoryMetricsInGroup.filter(metric => isFeatureAccessible(metric.tier, currentUserTier || 'free'));
                                        if (accessibleMetricsToDisplay.length === 0) return null;
                                        return (
                                            <div key={categoryKey} className="mb-3 border-b border-navy-700 pb-3 last:border-b-0 last:pb-0">
                                                <h3 className="text-sm lg:text-base font-semibold text-cyan-400 mb-2 capitalize">{metricCategories[categoryKey as MetricCategory] || categoryKey}</h3>
                                                {accessibleMetricsToDisplay.map(metric => {
                                                    const weightValue = metricWeights[metric.db_column] ?? 0;
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
                                </div>
                           </ScrollArea>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 space-y-4 flex flex-col min-h-0">
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg flex flex-col flex-grow">
                        <CardHeader className="p-4 sm:p-6 border-b border-navy-700 flex-shrink-0">
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
                        <CardContent className="px-1.5 sm:px-3 md:px-4 pb-4 pt-3 flex-grow overflow-hidden">
                            <ScrollArea className="h-full w-full">
                                {(overallLoading && filteredScores.length === 0) ? (
                                    <div className="text-center text-gray-400 py-8 px-2 flex flex-col items-center justify-center h-full"><LoadingIndicator message={getEmptyStateMessage()} /></div>
                                ) : filteredScores.length > 0 ? (
                                    <ol className="space-y-0.5 text-gray-200 pr-1">
                                        {filteredScores.map((item, index) => (
                                            <React.Fragment key={item.companyId}>
                                                <li className="flex justify-between items-center text-xs sm:text-sm border-b border-navy-700/30 py-2 px-1 rounded-sm hover:bg-navy-700/30 transition-colors duration-150 group">
                                                    <span className="flex items-center space-x-1.5 min-w-0 flex-1 mr-1.5">
                                                        <span className="font-semibold text-gray-400 w-6 sm:w-7 text-right flex-shrink-0">{index + 1}.</span>
                                                        <span className="truncate flex items-center space-x-1">
                                                            <CompanyNameBadge name={item.companyName} code={item.code} headquarters={item.headquarters} description={item.description} />
                                                            {item.status && <StatusBadge status={item.status as CompanyStatus} />}
                                                        </span>
                                                    </span>
                                                    <span className="font-bold text-lg sm:text-xl text-cyan-300 pl-1.5 flex-shrink-0 mr-1">{item.score !== null ? Math.round(item.score) : 'N/A'}</span>
                                                    <Button variant="ghost" size="iconSm" className="opacity-50 group-hover:opacity-100" onClick={() => handleToggleDebugLog(item)} title={`Toggle Debug for ${item.companyName}`}>
                                                        {showDebugForCompanyId === item.companyId ? <ChevronDown size={16}/> : <Microscope size={14}/>}
                                                    </Button>
                                                </li>
                                                {showDebugForCompanyId === item.companyId && selectedDebugCompany && selectedDebugCompany.companyId === item.companyId && (
                                                    <li className="bg-navy-900/30 p-2 rounded-b-md text-xs border-x border-b border-navy-700/50">
                                                        <div className="max-h-[250px] w-full overflow-y-auto pr-2 bg-navy-900 p-1.5 rounded-sm text-[0.7rem] leading-relaxed" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--tw-color-navy-500, #47595D) transparent' }}> {/* Basic themed scrollbar for this div */}
                                                            <h5 className="text-[0.75rem] font-semibold mt-1 mb-0.5 text-sky-400 sticky top-0 bg-navy-900 py-0.5 z-10">Calculation Summary:</h5>
                                                            <pre className="whitespace-pre-wrap break-all font-mono mb-2 text-gray-300">
                                                                {getDebugSummary(selectedDebugCompany.debugLogs)}
                                                            </pre>
                                                            <h5 className="text-[0.75rem] font-semibold mt-1 mb-0.5 text-sky-400 sticky top-0 bg-navy-900 py-0.5 z-10">Active Metric Breakdown:</h5>
                                                            {Object.entries(selectedDebugCompany.breakdown)
                                                                .filter(([, comp]) => comp.isAccessible && comp.weight > 0 && comp.isIncludedInScore) // Show only metrics that contributed
                                                                .map(([metricDbCol, compDetails]) => (
                                                                <div key={metricDbCol} className="mb-1 p-1 border-t border-navy-700/40">
                                                                    <p><strong>{compDetails.metricLabel}</strong> (Wt: {compDetails.weight}%)</p>
                                                                    <p className="ml-1">Raw: <span className="text-gray-400">{String(compDetails.rawValue)}</span> | Proc: <span className="text-gray-400">{isValidNumber(compDetails.processedValue) ? compDetails.processedValue.toFixed(2) : String(compDetails.processedValue)}</span></p>
                                                                    {compDetails.imputedValue !== undefined && compDetails.imputedValue !== null && <p className="ml-1">Imputed ({compDetails.imputationMethodApplied || imputationMode}): <span className="text-orange-300">{compDetails.imputedValue?.toFixed(2)}</span></p>}
                                                                    <p className="ml-1">For Norm: <span className="text-purple-400">{isValidNumber(compDetails.valueUsedForNormalization) ? compDetails.valueUsedForNormalization.toFixed(2) : String(compDetails.valueUsedForNormalization)}</span></p>
                                                                    <p className="ml-1">Norm (<span className="text-purple-300">{compDetails.normalizationMethod || 'N/A'}</span>): <span className="text-cyan-300">{compDetails.normalizedValue?.toFixed(3) ?? 'N/A'}</span></p>
                                                                    <p className="ml-1">Weighted: <span className="text-green-300">{compDetails.weightedScore?.toFixed(3) ?? 'N/A'}</span></p>
                                                                    {compDetails.error && <p className="ml-1 text-red-400">Note: {compDetails.error}</p>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </li>
                                                )}
                                            </React.Fragment>
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
        </PageContainer>
    );
};

export default ScoringPage;