// src/pages/scoring/index.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFilters } from '../../contexts/filter-context';
import { calculateScores, CompanyScore } from '../../lib/scoringUtils';
import { metrics as allMetricsFromTypes, MetricConfig, metricCategories, MetricCategory } from '../../lib/metric-types';
import { isFeatureAccessible } from '../../lib/tier-utils'; // Using the corrected utility
import { isValidNumber, cn } from '../../lib/utils';
import { Lock, Info, ChevronsUp, ChevronsDown } from 'lucide-react';
import { PageContainer } from '../../components/ui/page-container';
import { Slider } from '../../components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { CompanyNameBadge } from '../../components/company-name-badge';
import { Button } from '../../components/ui/button';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { StatusBadge } from '../../components/status-badge';
import type { Company, CompanyStatus, ColumnTier } from '../../lib/types';

const SHARE_PRICE_DB_COLUMN = 'share_price';
const EMPTY_COMPANY_ARRAY: Company[] = [];
const EMPTY_SCORE_ARRAY: CompanyScore[] = [];
const FILTERABLE_STATUSES: CompanyStatus[] = ['Producer', 'Developer', 'Explorer', 'Royalty', 'Other'];


const ScoringPage: React.FC = () => {
    const {
        metricFullRanges,
        currentUserTier,
        filteredCompanyIds,
        excludedCompanyIds,
        loadingFilteredSet,
        error: contextError,
        fetchCompaniesByIds,
        totalCount, // For description text
        effectiveTotalCount, // For accurate "available for scoring" count
        loadingRanges,
    } = useFilters();

    const [scoringCompanyData, setScoringCompanyData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
    const [isScoringDataLoading, setIsScoringDataLoading] = useState<boolean>(false);

    // Determine metrics available for scoring based on current user's tier
    const metricsForScoring = useMemo(() => {
        if (!currentUserTier) {
            console.warn("[ScoringPage] currentUserTier is not yet available. No metrics will be available for scoring yet.");
            return []; 
        }
        console.log("[ScoringPage] Calculating metricsForScoring based on currentUserTier:", currentUserTier);
        const accessible = allMetricsFromTypes.filter(metric => 
            metric.db_column !== SHARE_PRICE_DB_COLUMN && 
            isFeatureAccessible(metric.tier, currentUserTier) // Using corrected utility
        );
        console.log(`[ScoringPage] Found ${accessible.length} accessible metrics for scoring.`);
        return accessible;
    }, [currentUserTier]); // allMetricsFromTypes is constant

    const [metricWeights, setMetricWeights] = useState<Record<string, number>>({});

    // Initialize/Update weights when accessible metrics change (due to tier change or initial load)
    useEffect(() => {
        console.log("[ScoringPage] Updating metricWeights. Number of accessible metricsForScoring:", metricsForScoring.length);
        setMetricWeights(prevWeights => {
            const newWeights: Record<string, number> = {};
            let hasChanges = false;
            
            metricsForScoring.forEach(metric => {
                // If metric is accessible, ensure it has a weight.
                // Preserve existing weight if it exists, otherwise default to 100.
                newWeights[metric.db_column] = prevWeights.hasOwnProperty(metric.db_column)
                    ? prevWeights[metric.db_column]
                    : 100; 
                if (newWeights[metric.db_column] !== prevWeights[metric.db_column]) {
                    hasChanges = true;
                }
            });

            // Check if any weights need to be removed (metrics that are no longer in metricsForScoring)
            for (const dbCol in prevWeights) {
                if (!newWeights.hasOwnProperty(dbCol)) {
                    hasChanges = true; 
                    break;
                }
            }
            // Also consider if the number of keys changed (simpler way to detect additions/removals)
            if (Object.keys(newWeights).length !== Object.keys(prevWeights).length) {
                hasChanges = true;
            }

            if(hasChanges) {
                console.log("[ScoringPage] Metric weights updated:", newWeights);
                return newWeights;
            }
            return prevWeights;
        });
    }, [metricsForScoring]);

    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

    const metricConfigsMap = useMemo(() => {
        const map: Record<string, MetricConfig> = {};
        allMetricsFromTypes.forEach(metric => { if (metric.db_column) map[metric.db_column] = metric; });
        return map;
    }, []);

    // Group all potentially scorable metrics by category for UI structure
    // Accessibility will be checked again at the point of rendering each slider
    const groupedMetricsForUI = useMemo(() => {
        const groups: Record<string, MetricConfig[]> = {};
        const allPotentiallyScorableMetrics = allMetricsFromTypes.filter(metric => metric.db_column !== SHARE_PRICE_DB_COLUMN);
        allPotentiallyScorableMetrics.forEach(metric => {
            if (!metric.category) return; // Should not happen if data is clean
            if (!groups[metric.category]) groups[metric.category] = [];
            groups[metric.category].push(metric);
        });
        return groups;
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchDataForScoring = async () => {
            if (loadingFilteredSet) { // Wait for initial ID filtering
                setIsScoringDataLoading(true); // Indicate data fetching for scores will start soon
                return;
            }
            if (filteredCompanyIds && filteredCompanyIds.length > 0) {
                setIsScoringDataLoading(true);
                setScoringCompanyData(EMPTY_COMPANY_ARRAY); // Clear previous
                try {
                    console.log(`[ScoringPage] Fetching details for ${filteredCompanyIds.length} companies for scoring.`);
                    const data = await fetchCompaniesByIds(filteredCompanyIds);
                    if (isMounted) {
                        setScoringCompanyData(Array.isArray(data) ? data : EMPTY_COMPANY_ARRAY);
                        console.log(`[ScoringPage] Loaded details for ${Array.isArray(data) ? data.length : 0} companies.`);
                    }
                } catch (e) {
                    console.error('[ScoringPage] Error fetching company details for scoring:', e);
                    if (isMounted) setScoringCompanyData(EMPTY_COMPANY_ARRAY);
                } finally {
                    if (isMounted) setIsScoringDataLoading(false);
                }
            } else if (!loadingFilteredSet && isMounted) { // No IDs or empty IDs, and not loading them
                 if (scoringCompanyData.length > 0) setScoringCompanyData(EMPTY_COMPANY_ARRAY); // Clear if previously had data
                 setIsScoringDataLoading(false); // Not loading if no IDs to fetch
            }
        };
        fetchDataForScoring();
        return () => { isMounted = false; };
    }, [filteredCompanyIds, loadingFilteredSet, fetchCompaniesByIds]);

    const handleWeightChange = (db_column: string, value: number[]) => {
        setMetricWeights(prev => ({ ...prev, [db_column]: value[0] }));
    };

    const handleSetAllWeights = useCallback((value: 0 | 100) => {
        const newWeights: Record<string, number> = {};
        // metricsForScoring contains only currently accessible metrics
        metricsForScoring.forEach(metric => {
            newWeights[metric.db_column] = value;
        });
        setMetricWeights(newWeights);
    }, [metricsForScoring]);

    const handleSetAllMax = useCallback(() => handleSetAllWeights(100), [handleSetAllWeights]);
    const handleSetAllMin = useCallback(() => handleSetAllWeights(0), [handleSetAllWeights]);

    const calculatedScores: CompanyScore[] = useMemo(() => {
        const idsToExclude = excludedCompanyIds instanceof Set ? excludedCompanyIds : new Set<number>();
        const includedScoringData = Array.isArray(scoringCompanyData)
            ? scoringCompanyData.filter(company => !idsToExclude.has(company.company_id))
            : EMPTY_COMPANY_ARRAY;

        if (isScoringDataLoading || loadingRanges || includedScoringData.length === 0 || 
            !metricFullRanges || Object.keys(metricFullRanges).length === 0 ||
            !metricConfigsMap || Object.keys(metricConfigsMap).length === 0 ||
            !currentUserTier ) {
            return EMPTY_SCORE_ARRAY;
        }
        
        // Filter metricWeights to only include weights for metrics currently accessible to the user's tier
        const activeAndAccessibleWeights: Record<string, number> = {};
        metricsForScoring.forEach(metric => { // metricsForScoring is already tier-filtered
            if (metricWeights.hasOwnProperty(metric.db_column) && isValidNumber(metricWeights[metric.db_column]) && metricWeights[metric.db_column] > 0) {
                activeAndAccessibleWeights[metric.db_column] = metricWeights[metric.db_column];
            }
        });

        if (Object.keys(activeAndAccessibleWeights).length === 0) {
             console.log("[ScoringPage] No active and accessible weights to calculate scores.");
            return EMPTY_SCORE_ARRAY;
        }

        try {
            console.log("[ScoringPage] Calculating scores with weights:", activeAndAccessibleWeights);
            const scores = calculateScores(
                includedScoringData, activeAndAccessibleWeights,
                metricFullRanges, metricConfigsMap, currentUserTier 
            );
            return Array.isArray(scores) ? scores : EMPTY_SCORE_ARRAY;
        } catch (error) {
            console.error('[ScoringPage] Error executing calculateScores:', error);
            return EMPTY_SCORE_ARRAY;
        }
    }, [
        scoringCompanyData, excludedCompanyIds, isScoringDataLoading, loadingRanges,
        metricWeights, metricFullRanges, metricConfigsMap, currentUserTier, metricsForScoring
    ]);

    const filteredScores = useMemo(() => {
        if (!Array.isArray(calculatedScores)) return EMPTY_SCORE_ARRAY;
        if (selectedStatusFilter === 'all') return calculatedScores;
        return calculatedScores.filter(score => {
            const company = scoringCompanyData.find(c => c?.company_id === score.companyId);
            return company?.status?.toLowerCase() === selectedStatusFilter.toLowerCase();
        });
    }, [calculatedScores, selectedStatusFilter, scoringCompanyData]);

    const isLoading = loadingFilteredSet || isScoringDataLoading || loadingRanges;

    const getEmptyStateMessage = () => {
        if (isLoading) return 'Loading data for scoring...';
        if (contextError) return `Error loading filter context: ${contextError}`;
        if (!Array.isArray(scoringCompanyData) && !isScoringDataLoading && filteredCompanyIds && filteredCompanyIds.length > 0) return 'Error loading company details for scoring.';
        if (!loadingFilteredSet && (!filteredCompanyIds || filteredCompanyIds.length === 0)) return 'No companies found with current filters.';
        if (effectiveTotalCount === 0 && totalCount > 0) return `All ${totalCount} companies are excluded. Update filters or inclusions.`;
        if (effectiveTotalCount === 0) return 'No companies available to score based on filters/exclusions.';
        if (metricsForScoring.length === 0 && !isLoading) return 'No metrics are accessible for your current subscription tier to perform scoring.';
        if (Object.values(metricWeights).every(w => w === 0) && metricsForScoring.length > 0) return 'Adjust metric weights to see scores (or use "Set Max").';
        if (calculatedScores.length > 0 && filteredScores.length === 0 && selectedStatusFilter !== 'all') return `No ranked companies match the '${selectedStatusFilter}' status. Try 'All Statuses'.`;
        if (calculatedScores.length === 0 && metricsForScoring.length > 0 && Object.values(metricWeights).some(w => w > 0) && !isLoading) return 'Scores could not be calculated. This might be due to missing data for selected metrics or invalid ranges.';
        return 'Adjust metric weights or filters to begin scoring.';
    };
    
    const pageDescription = isLoading ? 'Loading data...' : contextError ? `Error: ${contextError}` : `${effectiveTotalCount ?? 0} companies available for scoring.`;

    return (
        <PageContainer title="Company Scoring" description={pageDescription} className="relative isolate">
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: "url('/Background2.jpg')" }} aria-hidden="true" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Metric Weights Card */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg overflow-hidden">
                        <CardHeader className="p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <CardTitle className="text-lg font-medium text-white">Metric Weights</CardTitle>
                                    <p className="text-sm text-gray-400 pt-1">Adjust weights (0-100%). Hover <Info size={14} className="inline align-baseline" /> for details.</p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 mt-2 sm:mt-0">
                                    <Button onClick={handleSetAllMax} variant="secondary" size="sm" title="Set all accessible weights to 100%" disabled={metricsForScoring.length === 0 || isLoading}>
                                        <ChevronsUp className="h-4 w-4 mr-1" /> Max
                                    </Button>
                                    <Button onClick={handleSetAllMin} variant="secondary" size="sm" title="Set all accessible weights to 0%" disabled={metricsForScoring.length === 0 || isLoading}>
                                        <ChevronsDown className="h-4 w-4 mr-1" /> Min
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 px-6 pb-6 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
                            {loadingRanges && <div className="text-center text-gray-400 p-4"><LoadingIndicator message="Loading Metric Ranges..." /></div>}
                            {!loadingRanges && Object.keys(groupedMetricsForUI).length === 0 && <p className="text-gray-400 p-4 text-center">No metric categories available for scoring.</p>}
                            {!loadingRanges && Object.entries(groupedMetricsForUI).map(([categoryKey, categoryMetricsInGroup]) => {
                                const accessibleMetricsToDisplay = categoryMetricsInGroup.filter(metric =>
                                    isFeatureAccessible(metric.tier, currentUserTier || 'free') // Use fixed utility
                                );
                                if (accessibleMetricsToDisplay.length === 0) return null;

                                return (
                                    <div key={categoryKey} className="mb-4 border-b border-navy-700 pb-4 last:border-b-0 last:pb-0">
                                        <h3 className="text-base lg:text-lg font-semibold text-cyan-400 mb-3 capitalize">
                                            {metricCategories[categoryKey as MetricCategory] || categoryKey}
                                        </h3>
                                        {accessibleMetricsToDisplay.map(metric => {
                                            const weightValue = metricWeights[metric.db_column] ?? 0; // Default to 0 if no weight for this specific metric yet
                                            return (
                                                <div key={metric.db_column} className="mb-3">
                                                    <label className="flex items-center text-sm font-medium text-gray-300 mb-1.5 space-x-1.5">
                                                        <span>{metric.label} ({weightValue}%)</span>
                                                        {metric.higherIsBetter ? (<span className="text-green-400/90">↑</span>) : (<span className="text-red-400/90">↓</span>)}
                                                        <TooltipProvider delayDuration={100}><Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button type="button" aria-label={`Info for ${metric.label}`} className="cursor-help text-gray-400 hover:text-cyan-300">
                                                                    <Info size={13} />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" align="start" className="max-w-xs text-xs z-50 bg-navy-600 border border-navy-500 rounded-md shadow-lg px-2.5 py-1.5 text-gray-200">
                                                                <p>{metric.description || 'No description.'}</p>
                                                            </TooltipContent>
                                                        </Tooltip></TooltipProvider>
                                                    </label>
                                                    <div className="relative pl-1 pr-1">
                                                        <Slider
                                                            value={[weightValue]}
                                                            onValueChange={(value) => handleWeightChange(metric.db_column, value)}
                                                            max={100} step={1}
                                                            aria-label={`${metric.label} weight`}
                                                            disabled={loadingRanges} // Only disabled if ranges are loading, accessibility is handled by presence
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                {/* Ranked Companies Section */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg">
                        <CardHeader className="p-6 border-b border-navy-700">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <CardTitle className="text-lg font-medium text-white">Ranked Companies</CardTitle>
                                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter} disabled={isLoading || calculatedScores.length === 0 && !Object.values(metricWeights).some(w => w > 0) }>
                                    <SelectTrigger className="w-full sm:w-[200px] bg-navy-700 border-navy-600 text-white focus:ring-cyan-500 disabled:opacity-60">
                                        <SelectValue placeholder="Filter by status..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-navy-700 border-navy-600 text-white">
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {FILTERABLE_STATUSES.map(statusValue => (
                                            <SelectItem key={statusValue} value={statusValue.toLowerCase()} className="capitalize hover:bg-navy-600 focus:bg-navy-600">
                                                {statusValue}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-2 sm:px-4 md:px-6 pb-6 pt-4">
                            <div className="min-h-[300px] max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar">
                                {(isLoading && filteredScores.length === 0) ? (
                                    <div className="text-center text-gray-400 py-10 px-2 flex flex-col items-center justify-center h-full">
                                        <LoadingIndicator message={getEmptyStateMessage()} />
                                    </div>
                                ) : filteredScores.length > 0 ? (
                                    <ol className="space-y-1 text-gray-200">
                                        {filteredScores.map((item, index) => {
                                            const companyDetails = scoringCompanyData.find(c => c.company_id === item.companyId);
                                            return (
                                                <li key={item.companyId} className="flex justify-between items-center text-sm border-b border-navy-700/40 py-2.5 px-1.5 rounded-sm hover:bg-navy-700/40 transition-colors duration-150">
                                                    <span className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                                                        <span className="font-semibold text-gray-400 w-7 text-right flex-shrink-0">{index + 1}.</span>
                                                        <span className="truncate flex items-center space-x-1.5">
                                                            {companyDetails ? (
                                                                <CompanyNameBadge name={item.companyName} code={item.code} headquarters={companyDetails.headquarters} description={companyDetails.description} />
                                                            ) : (
                                                                <span className="font-medium text-white">{item.companyName} ({item.code || 'N/A'})</span>
                                                            )}
                                                            {companyDetails?.status && <StatusBadge status={companyDetails.status} />}
                                                        </span>
                                                    </span>
                                                    <span className="font-bold text-xl text-cyan-300 pl-2 flex-shrink-0">
                                                        {item.score !== null ? Math.round(item.score) : 'N/A'}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                ) : (
                                    <div className="text-center text-gray-400 py-10 px-2 flex flex-col items-center justify-center h-full space-y-2">
                                        <Info size={28} className="text-cyan-500/70 mb-1" />
                                        <p className="font-medium">{getEmptyStateMessage()}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
};

export default ScoringPage;