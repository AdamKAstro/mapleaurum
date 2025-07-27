// src/pages/scatter-score-pro/components/ConfigurationPanel.tsx
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { Info, X, Loader2, PlayCircle, Sparkles, CheckCircle2, AlertCircle, Settings2 } from 'lucide-react';
import { MetricSelector } from '../../../components/metric-selector';
import type { ScatterScoreTemplate, AxisMetricConfig, NormalizationMode, ImputationMode } from '../types';
import type { MetricConfig } from '../../../lib/metric-types';
import { cn } from '../../../lib/utils';
import { ANIMATION_CONFIG } from '../constants';
import { AxisMetricConfigurator } from './AxisMetricConfigurator';
import { ScaleToggle } from './ScaleToggle';

interface ConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ScatterScoreTemplate[];
  activeTemplateName: string | null;
  onTemplateChange: (templateName: string) => void;
  selectedXMetrics: AxisMetricConfig[];
  selectedYMetrics: AxisMetricConfig[];
  selectedZMetricKey: string | null;
  zScale: 'linear' | 'log';
  normalizationMode: NormalizationMode;
  imputationMode: ImputationMode;
  onAxisMetricChange: (
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => void;
  onZMetricChange: (value: string | null) => void;
  onZScaleChange: (value: 'linear' | 'log') => void;
  onNormalizationChange: (value: NormalizationMode) => void;
  onImputationChange: (value: ImputationMode) => void;
  onApply: () => void;
  isCalculating: boolean;
  accessibleMetrics: MetricConfig[];
  currentUserTier?: string | null;
}

// Configuration status helper
const getConfigStatus = (
  xMetrics: AxisMetricConfig[],
  yMetrics: AxisMetricConfig[],
  xWeight: number,
  yWeight: number
) => {
  const hasXMetrics = xMetrics.length > 0;
  const hasYMetrics = yMetrics.length > 0;
  const xWeightValid = Math.round(xWeight) === 100;
  const yWeightValid = Math.round(yWeight) === 100;
  
  if (!hasXMetrics && !hasYMetrics) {
    return { status: 'empty', message: 'Select metrics to begin' };
  }
  
  if (hasXMetrics && !xWeightValid || hasYMetrics && !yWeightValid) {
    return { status: 'warning', message: 'Adjust weights to 100%' };
  }
  
  if ((hasXMetrics && xWeightValid) || (hasYMetrics && yWeightValid)) {
    return { status: 'ready', message: 'Ready to plot' };
  }
  
  return { status: 'empty', message: 'Configure axes' };
};

