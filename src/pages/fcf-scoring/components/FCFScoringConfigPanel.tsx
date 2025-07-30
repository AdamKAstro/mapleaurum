// src/pages/fcf-scoring/components/FCFScoringConfigPanel.tsx
import React from 'react';
import type { CompanyStatus } from '@/lib/types';
import type { FCFScoringConfigs } from '../types';
import type { MetricConfig } from '@/lib/metric-types';
import { FCF_METRIC_RATIONALES, getFCFMetricsForCompanyType } from '../fcf-scoring-configs';
import { getMetricByKey } from '@/lib/metric-types';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Calculator, Loader2, Info, Lightbulb, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface FCFScoringConfigPanelProps {
    activeCompanyType: CompanyStatus;
    onCompanyTypeChange: (type: CompanyStatus) => void;
    weights: FCFScoringConfigs;
    onWeightChange: (companyType: CompanyStatus, metricKey: string, weight: number) => void;
    normalizeByShares: Record<CompanyStatus, boolean>;
    onNormalizeBySharesChange: (companyType: CompanyStatus, value: boolean) => void;
    onCalculate: () => void;
    isCalculating: boolean;
    companyCount: number;
    accessibleMetrics: readonly MetricConfig[];
}

const COMPANY_TYPE_TABS: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty'];

