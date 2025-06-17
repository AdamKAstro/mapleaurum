//src/pages/scoring-advanced/index.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Company, CompanyStatus } from '@/lib/types';
import type { ScoringStrategy, AdvancedScoringResult } from '@/lib/scoringUtilsAdvanced';
import { calculateAdvancedScores, COMPANY_TYPE_METRIC_PRIORITIES } from '@/lib/scoringUtilsAdvanced';
import { useFilters } from '@/contexts/filter-context'; // Ensure this path is correct based on your project structure

import { ScoringConfigurationPanel } from './components/ScoringConfigurationPanel';
import { AdvancedScoringDataTable } from './components/AdvancedScoringDataTable';

import { PageContainer } from '@/components/ui/page-container';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { AlertCircle } from 'lucide-react';
import { metrics as ALL_METRICS_CONFIG, getAccessibleMetrics } from '@/lib/metric-types';

// Create a set of all unique Tier 1 metric keys
const tier1MetricKeys = new Set<string>();
Object.values(COMPANY_TYPE_METRIC_PRIORITIES).forEach(tieredMetrics => {
    tieredMetrics.forEach(metric => {
        if (metric.tier === 1) {
            tier1MetricKeys.add(metric.key);
        }
    });
});

// Set initial weights based on Tier 1 status
const initialMetricWeights: Record<string, number> = Object.fromEntries(
    ALL_METRICS_CONFIG.map(m => {
        if (tier1MetricKeys.has(m.key)) {
            return [m.key, 10]; // Higher default for Tier 1
        }
        return [m.key, 3]; // Standard default for others
    })
);

