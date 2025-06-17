// src/pages/scatter-score-pro/index.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, type ScatterDataPoint } from 'chart.js';
import { Scatter } from 'react-chartjs-2';

// Contexts & Global Data
import { useFilters } from '../../contexts/filter-context';
import { useCurrency } from '../../contexts/currency-context';
import { useSubscription } from '../../contexts/subscription-context';
import { metrics as allMetricsData, getMetricConfig as getMetricConfigUtil } from '../../lib/metric-types';
import type { MetricConfig, NormalizationMode, ImputationMode, Company, Currency } from '../../lib/types';

// UI Components
import { PageContainer } from '../../components/ui/page-container';
import { Button } from '../../components/ui/button';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { Settings, X } from 'lucide-react';

// ScatterScorePro specific components, hooks, types, utils, constants
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ChartControls } from './components/ChartControls';
import { useTemplateLoader } from './hooks/useTemplateLoader';
import { useScoreCalculation } from './hooks/useScoreCalculation';
import { useScatterScoreChart } from './hooks/useScatterScoreChart';
import { useAccessibleMetrics } from './hooks/useAccessibleMetrics';
import { normalizeWeights } from './utils/normalizeWeights';
import { PREDEFINED_TEMPLATES, getTemplateByName } from './templates';
import type { AxisMetricConfig, ScatterScorePlotPoint, TemplateConfig } from './types';
import { STATUS_COLORS, CHART_SETTINGS, ANIMATION_CONFIG, DEFAULT_WEIGHT_FOR_NEW_METRIC, DEBUG_SCATTER_SCORE } from './constants';
import { cn, isValidNumber } from '../../lib/utils';

// Error types for better error handling
interface ValidationError {
  axis: 'X' | 'Y' | 'general';
  message: string;
}