const CompanyTypeTooltip: React.FC<{ type: CompanyStatus }> = ({ type }) => {
    const rationale = FCF_METRIC_RATIONALES[type];
    return (
        <div className="space-y-2 max-w-sm">
            <p className="font-bold text-surface-white">{type.charAt(0).toUpperCase() + type.slice(1)} Companies</p>
            <p className="text-xs text-gray-300">{rationale.overallApproach}</p>
            <div className="pt-2">
                <p className="text-xs font-semibold text-accent-teal">Key Priorities:</p>
                <ul className="text-xs text-gray-300 list-disc list-inside mt-1">
                    {rationale.keyPriorities.slice(0, 3).map((priority, i) => (
                        <li key={i}>{priority}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const MetricWeightControl: React.FC<{
    metricKey: string;
    weight: number;
    companyType: CompanyStatus;
    onChange: (weight: number) => void;
    isAccessible: boolean;
}> = ({ metricKey, weight, companyType, onChange, isAccessible }) => {
    const metricConfig = getMetricByKey(metricKey);
    const rationale = FCF_METRIC_RATIONALES[companyType]?.metrics.find(m => m.metricKey === metricKey);
    
    if (!metricConfig || !rationale) return null;
    
    return (
        <div className="space-y-2 p-3 bg-navy-800/50 rounded-lg border border-navy-600/50">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                        <Label className="text-sm font-medium text-surface-white">
                            {metricConfig.label}
                        </Label>
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="text-muted-foreground hover:text-accent-teal transition-colors">
                                        <Info size={14} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-md p-4 bg-navy-700/95 border border-navy-600/80">
                                    <div className="space-y-3">
                                        <div>
                                            <p className="font-bold text-surface-white mb-1">Rationale ({weight}% weight)</p>
                                            <p className="text-xs text-gray-300">{rationale.reasoning}</p>
                                        </div>
                                        
                                        <div>
                                            <p className="font-semibold text-accent-teal text-xs mb-1 flex items-center gap-1">
                                                <Lightbulb size={12} />
                                                What to Look For
                                            </p>
                                            <p className="text-xs text-gray-300">{rationale.whatToLookFor}</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="font-semibold text-red-400 text-xs mb-1 flex items-center gap-1">
                                                    <TrendingDown size={12} />
                                                    Red Flags
                                                </p>
                                                <ul className="text-xs text-gray-300 list-disc list-inside space-y-0.5">
                                                    {rationale.redFlags.map((flag, i) => (
                                                        <li key={i}>{flag}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-green-400 text-xs mb-1 flex items-center gap-1">
                                                    <TrendingUp size={12} />
                                                    Green Flags
                                                </p>
                                                <ul className="text-xs text-gray-300 list-disc list-inside space-y-0.5">
                                                    {rationale.greenFlags.map((flag, i) => (
                                                        <li key={i}>{flag}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        
                                        {!metricConfig.higherIsBetter && (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-400 pt-2 border-t border-navy-600/50">
                                                <AlertCircle size={12} />
                                                <span>Lower values score higher for this metric</span>
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {!isAccessible && (
                        <p className="text-xs text-amber-500 mt-1">Requires {metricConfig.accessTier} tier</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-accent-teal w-12 text-right">{weight}%</span>
                </div>
            </div>
            
            <Slider
                value={[weight]}
                onValueChange={([v]) => onChange(v)}
                min={0}
                max={50}
                step={5}
                disabled={!isAccessible}
                className="mt-2"
            />
        </div>
    );
};

export const FCFScoringConfigPanel: React.FC<FCFScoringConfigPanelProps> = ({
    activeCompanyType,
    onCompanyTypeChange,
    weights,
    onWeightChange,
    normalizeByShares,
    onNormalizeBySharesChange,
    onCalculate,
    isCalculating,
    companyCount,
    accessibleMetrics
}) => {
    const activeWeights = weights[activeCompanyType];
    const activeMetrics = getFCFMetricsForCompanyType(activeCompanyType);
    const totalWeight = Object.values(activeWeights).reduce((sum, w) => sum + w, 0);
    
    return (
        <div className="flex flex-col space-y-4 bg-navy-700/30 p-5 rounded-xl border border-navy-600/50 h-full">
            <h2 className="text-xl font-bold text-surface-white flex-shrink-0">FCF Scoring Configuration</h2>
            
            <div className="flex-shrink-0">
                <Button 
                    onClick={onCalculate} 
                    disabled={isCalculating || companyCount === 0} 
                    className="w-full h-12 text-base font-bold bg-gradient-to-r from-accent-teal to-teal-500 hover:from-teal-500 hover:to-accent-teal shadow-lg"
                >
                    {isCalculating ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin" />
                            Calculating FCF Scores...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Calculator />
                            Calculate FCF Scores ({companyCount})
                        </span>
                    )}
                </Button>
            </div>
            
            <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-shrink-0">
                <div className="flex border-b border-navy-600 mb-3 flex-wrap">
                    {COMPANY_TYPE_TABS.map(type => (
                        <TooltipProvider key={type} delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button 
                                        onClick={() => onCompanyTypeChange(type)} 
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 capitalize",
                                            activeCompanyType === type 
                                                ? "border-accent-teal text-accent-teal" 
                                                : "border-transparent text-muted-foreground hover:text-surface-white"
                                        )}
                                    >
                                        {type}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="z-[100] bg-navy-700/95 border border-navy-600/80">
                                    <CompanyTypeTooltip type={type} />
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
                
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Total Weight</Label>
                        <span className={cn(
                            "text-sm font-mono",
                            totalWeight === 100 ? "text-green-400" : "text-amber-400"
                        )}>
                            {totalWeight}%
                        </span>
                    </div>
                    {totalWeight !== 100 && (
                        <p className="text-xs text-amber-400">
                            Weights should sum to 100% for optimal scoring
                        </p>
                    )}
                </div>
                
                <div className="flex items-center space-x-2 p-3 bg-navy-900/50 rounded-lg border border-navy-600/50">
                    <Checkbox 
                        id={`normalize-shares-${activeCompanyType}`}
                        checked={normalizeByShares[activeCompanyType]}
                        onCheckedChange={(checked) => onNormalizeBySharesChange(activeCompanyType, !!checked)}
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                        <label 
                            htmlFor={`normalize-shares-${activeCompanyType}`} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                        >
                            Normalize by Shares
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button className="ml-1.5 text-muted-foreground hover:text-accent-teal transition-colors">
                                            <Info size={13} />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-xs p-3 z-[100] bg-navy-700/95 border border-navy-600/80">
                                        <p className="font-bold mb-1 text-surface-white">Per-Share Normalization</p>
                                        <p className="text-xs text-gray-300 mb-2">
                                            When enabled, absolute financial metrics (FCF, Cash, Debt, EV) are divided by fully diluted shares before scoring.
                                        </p>
                                        <p className="text-xs text-gray-300">
                                            This levels the playing field between companies of different sizes, converting metrics to per-share values. 
                                            Particularly useful for {activeCompanyType === 'explorer' ? 'explorers' : activeCompanyType === 'developer' ? 'developers' : 'comparing companies'} where market cap varies widely.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </label>
                    </div>
                </div>
            </div>
            
            <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-grow flex flex-col min-h-0">
                <h3 className="text-base font-semibold mb-3 flex-shrink-0 flex items-center gap-2">
                    FCF Formula Weights
                    <span className="text-xs font-normal text-muted-foreground">
                        (Hover metrics for detailed rationale)
                    </span>
                </h3>
                <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-navy-600">
                    {activeMetrics.map(metricKey => {
                        const metricConfig = getMetricByKey(metricKey);
                        const isAccessible = metricConfig ? accessibleMetrics.includes(metricConfig) : false;
                        
                        return (
                            <MetricWeightControl
                                key={metricKey}
                                metricKey={metricKey}
                                weight={activeWeights[metricKey] || 0}
                                companyType={activeCompanyType}
                                onChange={(weight) => onWeightChange(activeCompanyType, metricKey, weight)}
                                isAccessible={isAccessible}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};