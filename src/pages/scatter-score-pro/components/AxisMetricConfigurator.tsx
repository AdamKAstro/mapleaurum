// src/pages/scatter-score-pro/components/AxisMetricConfigurator.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Checkbox } from '../../../components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { ChevronDown, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AxisMetricConfig } from '../types';
import type { MetricConfig } from '../../../lib/metric-types';
import { metricCategories } from '../../../lib/metric-types';
import { cn } from '../../../lib/utils';

interface MetricListItemProps {
  metric: AxisMetricConfig;
  axisType: 'X' | 'Y';
  onWeightChange: (value: number) => void;
  onToggleHLB: (value: boolean) => void;
  onRemove: () => void;
  isOnlyMetric: boolean;
}

const MetricListItem: React.FC<MetricListItemProps> = ({ 
  metric, 
  onWeightChange, 
  onToggleHLB, 
  onRemove,
  isOnlyMetric
}) => {
  const [localWeight, setLocalWeight] = useState(metric.weight.toString());
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (!isEditing) {
      setLocalWeight(metric.weight.toString());
    }
  }, [metric.weight, isEditing]);

  const handleWeightChange = (value: string) => {
    setLocalWeight(value);
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onWeightChange(numValue);
    } else if (value === "") {
      onWeightChange(0);
    }
  };

  return (
    <div className={cn(
      "group relative flex items-center gap-3 p-3",
      "bg-gradient-to-r from-navy-900/50 to-navy-800/50",
      "rounded-lg border border-navy-700/50",
      "hover:from-navy-900/70 hover:to-navy-800/70 hover:border-navy-600",
      "transition-all duration-200",
      "before:absolute before:inset-0 before:rounded-lg",
      "before:bg-gradient-to-r before:from-blue-500/0 before:to-purple-500/0",
      "hover:before:from-blue-500/5 hover:before:to-purple-500/5",
      "before:transition-all before:duration-300"
    )}>
      {/* Metric Name Section */}
      <div className="flex-grow min-w-0 z-10">
        <p className="text-sm font-semibold text-gray-200 truncate" title={metric.metricLabel}>
          {metric.metricLabel}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {metric.originalHigherIsBetter ? 'Default: Higher is better' : 'Default: Lower is better'}
        </p>
      </div>

      {/* Controls Section */}
      <div className="flex items-center gap-3 flex-shrink-0 z-10">
        {/* Weight Input Group */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Input 
              type="number" 
              value={localWeight}
              onChange={(e) => handleWeightChange(e.target.value)}
              onFocus={() => setIsEditing(true)}
              onBlur={() => setIsEditing(false)}
              className={cn(
                "h-9 text-sm w-20 text-center font-bold",
                "bg-navy-800/80 border-navy-600",
                "text-white placeholder:text-gray-500",
                "focus:bg-navy-800 focus:border-blue-500",
                "transition-all duration-200",
                isOnlyMetric && "opacity-50 cursor-not-allowed"
              )}
              min={0} 
              max={100} 
              step={5}
              disabled={isOnlyMetric}
            />
            {isEditing && (
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                Press Enter to confirm
              </div>
            )}
          </div>
          <span className="text-sm text-gray-400 font-medium">%</span>
        </div>

        {/* HLB Toggle */}
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleHLB(!metric.userHigherIsBetter)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
                  "border transition-all duration-200",
                  metric.userHigherIsBetter
                    ? "bg-emerald-900/30 border-emerald-700/50 hover:bg-emerald-900/50"
                    : "bg-navy-800/50 border-navy-600 hover:bg-navy-700/50"
                )}
              >
                <Checkbox 
                  checked={metric.userHigherIsBetter}
                  className={cn(
                    "h-4 w-4 border-2",
                    metric.userHigherIsBetter
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-gray-600 bg-transparent"
                  )}
                  onCheckedChange={(checked) => onToggleHLB(!!checked)}
                />
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wide",
                  metric.userHigherIsBetter ? "text-emerald-400" : "text-gray-400"
                )}>
                  HLB
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="left" 
              className="max-w-[240px] p-3 bg-navy-900 border-navy-700"
            >
              <p className="text-sm font-semibold text-white mb-1">
                Higher is Better
              </p>
              <p className="text-xs text-gray-400">
                When enabled, larger values for this metric are considered preferable. 
                Currently: <span className="font-bold text-white">
                  {metric.userHigherIsBetter ? 'Enabled' : 'Disabled'}
                </span>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Remove Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-8 w-8 rounded-md",
            "text-red-400/70 hover:text-red-400",
            "hover:bg-red-900/20 active:bg-red-900/30",
            "transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-red-500",
            isOnlyMetric && "opacity-50 cursor-not-allowed"
          )}
          onClick={onRemove}
          disabled={isOnlyMetric}
          aria-label={`Remove ${metric.metricLabel}`}
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
};

