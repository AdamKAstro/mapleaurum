// src/pages/scatter-score-pro/index.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip as ChartJsTooltip,
  Legend as ChartJsLegend,
  type ChartOptions,
  type ScatterDataPoint,
  type ScriptableContext
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Contexts & Core
import { useFilters } from '../../contexts/filter-context';
import { useCurrency } from '../../contexts/currency-context';
import { PageContainer } from '../../components/ui/page-container';
import { Button } from '../../components/ui/button';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { 
  Settings, X, ZoomIn, ZoomOut, RotateCcw, Loader2, 
  ChevronLeft, PlayCircle, Sparkles 
} from 'lucide-react';

// Scatter Score specific imports
import type { 
  ScatterScorePlotPoint, 
  ScatterScorePlotPointData,
  AxisMetricConfig 
} from './types';
import { 
  DEBUG_SCATTER_SCORE, 
  STATUS_COLORS, 
  CHART_SETTINGS,
  ANIMATION_CONFIG 
} from './constants';
import { SCATTER_SCORE_TEMPLATES } from './templates';
import { useTemplateLoader } from './hooks/useTemplateLoader';
import { normalizeWeights } from './utils/normalizeWeights';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { useScatterScoreChart } from './hooks/useScatterScoreChart';
import { useScoreCalculation } from './hooks/useScoreCalculation';

// Lib imports
import {
  metrics as allMetrics,
  getAccessibleMetrics,
  type MetricConfig
} from '../../lib/metric-types';
import type { Company, NormalizationMode, ImputationMode } from '../../lib/types';
import { cn, isValidNumber } from '../../lib/utils';

ChartJS.register(
  LinearScale, LogarithmicScale, PointElement, ChartJsTooltip, 
  ChartJsLegend, zoomPlugin, ChartDataLabels
);

