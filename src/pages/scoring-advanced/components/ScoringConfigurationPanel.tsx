import React, { useState } from 'react';
import type { CompanyStatus } from '@/lib/types';
import type { ScoringStrategy } from '@/lib/scoringUtilsAdvanced';
import { type MetricConfig } from '@/lib/metric-types';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2 } from 'lucide-react';

interface ScoringConfigurationPanelProps {
  weights: Record<string, number>;
  onWeightChange: (metricKey: string, weight: number) => void;
  strategies: Record<CompanyStatus, ScoringStrategy>;
  onStrategyChange: (status: CompanyStatus, newStrategy: Partial<ScoringStrategy>) => void;
  allMetrics: readonly MetricConfig[];
  onCalculate: () => void;
  isCalculating: boolean;
  companyCount: number;
}

const STATUS_TABS: CompanyStatus[] = ['Producer', 'Developer', 'Explorer', 'Royalty'];

export const ScoringConfigurationPanel: React.FC<ScoringConfigurationPanelProps> = ({
  weights,
  onWeightChange,
  strategies,
  onStrategyChange,
  allMetrics,
  onCalculate,
  isCalculating,
  companyCount
}) => {
  const [activeTab, setActiveTab] = useState<CompanyStatus>('Producer');
  const activeStrategy = strategies[activeTab];

  return (
    <div className="flex flex-col space-y-4 bg-navy-700/30 p-4 rounded-xl border border-navy-600/50 h-full">
      <h2 className="text-xl font-bold text-surface-white flex-shrink-0">Configuration</h2>

      <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-shrink-0">
        <div className="flex border-b border-navy-600 mb-3">
          {STATUS_TABS.map(status => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
                activeTab === status
                  ? "border-accent-teal text-accent-teal"
                  : "border-transparent text-muted-foreground hover:text-surface-white"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StrategyInput
            label="Normalization"
            value={activeStrategy.normalization}
            onChange={value => onStrategyChange(activeTab, { normalization: value as any })}
            options={[
                { value: 'ensemble', label: 'Ensemble (Recommended)' },
                { value: 'percentile', label: 'Percentile Rank' },
                { value: 'robust_zscore', label: 'Robust Z-Score' },
                { value: 'min_max', label: 'Min-Max (Winsorized)' }
            ]}
          />
          <StrategyInput
            label="Missing Values"
            value={activeStrategy.imputationStrategy}
            onChange={value => onStrategyChange(activeTab, { imputationStrategy: value as any })}
            options={[
                { value: 'conservative', label: 'Conservative (25th Percentile)' },
                { value: 'peer_group', label: 'Peer Group Median' },
                { value: 'none', label: 'Exclude Metric' }
            ]}
          />
          <StrategySlider
            label="Sigmoid Steepness (k)"
            value={activeStrategy.transformationSteepness || 10}
            onChange={value => onStrategyChange(activeTab, { transformationSteepness: value })}
            min={1} max={30} step={1}
            />
          <StrategySlider
            label="Min. Data Coverage"
            value={activeStrategy.requiredCoverage * 100}
            onChange={value => onStrategyChange(activeTab, { requiredCoverage: value / 100 })}
            min={0} max={50} step={1} suffix="%"
          />
        </div>
      </div>

      <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-grow flex flex-col min-h-0">
          <h3 className="text-base font-semibold mb-2 flex-shrink-0">Metric Base Weights</h3>
          <div className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-navy-600">
             {allMetrics
                .slice() 
                .sort((a,b) => a.label.localeCompare(b.label))
                .map(metric => (
                <div key={metric.key} className="flex items-center justify-between gap-2">
                    <Label htmlFor={`weight-${metric.key}`} className="text-xs text-muted-foreground truncate flex-1" title={metric.label}>
                        {metric.label}
                    </Label>
                    <Input
                        id={`weight-${metric.key}`}
                        type="number"
                        value={weights[metric.key] || 0}
                        onChange={e => onWeightChange(metric.key, parseInt(e.target.value, 10) || 0)}
                        className="h-7 text-xs w-20 bg-navy-900/50 border-navy-600 text-center"
                        min={0}
                        max={100}
                    />
                </div>
             ))}
          </div>
      </div>
      
       <Button
            onClick={onCalculate}
            disabled={isCalculating || companyCount === 0}
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-accent-teal to-teal-500 hover:from-teal-500 hover:to-accent-teal shadow-lg flex-shrink-0"
        >
            {isCalculating ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" />Calculating...</span>
            ) : (
              <span className="flex items-center gap-2"><Sparkles />Calculate Scores ({companyCount} Companies)</span>
            )}
        </Button>
    </div>
  );
};

const StrategyInput: React.FC<{label: string, value: string, onChange: (v: string) => void, options: {value: string, label: string}[]}> = 
({label, value, onChange, options}) => (
    <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-xs bg-navy-900/50 border-navy-600">
                <SelectValue/>
            </SelectTrigger>
            <SelectContent>
                {options.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}
            </SelectContent>
        </Select>
    </div>
);

const StrategySlider: React.FC<{label: string, value: number, onChange: (v: number) => void, min: number, max: number, step: number, suffix?: string}> =
({label, value, onChange, min, max, step, suffix}) => (
     <div className="space-y-1">
        <Label className="text-xs font-medium text-muted-foreground flex justify-between">
            <span>{label}</span>
            <span>{value}{suffix}</span>
        </Label>
        <Slider
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            min={min} max={max} step={step}
            className="mt-2"
        />
    </div>
);