interface AxisMetricConfiguratorProps {
  axisTitle: string;
  currentSelectedMetricsForAxis: AxisMetricConfig[];
  axisType: 'X' | 'Y';
  currentTotalWeightForAxis: number;
  accessibleMetrics: MetricConfig[];
  handleAxisMetricChange: (
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => void;
}

export const AxisMetricConfigurator: React.FC<AxisMetricConfiguratorProps> = ({
  axisTitle,
  currentSelectedMetricsForAxis = [],
  axisType,
  currentTotalWeightForAxis,
  accessibleMetrics,
  handleAxisMetricChange
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectKey, setSelectKey] = useState(0); // Force re-render of Select
  const roundedWeight = Math.round(currentTotalWeightForAxis);
  const hasMetrics = currentSelectedMetricsForAxis.length > 0;
  const isWeightValid = roundedWeight === 100 && hasMetrics;

  // Reset select after adding a metric
  const handleAddMetric = (metricKey: string) => {
    handleAxisMetricChange(axisType, metricKey, 'add');
    setSelectKey(prev => prev + 1); // Force Select to reset
  };

  return (
    <div className={cn(
      "relative rounded-xl border transition-all duration-300",
      "bg-gradient-to-br from-navy-800/60 to-navy-900/60",
      "backdrop-blur-sm",
      isExpanded 
        ? "border-navy-600/60 shadow-lg" 
        : "border-navy-700/40 shadow-md hover:shadow-lg"
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "hover:bg-white/[0.02] active:bg-white/[0.04]",
          "transition-colors duration-200",
          "rounded-t-xl",
          !isExpanded && "rounded-b-xl"
        )}
        aria-expanded={isExpanded}
        aria-controls={`${axisType}-axis-metrics`}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">
            {axisTitle}
          </h3>
          <span className="text-sm text-gray-500">
            ({currentSelectedMetricsForAxis.length} metric{currentSelectedMetricsForAxis.length !== 1 ? 's' : ''})
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Weight Indicator */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "text-sm font-bold transition-all duration-300",
            !hasMetrics ? "bg-navy-700/50 text-gray-500" :
            isWeightValid 
              ? "bg-emerald-900/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
              : "bg-amber-900/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
          )}>
            {isWeightValid ? (
              <CheckCircle2 size={14} className="animate-pulse" />
            ) : hasMetrics && (
              <AlertCircle size={14} className="animate-pulse" />
            )}
            <span>{roundedWeight}%</span>
          </div>
          
          {/* Chevron */}
          <ChevronDown className={cn(
            "h-5 w-5 text-gray-400 transition-transform duration-300",
            isExpanded ? "rotate-180" : ""
          )} />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div 
          id={`${axisType}-axis-metrics`}
          className="p-4 pt-0 space-y-4 border-t border-navy-700/50"
        >
          {/* Add Metric Selector */}
          <Select 
            key={selectKey}
            onValueChange={handleAddMetric}
            value=""
          >
            <SelectTrigger className={cn(
              "w-full h-11",
              "bg-navy-800/50 border-navy-600",
              "hover:bg-navy-800/70 hover:border-navy-500",
              "focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30",
              "transition-all duration-200"
            )}>
              <div className="flex items-center gap-2">
                <Plus size={18} className="text-blue-400" />
                <span className="text-gray-300 font-medium">
                  Add metric to {axisType}-axis...
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className={cn(
              "max-h-80 bg-navy-900 border-navy-700",
              "shadow-2xl backdrop-blur-md"
            )}>
              {Object.entries(metricCategories)
                .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
                .map(([catKey, catLabel]) => {
                  const availableMetrics = accessibleMetrics.filter(
                    m => m.category === catKey && 
                    !currentSelectedMetricsForAxis.find(sm => sm.key === m.key)
                  );
                  
                  if (availableMetrics.length === 0) return null;
                  
                  return (
                    <SelectGroup key={catKey}>
                      <SelectLabel className={cn(
                        "px-3 py-2 text-xs font-bold uppercase tracking-wider",
                        "text-gray-500 bg-navy-800/50"
                      )}>
                        {catLabel}
                      </SelectLabel>
                      {availableMetrics.map(m => (
                        <SelectItem 
                          key={m.key} 
                          value={m.key} 
                          className={cn(
                            "pl-6 py-2.5 text-sm font-medium",
                            "text-gray-300 hover:text-white",
                            "focus:bg-blue-900/30 focus:text-blue-300",
                            "transition-colors duration-150"
                          )}
                        >
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              {accessibleMetrics.filter(
                m => !currentSelectedMetricsForAxis.find(sm => sm.key === m.key)
              ).length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-sm text-gray-500 font-medium">
                    All available metrics have been added
                  </p>
                </div>
              )}
            </SelectContent>
          </Select>

          {/* Metrics List */}
          <div className={cn(
            "space-y-2 transition-all duration-300",
            hasMetrics ? "max-h-[24rem]" : "max-h-32",
            hasMetrics && "overflow-y-auto pr-2 -mr-2",
            "scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-transparent",
            "hover:scrollbar-thumb-navy-500"
          )}>
            {!hasMetrics ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-navy-800/50 mb-4">
                  <Plus size={24} className="text-gray-600" />
                </div>
                <p className="text-sm text-gray-400 font-medium">
                  No metrics selected yet
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Use the dropdown above to add metrics
                </p>
              </div>
            ) : (
              currentSelectedMetricsForAxis.map((metric) => (
                <MetricListItem
                  key={metric.key}
                  metric={metric}
                  axisType={axisType}
                  isOnlyMetric={currentSelectedMetricsForAxis.length === 1}
                  onWeightChange={(value) => 
                    handleAxisMetricChange(axisType, metric.key, 'updateWeight', value)
                  }
                  onToggleHLB={(value) => 
                    handleAxisMetricChange(axisType, metric.key, 'toggleHLB', value)
                  }
                  onRemove={() => 
                    handleAxisMetricChange(axisType, metric.key, 'remove')
                  }
                />
              ))
            )}
          </div>

          {/* Weight Normalization Hint */}
          {hasMetrics && roundedWeight !== 100 && (
            <div className={cn(
              "flex items-start gap-2 p-3 rounded-lg",
              "bg-amber-900/20 border border-amber-800/30",
              "animate-in fade-in slide-in-from-bottom-2 duration-300"
            )}>
              <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-300">
                <p className="font-semibold mb-0.5">Weights don't sum to 100%</p>
                <p className="text-amber-400/80">
                  Adjust the weights above or they'll be automatically normalized when you apply changes.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};