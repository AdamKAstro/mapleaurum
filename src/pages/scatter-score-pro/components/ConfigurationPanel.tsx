// src/pages/scatter-score-pro/components/ConfigurationPanel.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { 
  Info, X, Loader2, PlayCircle, Sparkles
} from 'lucide-react';
import { MetricSelector } from '../../../components/metric-selector';
import type { 
  ScatterScoreTemplate, 
  AxisMetricConfig,
  NormalizationMode, // Import these types
  ImputationMode   // Import these types
} from '../types';
import type { MetricConfig } from '../../../lib/metric-types'; // Adjusted path
import { cn } from '../../../lib/utils';
import { ANIMATION_CONFIG } from '../constants';
import { AxisMetricConfigurator } from './AxisMetricConfigurator';
import { ScaleToggle } from './ScaleToggle';

interface ConfigurationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ScatterScoreTemplate[];
  activeTemplateName: string | null;
  onTemplateChange: (templateName: string) => void; // Changed from templateId to templateName to match useTemplateLoader
  selectedXMetrics: AxisMetricConfig[];
  selectedYMetrics: AxisMetricConfig[];
  selectedZMetricKey: string | null;
  zScale: 'linear' | 'log';
  normalizationMode: NormalizationMode; // Use imported type
  imputationMode: ImputationMode;     // Use imported type
  onAxisMetricChange: (
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => void;
  onZMetricChange: (value: string | null) => void;
  onZScaleChange: (value: 'linear' | 'log') => void;
  onNormalizationChange: (value: NormalizationMode) => void; // Use imported type
  onImputationChange: (value: ImputationMode) => void;     // Use imported type
  onApply: () => void;
  isCalculating: boolean;
  accessibleMetrics: MetricConfig[];
  currentUserTier?: string | null; // Make sure this is passed from index.tsx
}

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

  // Determine if apply button should be enabled
  const canApply = (selectedXMetrics.length > 0 || selectedYMetrics.length > 0) && !isCalculating;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div 
          key="config-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ 
            width: "auto", // Or specific width like "380px" / "420px"
            opacity: 1,
            transition: {
              width: ANIMATION_CONFIG.panel,
              opacity: ANIMATION_CONFIG.fadeIn
            }
          }}
          exit={{ 
            width: 0,
            opacity: 0,
            transition: {
              width: ANIMATION_CONFIG.panel,
              opacity: { duration: 0.1 } // Faster fade out
            }
          }}
          className={cn(
            "flex-shrink-0 overflow-hidden",
            // For mobile, it's fixed. For desktop, it's relative within flex row.
            "lg:block fixed inset-0 z-50 lg:relative lg:z-auto lg:inset-auto" 
          )}
        >
          <motion.div
            // initial={{ x: "-100%" }} // Example for slide-in from left on mobile
            // animate={{ x: 0 }}
            // exit={{ x: "-100%" }}
            // transition={ANIMATION_CONFIG.panel}
            className={cn(
              "h-full flex flex-col space-y-4 overflow-y-auto bg-navy-800/80 backdrop-blur-sm rounded-xl p-3 md:p-4",
              "lg:w-[380px] xl:w-[420px] lg:max-h-[calc(100vh-var(--header-height,60px)-2rem)]", // Adjusted max-h for typical header
              "scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-navy-700/50"
            )}
            style={{ '--header-height': '60px' } as React.CSSProperties} // Example header height
          >
            {/* Panel Header */}
            <div className="flex justify-between items-center sticky top-0 bg-navy-800/90 backdrop-blur-sm py-2 -mx-3 md:-mx-4 px-3 md:px-4 z-10 border-b border-navy-700">
              <h2 className="text-xl font-bold text-surface-white">Configuration</h2>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClose} 
                className="text-muted-foreground hover:text-surface-white h-8 w-8"
                aria-label="Close configuration panel"
              >
                <X size={18}/>
              </Button>
            </div>

            <div className="space-y-4 flex-grow pb-4"> {/* Added flex-grow and pb-4 for better spacing */}
              {/* Template Selector */}
              <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold text-surface-white" htmlFor="template-select">Template</Label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-accent-teal" aria-label="View template descriptions">
                          <Info size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="left" 
                        align="end"
                        className="text-xs max-w-[300px] p-3 z-[100] bg-navy-700/95 border border-navy-600/80 font-sans"
                      >
                        <div className="space-y-2">
                          {templates.map((t, index) => (
                            <div key={t.id} className={cn(
                              "pb-2",
                              index < templates.length - 1 && "border-b border-navy-600/50"
                            )}>
                              <p className="font-semibold text-accent-teal mb-0.5">{t.name}</p>
                              <p className="text-surface-white/80 text-[11px] font-light">{t.description}</p>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={activeTemplateName || ""} onValueChange={onTemplateChange}>
                  <SelectTrigger id="template-select" className="w-full h-8 text-xs bg-navy-700/50 border-navy-600 font-medium">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.name} className="text-xs font-medium">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Axis Configurations */}
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

              {/* Z-Axis Configuration */}
              <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/50 space-y-2">
                <h3 className="text-base font-semibold">Bubble Size (Z-Axis)</h3>
                <MetricSelector
                  label="" // No explicit label needed here as per design
                  selectedMetric={selectedZMetricKey || ""}
                  onMetricChange={onZMetricChange}
                  currentTier={currentUserTier}
                  availableMetrics={accessibleMetrics} // Ensure these are correctly filtered if needed
                  filterForNumericOnly={true}
                  placeholder="Select metric for bubble size..."
                  className="text-xs h-8 font-medium"
                  triggerClassName="bg-navy-700/50 border-navy-600" // Match other selects
                />
                {selectedZMetricKey && (
                  <ScaleToggle 
                    scale={zScale} 
                    onChange={onZScaleChange} 
                    label="Scale" 
                  />
                )}
              </div>

              {/* Advanced Settings */}
              <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/50 space-y-3">
                <h3 className="text-base font-semibold">Advanced Settings</h3>
                <div>
                  <Label htmlFor="norm-mode" className="text-xs text-muted-foreground font-medium">
                    Normalization
                  </Label>
                  <Select 
                    value={normalizationMode} 
                    onValueChange={onNormalizationChange}
                  >
                    <SelectTrigger id="norm-mode" className="h-8 text-xs bg-navy-700/50 border-navy-600 mt-1 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="dataset_min_max" className="text-xs font-medium">Dataset Min-Max</SelectItem>
                      <SelectItem value="global_min_max" className="text-xs font-medium">Global Min-Max</SelectItem>
                      <SelectItem value="dataset_rank_percentile" className="text-xs font-medium">Dataset Rank</SelectItem>
                      <SelectItem value="dataset_z_score" className="text-xs font-medium">Dataset Z-Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="impute-mode" className="text-xs text-muted-foreground font-medium">
                    Missing Values
                  </Label>
                  <Select 
                    value={imputationMode} 
                    onValueChange={onImputationChange}
                  >
                    <SelectTrigger id="impute-mode" className="h-8 text-xs bg-navy-700/50 border-navy-600 mt-1 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="zero_worst" className="text-xs font-medium">Zero / Worst</SelectItem>
                      <SelectItem value="dataset_mean" className="text-xs font-medium">Dataset Mean</SelectItem>
                      <SelectItem value="dataset_median" className="text-xs font-medium">Dataset Median</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Apply Button */}
              <div className="mt-auto sticky bottom-0 bg-navy-800/90 backdrop-blur-sm py-3 -mx-3 md:-mx-4 px-3 md:px-4"> {/* Made button sticky */}
                <Button 
                  onClick={onApply} 
                  className={cn(
                    "w-full text-base font-bold h-12 relative overflow-hidden group transition-all duration-300",
                    "bg-gradient-to-r from-accent-teal to-teal-500 hover:from-teal-500 hover:to-accent-teal",
                    "shadow-lg hover:shadow-xl shadow-teal-900/20 hover:shadow-teal-900/30",
                    "disabled:opacity-50 disabled:cursor-not-allowed", // Standard disabled style
                    "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
                    "before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700"
                  )}
                  disabled={!canApply}
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {isCalculating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Calculating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>Apply Configuration & Plot</span>
                        <PlayCircle className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};