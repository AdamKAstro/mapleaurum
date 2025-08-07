// src/pages/RPSScoringPage/components/RPSConfigPanel.tsx

import React from 'react';
import type { CompanyStatus } from '@/lib/types';
import type { MetricConfig } from '@/lib/metric-types';
import { getMetricByKey } from '@/lib/metric-types';
import { cn } from '@/lib/utils';

// Import the RPS-specific configs and types
import { RPSCompanyConfig } from '../rps-scoring-configs';
import { getMetricRationale } from '../rps-scoring-configs';

// Import UI Components from your library
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calculator, Loader2, Info, AlertCircle } from 'lucide-react';

// --- Component Props ---
interface RPSConfigPanelProps {
    activeCompanyType: CompanyStatus;
    onCompanyTypeChange: (type: CompanyStatus) => void;
    weights: RPSCompanyConfig; // The weights object for the active company type
    onWeightChange: (theme: string, metricKey: string, weight: number) => void;
    onCalculate: () => void;
    isCalculating: boolean;
    companyCount: number;
    accessibleMetrics: readonly MetricConfig[];
}

const COMPANY_TYPE_TABS: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty'];

// --- Sub-Component for a single metric control ---
const MetricWeightControl: React.FC<{
    metricKey: string;
    weight: number;
    theme: string;
    companyType: CompanyStatus;
    onChange: (weight: number) => void;
    isAccessible: boolean;
}> = ({ metricKey, weight, theme, companyType, onChange, isAccessible }) => {
    // Attempt to get rationale from our new RPS config
    const rationale = getMetricRationale(companyType, metricKey);
    if (!rationale) return null;

    // Use a placeholder if metric isn't in the central registry (e.g., for calculated metrics)
    const metricConfig = getMetricByKey(metricKey) || { label: rationale.label, accessTier: 'free' };

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
                                        {!rationale.higherIsBetter && (
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
                step={1} // Allow finer control
                disabled={!isAccessible}
                className="mt-2"
            />
        </div>
    );
};


// --- Main Panel Component ---
export const RPSConfigPanel: React.FC<RPSConfigPanelProps> = ({
    activeCompanyType,
    onCompanyTypeChange,
    weights,
    onWeightChange,
    onCalculate,
    isCalculating,
    companyCount,
    accessibleMetrics,
}) => {
    // Calculate the total weight of all metrics for the active company type
    const totalWeight = Object.values(weights)
        .flatMap(theme => Object.values(theme))
        .reduce((sum, w) => sum + w, 0);
    
    return (
        <div className="flex flex-col space-y-4 bg-navy-700/30 p-5 rounded-xl border border-navy-600/50 h-full">
            <h2 className="text-xl font-bold text-surface-white flex-shrink-0">RPS Configuration</h2>
            
            {/* --- Calculate Button --- */}
            <div className="flex-shrink-0">
                <Button 
                    onClick={onCalculate} 
                    disabled={isCalculating || companyCount === 0} 
                    className="w-full h-12 text-base font-bold bg-gradient-to-r from-accent-teal to-teal-500 hover:from-teal-500 hover:to-accent-teal shadow-lg"
                >
                    {isCalculating ? (
                        <span className="flex items-center gap-2">
                            <Loader2 className="animate-spin" />
                            Calculating RPS...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Calculator />
                            Calculate RPS ({companyCount})
                        </span>
                    )}
                </Button>
            </div>
            
            {/* --- Company Type Tabs & Weight Summary --- */}
            <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-shrink-0">
                <div className="flex border-b border-navy-600 mb-3 flex-wrap">
                    {COMPANY_TYPE_TABS.map(type => (
                        <button 
                            key={type}
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
                    ))}
                </div>
                
                <div>
                    <div className="flex items-center justify-between mb-1">
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
                            Weights should sum to 100% for an accurate score.
                        </p>
                    )}
                </div>
            </div>
            
            {/* --- Metric Weight Sliders (Themed) --- */}
            <div className="bg-navy-800/40 p-3 rounded-lg border border-navy-600/50 flex-grow flex flex-col min-h-0">
                <div className="flex-grow overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-navy-600">
                    {Object.entries(weights).map(([theme, metrics]) => (
                        <div key={theme}>
                            <h3 className="text-base font-semibold mb-3 text-surface-white capitalize">{theme}</h3>
                            <div className="space-y-3">
                                {Object.entries(metrics).map(([metricKey, weight]) => {
                                    const metricConfig = getMetricByKey(metricKey);
                                    const isAccessible = metricConfig ? accessibleMetrics.includes(metricConfig) : true; // Default true for calculated metrics

                                    return (
                                        <MetricWeightControl
                                            key={metricKey}
                                            metricKey={metricKey}
                                            weight={weight}
                                            theme={theme}
                                            companyType={activeCompanyType}
                                            onChange={(newWeight) => onWeightChange(theme, metricKey, newWeight)}
                                            isAccessible={isAccessible}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};