// Section card component for consistent styling
const SectionCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className={cn(
      "relative rounded-xl border transition-all duration-300",
      "bg-gradient-to-br from-navy-900/50 to-navy-800/50",
      "backdrop-blur-sm border-navy-700/50",
      "hover:border-navy-600/50 hover:shadow-lg",
      "before:absolute before:inset-0 before:rounded-xl",
      "before:bg-gradient-to-br before:from-blue-500/0 before:to-purple-500/0",
      "hover:before:from-blue-500/5 hover:before:to-purple-500/5",
      "before:transition-all before:duration-300",
      className
    )}
  >
    <div className="relative z-10 p-4">
      {children}
    </div>
  </motion.div>
);

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  isOpen,
  onClose,
  templates,
  activeTemplateName,
  onTemplateChange,
  selectedXMetrics,
  selectedYMetrics,
  selectedZMetricKey,
  zScale,
  normalizationMode,
  imputationMode,
  onAxisMetricChange,
  onZMetricChange,
  onZScaleChange,
  onNormalizationChange,
  onImputationChange,
  onApply,
  isCalculating,
  accessibleMetrics,
  currentUserTier
}) => {
  const xTotalWeight = selectedXMetrics.reduce((sum, m) => sum + m.weight, 0);
  const yTotalWeight = selectedYMetrics.reduce((sum, m) => sum + m.weight, 0);
  
  const configStatus = useMemo(
    () => getConfigStatus(selectedXMetrics, selectedYMetrics, xTotalWeight, yTotalWeight),
    [selectedXMetrics, selectedYMetrics, xTotalWeight, yTotalWeight]
  );
  
  const canApply = configStatus.status !== 'empty' && !isCalculating;

  // Animation variants for staggered children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div 
          key="config-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: "auto",
            opacity: 1,
            transition: { width: ANIMATION_CONFIG.panel, opacity: ANIMATION_CONFIG.fadeIn }
          }}
          exit={{ 
            width: 0,
            opacity: 0,
            transition: { width: ANIMATION_CONFIG.panel, opacity: { duration: 0.1 } }
          }}
          className="flex-shrink-0 overflow-hidden lg:block fixed inset-0 z-50 lg:relative lg:z-auto lg:inset-auto"
        >
          <div
            className={cn(
              "h-full flex flex-col",
              "bg-gradient-to-br from-navy-800/90 to-navy-900/90",
              "backdrop-blur-xl backdrop-saturate-150",
              "border-r border-navy-700/50",
              "lg:w-[380px] xl:w-[420px]",
              "lg:max-h-[calc(100vh-var(--header-height,60px)-2rem)]",
              "lg:rounded-xl lg:shadow-2xl"
            )}
            style={{ '--header-height': '60px' } as React.CSSProperties}
          >
            {/* Enhanced Sticky Header */}
            <div className={cn(
              "sticky top-0 z-30",
              "flex justify-between items-center px-5 py-4",
              "bg-gradient-to-r from-navy-800/95 to-navy-900/95",
              "backdrop-blur-md border-b border-navy-700/50",
              "shadow-lg flex-shrink-0"
            )}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <Settings2 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Configuration</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{configStatus.message}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose} 
                className={cn(
                  "text-gray-400 hover:text-white",
                  "hover:bg-white/10 active:bg-white/20",
                  "transition-all duration-200",
                  "h-9 w-9 rounded-lg"
                )}
                aria-label="Close configuration panel"
              >
                <X size={20}/>
              </Button>
            </div>

            {/* Enhanced Scrollable Content */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                "flex-grow overflow-y-auto",
                "scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-transparent",
                "hover:scrollbar-thumb-navy-500",
                "p-5 space-y-4"
              )}
            >
              {/* Template Selection Card */}
              <SectionCard>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Template
                  </Label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className={cn(
                            "p-1.5 rounded-md",
                            "text-gray-400 hover:text-blue-400",
                            "hover:bg-blue-500/10",
                            "transition-all duration-200"
                          )}
                          aria-label="View template descriptions"
                        >
                          <Info size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="left" 
                        align="end" 
                        className={cn(
                          "max-w-[320px] p-4 z-[100]",
                          "bg-navy-800 border border-navy-600",
                          "shadow-2xl backdrop-blur-md"
                        )}
                      >
                        <div className="space-y-3">
                          {templates.map((t, index) => (
                            <div 
                              key={t.id} 
                              className={cn(
                                "pb-3",
                                index < templates.length - 1 && "border-b border-navy-700/50"
                              )}
                            >
                              <p className="font-bold text-blue-400 mb-1">{t.name}</p>
                              <p className="text-gray-300 text-xs leading-relaxed">{t.description}</p>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={activeTemplateName || ""} onValueChange={onTemplateChange}>
                  <SelectTrigger 
                    id="template-select" 
                    className={cn(
                      "w-full h-11",
                      "bg-navy-800/50 border-navy-600",
                      "text-gray-300 font-medium",
                      "hover:bg-navy-800/70 hover:border-navy-500",
                      "focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30",
                      "transition-all duration-200"
                    )}
                  >
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent className={cn(
                    "bg-navy-900 border-navy-700",
                    "shadow-2xl backdrop-blur-md"
                  )}>
                    {templates.map(t => (
                      <SelectItem 
                        key={t.id} 
                        value={t.name} 
                        className={cn(
                          "text-gray-300 font-medium",
                          "focus:bg-blue-900/30 focus:text-blue-300",
                          "transition-colors duration-150"
                        )}
                      >
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SectionCard>

              {/* Axis Configurations with enhanced spacing */}
              <div className="space-y-4">
                <AxisMetricConfigurator
                  axisTitle="X-Axis Metrics"
                  currentSelectedMetricsForAxis={selectedXMetrics}
                  axisType="X"
                  currentTotalWeightForAxis={xTotalWeight}
                  accessibleMetrics={accessibleMetrics}
                  handleAxisMetricChange={onAxisMetricChange}
                />
                <AxisMetricConfigurator
                  axisTitle="Y-Axis Metrics"
                  currentSelectedMetricsForAxis={selectedYMetrics}
                  axisType="Y"
                  currentTotalWeightForAxis={yTotalWeight}
                  accessibleMetrics={accessibleMetrics}
                  handleAxisMetricChange={onAxisMetricChange}
                />
              </div>

              {/* Z-Axis Configuration Card */}
              <SectionCard>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
                  <span className="text-2xl">🫧</span>
                  Bubble Size (Z-Axis)
                </h3>
                <MetricSelector
                  label=""
                  selectedMetric={selectedZMetricKey || ""}
                  onMetricChange={onZMetricChange}
                  currentTier={currentUserTier}
                  availableMetrics={accessibleMetrics}
                  filterForNumericOnly={true}
                  placeholder="Select metric for bubble size..."
                  triggerClassName={cn(
                    "w-full h-11",
                    "bg-navy-800/50 border-navy-600",
                    "text-gray-300 font-medium",
                    "hover:bg-navy-800/70 hover:border-navy-500",
                    "focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30",
                    "transition-all duration-200"
                  )}
                />
                {selectedZMetricKey && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3"
                  >
                    <ScaleToggle scale={zScale} onChange={onZScaleChange} label="Bubble Scale" />
                  </motion.div>
                )}
              </SectionCard>

              {/* Advanced Settings Card */}
              <SectionCard>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                  <span className="text-2xl">⚙️</span>
                  Advanced Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label 
                      htmlFor="norm-mode" 
                      className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2"
                    >
                      Normalization Method
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={14} className="text-gray-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className="max-w-xs bg-navy-800 border-navy-600"
                          >
                            <p className="text-xs">
                              Controls how metric values are scaled for comparison
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select value={normalizationMode} onValueChange={onNormalizationChange}>
                      <SelectTrigger 
                        id="norm-mode" 
                        className={cn(
                          "w-full h-10",
                          "bg-navy-800/50 border-navy-600",
                          "text-gray-300 font-medium text-sm",
                          "hover:bg-navy-800/70 hover:border-navy-500",
                          "focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30",
                          "transition-all duration-200"
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-900 border-navy-700">
                        <SelectItem value="dataset_min_max" className="text-sm text-gray-300">
                          Dataset Min-Max
                        </SelectItem>
                        <SelectItem value="global_min_max" className="text-sm text-gray-300">
                          Global Min-Max
                        </SelectItem>
                        <SelectItem value="dataset_rank_percentile" className="text-sm text-gray-300">
                          Dataset Rank
                        </SelectItem>
                        <SelectItem value="dataset_z_score" className="text-sm text-gray-300">
                          Dataset Z-Score
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label 
                      htmlFor="impute-mode" 
                      className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-2"
                    >
                      Missing Values Treatment
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={14} className="text-gray-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className="max-w-xs bg-navy-800 border-navy-600"
                          >
                            <p className="text-xs">
                              How to handle missing data points in the dataset
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select value={imputationMode} onValueChange={onImputationChange}>
                      <SelectTrigger 
                        id="impute-mode" 
                        className={cn(
                          "w-full h-10",
                          "bg-navy-800/50 border-navy-600",
                          "text-gray-300 font-medium text-sm",
                          "hover:bg-navy-800/70 hover:border-navy-500",
                          "focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30",
                          "transition-all duration-200"
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-900 border-navy-700">
                        <SelectItem value="zero_worst" className="text-sm text-gray-300">
                          Zero / Worst
                        </SelectItem>
                        <SelectItem value="dataset_mean" className="text-sm text-gray-300">
                          Dataset Mean
                        </SelectItem>
                        <SelectItem value="dataset_median" className="text-sm text-gray-300">
                          Dataset Median
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>
            </motion.div>

            {/* Enhanced Sticky Footer */}
            <div className={cn(
              "sticky bottom-0 z-30 mt-auto p-5",
              "bg-gradient-to-r from-navy-800/95 to-navy-900/95",
              "backdrop-blur-md border-t border-navy-700/50",
              "shadow-[0_-10px_40px_rgba(0,0,0,0.3)]",
              "flex-shrink-0"
            )}>
              {/* Configuration Status Bar */}
              <div className={cn(
                "flex items-center gap-2 mb-3 p-2 rounded-lg",
                "bg-navy-800/50 border",
                configStatus.status === 'ready' && "border-emerald-700/50",
                configStatus.status === 'warning' && "border-amber-700/50",
                configStatus.status === 'empty' && "border-navy-700/50"
              )}>
                {configStatus.status === 'ready' && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                {configStatus.status === 'warning' && (
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  configStatus.status === 'ready' && "text-emerald-400",
                  configStatus.status === 'warning' && "text-amber-400",
                  configStatus.status === 'empty' && "text-gray-500"
                )}>
                  {configStatus.message}
                </span>
              </div>

              {/* Enhanced Apply Button */}
              <Button 
                onClick={onApply} 
                className={cn(
                  "w-full h-12 relative overflow-hidden group",
                  "text-base font-bold tracking-wide",
                  "transition-all duration-300 transform",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  // Gradient background
                  "bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500",
                  "hover:from-blue-500 hover:via-cyan-400 hover:to-teal-400",
                  // Shadow effects
                  "shadow-[0_4px_20px_rgba(6,182,212,0.4)]",
                  "hover:shadow-[0_6px_30px_rgba(6,182,212,0.6)]",
                  // Disabled state
                  "disabled:from-gray-700 disabled:via-gray-600 disabled:to-gray-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "disabled:shadow-none disabled:hover:scale-100",
                  // Shine effect
                  "before:absolute before:inset-0",
                  "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
                  "before:translate-x-[-200%] before:skew-x-[-25deg]",
                  "group-hover:before:translate-x-[200%]",
                  "before:transition-transform before:duration-1000 before:ease-out"
                )}
                disabled={!canApply}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isCalculating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Calculating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className={cn(
                        "h-5 w-5 transition-all duration-300",
                        "group-hover:rotate-12 group-hover:scale-110"
                      )} />
                      <span>Apply Configuration</span>
                      <PlayCircle className={cn(
                        "h-5 w-5 transition-all duration-300",
                        "group-hover:translate-x-1"
                      )} />
                    </>
                  )}
                </span>
                
                {/* Pulse effect when ready */}
                {configStatus.status === 'ready' && !isCalculating && (
                  <span className={cn(
                    "absolute inset-0 rounded-lg",
                    "bg-gradient-to-r from-blue-600/50 via-cyan-500/50 to-teal-500/50",
                    "animate-pulse"
                  )} />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};