export function ScatterScoreProPage() {
  const {
    activeCompanyIds,
    fetchCompaniesByIds,
    metricFullRanges: globalMetricRangesFromContext
  } = useFilters();
  const { currency: selectedDisplayCurrency } = useCurrency();
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();

  const chartRef = useRef<ChartJS<'scatter', (ScatterDataPoint | null)[], unknown> | null>(null);

  const accessibleMetrics = useAccessibleMetrics();
  console.log('%c[ScatterScoreProPage] accessibleMetrics from hook:', 'color: green; font-weight: bold;', accessibleMetrics.length, accessibleMetrics.map(m=>m.key).slice(0,10));


  const getMetricConfigDetails = useCallback((key: string): MetricConfig | undefined => {
    return allMetricsData.find(m => m.key === key);
  }, []);

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [plotData, setPlotData] = useState<ScatterScorePlotPoint[]>([]);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

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
    updateMetrics: updateMetricsFromLoader,
    setZScale: setZScaleInLoader,
    setNormalizationMode: setNormalizationModeInLoader,
    setImputationMode: setImputationModeInLoader,
  } = useTemplateLoader({
    templates: PREDEFINED_TEMPLATES,
    accessibleMetrics,
    getMetricConfigDetails,
    normalizeWeights,
    onTemplateApplied: () => {
      if (DEBUG_SCATTER_SCORE) console.log('[ScatterScoreProPage] onTemplateApplied: Triggering initial score calculation.');
      handleApplyConfigurationAndCalculateScores(true);
      setIsInitialLoadComplete(true);
    }
  });

  const { calculateScores } = useScoreCalculation({
    getMetricConfigDetails,
    allMetrics: allMetricsData,
    globalMetricRangesFromContext
  });

  const { chartDatasets, chartOptions } = useScatterScoreChart({
    plotData,
    isCalculatingScores: isCalculating,
    selectedXMetrics,
    selectedYMetrics,
    selectedZMetricKey,
    zScale, // Pass zScale to useScatterScoreChart
    currentTemplateConfig,
    getMetricConfigDetails,
    selectedDisplayCurrency: selectedDisplayCurrency as Currency,
    statusColors: STATUS_COLORS,
    chartSettings: CHART_SETTINGS
  });

  // Enhanced validation function
  const validateConfiguration = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (selectedXMetrics.length === 0 && selectedYMetrics.length === 0) {
      errors.push({ axis: 'general', message: 'Please select at least one metric for X or Y axis.' });
      return errors;
    }

    if (selectedXMetrics.length > 0) {
      const xTotal = selectedXMetrics.reduce((sum, m) => sum + m.weight, 0);
      const roundedXTotal = Math.round(xTotal);
      if (roundedXTotal !== 100) {
        errors.push({
          axis: 'X',
          message: `X-Axis weights sum to ${roundedXTotal}%, must be 100%.`
        });
      }
    }

    if (selectedYMetrics.length > 0) {
      const yTotal = selectedYMetrics.reduce((sum, m) => sum + m.weight, 0);
      const roundedYTotal = Math.round(yTotal);
      if (roundedYTotal !== 100) {
        errors.push({
          axis: 'Y',
          message: `Y-Axis weights sum to ${roundedYTotal}%, must be 100%.`
        });
      }
    }

    return errors;
  }, [selectedXMetrics, selectedYMetrics]);

  const handleApplyConfigurationAndCalculateScores = useCallback(async (skipValidation: boolean = false) => {
    if (DEBUG_SCATTER_SCORE) console.log("[ScatterScoreProPage] handleApply called. Skip validation:", skipValidation);

    setIsCalculating(true);
    setCalculationError(null);
    setValidationErrors([]);

    if (!skipValidation) {
      const errors = validateConfiguration();
      if (errors.length > 0) {
        setValidationErrors(errors);
        const errorMessage = errors.map(e => e.message).join('\n');
        alert(errorMessage);
        setIsCalculating(false);
        if (errors.some(e => e.axis === 'general')) {
          setPlotData([]);
        }
        return;
      }
    }

    try {
      const companiesToScore = await fetchCompaniesByIds(activeCompanyIds);

      if (!companiesToScore || companiesToScore.length === 0) {
        if (DEBUG_SCATTER_SCORE) console.log("[ScatterScoreProPage] No companies to score after filtering/selection.");
        setPlotData([]);
        setIsCalculating(false);
        return;
      }

      if (DEBUG_SCATTER_SCORE) {
        console.log(`[ScatterScoreProPage] Scoring ${companiesToScore.length} companies.`);
      }

      const results = await calculateScores(
        companiesToScore,
        selectedXMetrics,
        selectedYMetrics,
        selectedZMetricKey,
        zScale, // Pass zScale to calculateScores
        normalizationMode,
        imputationMode
      );

      const validResults = results.filter(p => isValidNumber(p.xScore) && isValidNumber(p.yScore));
      setPlotData(validResults);

      if (DEBUG_SCATTER_SCORE) {
        console.log(`[ScatterScoreProPage] Calculation complete. Plottable points: ${validResults.length}`);
      }
    } catch (error: any) {
      console.error("[ScatterScoreProPage] Error during score calculation:", error);
      const errorMessage = error.message || 'Unknown error occurred during score calculation';
      setCalculationError(`Failed to calculate scores: ${errorMessage}`);
      setPlotData([]);
    } finally {
      setIsCalculating(false);
    }
  }, [
    selectedXMetrics, selectedYMetrics, selectedZMetricKey, zScale, // Added zScale as dependency
    normalizationMode, imputationMode,
    fetchCompaniesByIds, activeCompanyIds, calculateScores,
    validateConfiguration
  ]);

  const handleAxisMetricChange = useCallback((
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => {
    try {
      const currentMetrics = axisType === 'X' ? selectedXMetrics : selectedYMetrics;
      let newMetricsArray = [...currentMetrics];
      const existingIndex = newMetricsArray.findIndex(m => m.key === metricKey);

      const activeTpl = activeTemplateName ? getTemplateByName(activeTemplateName) : null;
      const strategy = activeTpl?.metricSelectionStrategy;

      if (action === 'add') {
        if (existingIndex === -1) {
          const metricConfig = getMetricConfigDetails(metricKey);
          if (metricConfig && accessibleMetrics.some(am => am.key === metricKey)) {
            if (strategy && strategy.maxTotal && newMetricsArray.length >= strategy.maxTotal) {
              alert(`Cannot add more than ${strategy.maxTotal} metrics for this axis with the current template strategy.`);
              return;
            }
            newMetricsArray.push({
              key: metricKey,
              metricLabel: metricConfig.label,
              weight: DEFAULT_WEIGHT_FOR_NEW_METRIC,
              userHigherIsBetter: metricConfig.higherIsBetter,
              originalHigherIsBetter: metricConfig.higherIsBetter,
            });
            newMetricsArray = normalizeWeights(newMetricsArray, metricKey, DEFAULT_WEIGHT_FOR_NEW_METRIC, true);
          }
        }
      } else if (action === 'remove') {
        if (existingIndex === -1) return; // Metric not found, nothing to remove

        const metricToRemove = newMetricsArray[existingIndex];

        if (strategy && strategy.minRequired && newMetricsArray.length - 1 < strategy.minRequired) {
          alert(`Cannot remove metric. Minimum ${strategy.minRequired} metrics required for this axis with the current template strategy.`);
          return;
        }

        if (strategy && strategy.priorityGroups && metricToRemove) {
          for (const group of strategy.priorityGroups) {
            // Check if the metric belongs to a priority group
            // Note: This assumes AxisMetricConfig has a 'category' field which might need to be added
            const metricCategory = (metricToRemove as any).category;
            if (metricCategory === group.category) {
              const metricsInGroup = newMetricsArray.filter(m => (m as any).category === group.category);
              if (metricsInGroup.length - 1 < group.minCount) {
                alert(`Cannot remove metric '${metricToRemove.metricLabel}'. It's part of priority group '${group.category}' which requires at least ${group.minCount} metrics.`);
                return;
              }
            }
          }
        }

        newMetricsArray = newMetricsArray.filter(m => m.key !== metricKey);
        if (newMetricsArray.length > 0) {
          newMetricsArray = normalizeWeights(newMetricsArray);
        }
      } else if (existingIndex !== -1) {
        if (action === 'updateWeight') {
          const newWeight = Math.max(0, Math.min(100, Number(value) || 0));
          newMetricsArray[existingIndex].weight = newWeight;
          newMetricsArray = normalizeWeights(newMetricsArray, metricKey, newWeight, false);
        } else if (action === 'toggleHLB') {
          newMetricsArray[existingIndex] = {
            ...newMetricsArray[existingIndex],
            userHigherIsBetter: !!value
          };
        }
      }

      if (axisType === 'X') {
        updateMetricsFromLoader(newMetricsArray, selectedYMetrics, selectedZMetricKey);
      } else {
        updateMetricsFromLoader(selectedXMetrics, newMetricsArray, selectedZMetricKey);
      }
    } catch (error) {
      console.error(`[ScatterScoreProPage] Error in handleAxisMetricChange:`, error);
      alert('An error occurred while updating metrics. Please try again.');
    }
  }, [
    selectedXMetrics, selectedYMetrics, selectedZMetricKey, activeTemplateName,
    getMetricConfigDetails, accessibleMetrics, normalizeWeights, updateMetricsFromLoader
  ]);

  const handleZMetricChange = useCallback((metricKey: string | null) => {
    try {
      updateMetricsFromLoader(selectedXMetrics, selectedYMetrics, metricKey);
    } catch (error) {
      console.error('[ScatterScoreProPage] Error updating Z metric:', error);
    }
  }, [selectedXMetrics, selectedYMetrics, updateMetricsFromLoader]);

  const handleZoomIn = useCallback(() => chartRef.current?.zoom(1.2), []);
  const handleZoomOut = useCallback(() => chartRef.current?.zoom(0.8), []);
  const handleResetZoom = useCallback(() => chartRef.current?.resetZoom(), []);

  // Ensure chart resizes properly when panel opens/closes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    }, ANIMATION_CONFIG.panel.stiffness ? 350 : 350);

    return () => clearTimeout(timer);
  }, [isConfigPanelOpen]);

  const canPlot = selectedXMetrics.length > 0 || selectedYMetrics.length > 0;
  const hasValidationErrors = validationErrors.length > 0;

  // Handle subscription loading state
  if (isSubscriptionLoading) {
    return (
      <PageContainer title="Advanced ScatterScore Analysis" description="Loading subscription...">
        <div className="flex-grow flex items-center justify-center h-full">
          <LoadingIndicator message="Loading subscription status..." />
        </div>
      </PageContainer>
    );
  }

  if (!isInitialLoadComplete && (isTemplateLoading || accessibleMetrics.length === 0)) {
    return (
      <PageContainer title="Advanced ScatterScore Analysis" description="Initializing...">
        <div className="flex-grow flex items-center justify-center h-full">
          <LoadingIndicator message="Loading ScatterScore Pro..." />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description={
        isCalculating ? "Calculating scores & preparing chart..."
        : plotData.length > 0 ? `Displaying ${plotData.length} companies.`
        : "Configure axes and apply to plot scores."
      }
      className="relative isolate flex flex-col flex-grow font-sans"
      contentClassName="flex flex-col flex-grow min-h-0"
    >
      <motion.div
        className="flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 flex-grow overflow-hidden"
      >
        <Button
          onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
          variant="outline"
          className="lg:hidden fixed bottom-4 right-4 z-[60] bg-navy-700 border-navy-600 p-2 h-auto shadow-lg"
          aria-label="Toggle Configuration Panel"
        >
          <Settings size={20}/>
        </Button>

        <ConfigurationPanel
          isOpen={isConfigPanelOpen}
          onClose={() => setIsConfigPanelOpen(false)}
          templates={PREDEFINED_TEMPLATES}
          activeTemplateName={activeTemplateName}
          onTemplateChange={loadTemplate}
          selectedXMetrics={selectedXMetrics}
          selectedYMetrics={selectedYMetrics}
          selectedZMetricKey={selectedZMetricKey}
          zScale={zScale}
          normalizationMode={normalizationMode}
          imputationMode={imputationMode}
          onAxisMetricChange={handleAxisMetricChange}
          onZMetricChange={handleZMetricChange}
          onZScaleChange={setZScaleInLoader}
          onNormalizationChange={setNormalizationModeInLoader}
          onImputationChange={setImputationModeInLoader}
          onApply={() => handleApplyConfigurationAndCalculateScores(false)}
          isCalculating={isCalculating || isTemplateLoading}
          accessibleMetrics={accessibleMetrics}
          currentUserTier={currentUserSubscriptionTier}
        />

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
                className="fixed left-3 bottom-3 z-[45] bg-accent-teal/90 border-teal-600 hover:bg-accent-teal shadow-md rounded-lg w-12 h-12"
                aria-label="Open configuration panel"
              >
                <Settings size={20} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout
          transition={ANIMATION_CONFIG.panel}
          className="flex-grow relative bg-navy-800/70 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-navy-700/50 flex flex-col min-h-[400px] lg:min-h-0"
        >
          {(plotData.length > 0 || isCalculating) && !calculationError && (
            <ChartControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
            />
          )}

          <div className="flex-grow min-h-[400px] sm:min-h-[500px] flex items-center justify-center">
            {isCalculating || (isTemplateLoading && !isInitialLoadComplete) ? (
              <LoadingIndicator
                message={isCalculating ? "Calculating scores..." : "Loading template..."}
              />
            ) : calculationError ? (
              <div className="text-center p-4">
                <p className="text-destructive font-medium mb-2">{calculationError}</p>
                <Button
                  onClick={() => {
                    setCalculationError(null);
                    handleApplyConfigurationAndCalculateScores(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : hasValidationErrors && plotData.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-yellow-500 font-medium mb-2">Configuration errors:</p>
                {validationErrors.map((error, idx) => (
                  <p key={idx} className="text-yellow-400 text-sm">
                    {error.axis !== 'general' ? `${error.axis}-Axis: ` : ''}{error.message}
                  </p>
                ))}
              </div>
            ) : plotData.length === 0 && canPlot && isInitialLoadComplete ? (
              <p className="text-center text-gray-400 p-4 font-light">
                No data to plot. Try adjusting filters or metric configuration.
              </p>
            ) : plotData.length === 0 && !canPlot && isInitialLoadComplete ? (
              <p className="text-center text-gray-400 font-light">
                Please select metrics and click "Apply Configuration & Plot".
              </p>
            ) : plotData.length > 0 && chartDatasets.length > 0 ? (
              <Scatter
                ref={chartRef}
                data={{ datasets: chartDatasets }}
                options={chartOptions}
              />
            ) : isInitialLoadComplete && (
              <p className="text-center text-gray-400 p-4 font-light">
                No data to display. Please check your configuration and filters.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}