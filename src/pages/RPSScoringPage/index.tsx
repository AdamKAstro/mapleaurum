// src/pages/RPSScoringPage/index.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Company, CompanyStatus } from '@/lib/types';
import { useFilters } from '@/contexts/filter-context';
import { getAccessibleMetrics } from '@/lib/metric-types';
import { debounce } from 'lodash';
import { RPS_SCORING_CONFIGS } from './rps-scoring-configs';
import { precomputeRPSData, applyWeightsToPrecomputedData } from './rps-scoring-engine';
import type { RPSScoringResult, PrecomputedResult } from './rps-scoring-engine';
import { PageContainer } from '@/components/ui/page-container';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
// UPDATED: Import the new RPS sidebar
import { RPSEducationalSidebar } from './components/RPSEducationalSidebar';
import { RPSConfigPanel } from './components/RPSConfigPanel';
import { RPSResultsDisplay } from './components/RPSResultsDisplay';
import { PeerGroupWeightsPanel } from './components/PeerGroupWeightsPanel';
import { ScorePreviewBar } from './components/ScorePreviewBar';
import { AlertCircle, Scale, BarChart3, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [isConfigPanelCollapsed, setIsConfigPanelCollapsed] = useState(false);
  
  // Configuration State
  const [activeCompanyType, setActiveCompanyType] = useState<CompanyStatus>('producer');
  const [metricWeights, setMetricWeights] = useState(RPS_SCORING_CONFIGS);
  const [peerGroupWeights, setPeerGroupWeights] = useState({
    status: 34,
    valuation: 33,
    operational: 33,
  });

  // State for pre-computed data
  const [precomputedData, setPrecomputedData] = useState<PrecomputedResult[]>([]);
  
  // State for the live preview bar
  const [previewScores, setPreviewScores] = useState<{
    topCompanies: { company: Company; score: number; change: number }[];
    isCalculating: boolean;
  }>({
    topCompanies: [],
    isCalculating: false,
  });

  const effectiveTier = currentUserTier || 'free';
  const accessibleMetrics = useMemo(() => getAccessibleMetrics(effectiveTier), [effectiveTier]);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchDataForScoring = async () => {
      if (isFilterContextLoading || isDataLoading) return;
      const idsToFetch = activeCompanyIds ? Array.from(new Set(activeCompanyIds)).sort() : [];
      const currentIdString = idsToFetch.join(',');

      if (idsToFetch.length === 0) {
        setAllCompanyDetails([]);
        setScoringResults([]);
        setPrecomputedData([]);
        setPreviewScores({ topCompanies: [], isCalculating: false });
        setLastFetchedIds('');
        return;
      }
      if (currentIdString === lastFetchedIds) return;

      setIsDataLoading(true);
      setError(null);
      try {
        const companies = await fetchCompaniesByIds(idsToFetch);
        setAllCompanyDetails(Array.isArray(companies) ? companies : []);
        setLastFetchedIds(currentIdString);
        setScoringResults([]);
        setPrecomputedData([]);
        setPreviewScores({ topCompanies: [], isCalculating: false });
      } catch (e: any) {
        setError(e.message || "Failed to load company details.");
        setAllCompanyDetails([]);
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchDataForScoring();
  }, [activeCompanyIds, isFilterContextLoading, fetchCompaniesByIds, isDataLoading, lastFetchedIds]);

  // --- Main Calculation Handler ---
  const handleCalculateScores = useCallback(async () => {
    if (allCompanyDetails.length === 0) {
      setError('No companies loaded to calculate.');
      return;
    }
    setIsCalculating(true);
    setError(null);
    setPreviewScores({ topCompanies: [], isCalculating: false });

    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const precomputed = precomputeRPSData(allCompanyDetails, metricWeights);
      setPrecomputedData(precomputed);
      const finalResults = applyWeightsToPrecomputedData(precomputed, metricWeights, peerGroupWeights);
      setScoringResults(finalResults);
      if (finalResults.length === 0) {
        setError('Scoring did not produce results due to insufficient data.');
      }
    } catch (e: any) {
      console.error('[RPS Page] Calculation failed:', e);
      setError(e.message || 'An unexpected error occurred during calculation.');
      setScoringResults([]);
      setPrecomputedData([]);
    } finally {
      setIsCalculating(false);
    }
  }, [allCompanyDetails, metricWeights, peerGroupWeights]);

  // --- Debounced Preview Effect ---
  const debouncedPreview = useCallback(
    debounce((precomputed, currentResults, metrics, peers) => {
      setPreviewScores(prev => ({ ...prev, isCalculating: true }));
      const newResults = applyWeightsToPrecomputedData(precomputed, metrics, peers);
      const topPreview = newResults.slice(0, 5).map(newResult => {
        const oldResult = currentResults.find(r => r.company.company_id === newResult.company.company_id);
        return {
          company: newResult.company,
          score: newResult.finalScore,
          change: oldResult ? newResult.finalScore - oldResult.finalScore : 0,
        };
      });
      setPreviewScores({ topCompanies: topPreview, isCalculating: false });
    }, 300),
    []
  );

  useEffect(() => {
    if (precomputedData.length > 0 && scoringResults.length > 0) {
      debouncedPreview(precomputedData, scoringResults, metricWeights, peerGroupWeights);
    }
  }, [metricWeights, peerGroupWeights, precomputedData, scoringResults, debouncedPreview]);

  // --- Other Callbacks ---
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

  const handlePeerWeightChange = useCallback((group: 'status' | 'valuation' | 'operational', value: number) => {
    setPeerGroupWeights(prev => ({ ...prev, [group]: value }));
  }, []);

  const isLoading = isDataLoading || isCalculating;

  // --- Render ---
  return (
    <PageContainer
      title="Relative Performance Score (Peers)"
      description="Analyze companies using a dynamic, multi-faceted scoring system relative to their true peers."
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {!isConfigPanelCollapsed && (
          <div className="lg:col-span-1">
            <RPSConfigPanel
              onCollapse={() => setIsConfigPanelCollapsed(true)}
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
        )}

        <div className={cn("lg:col-span-3", isConfigPanelCollapsed && "lg:col-span-4")}>
          <div className="bg-navy-700/30 p-6 rounded-xl border border-navy-600/50 min-h-[700px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {isConfigPanelCollapsed && (
                  <Button variant="ghost" size="icon" onClick={() => setIsConfigPanelCollapsed(false)} className="mr-2" aria-label="Expand panel">
                    <ChevronRight />
                  </Button>
                )}
                <BarChart3 size={24} className="text-accent-teal" />
                RPS Results
              </h2>
              <button
                onClick={() => setShowEducationalSidebar(true)}
                className="flex items-center gap-2 px-4 py-2 bg-navy-700/50 hover:bg-navy-700 border border-navy-600 rounded-lg transition-colors"
              >
                <Scale size={18} />
                <span className="text-sm">RPS Help</span>
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 p-4 bg-red-500/10 rounded-md mb-4">
                <AlertCircle size={20} />
                <p>{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex-grow flex justify-center items-center">
                <LoadingIndicator message={isDataLoading ? 'Loading company data...' : 'Calculating RPS...'} />
              </div>
            ) : scoringResults.length > 0 ? (
              <>
                <ScorePreviewBar previewData={previewScores} onApply={handleCalculateScores} />
                <PeerGroupWeightsPanel weights={peerGroupWeights} onWeightChange={handlePeerWeightChange} />
                <RPSResultsDisplay results={scoringResults} />
              </>
            ) : (
              <div className="flex-grow flex flex-col justify-center items-center text-center text-muted-foreground">
                <p className="text-lg mb-2">Configure and click "Calculate RPS" to begin.</p>
                <p className="text-sm max-w-md">
                  The system will analyze the {allCompanyDetails.length} selected companies using the '{activeCompanyType}' formula.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* UPDATED: Render the new RPS sidebar */}
      {showEducationalSidebar && <RPSEducationalSidebar onClose={() => setShowEducationalSidebar(false)} />}
    </PageContainer>
  );
}

export default RPSScoringPage;