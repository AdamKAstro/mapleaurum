// src/pages/scoring/index.tsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useFilters } from '../../contexts/filter-context';
import { calculateScores, CompanyScore } from '../../lib/scoringUtils';
import { metrics, MetricConfig, metricCategories } from '../../lib/metric-types';
import { isFeatureAccessible } from '../../lib/tier-utils';
import { isValidNumber } from '../../lib/utils';
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
import type { Company, CompanyStatus } from '../../lib/types';

const SHARE_PRICE_DB_COLUMN = 'share_price';
const EMPTY_COMPANY_ARRAY: Company[] = [];
const EMPTY_SCORE_ARRAY: CompanyScore[] = [];

const ScoringPage: React.FC = () => {
    const {
        metricFullRanges,
        currentUserTier,
        filteredCompanyIds,
        excludedCompanyIds,
        loadingFilteredSet,
        error: contextError,
        fetchCompaniesByIds,
        totalCount,
        effectiveTotalCount,
        loadingRanges,
    } = useFilters();

    const [scoringCompanyData, setScoringCompanyData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
    const [isScoringDataLoading, setIsScoringDataLoading] = useState<boolean>(false);

    const metricsForScoring = useMemo(() => {
        return metrics.filter(metric => metric.db_column !== SHARE_PRICE_DB_COLUMN);
    }, []);

    const [metricWeights, setMetricWeights] = useState<Record<string, number>>(() => {
        const initialWeights: Record<string, number> = {};
        metricsForScoring.forEach(metric => {
            if (isFeatureAccessible(metric.tier, currentUserTier)) {
                initialWeights[metric.db_column] = 100;
            }
        });
        return initialWeights;
    });

    useEffect(() => {
        setMetricWeights(prevWeights => {
            const newWeights = { ...prevWeights };
            let weightsChanged = false;
            metricsForScoring.forEach(metric => {
                const isAccessible = isFeatureAccessible(metric.tier, currentUserTier);
                const hasWeight = newWeights.hasOwnProperty(metric.db_column);
                if (isAccessible && !hasWeight) {
                    newWeights[metric.db_column] = 100;
                    weightsChanged = true;
                } else if (!isAccessible && hasWeight) {
                    delete newWeights[metric.db_column];
                    weightsChanged = true;
                }
            });
            return weightsChanged ? newWeights : prevWeights;
        });
    }, [currentUserTier, metricsForScoring]);

    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

    const metricConfigsMap = useMemo(() => {
        const map: Record<string, MetricConfig> = {};
        if (!Array.isArray(metrics)) return map;
        metrics.forEach(metric => { if (metric.db_column) map[metric.db_column] = metric; });
        return map;
    }, []);

    const groupedMetricsForUI = useMemo(() => {
        const groups: Record<string, MetricConfig[]> = {};
        if (!Array.isArray(metricsForScoring)) return groups;
        metricsForScoring.forEach(metric => {
            if (!metric.category) return;
            if (!groups[metric.category]) groups[metric.category] = [];
            groups[metric.category].push(metric);
        });
        return groups;
    }, [metricsForScoring]);

    useEffect(() => {
        let isMounted = true;
        const fetchDataForScoring = async () => {
            if (!loadingFilteredSet && filteredCompanyIds && filteredCompanyIds.length > 0) {
                setIsScoringDataLoading(true);
                setScoringCompanyData(EMPTY_COMPANY_ARRAY);
                try {
                    const data = await fetchCompaniesByIds(filteredCompanyIds);
                    if (isMounted) {
                        setScoringCompanyData(data);
                        console.log(`[ScoringPage] Loaded data for ${data.length} companies for scoring.`);
                    }
                } catch (e) {
                    console.error('[ScoringPage] Error calling fetchCompaniesByIds (should be handled in context):', e);
                    if (isMounted) setScoringCompanyData(EMPTY_COMPANY_ARRAY);
                } finally {
                    if (isMounted) setIsScoringDataLoading(false);
                }
            } else if (!loadingFilteredSet) {
                if (isMounted && scoringCompanyData.length > 0) {
                    setScoringCompanyData(EMPTY_COMPANY_ARRAY);
                }
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
        metricsForScoring.forEach(metric => {
            if (isFeatureAccessible(metric.tier, currentUserTier)) {
                newWeights[metric.db_column] = value;
            }
        });
        setMetricWeights(newWeights);
    }, [metricsForScoring, currentUserTier]);

    const handleSetAllMax = useCallback(() => handleSetAllWeights(100), [handleSetAllWeights]);
    const handleSetAllMin = useCallback(() => handleSetAllWeights(0), [handleSetAllWeights]);

    const calculatedScores: CompanyScore[] = useMemo(() => {
        const idsToExclude = excludedCompanyIds instanceof Set ? excludedCompanyIds : new Set<number>();
        const includedScoringData = Array.isArray(scoringCompanyData)
            ? scoringCompanyData.filter(company => !idsToExclude.has(company.company_id))
            : EMPTY_COMPANY_ARRAY;

        if (
            loadingFilteredSet ||
            isScoringDataLoading ||
            loadingRanges ||
            includedScoringData.length === 0 ||
            !metricFullRanges ||
            Object.keys(metricFullRanges).length === 0 ||
            !metricConfigsMap ||
            Object.keys(metricConfigsMap).length === 0
        ) {
            return EMPTY_SCORE_ARRAY;
        }

        const hasPositiveWeight = Object.values(metricWeights).some(w => isValidNumber(w) && w > 0);
        if (!hasPositiveWeight) {
            return EMPTY_SCORE_ARRAY;
        }

        try {
            const validWeights: Record<string, number> = {};
            for (const key in metricWeights) {
                if (isValidNumber(metricWeights[key])) validWeights[key] = metricWeights[key];
            }
            const scores = calculateScores(
                includedScoringData,
                validWeights,
                metricFullRanges,
                metricConfigsMap,
                currentUserTier
            );
            console.log(`[ScoringPage] Calculated scores for ${scores.length} included companies.`);
            return Array.isArray(scores) ? scores : EMPTY_SCORE_ARRAY;
        } catch (error) {
            console.error('[ScoringPage] Error executing calculateScores:', error);
            return EMPTY_SCORE_ARRAY;
        }
    }, [
        scoringCompanyData,
        excludedCompanyIds,
        loadingFilteredSet,
        isScoringDataLoading,
        loadingRanges,
        metricWeights,
        metricFullRanges,
        metricConfigsMap,
        currentUserTier,
    ]);

    const filteredScores = useMemo(() => {
        if (!Array.isArray(calculatedScores)) return EMPTY_SCORE_ARRAY;
        if (selectedStatusFilter === 'all') return calculatedScores;
        return calculatedScores.filter(score => {
            const company = scoringCompanyData.find(c => c?.company_id === score.companyId);
            return company?.status?.toLowerCase() === selectedStatusFilter;
        });
    }, [calculatedScores, selectedStatusFilter, scoringCompanyData]);

    const isLoading = loadingFilteredSet || isScoringDataLoading || loadingRanges;

    const getEmptyStateMessage = () => {
        if (isLoading) return 'Loading companies for scoring...';
        if (contextError) return `Error: ${contextError}`;
        if (!Array.isArray(scoringCompanyData)) return 'Error loading company details.';
        if (loadingFilteredSet && filteredCompanyIds === null) return 'Applying filters...';
        if (!loadingFilteredSet && (!filteredCompanyIds || filteredCompanyIds.length === 0)) return 'No companies match the current filters.';
        const includedCount = scoringCompanyData.filter(c => !excludedCompanyIds.has(c.company_id)).length;
        if (includedCount === 0 && scoringCompanyData.length > 0) return `All ${effectiveTotalCount} matching companies are currently excluded via checkboxes.`;
        if (includedCount === 0) return 'No companies available to score (check filters/exclusions).';
        if (!metricFullRanges || Object.keys(metricFullRanges).length === 0) return 'Metric ranges not loaded.';
        const accessibleMetricsExist = metricsForScoring.some(m => isFeatureAccessible(m.tier, currentUserTier));
        if (!accessibleMetricsExist) return 'No metrics accessible for scoring in the current tier.';
        if (Object.keys(metricWeights || {}).length === 0 || !Object.values(metricWeights).some(w => w > 0)) return 'Set weights for accessible metrics (or use Set Max) to calculate rankings.';
        if (calculatedScores.length > 0 && filteredScores.length === 0) return `No ranked companies match the selected '${selectedStatusFilter}' status filter.`;
        if (calculatedScores.length === 0 && Object.keys(metricWeights || {}).length > 0 && Object.values(metricWeights).some(w => w > 0)) return 'Scores could not be calculated (check data validity or ranges).';
        return 'Adjust weights to rank companies.';
    };

    const pageDescription = isLoading
        ? 'Loading data...'
        : contextError
        ? `Error: ${contextError}`
        : `${effectiveTotalCount ?? 0} companies matched filters`;

    return (
        <PageContainer
            title="Company Scoring"
            description={pageDescription}
            className="relative isolate"
        >
            <div className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: "url('/Background2.jpg')" }} aria-hidden="true" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg overflow-hidden">
                        <CardHeader className="p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div>
                                    <CardTitle className="text-lg font-medium text-white">Metric Weights</CardTitle>
                                    <p className="text-sm text-gray-400 pt-1">Adjust weights (0-100%). Hover over <Info size={14} className="inline align-baseline" /> for details.</p>
                                </div>
                                <div className="flex items-center gap-4 flex-shrink-0 mt-2 sm:mt-0">
                                    <Button onClick={handleSetAllMax} variant="secondary" size="sm" title="Set all accessible weights to 100%">
                                        <ChevronsUp className="h-4 w-4 mr-1" /> Set Max
                                    </Button>
                                    <Button onClick={handleSetAllMin} variant="secondary" size="sm" title="Set all accessible weights to 0%">
                                        <ChevronsDown className="h-4 w-4 mr-1" /> Set Min
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 px-6 pb-6">
                            {loadingRanges ? (
                                <div className="text-center text-gray-400 p-4">
                                    <LoadingIndicator message="Loading Metric Ranges..." />
                                </div>
                            ) : Object.keys(groupedMetricsForUI).length === 0 ? (
                                <p className="text-gray-400 p-4 text-center">No metrics available or accessible for scoring.</p>
                            ) : (
                                Object.entries(groupedMetricsForUI).map(([category, categoryMetrics]) => {
                                    const accessibleMetricsInCategory = categoryMetrics.filter(metric => isFeatureAccessible(metric.tier, currentUserTier));
                                    if (accessibleMetricsInCategory.length === 0) return null;
                                    return (
                                        <div key={category} className="mb-4 border-b border-navy-700 pb-4 last:border-b-0 last:pb-0">
                                            <h3 className="text-lg font-semibold text-cyan-400 mb-3 capitalize">
                                                {metricCategories[category as keyof typeof metricCategories] || category}
                                            </h3>
                                            {accessibleMetricsInCategory.map(metric => {
                                                const weightValue = metricWeights[metric.db_column] ?? 0;
                                                return (
                                                    <div key={metric.db_column} className="mb-3">
                                                        <label className="flex items-center text-sm font-medium text-gray-300 mb-1 space-x-1">
                                                            <span>{metric.label} ({weightValue}%)</span>
                                                            <TooltipProvider delayDuration={150}>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button type="button" aria-label={`Info for ${metric.label}`} className="cursor-help text-gray-400 hover:text-cyan-300">
                                                                            <Info size={14} />
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="top" align="start" className="max-w-xs text-xs z-50 bg-navy-500 border border-navy-400/50 rounded-md shadow-lg px-3 py-1.5 text-gray-100">
                                                                        <p>{metric.description || 'No description available.'}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        </label>
                                                        <div className="relative pl-1 pr-1">
                                                            <Slider
                                                                value={[weightValue]}
                                                                onValueChange={(value) => handleWeightChange(metric.db_column, value)}
                                                                max={100}
                                                                step={1}
                                                                aria-label={`${metric.label} weight`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-4">
                    <Card className="bg-navy-800 border border-navy-700 shadow-lg">
                        <CardHeader className="p-6">
                            <CardTitle className="text-lg font-medium text-white">Ranked Companies</CardTitle>
                            <div className="mt-4">
                                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter} disabled={isLoading}>
                                    <SelectTrigger className="w-full bg-navy-700 border border-navy-600 text-white focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-navy-800 disabled:opacity-50">
                                        <SelectValue placeholder="Filter by status..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-navy-700 border border-navy-600 text-white">
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {['producer', 'developer', 'explorer', 'royalty'].map(status => (
                                            <SelectItem key={status} value={status} className="capitalize hover:bg-navy-600 focus:bg-navy-600">
                                                {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0">
                            <div className="min-h-[300px]">
                                {isLoading && filteredScores.length === 0 ? (
                                    <div className="text-center text-gray-400 py-4 px-2 flex items-center justify-center h-full">
                                        <LoadingIndicator message={getEmptyStateMessage()} />
                                    </div>
                                ) : filteredScores.length > 0 ? (
                                    <ol className="space-y-1 text-gray-200 max-h-[calc(60vh+20px)] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                                        {filteredScores.map((item, index) => {
                                            const company = scoringCompanyData.find(c => c?.company_id === item.companyId);
                                            const status = company?.status;
                                            return (
                                                <li key={item.companyId} className="flex justify-between items-center text-sm border-b border-navy-700/50 py-1.5 px-1 rounded-sm hover:bg-navy-700/30 transition-colors duration-150">
                                                    <span className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                                                        <span className="font-semibold text-gray-400 w-6 text-right flex-shrink-0">{index + 1}.</span>
                                                        <span className="truncate flex items-center space-x-1.5">
                                                            <CompanyNameBadge name={item.companyName} code={item.code} headquarters={item.headquarters} description={item.description} />
                                                            {status && <StatusBadge status={status as CompanyStatus} />}
                                                        </span>
                                                    </span>
                                                    <span className="font-semibold text-cyan-300 pl-2 flex-shrink-0">
                                                        {item.score !== null ? Math.round(item.score) : 'N/A'}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                ) : (
                                    <div className="text-center text-gray-400 py-4 px-2 flex items-center justify-center h-full space-x-2">
                                        <Info size={18} />
                                        <span>{getEmptyStateMessage()}</span>
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