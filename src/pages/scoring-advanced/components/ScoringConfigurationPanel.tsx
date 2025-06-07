import React, { useState } from 'react';
import type { CompanyStatus } from '@/lib/types';
import type { ScoringStrategy } from '@/lib/scoringUtilsAdvanced';
import { type MetricConfig } from '@/lib/metric-types';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, Info } from 'lucide-react';

const HelpTooltip: React.FC<{ content: React.ReactNode }> = ({ content }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild><button className="ml-1.5 text-muted-foreground hover:text-accent-teal transition-colors -mb-0.5"><Info size={13} /></button></TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs p-3 z-[100] bg-navy-700/95 border border-navy-600/80 font-sans">{content}</TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

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

const STATUS_TABS: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty'];

export const ScoringConfigurationPanel: React.FC<ScoringConfigurationPanelProps> = ({
  weights, onWeightChange, strategies, onStrategyChange, allMetrics, onCalculate, isCalculating, companyCount
}) => {
  const [activeTab, setActiveTab] = useState<CompanyStatus>('producer');
  const activeStrategy = strategies[activeTab];

  return (
    <div className="flex flex-col space-y-4 bg-navy-700/30 p-4 rounded-xl border border-navy-600/50 h-full">
      <h2 className="text-xl font-bold text-surface-white flex-shrink-0">Configuration</h2>
      
      <div className="flex-shrink-0">
          <Button onClick={onCalculate} disabled={isCalculating || companyCount === 0} className="w-full h-12 text-base font-bold bg-gradient-to-r from-accent-teal to-teal-500 hover:from-teal-500 hover:to-accent-teal shadow-lg">
              {isCalculating ? (<span className="flex items-center gap-2"><Loader2 className="animate-spin" />Calculating...</span>) : (<span className="flex items-center gap-2"><Sparkles />Calculate Scores ({companyCount} Companies)</span>)}
          </Button>
      </div>

      <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-shrink-0">
        <div className="flex border-b border-navy-600 mb-3 flex-wrap">
          {STATUS_TABS.map(status => (
            <button key={status} onClick={() => setActiveTab(status)} className={cn("px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 capitalize", activeTab === status ? "border-accent-teal text-accent-teal" : "border-transparent text-muted-foreground hover:text-surface-white")}>
              {status}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
          <StrategyInput label="Normalization" tooltipContent={<><p className="font-bold mb-1">Scales raw data to a common range.</p><p className="text-xs">Selects the statistical method used to map diverse metric scales (e.g., market cap, P/E ratios) to a comparable 0-1 range for equitable weighting in the final score.</p></>} value={activeStrategy.normalization} onChange={value => onStrategyChange(activeTab, { normalization: value as any })} options={[{ value: 'ensemble', label: 'Ensemble (Recommended)' }, { value: 'percentile', label: 'Percentile Rank' }, { value: 'robust_zscore', label: 'Robust Z-Score' }]} />
          <StrategyInput label="Missing Values" tooltipContent={<><p className="font-bold mb-1">Defines how to handle missing data.</p><p className="text-xs">'Conservative' is recommended as it avoids rewarding companies for null data by assigning a below-average (25th percentile) value from their peers.</p></>} value={activeStrategy.imputationStrategy} onChange={value => onStrategyChange(activeTab, { imputationStrategy: value as any })} options={[{ value: 'conservative', label: 'Conservative' }, { value: 'peer_group', label: 'Peer Group Median' }, { value: 'none', label: 'Exclude Metric' }]} />
          <StrategySlider label="Sigmoid Steepness (k)" tooltipContent={<><p className="font-bold mb-1">Controls the score distribution.</p><p className="text-xs">Adjusts the S-shaped transformation curve. Higher values create more separation between similarly-ranked companies, helping to 'spread out' final scores.</p></>} value={activeStrategy.transformationSteepness || 10} onChange={value => onStrategyChange(activeTab, { transformationSteepness: value })} min={1} max={30} step={1} />
          <StrategySlider label="Min. Data Coverage" tooltipContent={<><p className="font-bold mb-1">Excludes metrics with poor data.</p><p className="text-xs">Sets a threshold for data availability. Any metric with coverage below this percentage for the selected company type will be ignored in the calculation.</p></>} value={activeStrategy.requiredCoverage * 100} onChange={value => onStrategyChange(activeTab, { requiredCoverage: value / 100 })} min={0} max={50} step={1} suffix="%" />
          <div className="md:col-span-2 flex items-center space-x-2 mt-2">
            <Checkbox id={`normalize-by-shares-${activeTab}`} checked={activeStrategy.normalizeByShares} onCheckedChange={(checked) => onStrategyChange(activeTab, { normalizeByShares: !!checked })} />
            <div className="grid gap-1.5 leading-none">
                <label htmlFor={`normalize-by-shares-${activeTab}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                    Normalize by Shares
                    <HelpTooltip content={<><p className="font-bold mb-1">Levels the playing field between large and small caps.</p><p className="text-xs">When checked, absolute financial metrics (e.g., Cash, EBITDA) are divided by shares outstanding before scoring. This converts them to per-share values, reducing the natural advantage of larger companies.</p></>} />
                </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-grow flex flex-col min-h-0">
          <h3 className="text-base font-semibold mb-2 flex-shrink-0">Metric Base Weights</h3>
          <div className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-navy-600">
             {allMetrics.length > 0 ? allMetrics.slice().sort((a,b) => a.label.localeCompare(b.label)).map(metric => (
                <div key={metric.key} className="flex items-center justify-between gap-2">
                    <Label htmlFor={`weight-${metric.key}`} className="text-xs text-muted-foreground truncate flex-1" title={metric.label}>{metric.label}</Label>
                    <Input id={`weight-${metric.key}`} type="number" value={weights[metric.key] || 0} onChange={e => onWeightChange(metric.key, parseInt(e.target.value, 10) || 0)} className="h-7 text-xs w-20 bg-navy-900/50 border-navy-600 text-center" min={0} max={100} />
                </div>
             )) : <p className="text-xs text-center text-muted-foreground py-4">No metrics available for your current subscription tier.</p>}
          </div>
      </div>
    </div>
  );
};

const StrategyInput: React.FC<{label: string, value: string, onChange: (v: string) => void, options: {value: string, label: string}[], tooltipContent: React.ReactNode}> = 
({label, value, onChange, options, tooltipContent}) => (
    <div className="space-y-1">
        <div className="flex items-center"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><HelpTooltip content={tooltipContent} /></div>
        <Select value={value} onValueChange={onChange}><SelectTrigger className="h-8 text-xs bg-navy-900/50 border-navy-600"><SelectValue/></SelectTrigger><SelectContent>{options.map(opt => <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>)}</SelectContent></Select>
    </div>
);

const StrategySlider: React.FC<{label: string, value: number, onChange: (v: number) => void, min: number, max: number, step: number, suffix?: string, tooltipContent: React.ReactNode}> =
({label, value, onChange, min, max, step, suffix, tooltipContent}) => (
     <div className="space-y-1">
        <div className="flex items-center justify-between"><div className="flex items-center"><Label className="text-xs font-medium text-muted-foreground">{label}</Label><HelpTooltip content={tooltipContent} /></div><span className="text-xs font-mono">{value}{suffix}</span></div>
        <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="mt-2" />
    </div>
);