export function ScatterScoreProPage() {
  const { 
    currentUserTier, 
    filteredCompanyIds, 
    fetchCompaniesByIds, 
    metricFullRanges: globalMetricRangesFromContext 
  } = useFilters();
  const { currency: selectedDisplayCurrency } = useCurrency();
  
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [chartDataSource, setChartDataSource] = useState<Company[]>([]);
  const [plotData, setPlotData] = useState<ScatterScorePlotPoint[]>([]);
  const [isCalculatingScores, setIsCalculatingScores] = useState(false);
  const [axisScoreError, setAxisScoreError] = useState<string | null>(null);

  const chartRef = useRef<ChartJS<'scatter', (ScatterDataPoint | null)[], unknown> | null>(null);

  const accessibleMetrics = useMemo(() => 
    getAccessibleMetrics(currentUserTier || 'free'), 
    [currentUserTier]
  );
  
  const getMetricConfigDetails = useCallback((key: string): MetricConfig | undefined => 
    allMetrics.find(m => m.key === key), 
    []
  );

  // Use the template loader hook
  const {
    activeTemplateName,
    selectedXMetrics,
    selectedYMetrics,
    selectedZMetricKey,
    zScale,
    normalizationMode,
    imputationMode,
    currentTemplateConfig,
    isTemplateLoading,
    isTemplateReady,
    loadTemplate,
    setActiveTemplateName,
    updateMetrics,
    setZScale,
    setNormalizationMode,
    setImputationMode
  } = useTemplateLoader({
    templates: SCATTER_SCORE_TEMPLATES,
    accessibleMetrics,
    getMetricConfigDetails,
    normalizeWeights,
    onTemplateApplied: () => {
      if (DEBUG_SCATTER_SCORE) console.log('[ScatterScoreProPage] Template applied, auto-calculating scores');
      // Auto-calculate on initial template load
      handleApplyConfigurationAndCalculateScores(true);
    }
  });

  // Use score calculation hook
  const { calculateScores, datasetStatsCache } = useScoreCalculation({
    getMetricConfigDetails,
    allMetrics,
    globalMetricRangesFromContext
  });

  // Use chart hook
  const { chartDatasets, chartOptions } = useScatterScoreChart({
    plotData,
    isCalculatingScores,
    selectedXMetrics,
    selectedYMetrics,
    selectedZMetricKey,
    zScale,
    currentTemplateConfig,
    getMetricConfigDetails,
    selectedDisplayCurrency,
    statusColors: STATUS_COLORS,
    chartSettings: CHART_SETTINGS
  });

  const handleApplyConfigurationAndCalculateScores = useCallback(async (skipValidation: boolean = false) => {
    if (DEBUG_SCATTER_SCORE) {
      console.log("[ScatterScoreProPage] Applying configuration and calculating scores");
    }
    
    const finalXMetrics = normalizeWeights(selectedXMetrics);
    const finalYMetrics = normalizeWeights(selectedYMetrics);
    
    const currentXTotal = finalXMetrics.reduce((sum, m) => sum + m.weight, 0);
    const currentYTotal = finalYMetrics.reduce((sum, m) => sum + m.weight, 0);

    if (!skipValidation) {
      if (finalXMetrics.length > 0 && Math.round(currentXTotal) !== 100) {
        alert(`X-Axis weights sum to ${currentXTotal}%, but must sum to 100%. Please adjust.`);
        return;
      }
      if (finalYMetrics.length > 0 && Math.round(currentYTotal) !== 100) {
        alert(`Y-Axis weights sum to ${currentYTotal}%, but must sum to 100%. Please adjust.`);
        return;
      }
      if (finalXMetrics.length === 0 && finalYMetrics.length === 0) {
        alert("Please select at least one metric for either X or Y axis.");
        setPlotData([]);
        return;
      }
    }
    
    setIsCalculatingScores(true);
    setAxisScoreError(null);
    setPlotData([]);
    
    try {
      const companiesToScore = await fetchCompaniesByIds(filteredCompanyIds);
      if (!companiesToScore || companiesToScore.length === 0) {
        setPlotData([]);
        setIsCalculatingScores(false);
        return;
      }
      
      setChartDataSource(companiesToScore);
      
      const newPlotData = await calculateScores(
        companiesToScore,
        finalXMetrics,
        finalYMetrics,
        selectedZMetricKey,
        normalizationMode as NormalizationMode,
        imputationMode as ImputationMode
      );
      
      setPlotData(newPlotData.filter(p => 
        isValidNumber(p.xScore) && isValidNumber(p.yScore)
      ));
    } catch (error: any) {
      console.error("[ScatterScoreProPage] Error during score calculation:", error);
      setAxisScoreError(`Failed to calculate scores: ${error.message || 'Unknown error'}`);
      setPlotData([]);
    } finally {
      setIsCalculatingScores(false);
    }
  }, [
    selectedXMetrics,
    selectedYMetrics,
    selectedZMetricKey,
    normalizationMode,
    imputationMode,
    fetchCompaniesByIds,
    filteredCompanyIds,
    calculateScores
  ]);

  const handleTemplateChange = useCallback((newTemplateName: string) => {
    loadTemplate(newTemplateName);
  }, [loadTemplate]);
  
  const handleAxisMetricChange = useCallback((
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => {
    const currentMetrics = axisType === 'X' ? selectedXMetrics : selectedYMetrics;
    let newMetrics = [...currentMetrics];
    
    if (action === 'add') {
      const metricConfig = getMetricConfigDetails(metricKey);
      if (metricConfig && accessibleMetrics.some(am => am.key === metricKey)) {
        newMetrics.push({
          key: metricKey,
          metricLabel: metricConfig.label,
          weight: 5,
          userHigherIsBetter: metricConfig.higherIsBetter,
          originalHigherIsBetter: metricConfig.higherIsBetter,
        });
        newMetrics = normalizeWeights(newMetrics, metricKey, 5, true);
      }
    } else if (action === 'remove') {
      newMetrics = newMetrics.filter(m => m.key !== metricKey);
      newMetrics = normalizeWeights(newMetrics);
    } else if (action === 'updateWeight') {
      const idx = newMetrics.findIndex(m => m.key === metricKey);
      if (idx !== -1) {
        const newWeight = Math.max(0, Math.min(100, Number(value) || 0));
        newMetrics = normalizeWeights(newMetrics, metricKey, newWeight, false);
      }
    } else if (action === 'toggleHLB') {
      const idx = newMetrics.findIndex(m => m.key === metricKey);
      if (idx !== -1) {
        newMetrics[idx] = { ...newMetrics[idx], userHigherIsBetter: !!value };
      }
    }
    
    if (axisType === 'X') {
      updateMetrics(newMetrics, selectedYMetrics, selectedZMetricKey);
    } else {
      updateMetrics(selectedXMetrics, newMetrics, selectedZMetricKey);
    }
  }, [selectedXMetrics, selectedYMetrics, selectedZMetricKey, getMetricConfigDetails, accessibleMetrics, updateMetrics]);

  const handleZoomIn = useCallback(() => chartRef.current?.zoom(1.2), []);
  const handleZoomOut = useCallback(() => chartRef.current?.zoom(0.8), []);
  const handleResetZoom = useCallback(() => chartRef.current?.resetZoom(), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  // Trigger chart resize when panel state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [isConfigPanelOpen]);

  const showChart = !isCalculatingScores && !axisScoreError && plotData.length > 0 && chartDatasets.length > 0;
  const showInitialMessage = !isCalculatingScores && !axisScoreError && plotData.length === 0 && 
    selectedXMetrics.length === 0 && selectedYMetrics.length === 0 && !isTemplateLoading;

  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description={isCalculatingScores 
        ? "Calculating scores & preparing chart..." 
        : plotData.length > 0 
        ? `Displaying ${plotData.length} companies.` 
        : "Configure axes and apply to plot scores."
      }
      className="relative isolate flex flex-col flex-grow font-sans"
      contentClassName="flex flex-col flex-grow min-h-0"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
        style={{ backgroundImage: `url(data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgb(241,196,15);stop-opacity:0.1" /><stop offset="100%" style="stop-color:rgb(34,197,94);stop-opacity:0.1" /></linearGradient></defs><rect width="1200" height="600" fill="url(#g)" /><circle cx="200" cy="150" r="100" fill="rgba(241,196,15,0.05)" /><circle cx="1000" cy="450" r="150" fill="rgba(34,197,94,0.05)" /></svg>')})` }}
        aria-hidden="true"
      />

      <motion.div 
        initial={false}
        animate={{ paddingLeft: isConfigPanelOpen ? '0' : '0' }}
        transition={ANIMATION_CONFIG.panel}
        className="flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 flex-grow overflow-hidden"
      >
        {/* Mobile toggle button */}
        <Button 
          onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} 
          variant="outline" 
          className="lg:hidden fixed bottom-4 right-4 z-[60] bg-navy-700 border-navy-600 p-2 h-auto shadow-lg"
          aria-label="Toggle Configuration Panel"
        >
          <Settings size={20}/>
        </Button>

        {/* Configuration Panel */}
        <ConfigurationPanel
          isOpen={isConfigPanelOpen}
          onClose={() => setIsConfigPanelOpen(false)}
          templates={SCATTER_SCORE_TEMPLATES}
          activeTemplateName={activeTemplateName}
          onTemplateChange={handleTemplateChange}
          selectedXMetrics={selectedXMetrics}
          selectedYMetrics={selectedYMetrics}
          selectedZMetricKey={selectedZMetricKey}
          zScale={zScale}
          normalizationMode={normalizationMode}
          imputationMode={imputationMode}
          onAxisMetricChange={handleAxisMetricChange}
          onZMetricChange={(value) => updateMetrics(selectedXMetrics, selectedYMetrics, value || null)}
          onZScaleChange={setZScale}
          onNormalizationChange={(value) => {
            setNormalizationMode(value);
            setActiveTemplateName(null);
          }}
          onImputationChange={(value) => {
            setImputationMode(value);
            setActiveTemplateName(null);
          }}
          onApply={() => handleApplyConfigurationAndCalculateScores(false)}
          isCalculating={isCalculatingScores}
          accessibleMetrics={accessibleMetrics}
          currentUserTier={currentUserTier}
        />

        {/* Desktop expand button when collapsed */}
        <AnimatePresence>
          {!isConfigPanelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:block"
            >
              <Button
                onClick={() => setIsConfigPanelOpen(true)}
                variant="outline"
                size="icon"
                className="fixed left-3 bottom-3 z-[100] bg-accent-teal/90 border-teal-600 hover:bg-accent-teal shadow-md rounded-lg w-12 h-12"
                aria-label="Open configuration panel"
              >
                <Settings size={20} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chart Container */}
        <motion.div 
          layout
          transition={ANIMATION_CONFIG.panel}
          className="flex-grow relative bg-navy-800/70 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-navy-700/50 flex flex-col min-h-[400px] lg:min-h-0"
        >
          {/* Zoom Controls */}
          {showChart && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <Button 
                variant="outline" 
                size="icon-sm" 
                onClick={handleZoomIn} 
                title="Zoom In" 
                className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon-sm" 
                onClick={handleZoomOut} 
                title="Zoom Out" 
                className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon-sm" 
                onClick={handleResetZoom} 
                title="Reset Zoom" 
                className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex-grow min-h-[400px] sm:min-h-[500px]">
            {/* Loading State */}
            {(isCalculatingScores || isTemplateLoading) && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <LoadingIndicator message={
                  isTemplateLoading 
                    ? "Loading template configuration..." 
                    : "Calculating scores & preparing chart..."
                } />
              </div>
            )}
            
            {/* Error State */}
            {!isCalculatingScores && axisScoreError && (
              <div className="h-full flex items-center justify-center">
                <p className="text-destructive text-center p-4 font-medium">{axisScoreError}</p>
              </div>
            )}
            
            {/* Initial State */}
            {showInitialMessage && (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-gray-400 font-light">
                  Please select metrics for at least one axis and click "Apply Configuration & Plot".
                </p>
              </div>
            )}

            {/* Chart */}
            {showChart && (
              <Scatter 
                ref={chartRef} 
                data={{ datasets: chartDatasets }} 
                options={chartOptions} 
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}