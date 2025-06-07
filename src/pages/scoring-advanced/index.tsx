import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Company, CompanyStatus } from '@/lib/types';
import type { ScoringStrategy, AdvancedScoringResult } from '@/lib/scoringUtilsAdvanced';
import { calculateAdvancedScores } from '@/lib/scoringUtilsAdvanced';
import { useFilters } from '@/contexts/filter-context';

import { ScoringConfigurationPanel } from './components/ScoringConfigurationPanel';
import { AdvancedScoringDataTable } from './components/AdvancedScoringDataTable';

import { PageContainer } from '@/components/ui/page-container';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { AlertCircle } from 'lucide-react';
import { metrics as ALL_METRICS_CONFIG, getAccessibleMetrics } from '@/lib/metric-types';

const initialMetricWeights: Record<string, number> = {
    ...Object.fromEntries(ALL_METRICS_CONFIG.map(m => [m.key, 2])),
    'financials.enterprise_to_ebitda': 10,
    'financials.price_to_book': 8,
    'costs.aisc_last_year': 10,
    'financials.free_cash_flow': 8,
    'financials.net_financial_assets': 7,
    'production.reserve_life_years': 7,
    'mineral_estimates.resources_total_aueq_moz': 5,
    'financials.market_cap_value': 3,
};

const initialScoringStrategies: Record<CompanyStatus, ScoringStrategy> = {
    producer: { companyType: 'producer', metricSelection: 'dynamic', requiredCoverage: 0.10, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 10, normalizeByShares: false },
    developer: { companyType: 'developer', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 12, normalizeByShares: true },
    explorer: { companyType: 'explorer', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 15, normalizeByShares: true },
    royalty: { companyType: 'royalty', metricSelection: 'dynamic', requiredCoverage: 0.10, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType'], transformationSteepness: 8, normalizeByShares: false },
    other: { companyType: 'other', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['none'], peerGroupFactors: ['companyType'], normalizeByShares: true }
};

export function AdvancedScoringPage() {
    const { filteredCompanyIds, fetchCompaniesByIds, currentUserTier, effectiveTotalCount } = useFilters();
    
    const [allCompanyDetails, setAllCompanyDetails] = useState<Company[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [weights, setWeights] = useState<Record<string, number>>(initialMetricWeights);
    const [strategies, setStrategies] = useState<Record<CompanyStatus, ScoringStrategy>>(initialScoringStrategies);
    const [scoringResults, setScoringResults] = useState<AdvancedScoringResult[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(100);

    useEffect(() => {
        const fetchAllData = async () => {
            if (filteredCompanyIds && filteredCompanyIds.length > 0) {
                setIsDataLoading(true);
                try {
                    const data = await fetchCompaniesByIds(filteredCompanyIds);
                    setAllCompanyDetails(Array.isArray(data) ? data : []);
                } catch (e) {
                    console.error("Failed to fetch all company details:", e);
                    setAllCompanyDetails([]);
                } finally {
                    setIsDataLoading(false);
                }
            } else {
                setAllCompanyDetails([]);
            }
        };
        fetchAllData();
    }, [filteredCompanyIds, fetchCompaniesByIds]);

    const effectiveTier = currentUserTier || 'free';
    const accessibleMetrics = useMemo(() => getAccessibleMetrics(effectiveTier), [effectiveTier]);

    const handleWeightChange = (metricKey: string, weight: number) => setWeights(prev => ({ ...prev, [metricKey]: weight }));
    const handleStrategyChange = (status: CompanyStatus, newStrategy: Partial<ScoringStrategy>) => setStrategies(prev => ({...prev, [status]: { ...prev[status], ...newStrategy }}));

    const handleCalculateScores = useCallback(async () => {
        setIsCalculating(true);
        setError(null);
        setCurrentPage(1);
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            if (!allCompanyDetails || allCompanyDetails.length === 0) throw new Error("No company data available to score.");
            
            const results = calculateAdvancedScores(allCompanyDetails, weights, accessibleMetrics, strategies);
            setScoringResults(results);

        } catch (e: any) {
            console.error("Scoring calculation failed:", e);
            setError(e.message || "An unexpected error occurred.");
            setScoringResults([]);
        } finally {
            setIsCalculating(false);
        }
    }, [allCompanyDetails, weights, strategies, accessibleMetrics]);

    const isLoading = isDataLoading || isCalculating;

    return (
        <PageContainer title="Advanced Scoring & Ranking" description="Configure weights and strategies to generate custom company rankings.">
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 h-full">
                <div className="lg:col-span-1">
                    <ScoringConfigurationPanel weights={weights} onWeightChange={handleWeightChange} strategies={strategies} onStrategyChange={handleStrategyChange} allMetrics={accessibleMetrics} onCalculate={handleCalculateScores} isCalculating={isLoading} companyCount={effectiveTotalCount || 0} />
                </div>
                <div className="lg:col-span-2 xl:col-span-3 bg-navy-700/30 p-4 rounded-xl border border-navy-600/50 min-h-[600px]">
                    <h2 className="text-xl font-bold mb-4">Scoring Results</h2>
                    {error && (<div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-md"><AlertCircle size={20}/><p>{error}</p></div>)}
                    
                    {isLoading ? (<div className="flex justify-center items-center h-64"><LoadingIndicator message={isDataLoading ? 'Loading all company data...' : 'Calculating scores...'} /></div>
                    ) : scoringResults.length > 0 ? (
                        <AdvancedScoringDataTable results={scoringResults} page={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} onPageSizeChange={setPageSize} />
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <p>Configure settings and click "Calculate Scores" to begin.</p>
                            {(effectiveTotalCount === 0 && !isDataLoading) && <p className="mt-2 text-amber-500">Note: No companies match your current filters.</p>}
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

export default AdvancedScoringPage;