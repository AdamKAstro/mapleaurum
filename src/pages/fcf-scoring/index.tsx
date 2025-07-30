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

    // Fetch company data
    useEffect(() => {
        const fetchDataForScoring = async () => {
            if (overallFilterContextLoading || isDataLoading) return;

            const idsToFetch = activeCompanyIds ? Array.from(new Set(activeCompanyIds)) : [];
            
            const currentFetchedIds = new Set(allCompanyDetails.map(c => c.company_id));
            const needsRefetch = idsToFetch.length !== allCompanyDetails.length ||
                                 idsToFetch.some(id => !currentFetchedIds.has(id));

            if (idsToFetch.length === 0) {
                if (allCompanyDetails.length > 0) {
                    setAllCompanyDetails([]);
                    setIsDataLoading(false);
                }
                return;
            }

            if (!needsRefetch) return;

            setIsDataLoading(true);
            setAllCompanyDetails([]);
            setError(null);

            try {
                const data = await fetchCompaniesByIds(idsToFetch);
                setAllCompanyDetails(Array.isArray(data) ? data : []);
            } catch (e: any) {
                console.error("Failed to fetch company details:", e);
                setError(e.message || "Failed to load company details for scoring.");
                setAllCompanyDetails([]);
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchDataForScoring();
    }, [activeCompanyIds, overallFilterContextLoading, fetchCompaniesByIds, allCompanyDetails, isDataLoading]);

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
        setIsCalculating(true);
        setError(null);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            if (!allCompanyDetails || allCompanyDetails.length === 0) {
                throw new Error("No company data available to score. Please select companies on the Companies page.");
            }
            
            console.log(`[FCFScoringPage] Starting FCF score calculation for ${allCompanyDetails.length} companies.`);
            const results = calculateFCFScores(
                allCompanyDetails, 
                metricWeights, 
                normalizeByShares,
                accessibleMetrics
            );
            setScoringResults(results);
            console.log(`[FCFScoringPage] Calculation complete. Generated ${results.length} results.`);

        } catch (e: any) {
            console.error("FCF scoring calculation failed:", e);
            setError(e.message || "An unexpected error occurred during calculation.");
            setScoringResults([]);
        } finally {
            setIsCalculating(false);
        }
    }, [allCompanyDetails, metricWeights, normalizeByShares, accessibleMetrics]);

    const isLoading = isDataLoading || isCalculating;

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
                        companyCount={effectiveTotalCount || 0}
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
                                {(effectiveTotalCount === 0 && !isDataLoading) && (
                                    <p className="mt-4 text-amber-500">
                                        Note: No companies match your current filters or selection.
                                    </p>
                                )}
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