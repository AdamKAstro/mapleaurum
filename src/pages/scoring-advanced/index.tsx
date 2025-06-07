import React, { useState, useCallback } from 'react';
import type { CompanyStatus } from '../../lib/types';
import type { ScoringStrategy, AdvancedScoringResult } from '../../lib/scoringUtilsAdvanced';
import { calculateAdvancedScores } from '../../lib/scoringUtilsAdvanced';
import { useFilters } from '../../contexts/filter-context';

import { ScoringConfigurationPanel } from './components/ScoringConfigurationPanel';
import { AdvancedScoringDataTable } from './components/AdvancedScoringDataTable';

import { PageContainer } from '../../components/ui/page-container';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { AlertCircle } from 'lucide-react';
import { metrics as ALL_METRICS_CONFIG } from '../../lib/metric-types';

const initialMetricWeights: Record<string, number> = Object.fromEntries(
    ALL_METRICS_CONFIG.map(m => [m.key, 5])
);

const initialScoringStrategies: Record<CompanyStatus, ScoringStrategy> = {
    Producer: { companyType: 'Producer', metricSelection: 'dynamic', requiredCoverage: 0.10, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 10 },
    Developer: { companyType: 'Developer', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 12 },
    Explorer: { companyType: 'Explorer', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType', 'marketCap'], transformationSteepness: 15 },
    Royalty: { companyType: 'Royalty', metricSelection: 'dynamic', requiredCoverage: 0.10, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['sigmoid'], peerGroupFactors: ['companyType'], transformationSteepness: 8 },
    Other: { companyType: 'Other', metricSelection: 'dynamic', requiredCoverage: 0.05, imputationStrategy: 'conservative', normalization: 'ensemble', transformations: ['none'], peerGroupFactors: ['companyType'] }
};

export function AdvancedScoringPage() {
    const { displayData } = useFilters();

    const [weights, setWeights] = useState<Record<string, number>>(initialMetricWeights);
    const [strategies, setStrategies] = useState<Record<CompanyStatus, ScoringStrategy>>(initialScoringStrategies);
    const [scoringResults, setScoringResults] = useState<AdvancedScoringResult[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleWeightChange = (metricKey: string, weight: number) => {
        setWeights(prev => ({ ...prev, [metricKey]: weight }));
    };

    const handleStrategyChange = (status: CompanyStatus, newStrategy: Partial<ScoringStrategy>) => {
        setStrategies(prev => ({
            ...prev,
            [status]: { ...prev[status], ...newStrategy }
        }));
    };

    const handleCalculateScores = useCallback(async () => {
        setIsCalculating(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 50));
            if (!displayData || displayData.length === 0) throw new Error("No company data available to score.");
            
            const results = calculateAdvancedScores(displayData, weights, ALL_METRICS_CONFIG, strategies);
            setScoringResults(results);

        } catch (e: any) {
            console.error("Scoring calculation failed:", e);
            setError(e.message || "An unexpected error occurred during scoring.");
            setScoringResults([]);
        } finally {
            setIsCalculating(false);
        }
    }, [displayData, weights, strategies]);

    return (
        <PageContainer
            title="Advanced Scoring & Ranking"
            description="Configure weights and strategies to generate custom company rankings."
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-1">
                    <ScoringConfigurationPanel
                        weights={weights}
                        onWeightChange={handleWeightChange}
                        strategies={strategies}
                        onStrategyChange={handleStrategyChange}
                        allMetrics={ALL_METRICS_CONFIG}
                        onCalculate={handleCalculateScores}
                        isCalculating={isCalculating}
                        companyCount={displayData?.length || 0}
                    />
                </div>

                <div className="lg:col-span-2 bg-navy-700/30 p-4 rounded-xl border border-navy-600/50 min-h-[600px]">
                    <h2 className="text-xl font-bold mb-4">Scoring Results</h2>
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-md">
                            <AlertCircle size={20}/>
                            <p>{error}</p>
                        </div>
                    )}
                    {isCalculating ? (
                         <div className="flex justify-center items-center h-64"><LoadingIndicator /></div>
                    ) : scoringResults.length > 0 ? (
                        <AdvancedScoringDataTable results={scoringResults} />
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <p>Configure settings and click "Calculate Scores" to begin.</p>
                            {(!displayData || displayData.length === 0) && <p className="mt-2 text-amber-500">Note: No companies loaded. Please adjust your filters on the Companies page.</p>}
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}

export default AdvancedScoringPage;