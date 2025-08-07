// src/pages/RPSScoringPage/index.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Company, CompanyStatus } from '@/lib/types';
import { useFilters } from '@/contexts/filter-context';
import { getAccessibleMetrics } from '@/lib/metric-types';

// Import the new RPS-specific engine, configs, and types
import { RPS_SCORING_CONFIGS, RPSCompanyConfig } from './rps-scoring-configs';
import { calculateRelativePerformanceScores } from './rps-scoring-engine';
import type { RPSScoringResult } from './rps-scoring-engine';

// Import UI components (we will create the RPS versions in the next steps)
import { PageContainer } from '@/components/ui/page-container';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { EducationalSidebar } from '../fcf-scoring/components/EducationalSidebar'; // Can be reused or adapted
import { RPSConfigPanel } from './components/RPSConfigPanel';
import { RPSResultsDisplay } from './components/RPSResultsDisplay';

import { AlertCircle, BookOpen, BarChart3 } from 'lucide-react';

export function RPSScoringPage() {
    // --- State Management ---
    const { activeCompanyIds, fetchCompaniesByIds, currentUserTier, loading: isFilterContextLoading } = useFilters();

    const [allCompanyDetails, setAllCompanyDetails] = useState<Company[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [scoringResults, setScoringResults] = useState<RPSScoringResult[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetchedIds, setLastFetchedIds] = useState<string>('');
    const [showEducationalSidebar, setShowEducationalSidebar] = useState(false);

    // State for the RPS configuration
    const [activeCompanyType, setActiveCompanyType] = useState<CompanyStatus>('producer');
    const [metricWeights, setMetricWeights] = useState(RPS_SCORING_CONFIGS);

    // --- Memoized Values ---
    const effectiveTier = currentUserTier || 'free';
    const accessibleMetrics = useMemo(() => getAccessibleMetrics(effectiveTier), [effectiveTier]);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchDataForScoring = async () => {
            if (isFilterContextLoading || isDataLoading) {
                return; // Don't fetch if context is loading or a fetch is in progress
            }

            const idsToFetch = activeCompanyIds ? Array.from(new Set(activeCompanyIds)) : [];
            const currentIdString = idsToFetch.sort().join(',');

            if (idsToFetch.length === 0) {
                setAllCompanyDetails([]);
                setScoringResults([]);
                setLastFetchedIds('');
                return;
            }
            
            if (currentIdString === lastFetchedIds) {
                return; // Data is already fresh for the current set of IDs
            }

            setIsDataLoading(true);
            setError(null);
            try {
                const data = await fetchCompaniesByIds(idsToFetch);
                setAllCompanyDetails(Array.isArray(data) ? data : []);
                setLastFetchedIds(currentIdString);
                setScoringResults([]); // Clear old results when new data is loaded
            } catch (e: any) {
                console.error("[RPS Page] Failed to fetch company details:", e);
                setError(e.message || "Failed to load company details for scoring.");
                setAllCompanyDetails([]);
            } finally {
                setIsDataLoading(false);
            }
        };

        fetchDataForScoring();
    }, [activeCompanyIds, isFilterContextLoading, fetchCompaniesByIds, isDataLoading, lastFetchedIds]);


    // --- Callback Handlers ---
    const handleWeightChange = useCallback((theme: string, metricKey: string, weight: number) => {
        setMetricWeights(prev => ({
            ...prev,
            [activeCompanyType]: {
                ...prev[activeCompanyType],
                [theme]: {
                    ...prev[activeCompanyType][theme],
                    [metricKey]: weight,
                },
            },
        }));
    }, [activeCompanyType]);

    const handleCalculateScores = useCallback(async () => {
        if (allCompanyDetails.length === 0) {
            setError("No companies loaded. Please select companies using the main filter panel.");
            return;
        }

        setIsCalculating(true);
        setError(null);

        try {
            // Use a brief timeout to allow the UI to update to the "Calculating..." state
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const results = calculateRelativePerformanceScores(allCompanyDetails, metricWeights);
            setScoringResults(results);

            if (results.length === 0) {
                 setError("Scoring did not produce any results. This may be due to insufficient data for the selected companies.");
            }
        } catch (e: any) {
            console.error("[RPS Page] RPS calculation failed:", e);
            setError(e.message || "An unexpected error occurred during calculation.");
            setScoringResults([]);
        } finally {
            setIsCalculating(false);
        }
    }, [allCompanyDetails, metricWeights]);

    const isLoading = isDataLoading || isCalculating;

    // --- Render ---
    return (
        <PageContainer
            title="Relative Performance Score (RPS)"
            description="Analyze companies using a dynamic, multi-faceted scoring system relative to their true peers."
        >
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setShowEducationalSidebar(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-navy-700/50 hover:bg-navy-700 border border-navy-600 rounded-lg transition-colors"
                >
                    <BookOpen size={18} />
                    <span className="text-sm">RPS Help</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
                <div className="lg:col-span-1">
                    <RPSConfigPanel
                        activeCompanyType={activeCompanyType}
                        onCompanyTypeChange={setActiveCompanyType}
                        weights={metricWeights[activeCompanyType]}
                        onWeightChange={handleWeightChange}
                        onCalculate={handleCalculateScores}
                        isCalculating={isLoading}
                        companyCount={allCompanyDetails.length}
                        accessibleMetrics={accessibleMetrics}
                    />
                </div>

                <div className="lg:col-span-3">
                    <div className="bg-navy-700/30 p-6 rounded-xl border border-navy-600/50 min-h-[700px] flex flex-col">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <BarChart3 size={24} className="text-accent-teal" />
                            RPS Results
                        </h2>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-md mb-4">
                                <AlertCircle size={20} />
                                <p>{error}</p>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex-grow flex justify-center items-center">
                                <LoadingIndicator
                                    message={isDataLoading ? 'Loading company data...' : 'Calculating Relative Performance Scores...'}
                                />
                            </div>
                        ) : scoringResults.length > 0 ? (
                            <RPSResultsDisplay results={scoringResults} />
                        ) : (
                            <div className="flex-grow flex flex-col justify-center items-center text-center text-muted-foreground">
                                <p className="text-lg mb-2">Configure settings and click "Calculate RPS" to begin.</p>
                                <p className="text-sm max-w-md">
                                    The scoring system will analyze the {allCompanyDetails.length} selected companies using the RPS formula for the '{activeCompanyType}' category.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showEducationalSidebar && (
                // We can create a dedicated RPSHelpSidebar or adapt the existing one
                <EducationalSidebar onClose={() => setShowEducationalSidebar(false)} />
            )}
        </PageContainer>
    );
}

export default RPSScoringPage;