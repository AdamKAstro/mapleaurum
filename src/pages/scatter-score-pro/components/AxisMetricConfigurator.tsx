// src/pages/scatter-score-pro/components/AxisMetricConfigurator.tsx
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Checkbox } from '../../../components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { ChevronLeft, Plus, X } from 'lucide-react';
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
}

const MetricListItem: React.FC<MetricListItemProps> = ({ 
  metric, 
  axisType, 
  onWeightChange, 
  onToggleHLB, 
  onRemove 
}) => (
  <div className="flex items-center gap-2 p-2 bg-navy-700/30 rounded-md border border-navy-600/50 hover:border-navy-500/70 transition-colors">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-surface-white truncate" title={metric.metricLabel}>
        {metric.metricLabel}
      </p>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <Input 
        type="number" 
        value={metric.weight}
        onChange={(e) => {
          const value = parseInt(e.target.value, 10);
          if (!isNaN(value)) onWeightChange(value);
        }}
        className="h-7 text-xs w-14 bg-navy-800/50 border-navy-600 text-center font-medium"
        min={0} 
        max={100} 
        step={1} 
      />
      <span className="text-xs text-muted-foreground font-medium">%</span>
      <Checkbox 
        checked={metric.userHigherIsBetter}
        onCheckedChange={(checked) => onToggleHLB(!!checked)}
        className="border-gray-600 data-[state=checked]:bg-accent-teal data-[state=checked]:border-accent-teal h-3.5 w-3.5" 
      />
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground cursor-help font-medium">HLB</span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs max-w-[200px] p-2 z-[70] font-sans">
            <p>Higher is Better. Default: {metric.originalHigherIsBetter ? 'Yes' : 'No'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10" 
        onClick={onRemove}
      >
        <X size={14} />
      </Button>
    </div>
  </div>
);

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

  return (
    <div className="bg-navy-700/30 rounded-lg border border-navy-600/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-navy-700/20 transition-colors rounded-t-lg"
      >
        <h3 className="text-base font-semibold">{axisTitle}</h3>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded",
            currentTotalWeightForAxis !== 100 && currentSelectedMetricsForAxis.length > 0 
              ? "bg-red-500/20 text-red-400" 
              : currentTotalWeightForAxis === 100 
              ? "bg-green-500/20 text-green-400" 
              : "bg-navy-600/50 text-muted-foreground"
          )}>
            {Math.round(currentTotalWeightForAxis)}%
          </span>
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform text-muted-foreground",
            isExpanded ? "-rotate-90" : ""
          )} />
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          <Select 
            onValueChange={(value) => { 
              if (value && value !== "__placeholder__") {
                handleAxisMetricChange(axisType, value, 'add');
              }
            }}
            value=""
          >
            <SelectTrigger className="text-xs h-8 bg-navy-700/50 border-navy-600 font-medium">
              <div className="flex items-center gap-2">
                <Plus size={14} />
                <SelectValue placeholder="Add metric..." />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72 z-[60]">
              <SelectItem value="__placeholder__" disabled className="text-xs hidden">
                Select metric...
              </SelectItem>
              {Object.entries(metricCategories)
                .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
                .map(([catKey, catLabel]) => {
                  const metricsInCat = accessibleMetrics.filter(
                    m => m.category === catKey && !currentSelectedMetricsForAxis.find(sm => sm.key === m.key)
                  );
                  if (metricsInCat.length === 0) return null;
                  return (
                    <SelectGroup key={catKey}>
                      <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {catLabel}
                      </SelectLabel>
                      {metricsInCat.map(m => (
                        <SelectItem key={m.key} value={m.key} className="text-xs pl-4 font-medium">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              {accessibleMetrics.filter(m => !currentSelectedMetricsForAxis.find(sm => sm.key === m.key)).length === 0 && (
                <div className="p-2 text-xs text-muted-foreground text-center font-medium">
                  All accessible metrics added.
                </div>
              )}
            </SelectContent>
          </Select>
          
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-transparent">
            {currentSelectedMetricsForAxis.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 font-medium">
                No metrics selected for this axis.
              </p>
            ) : (
              currentSelectedMetricsForAxis.map((sm) => (
                <MetricListItem
                  key={sm.key}
                  metric={sm}
                  axisType={axisType}
                  onWeightChange={(value) => handleAxisMetricChange(axisType, sm.key, 'updateWeight', value)}
                  onToggleHLB={(value) => handleAxisMetricChange(axisType, sm.key, 'toggleHLB', value)}
                  onRemove={() => handleAxisMetricChange(axisType, sm.key, 'remove')}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};