const initialScoringStrategies: Record<CompanyStatus, ScoringStrategy> = {
    producer: { companyType: 'producer', metricSelection: 'dynamic', requiredCoverage: 0.10, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 10, normalizeByShares: false },
    developer: { companyType: 'developer', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 12, normalizeByShares: true },
    explorer: { companyType: 'explorer', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 15, normalizeByShares: true },
    royalty: { companyType: 'royalty', metricSelection: 'dynamic', requiredCoverage: 0.10, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType'], transformationSteepness: 8, normalizeByShares: false },
    other: { companyType: 'other', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['none'], peerGroupFactors: ['companyType'], normalizeByShares: true }
};

export function AdvancedScoringPage() {
    const { 
        activeCompanyIds, // <<<<< CRUCIAL: Get activeCompanyIds from context
        fetchCompaniesByIds, 
        currentUserTier, 
        effectiveTotalCount,
        loading: overallFilterContextLoading, // Get the overall loading state from FilterContext
    } = useFilters();
    
    const [allCompanyDetails, setAllCompanyDetails] = useState<Company[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false); // Local loading state for fetching company details
    const [weights, setWeights] = useState<Record<string, number>>(initialMetricWeights);
    const [strategies, setStrategies] = useState<Record<CompanyStatus, ScoringStrategy>>(initialScoringStrategies);
    const [scoringResults, setScoringResults] = useState<AdvancedScoringResult[]>([]);
    const [isCalculating, setIsCalculating] = useState(false); // Local loading state for score calculation
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);

    // Effect to fetch detailed company data for the activeCompanyIds
    useEffect(() => {
        // Define the async function inside useEffect
        const fetchDataForScoring = async () => {
            // Wait until activeCompanyIds is stable and no general context loading is happening
            if (overallFilterContextLoading || isDataLoading) { // Check both overall context loading and local data fetching
                if (overallFilterContextLoading) {
                    console.log("[AdvancedScoringPage][DataFetchEffect] Waiting for FilterContext to stabilize activeCompanyIds.");
                }
                return;
            }

            const idsToFetch = activeCompanyIds ? Array.from(new Set(activeCompanyIds)) : [];
            
            // Optimization: Avoid refetch if data already matches the active IDs
            const currentFetchedIds = new Set(allCompanyDetails.map(c => c.company_id));
            const needsRefetch = idsToFetch.length !== allCompanyDetails.length ||
                                 idsToFetch.some(id => !currentFetchedIds.has(id));

            if (idsToFetch.length === 0) {
                if (allCompanyDetails.length > 0) { // Only clear if there was data previously
                    console.log("[AdvancedScoringPage][DataFetchEffect] No activeCompanyIds, clearing allCompanyDetails.");
                    setAllCompanyDetails([]);
                    setIsDataLoading(false);
                }
                return;
            }

            if (!needsRefetch) {
                console.log("[AdvancedScoringPage][DataFetchEffect] allCompanyDetails already matches activeCompanyIds. Skipping fetch.");
                return;
            }

            setIsDataLoading(true);
            setAllCompanyDetails([]); // Clear previous data while loading new
            setError(null);
            console.log(`[AdvancedScoringPage][DataFetchEffect] Fetching details for ${idsToFetch.length} active companies. Sample IDs: ${idsToFetch.slice(0, 5).join(', ')}...`);

            try {
                // Pass activeCompanyIds to fetchCompaniesByIds
                const data = await fetchCompaniesByIds(idsToFetch);
                if (true) { // isMounted check implicitly handled by React's unmount cleanup for state updates
                    setAllCompanyDetails(Array.isArray(data) ? data : []);
                    console.log(`[AdvancedScoringPage][DataFetchEffect] Successfully loaded ${data.length} company details for scoring.`);
                }
            } catch (e: any) {
                console.error("[AdvancedScoringPage][DataFetchEffect] Failed to fetch company details:", e);
                setError(e.message || "Failed to load company details for scoring.");
                setAllCompanyDetails([]);
            } finally {
                setIsDataLoading(false);
            }
        };

        // Call the async function
        fetchDataForScoring();
    }, [activeCompanyIds, overallFilterContextLoading, fetchCompaniesByIds, allCompanyDetails, isDataLoading]);


    const effectiveTier = currentUserTier || 'free';
    const accessibleMetrics = useMemo(() => getAccessibleMetrics(effectiveTier), [effectiveTier]);

    const handleWeightChange = (metricKey: string, weight: number) => setWeights(prev => ({ ...prev, [metricKey]: weight }));
    const handleStrategyChange = (status: CompanyStatus, newStrategy: Partial<ScoringStrategy>) => setStrategies(prev => ({...prev, [status]: { ...prev[status], ...newStrategy }}));

    const handleCalculateScores = useCallback(async () => {
        setIsCalculating(true);
        setError(null);
        setCurrentPage(1); // Reset to first page on new calculation
        try {
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for UI feedback
            if (!allCompanyDetails || allCompanyDetails.length === 0) {
                throw new Error("No company data available to score. Please select companies on the Companies page.");
            }
            
            console.log(`[AdvancedScoringPage] Starting score calculation for ${allCompanyDetails.length} companies.`);
            const results = calculateAdvancedScores(allCompanyDetails, weights, accessibleMetrics, strategies);
            setScoringResults(results);
            console.log(`[AdvancedScoringPage] Calculation complete. Generated ${results.length} results.`);

        } catch (e: any) {
            console.error("Scoring calculation failed:", e);
            setError(e.message || "An unexpected error occurred during calculation.");
            setScoringResults([]);
        } finally {
            setIsCalculating(false);
        }
    }, [allCompanyDetails, weights, strategies, accessibleMetrics]);

    // Combined loading state for the UI
    const isLoading = isDataLoading || isCalculating;

    return (
        <PageContainer title="Advanced Scoring & Ranking" description="Configure weights and strategies to generate custom company rankings.">
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 h-full">
                <div className="lg:col-span-1">
                    <ScoringConfigurationPanel 
                        weights={weights} 
                        onWeightChange={handleWeightChange} 
                        strategies={strategies} 
                        onStrategyChange={handleStrategyChange} 
                        allMetrics={accessibleMetrics} 
                        onCalculate={handleCalculateScores} 
                        isCalculating={isLoading} 
                        companyCount={effectiveTotalCount || 0} // Show count of active companies
                    />
                </div>
                <div className="lg:col-span-2 xl:col-span-3 bg-navy-700/30 p-4 rounded-xl border border-navy-600/50 min-h-[600px]">
                    <h2 className="text-xl font-bold mb-4">Scoring Results</h2>
                    {error && (<div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-md"><AlertCircle size={20}/><p>{error}</p></div>)}
                    
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <LoadingIndicator message={isDataLoading ? 'Loading all company data...' : 'Calculating scores...'} />
                        </div>
                    ) : scoringResults.length > 0 ? (
                        <AdvancedScoringDataTable 
                            results={scoringResults} 
                            page={currentPage} 
                            pageSize={pageSize} 
                            onPageChange={setCurrentPage} 
                            onPageSizeChange={setPageSize} 
                        />
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <p>Configure settings and click "Calculate Scores" to begin.</p>
                            {(effectiveTotalCount === 0 && !isDataLoading) && <p className="mt-2 text-amber-500">Note: No companies match your current filters or selection.</p>}
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

export default AdvancedScoringPage;