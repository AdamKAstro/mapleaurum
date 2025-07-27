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
import type { MetricConfig, Company, Currency } from '../../lib/types';

// UI Components
import { PageContainer } from '../../components/ui/page-container';
import { Button } from '../../components/ui/button';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { 
  Settings, X, AlertTriangle, BarChart, FileWarning, 
  RefreshCw, ChevronRight, Sparkles, TrendingUp,
  Info, CheckCircle2
} from 'lucide-react';

// ScatterScorePro specific components, hooks, types, utils, constants
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { ChartControls } from './components/ChartControls';
import { useTemplateLoader } from './hooks/useTemplateLoader';
import { useScoreCalculation } from './hooks/useScoreCalculation';
import { useScatterScoreChart } from './hooks/useScatterScoreChart';
import { useAccessibleMetrics } from './hooks/useAccessibleMetrics';
import { normalizeWeights } from './utils/normalizeWeights';
import { PREDEFINED_TEMPLATES } from './templates';
import type { AxisMetricConfig, ScatterScorePlotPoint } from './types';
import { STATUS_COLORS, CHART_SETTINGS, ANIMATION_CONFIG, DEFAULT_WEIGHT_FOR_NEW_METRIC, DEBUG_SCATTER_SCORE } from './constants';
import { cn, isValidNumber } from '../../lib/utils';

interface ValidationError {
  axis: 'X' | 'Y' | 'general';
  message: string;
}

