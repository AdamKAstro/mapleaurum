// src/pages/fcf-scoring/index.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Company, CompanyStatus } from '@/lib/types';
import type { FCFScoringResult } from './types';
import { calculateFCFScores } from './fcf-scoring-engine';
import { FCF_SCORING_CONFIGS, getFCFMetricsForCompanyType } from './fcf-scoring-configs';
import { useFilters } from '@/contexts/filter-context';

import { FCFScoringConfigPanel } from './components/FCFScoringConfigPanel';
import { FCFScoringTable } from './components/FCFScoringTable';
import { EducationalSidebar } from './components/EducationalSidebar';

import { PageContainer } from '@/components/ui/page-container';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { AlertCircle, BookOpen } from 'lucide-react';
import { getAccessibleMetrics } from '@/lib/metric-types';

export function FCFScoringPage() {
    const { 
        activeCompanyIds,
        fetchCompaniesByIds, 
        currentUserTier, 
        effectiveTotalCount,
        loading: overallFilterContextLoading,
    } = useFilters();
    
    const [allCompanyDetails, setAllCompanyDetails] = useState<Company[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [scoringResults, setScoringResults] = useState<FCFScoringResult[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showEducationalSidebar, setShowEducationalSidebar] = useState(false);
    const [lastFetchedIds, setLastFetchedIds] = useState<string>(''); // Track what we last fetched
    
    // FCF-specific scoring state
    const [activeCompanyType, setActiveCompanyType] = useState<CompanyStatus>('producer');
    const [metricWeights, setMetricWeights] = useState(FCF_SCORING_CONFIGS);
    const [normalizeByShares, setNormalizeByShares] = useState<Record<CompanyStatus, boolean>>({
        producer: false,
        developer: true,
        explorer: true,
        royalty: false,
        other: true
    });

    // Fetch company data - FIXED LOGIC
    useEffect(() => {
        const fetchDataForScoring = async () => {
            console.log('[FCF Page] useEffect triggered', {
                overallFilterContextLoading,
                isDataLoading,
                activeCompanyIds: activeCompanyIds?.length || 0,
                effectiveTotalCount
            });

            // Don't fetch if context is still loading
            if (overallFilterContextLoading) {
                console.log('[FCF Page] Skipping fetch - context still loading');
                return;
            }

            // Don't fetch if already fetching
            if (isDataLoading) {
                console.log('[FCF Page] Skipping fetch - already fetching');
                return;
            }

            const idsToFetch = activeCompanyIds ? Array.from(new Set(activeCompanyIds)) : [];
            const currentIdString = idsToFetch.sort().join(',');
            
            console.log('[FCF Page] IDs to fetch:', idsToFetch.length, 'Last fetched:', lastFetchedIds);

            // If no companies to fetch, clear the data
            if (idsToFetch.length === 0) {
                console.log('[FCF Page] No companies to fetch, clearing data');
                setAllCompanyDetails([]);
                setLastFetchedIds('');
                setError(null);
                return;
            }

            // Check if we need to refetch (different IDs)
            if (currentIdString === lastFetchedIds && allCompanyDetails.length > 0) {
                console.log('[FCF Page] Data already fetched for these IDs, skipping');
                return;
            }

            console.log('[FCF Page] Starting fetch for', idsToFetch.length, 'companies');
            setIsDataLoading(true);
            setError(null);

            try {
                const data = await fetchCompaniesByIds(idsToFetch);
                const companies = Array.isArray(data) ? data : [];
                
                console.log('[FCF Page] Fetched', companies.length, 'companies successfully');
                setAllCompanyDetails(companies);
                setLastFetchedIds(currentIdString);
                
                // Clear previous scoring results when new data is loaded
                setScoringResults([]);
                
            } catch (e: any) {
                console.error("[FCF Page] Failed to fetch company details:", e);
                setError(e.message || "Failed to load company details for scoring.");
                setAllCompanyDetails([]);
                setLastFetchedIds('');
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchDataForScoring();
    }, [
        activeCompanyIds, 
        overallFilterContextLoading, 
        fetchCompaniesByIds, 
        // Removed allCompanyDetails and isDataLoading from deps to prevent loops
    ]);

    const effectiveTier = currentUserTier || 'free';
    const accessibleMetrics = useMemo(() => getAccessibleMetrics(effectiveTier), [effectiveTier]);

    const handleWeightChange = useCallback((companyType: CompanyStatus, metricKey: string, weight: number) => {
        setMetricWeights(prev => ({
            ...prev,
            [companyType]: {
                ...prev[companyType],
                [metricKey]: weight
            }
        }));
    }, []);

    const handleNormalizeBySharesChange = useCallback((companyType: CompanyStatus, value: boolean) => {
        setNormalizeByShares(prev => ({
            ...prev,
            [companyType]: value
        }));
    }, []);

    const handleCalculateScores = useCallback(async () => {
        console.log('[FCF Page] Starting score calculation');
        setIsCalculating(true);
        setError(null);
        
        try {
            // Small delay to ensure UI updates
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (!allCompanyDetails || allCompanyDetails.length === 0) {
                throw new Error("No company data available to score. Please ensure companies are selected and data is loaded.");
            }
            
            console.log(`[FCF Page] Starting FCF score calculation for ${allCompanyDetails.length} companies.`);
            const results = calculateFCFScores(
                allCompanyDetails, 
                metricWeights, 
                normalizeByShares,
                accessibleMetrics
            );
            
            setScoringResults(results);
            console.log(`[FCF Page] Calculation complete. Generated ${results.length} results.`);

        } catch (e: any) {
            console.error("[FCF Page] FCF scoring calculation failed:", e);
            setError(e.message || "An unexpected error occurred during calculation.");
            setScoringResults([]);
        } finally {
            setIsCalculating(false);
        }
    }, [allCompanyDetails, metricWeights, normalizeByShares, accessibleMetrics]);

    const isLoading = isDataLoading || isCalculating;
    
    // Debug logging for render state
    console.log('[FCF Page] Render state:', {
        isDataLoading,
        isCalculating,
        companiesLoaded: allCompanyDetails.length,
        effectiveTotalCount,
        overallFilterContextLoading,
        activeCompanyIdsCount: activeCompanyIds?.length || 0
    });

    return (
        <PageContainer 
            title="FCF-Focused Scoring Analysis" 
            description="Analyze companies using Free Cash Flow-centric scoring formulas optimized for each company type."
        >
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setShowEducationalSidebar(!showEducationalSidebar)}
                    className="flex items-center gap-2 px-4 py-2 bg-navy-700/50 hover:bg-navy-700 border border-navy-600 rounded-lg transition-colors"
                >
                    <BookOpen size={18} />
                    <span className="text-sm">Learning Center</span>
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                <div className="lg:col-span-1">
                    <FCFScoringConfigPanel 
                        activeCompanyType={activeCompanyType}
                        onCompanyTypeChange={setActiveCompanyType}
                        weights={metricWeights}
                        onWeightChange={handleWeightChange}
                        normalizeByShares={normalizeByShares}
                        onNormalizeBySharesChange={handleNormalizeBySharesChange}
                        onCalculate={handleCalculateScores}
                        isCalculating={isLoading}
                        companyCount={allCompanyDetails.length} // Use actual loaded count
                        accessibleMetrics={accessibleMetrics}
                    />
                </div>
                
                <div className="lg:col-span-3">
                    <div className="bg-navy-700/30 p-6 rounded-xl border border-navy-600/50 min-h-[700px]">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            FCF Scoring Results
                            <span className="text-sm font-normal text-muted-foreground">
                                (Hover over any element for detailed explanations)
                            </span>
                        </h2>
                        
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-md mb-4">
                                <AlertCircle size={20} />
                                <p>{error}</p>
                            </div>
                        )}
                        
                        {isLoading ? (
                            <div className="flex justify-center items-center h-96">
                                <LoadingIndicator 
                                    message={isDataLoading ? 'Loading company data...' : 'Calculating FCF scores...'} 
                                />
                            </div>
                        ) : scoringResults.length > 0 ? (
                            <FCFScoringTable results={scoringResults} />
                        ) : (
                            <div className="text-center py-24 text-muted-foreground">
                                <p className="text-lg mb-2">Configure settings and click "Calculate FCF Scores" to begin.</p>
                                <p className="text-sm">The scoring system will analyze companies using FCF-optimized formulas.</p>
                                
                                {/* Enhanced debugging information */}
                                <div className="mt-6 space-y-2 text-xs">
                                    {overallFilterContextLoading && (
                                        <p className="text-amber-500">Loading filter context...</p>
                                    )}
                                    {!overallFilterContextLoading && allCompanyDetails.length === 0 && activeCompanyIds && activeCompanyIds.length > 0 && (
                                        <p className="text-amber-500">
                                            Loading {activeCompanyIds.length} selected companies...
                                        </p>
                                    )}
                                    {!overallFilterContextLoading && (!activeCompanyIds || activeCompanyIds.length === 0) && (
                                        <p className="text-amber-500">
                                            Note: No companies match your current filters or selection.
                                        </p>
                                    )}
                                    {allCompanyDetails.length > 0 && (
                                        <p className="text-green-500">
                                            {allCompanyDetails.length} companies loaded and ready for scoring.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showEducationalSidebar && (
                <EducationalSidebar onClose={() => setShowEducationalSidebar(false)} />
            )}
        </PageContainer>
    );
}

export default FCFScoringPage;