// Skeleton loader for initial chart area
const ChartSkeleton: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center p-8">
    <div className="w-full max-w-3xl">
      <div className="space-y-6">
        {/* Axis labels skeleton */}
        <div className="flex justify-between">
          <div className="h-4 w-24 bg-navy-700/50 rounded animate-pulse" />
          <div className="h-4 w-24 bg-navy-700/50 rounded animate-pulse" />
        </div>
        
        {/* Chart area skeleton */}
        <div className="relative h-[400px] bg-navy-800/30 rounded-lg overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="border border-navy-700/20" />
            ))}
          </div>
          
          {/* Scatter points skeleton */}
          <div className="absolute inset-0 p-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-4 h-4 bg-blue-500/30 rounded-full animate-pulse"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
          
          {/* Loading overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-navy-900/20 backdrop-blur-sm">
            <div className="text-center">
              <Sparkles className="h-8 w-8 text-blue-400 mx-auto animate-pulse" />
              <p className="mt-2 text-sm text-gray-400 font-medium">Preparing visualization...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Enhanced empty state component
const EmptyState: React.FC<{
  type: 'no-config' | 'no-data' | 'no-companies';
  onAction?: () => void;
}> = ({ type, onAction }) => {
  const content = {
    'no-config': {
      icon: BarChart,
      title: 'Ready to Analyze',
      description: 'Select metrics in the configuration panel to begin your scatter analysis.',
      actionLabel: 'Open Configuration',
      gradient: 'from-blue-500/20 to-purple-500/20'
    },
    'no-data': {
      icon: TrendingUp,
      title: 'No Data Available',
      description: 'No companies match your current filters for the selected metrics.',
      actionLabel: 'Adjust Filters',
      gradient: 'from-amber-500/20 to-orange-500/20'
    },
    'no-companies': {
      icon: Info,
      title: 'Select Companies',
      description: 'Choose companies from the filters to include in your analysis.',
      actionLabel: 'Select Companies',
      gradient: 'from-teal-500/20 to-cyan-500/20'
    }
  }[type];

  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center p-8 max-w-md mx-auto"
    >
      <div className={cn(
        "w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6",
        "bg-gradient-to-br", content.gradient,
        "backdrop-blur-sm border border-white/10",
        "shadow-lg"
      )}>
        <Icon className="h-10 w-10 text-white/80" />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">
        {content.title}
      </h3>
      
      <p className="text-gray-400 mb-6 leading-relaxed">
        {content.description}
      </p>
      
      {onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          className={cn(
            "group border-white/20 hover:border-white/40",
            "hover:bg-white/5 transition-all duration-200"
          )}
        >
          {content.actionLabel}
          <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      )}
    </motion.div>
  );
};

// Enhanced error state component
const ErrorState: React.FC<{
  type: 'calculation' | 'validation';
  message: string;
  errors?: ValidationError[];
  onRetry?: () => void;
}> = ({ type, message, errors, onRetry }) => {
  const isValidation = type === 'validation';
  const Icon = isValidation ? FileWarning : AlertTriangle;
  const color = isValidation ? 'amber' : 'red';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "text-center p-6 max-w-lg mx-auto rounded-xl",
        "border backdrop-blur-sm shadow-2xl",
        isValidation 
          ? "bg-amber-900/20 border-amber-700/50" 
          : "bg-red-900/20 border-red-700/50"
      )}
    >
      <div className={cn(
        "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4",
        "bg-gradient-to-br animate-pulse",
        isValidation
          ? "from-amber-500/30 to-orange-500/30"
          : "from-red-500/30 to-pink-500/30"
      )}>
        <Icon className={cn(
          "h-8 w-8",
          isValidation ? "text-amber-400" : "text-red-400"
        )} />
      </div>
      
      <h3 className={cn(
        "text-lg font-bold mb-3",
        isValidation ? "text-amber-300" : "text-red-300"
      )}>
        {isValidation ? 'Configuration Needs Attention' : 'Calculation Error'}
      </h3>
      
      {errors && errors.length > 0 ? (
        <div className="space-y-2 text-left mb-4">
          {errors.map((error, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg",
                "bg-black/20 border",
                isValidation
                  ? "border-amber-800/50"
                  : "border-red-800/50"
              )}
            >
              <AlertTriangle className={cn(
                "h-4 w-4 mt-0.5 flex-shrink-0",
                isValidation ? "text-amber-500" : "text-red-500"
              )} />
              <p className={cn(
                "text-sm",
                isValidation ? "text-amber-300/90" : "text-red-300/90"
              )}>
                {error.message}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className={cn(
          "text-sm mb-4 px-4 py-2 rounded-lg",
          "bg-black/20",
          isValidation ? "text-amber-300/80" : "text-red-300/80"
        )}>
          {message}
        </p>
      )}
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant={isValidation ? "default" : "destructive"}
          size="sm"
          className="group"
        >
          <RefreshCw className="mr-2 h-4 w-4 transition-transform group-hover:rotate-180" />
          {isValidation ? 'Fix Configuration' : 'Retry Calculation'}
        </Button>
      )}
    </motion.div>
  );
};

export function ScatterScoreProPage() {
  const { activeCompanyIds, fetchCompaniesByIds, metricFullRanges: globalMetricRangesFromContext } = useFilters();
  const { currency: selectedDisplayCurrency } = useCurrency();
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();

  const chartRef = useRef<ChartJS<'scatter', (ScatterDataPoint | null)[], unknown> | null>(null);
  const accessibleMetrics = useAccessibleMetrics();

  const getMetricConfigDetails = useCallback((key: string): MetricConfig | undefined => {
    return allMetricsData.find(m => m.key === key);
  }, []);

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [plotData, setPlotData] = useState<ScatterScorePlotPoint[]>([]);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

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
    zScale,
    currentTemplateConfig,
    getMetricConfigDetails,
    selectedDisplayCurrency: selectedDisplayCurrency as Currency,
    statusColors: STATUS_COLORS,
    chartSettings: CHART_SETTINGS
  });

  const validateConfiguration = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (activeCompanyIds.length === 0) {
      errors.push({ 
        axis: 'general', 
        message: 'Please select at least one company to analyze.' 
      });
    }
    
    if (selectedXMetrics.length === 0 && selectedYMetrics.length === 0) {
      errors.push({ 
        axis: 'general', 
        message: 'Please select at least one metric for the X or Y axis.' 
      });
      return errors;
    }
    
    if (selectedXMetrics.length > 0) {
      const xTotal = selectedXMetrics.reduce((sum, m) => sum + m.weight, 0);
      if (Math.round(xTotal) !== 100) {
        errors.push({ 
          axis: 'X', 
          message: `X-Axis weights must sum to 100% (currently ${Math.round(xTotal)}%).` 
        });
      }
    }
    
    if (selectedYMetrics.length > 0) {
      const yTotal = selectedYMetrics.reduce((sum, m) => sum + m.weight, 0);
      if (Math.round(yTotal) !== 100) {
        errors.push({ 
          axis: 'Y', 
          message: `Y-Axis weights must sum to 100% (currently ${Math.round(yTotal)}%).` 
        });
      }
    }
    
    return errors;
  }, [selectedXMetrics, selectedYMetrics, activeCompanyIds]);

  const handleApplyConfigurationAndCalculateScores = useCallback(async (skipValidation: boolean = false) => {
    if (DEBUG_SCATTER_SCORE) console.log("[SSP] Apply called. Skip validation:", skipValidation);

    setCalculationError(null);
    setValidationErrors([]);
    setShowSuccessAnimation(false);

    if (!skipValidation) {
      const errors = validateConfiguration();
      if (errors.length > 0) {
        setValidationErrors(errors);
        setIsCalculating(false);
        setPlotData([]);
        return;
      }
    }
    
    setIsCalculating(true);

    try {
      const companiesToScore = await fetchCompaniesByIds(activeCompanyIds);
      if (!companiesToScore || companiesToScore.length === 0) {
        setPlotData([]);
        setIsCalculating(false);
        return;
      }

      const results = await calculateScores(
        companiesToScore, 
        selectedXMetrics, 
        selectedYMetrics, 
        selectedZMetricKey, 
        zScale, 
        normalizationMode, 
        imputationMode
      );
      
      const validResults = results.filter(p => isValidNumber(p.xScore) && isValidNumber(p.yScore));
      setPlotData(validResults);
      
      // Show success animation for non-initial loads
      if (isInitialLoadComplete && validResults.length > 0) {
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 2000);
      }

    } catch (error: any) {
      console.error("[SSP] Error during score calculation:", error);
      setCalculationError(error.message || 'An unexpected error occurred during calculation.');
      setPlotData([]);
    } finally {
      setIsCalculating(false);
      if (!isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
      }
    }
  }, [
    activeCompanyIds, calculateScores, fetchCompaniesByIds, isInitialLoadComplete,
    normalizationMode, imputationMode, selectedXMetrics, selectedYMetrics,
    selectedZMetricKey, zScale, validateConfiguration
  ]);

  // AUTO-PLOT on initial load
  useEffect(() => {
    if (isTemplateReady && accessibleMetrics.length > 0 && !isInitialLoadComplete && !isCalculating && activeCompanyIds.length > 0) {
      if (DEBUG_SCATTER_SCORE) console.log("%c[SSP] Triggering initial auto-plot...", 'color: #8A2BE2; font-weight: bold;');
      handleApplyConfigurationAndCalculateScores(true);
    }
  }, [isTemplateReady, accessibleMetrics, isInitialLoadComplete, isCalculating, activeCompanyIds, handleApplyConfigurationAndCalculateScores]);
  
  const handleAxisMetricChange = useCallback((
    axisType: 'X' | 'Y', 
    metricKey: string, 
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB', 
    value?: any
  ) => {
    const currentMetrics = axisType === 'X' ? selectedXMetrics : selectedYMetrics;
    let newMetricsArray = [...currentMetrics];
    const existingIndex = newMetricsArray.findIndex(m => m.key === metricKey);

    if (action === 'add') {
      if (existingIndex === -1) {
        const metricConfig = getMetricConfigDetails(metricKey);
        if (metricConfig) {
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
    } else if (action === 'remove' && existingIndex !== -1) {
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
    
    updateMetricsFromLoader(
      axisType === 'X' ? newMetricsArray : selectedXMetrics, 
      axisType === 'Y' ? newMetricsArray : selectedYMetrics, 
      selectedZMetricKey
    );
  }, [selectedXMetrics, selectedYMetrics, selectedZMetricKey, getMetricConfigDetails, normalizeWeights, updateMetricsFromLoader]);

  const handleZMetricChange = useCallback((metricKey: string | null) => {
    updateMetricsFromLoader(selectedXMetrics, selectedYMetrics, metricKey);
  }, [selectedXMetrics, selectedYMetrics, updateMetricsFromLoader]);

  const handleZoomIn = useCallback(() => chartRef.current?.zoom(1.2), []);
  const handleZoomOut = useCallback(() => chartRef.current?.zoom(0.8), []);
  const handleResetZoom = useCallback(() => chartRef.current?.resetZoom(), []);

  // Resize chart when panel opens/closes
  useEffect(() => {
    const timer = setTimeout(() => chartRef.current?.resize(), 350);
    return () => clearTimeout(timer);
  }, [isConfigPanelOpen]);
  
  const pageDescription = useMemo(() => {
    if (!isInitialLoadComplete || isCalculating) {
      return "Initializing advanced scatter analysis...";
    }
    if (calculationError) {
      return "Unable to complete calculation. Please retry.";
    }
    if (validationErrors.length > 0) {
      return "Configuration needs adjustment before plotting.";
    }
    if (plotData.length > 0) {
      return `Visualizing ${plotData.length} compan${plotData.length === 1 ? 'y' : 'ies'} across ${
        (selectedXMetrics.length > 0 ? 1 : 0) + (selectedYMetrics.length > 0 ? 1 : 0)
      } dimension${selectedXMetrics.length > 0 && selectedYMetrics.length > 0 ? 's' : ''}.`;
    }
    return "Configure metrics and apply to generate scatter plot.";
  }, [isInitialLoadComplete, isCalculating, calculationError, validationErrors.length, plotData.length, selectedXMetrics, selectedYMetrics]);
  
  const hasPlotConfig = selectedXMetrics.length > 0 || selectedYMetrics.length > 0;
  const hasNoCompanies = activeCompanyIds.length === 0;

  // Initial loading state
  if (isSubscriptionLoading || (isTemplateLoading && !isInitialLoadComplete)) {
    return (
      <PageContainer 
        title="Advanced ScatterScore Analysis" 
        description="Preparing your analysis environment..."
      >
        <div className="flex-grow flex items-center justify-center h-full p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center animate-pulse">
                <Sparkles className="h-12 w-12 text-blue-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-ping" />
            </div>
            <p className="mt-6 text-lg font-medium text-white">
              {isSubscriptionLoading ? "Verifying subscription..." : "Loading ScatterScore Pro..."}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Preparing advanced analytics tools
            </p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description={pageDescription}
      className="relative isolate flex flex-col flex-grow font-sans"
      contentClassName="flex flex-col flex-grow min-h-0"
    >
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-grow overflow-hidden">
        {/* Mobile Panel Toggle */}
        <AnimatePresence>
          {!isConfigPanelOpen && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="lg:hidden"
            >
              <Button 
                onClick={() => setIsConfigPanelOpen(true)} 
                variant="outline" 
                className={cn(
                  "fixed bottom-4 right-4 z-[60]",
                  "bg-gradient-to-r from-blue-600 to-purple-600",
                  "border-0 text-white shadow-2xl",
                  "hover:from-blue-500 hover:to-purple-500",
                  "h-14 w-14 rounded-full"
                )}
              >
                <Settings className="h-6 w-6" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Configuration Panel */}
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

        {/* Desktop Panel Toggle */}
        <AnimatePresence>
          {!isConfigPanelOpen && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }} 
              transition={{ type: "spring", damping: 20 }}
              className="hidden lg:block"
            >
              <Button 
                onClick={() => setIsConfigPanelOpen(true)} 
                variant="outline" 
                size="icon" 
                className={cn(
                  "fixed left-4 top-1/2 -translate-y-1/2 z-[45]",
                  "bg-gradient-to-br from-blue-500 to-purple-600",
                  "border-0 text-white shadow-2xl",
                  "hover:from-blue-400 hover:to-purple-500",
                  "hover:scale-110 transition-all duration-200",
                  "w-12 h-12 rounded-xl"
                )}
                aria-label="Open configuration panel"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chart Area */}
        <motion.div 
          layout 
          transition={ANIMATION_CONFIG.panel} 
          className={cn(
            "flex-grow relative",
            "bg-gradient-to-br from-navy-900/50 to-navy-800/50",
            "backdrop-blur-sm rounded-xl",
            "shadow-2xl border border-navy-700/50",
            "flex flex-col min-h-[500px] lg:min-h-0",
            "overflow-hidden"
          )}
        >
          {/* Success Animation Overlay */}
          <AnimatePresence>
            {showSuccessAnimation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/20"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="bg-emerald-500/20 rounded-full p-8 backdrop-blur-sm"
                >
                  <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chart Controls */}
          {plotData.length > 0 && !isCalculating && (
            <ChartControls 
              onZoomIn={handleZoomIn} 
              onZoomOut={handleZoomOut} 
              onResetZoom={handleResetZoom}
              className="z-20"
            />
          )}
          
          {/* Main Content Area */}
          <div className="flex-grow flex items-center justify-center p-6">
            <AnimatePresence mode="wait">
              {/* Initial Loading State */}
              {!isInitialLoadComplete && isCalculating ? (
                <motion.div
                  key="initial-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <ChartSkeleton />
                </motion.div>
              ) : isCalculating ? (
                /* Subsequent Calculation Loading */
                <motion.div 
                  key="calculating" 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center"
                >
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-10 w-10 text-blue-400" />
                      </motion.div>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-ping" />
                  </div>
                  <p className="mt-6 text-lg font-medium text-white">
                    Recalculating scores...
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Analyzing {activeCompanyIds.length} compan{activeCompanyIds.length === 1 ? 'y' : 'ies'}
                  </p>
                </motion.div>
              ) : calculationError ? (
                /* Calculation Error */
                <ErrorState
                  key="error"
                  type="calculation"
                  message={calculationError}
                  onRetry={() => handleApplyConfigurationAndCalculateScores(false)}
                />
              ) : validationErrors.length > 0 ? (
                /* Validation Errors */
                <ErrorState
                  key="validation"
                  type="validation"
                  message="Please fix the configuration issues"
                  errors={validationErrors}
                  onRetry={() => setIsConfigPanelOpen(true)}
                />
              ) : plotData.length > 0 ? (
                /* Chart Display */
                <motion.div 
                  key="chart" 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full relative"
                >
                  <Scatter 
                    ref={chartRef} 
                    data={{ datasets: chartDatasets }} 
                    options={chartOptions} 
                  />
                  
                  {/* Data Summary Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={cn(
                      "absolute bottom-4 left-4",
                      "px-3 py-1.5 rounded-full",
                      "bg-navy-800/80 backdrop-blur-sm",
                      "border border-navy-600/50",
                      "shadow-lg"
                    )}
                  >
                    <p className="text-xs font-medium text-gray-300">
                      {plotData.length} data point{plotData.length !== 1 ? 's' : ''} plotted
                    </p>
                  </motion.div>
                </motion.div>
              ) : hasNoCompanies ? (
                /* No Companies Selected */
                <EmptyState
                  key="no-companies"
                  type="no-companies"
                  onAction={() => {/* Open filters */}}
                />
              ) : !hasPlotConfig ? (
                /* No Configuration */
                <EmptyState
                  key="no-config"
                  type="no-config"
                  onAction={() => setIsConfigPanelOpen(true)}
                />
              ) : (
                /* No Data */
                <EmptyState
                  key="no-data"
                  type="no-data"
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </PageContainer>
  );
}