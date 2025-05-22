// src/pages/scatter-score-pro/index.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFilters } from '../../contexts/filter-context';
import { PageContainer } from '../../components/ui/page-container';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Info, Lock, ArrowUp, ArrowDown, Settings, RefreshCw, ListPlus, X } from 'lucide-react';
import { MetricSelector } from '../../components/metric-selector';
import {
  metrics as allMetrics, // CORRECTED: Import 'metrics' and alias to 'allMetrics'
  metricCategories,
  getAccessibleMetrics,
  type MetricConfig
} from '../../lib/metric-types';
import type { ColumnTier, NormalizationMode, ImputationMode } from '../../lib/types';
import { cn, isValidNumber } from '../../lib/utils';

// --- Local Type Definitions ---
interface AxisMetricConfig {
  key: string;
  metricLabel: string;
  weight: number;
  userHigherIsBetter: boolean;
  originalHigherIsBetter: boolean;
}

interface ScatterScoreTemplate {
  name: string;
  description: string;
  xMetricsConfig: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>;
  yMetricsConfig: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>;
  zMetricKey?: string | null;
  zScale?: 'linear' | 'log';
  defaultNormalizationMode?: NormalizationMode;
  defaultImputationMode?: ImputationMode;
}

const DEBUG_SCATTER_SCORE = process.env.NODE_ENV === 'development';

// --- PRE-DEFINED TEMPLATES --- (Full 5 templates as previously confirmed by user)
const PREDEFINED_TEMPLATES: ScatterScoreTemplate[] = [
  {
    name: "Value Hunter",
    description: "Focuses on undervalued companies with strong fundamentals and asset backing.",
    xMetricsConfig: [ 
      { key: 'financials.price_to_book', weight: 20, userHigherIsBetter: false },
      { key: 'financials.price_to_sales', weight: 20, userHigherIsBetter: false },
      { key: 'financials.enterprise_to_ebitda', weight: 20, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_mkt_cap_per_reserve_oz_all', weight: 20, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_ev_per_reserve_oz_all', weight: 20, userHigherIsBetter: false },
    ],
    yMetricsConfig: [ 
      { key: 'financials.net_financial_assets', weight: 25, userHigherIsBetter: true },
      { key: 'financials.debt_value', weight: 25, userHigherIsBetter: false }, 
      { key: 'financials.free_cash_flow', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_reserves_total_aueq_moz', weight: 25, userHigherIsBetter: true },
    ],
    zMetricKey: 'financials.market_cap_value', zScale: 'log',
    defaultNormalizationMode: 'dataset_rank_percentile', defaultImputationMode: 'dataset_median',
  },
  {
    name: "Growth Catalyst Seeker",
    description: "Targets companies with high resource expansion and production growth potential.",
    xMetricsConfig: [ 
      { key: 'mineral_estimates.me_potential_total_aueq_moz', weight: 30, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_resources_total_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_measured_indicated_total_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_potential_non_precious_aueq_moz', weight: 20, userHigherIsBetter: true },
    ],
    yMetricsConfig: [ 
      { key: 'production.p_future_production_total_aueq_koz', weight: 40, userHigherIsBetter: true },
      { key: 'financials.peg_ratio', weight: 30, userHigherIsBetter: false },
      { key: 'financials.forward_pe', weight: 30, userHigherIsBetter: false },
    ],
    zMetricKey: 'financials.enterprise_value_value', zScale: 'log',
    defaultNormalizationMode: 'dataset_min_max', defaultImputationMode: 'dataset_mean',
  },
  {
    name: "Producer Profitability Focus",
    description: "For analyzing currently producing companies, emphasizing profitability and operational efficiency.",
    xMetricsConfig: [ 
      { key: 'costs.c_aisc_last_year', weight: 30, userHigherIsBetter: false },
      { key: 'costs.c_aisc_last_quarter', weight: 30, userHigherIsBetter: false },
      { key: 'costs.c_tco_current', weight: 20, userHigherIsBetter: false },
      { key: 'costs.c_aic_last_year', weight: 20, userHigherIsBetter: false },
    ],
    yMetricsConfig: [ 
      { key: 'financials.ebitda', weight: 25, userHigherIsBetter: true },
      { key: 'financials.net_income_value', weight: 25, userHigherIsBetter: true },
      { key: 'financials.free_cash_flow', weight: 25, userHigherIsBetter: true },
      { key: 'production.p_current_production_total_aueq_koz', weight: 25, userHigherIsBetter: true },
    ],
    zMetricKey: 'financials.revenue_value', zScale: 'log',
    defaultNormalizationMode: 'dataset_rank_percentile', defaultImputationMode: 'dataset_median',
  },
  {
    name: "Financial Stability & Low Risk",
    description: "For risk-averse investors prioritizing companies with strong balance sheets and low debt.",
    xMetricsConfig: [
      { key: 'financials.cash_value', weight: 25, userHigherIsBetter: true },
      { key: 'financials.debt_value', weight: 25, userHigherIsBetter: false },
      { key: 'financials.net_financial_assets', weight: 25, userHigherIsBetter: true },
      { key: 'financials.liabilities', weight: 25, userHigherIsBetter: false },
    ],
    yMetricsConfig: [ 
      { key: 'production.p_reserve_life_years', weight: 35, userHigherIsBetter: true },
      { key: 'costs.c_aisc_last_year', weight: 35, userHigherIsBetter: false },
      { key: 'financials.gross_profit', weight: 30, userHigherIsBetter: true },
    ],
    zMetricKey: 'production.p_reserve_life_years', zScale: 'linear',
    defaultNormalizationMode: 'global_min_max', defaultImputationMode: 'zero_worst',
  },
  {
    name: "Precious Metals Pure Play",
    description: "Focusing on companies with high exposure to gold/silver, their precious resources, and related valuations.",
    xMetricsConfig: [ 
      { key: 'mineral_estimates.me_reserves_precious_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_measured_indicated_precious_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_resources_precious_aueq_moz', weight: 20, userHigherIsBetter: true },
      { key: 'company-overview.percent_gold', weight: 15, userHigherIsBetter: true },
      { key: 'company-overview.percent_silver', weight: 15, userHigherIsBetter: true },
    ],
    yMetricsConfig: [ 
      { key: 'valuation_metrics.vm_mkt_cap_per_reserve_oz_precious', weight: 25, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_ev_per_reserve_oz_precious', weight: 25, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_mkt_cap_per_mi_oz_precious', weight: 25, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_ev_per_mi_oz_precious', weight: 25, userHigherIsBetter: false },
    ],
    zMetricKey: 'production.p_current_production_precious_aueq_koz', zScale: 'log',
    defaultNormalizationMode: 'dataset_min_max', defaultImputationMode: 'dataset_median',
  }
];
// --- END: PRE-DEFINED TEMPLATES ---

const ScaleToggle: React.FC<{ scale: 'linear' | 'log'; onChange: (newScale: 'linear' | 'log') => void; label: string }> = ({ scale, onChange, label }) => (
    <div className="flex items-center gap-2 text-xs mt-1">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex bg-muted rounded-md p-0.5">
        <Button variant={scale === 'linear' ? 'secondary' : 'ghost'} size="xs" onClick={() => onChange('linear')} className={cn("px-2 py-0.5 h-7 text-xs", scale === 'linear' && "shadow-md")}>Linear</Button>
        <Button variant={scale === 'log' ? 'secondary' : 'ghost'} size="xs" onClick={() => onChange('log')} className={cn("px-2 py-0.5 h-7 text-xs", scale === 'log' && "shadow-md")}>Log</Button>
      </div>
    </div>
);

const normalizeWeights = (
    metrics: AxisMetricConfig[],
    changedMetricKey?: string,
    userSetWeightForChangedMetric?: number
): AxisMetricConfig[] => {
    if (!Array.isArray(metrics) || metrics.length === 0) return [];

    let mutableMetrics = metrics.map(m => ({ ...m })); // Work with a mutable copy

    if (mutableMetrics.length === 1) {
        mutableMetrics[0].weight = 100;
        return mutableMetrics;
    }

    let fixedWeightTotal = 0;
    let adjustableMetricsIndices: number[] = [];

    // Apply user-set weight first and identify fixed vs. adjustable
    if (changedMetricKey && userSetWeightForChangedMetric !== undefined) {
        const idx = mutableMetrics.findIndex(m => m.key === changedMetricKey);
        if (idx !== -1) {
            mutableMetrics[idx].weight = Math.max(0, Math.min(100, userSetWeightForChangedMetric));
            fixedWeightTotal = mutableMetrics[idx].weight;
        }
    }
    
    let sumOfAdjustableOriginalWeights = 0;
    mutableMetrics.forEach((m, index) => {
        if (m.key !== changedMetricKey) {
            adjustableMetricsIndices.push(index);
            sumOfAdjustableOriginalWeights += m.weight; // Sum original weights of adjustable metrics
        }
    });

    const remainingWeightToDistribute = 100 - fixedWeightTotal;

    if (adjustableMetricsIndices.length > 0) {
        if (sumOfAdjustableOriginalWeights === 0 || changedMetricKey) { 
            // If others were 0 or one specific metric was changed, distribute remaining weight equally
            const equalShare = remainingWeightToDistribute / adjustableMetricsIndices.length;
            adjustableMetricsIndices.forEach(idx => {
                mutableMetrics[idx].weight = Math.max(0, Math.round(equalShare));
            });
        } else { // Distribute remaining proportionally to original weights of adjustable metrics
            adjustableMetricsIndices.forEach(idx => {
                const proportion = mutableMetrics[idx].weight / sumOfAdjustableOriginalWeights;
                mutableMetrics[idx].weight = Math.max(0, Math.round(proportion * remainingWeightToDistribute));
            });
        }
    } else if (mutableMetrics.length === 1 && changedMetricKey) { // Only one metric, and it was the one changed
         mutableMetrics[0].weight = 100; // Ensure it takes full 100% if it's the only one after adjustment
    } else if (mutableMetrics.length > 0 && !changedMetricKey) { // Fallback for add/remove or initial template load
        const equalWeight = Math.floor(100 / mutableMetrics.length);
        mutableMetrics = mutableMetrics.map(m => ({ ...m, weight: equalWeight }));
    }

    // Final pass to ensure sum is exactly 100 due to rounding
    let currentSum = mutableMetrics.reduce((sum, m) => sum + m.weight, 0);
    if (mutableMetrics.length > 0 && currentSum !== 100) {
        const diff = 100 - currentSum;
        // Try to adjust a metric that wasn't the one explicitly changed by the user, or the first/last if no specific change
        let adjustIndex = -1;
        if (changedMetricKey) {
            adjustIndex = mutableMetrics.findIndex(m => m.key !== changedMetricKey && (m.weight + diff) >= 0 && (m.weight + diff) <= 100);
        }
        if (adjustIndex === -1) { // If no suitable "other" metric, try any metric
             adjustIndex = mutableMetrics.findIndex(m => (m.weight + diff) >= 0 && (m.weight + diff) <= 100);
             if (adjustIndex === -1 && mutableMetrics.length > 0) { // Fallback to first if no ideal candidate
                adjustIndex = 0;
             }
        }
        
        if (adjustIndex !== -1 && mutableMetrics[adjustIndex]) {
             mutableMetrics[adjustIndex].weight += diff;
        } else if (mutableMetrics.length > 0 && diff !== 0) { 
            // If still not 100 and couldn't adjust nicely, force adjustment on the first element
            // This handles cases where all other items are 0 or 100.
            mutableMetrics[0].weight = Math.max(0, Math.min(100, mutableMetrics[0].weight + diff));
            // If this made sum not 100 again (because first item was clamped), re-distribute the small error.
            let reSum = mutableMetrics.reduce((s,m) => s + m.weight, 0);
            if (mutableMetrics.length > 1 && reSum !== 100) {
                const reDiff = 100 - reSum;
                if (mutableMetrics[1]) mutableMetrics[1].weight += reDiff; // Add to second if exists
                else mutableMetrics[0].weight += reDiff; // Or back to first
            }
        }
    }
    // Final clamp on all weights after adjustments
    return mutableMetrics.map(m => ({...m, weight: Math.max(0, Math.min(100, Math.round(m.weight)))}));
};


export function ScatterScoreProPage() {
  const { currentUserTier } = useFilters();

  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(
    PREDEFINED_TEMPLATES.length > 0 ? PREDEFINED_TEMPLATES[0].name : null
  );
  
  const [selectedXMetrics, setSelectedXMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedYMetrics, setSelectedYMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedZMetricKey, setSelectedZMetricKey] = useState<string | null>(null);
  const [zScale, setZScale] = useState<'linear' | 'log'>('log');
  
  const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>('dataset_rank_percentile');
  const [imputationMode, setImputationMode] = useState<ImputationMode>('dataset_median');

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);

  const accessibleMetrics = useMemo(() => getAccessibleMetrics(currentUserTier || 'free'), [currentUserTier]);

  const getMetricConfigDetails = useCallback((key: string): MetricConfig | undefined => {
    return allMetrics.find(m => m.key === key);
  }, []);

  const loadTemplate = useCallback((templateName: string | null) => {
    const template = PREDEFINED_TEMPLATES.find(t => t.name === templateName) || PREDEFINED_TEMPLATES[0];
    if (!template) {
        if (DEBUG_SCATTER_SCORE && templateName) console.warn(`[ScatterScoreProPage] Template '${templateName}' not found or no templates exist.`);
        setSelectedXMetrics([]); setSelectedYMetrics([]); setSelectedZMetricKey(null);
        setActiveTemplateName(null);
        return;
    }

    setActiveTemplateName(template.name);

    const mapAndFilterMetrics = (configs: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>): AxisMetricConfig[] => {
      return configs
        .map(m => {
          const metricConfig = getMetricConfigDetails(m.key);
          if (!metricConfig) {
            if (DEBUG_SCATTER_SCORE) console.warn(`[ScatterScoreProPage] Metric config not found for key: ${m.key} in template '${template.name}'`);
            return null;
          }
          if (!accessibleMetrics.some(am => am.key === m.key)) {
            if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Metric ${metricConfig.label} from template '${template.name}' not accessible for tier ${currentUserTier}. Skipping.`);
            return null;
          }
          return {
            key: m.key,
            metricLabel: metricConfig.label,
            weight: m.weight,
            userHigherIsBetter: m.userHigherIsBetter ?? metricConfig.higherIsBetter,
            originalHigherIsBetter: metricConfig.higherIsBetter,
          };
        })
        .filter(m => m !== null) as AxisMetricConfig[];
    };

    setSelectedXMetrics(normalizeWeights(mapAndFilterMetrics(template.xMetricsConfig)));
    setSelectedYMetrics(normalizeWeights(mapAndFilterMetrics(template.yMetricsConfig)));
    
    const zMetricIsAccessible = template.zMetricKey ? accessibleMetrics.some(am => am.key === template.zMetricKey) : false; // Fixed: check accessibleMetrics
    setSelectedZMetricKey(zMetricIsAccessible && template.zMetricKey ? template.zMetricKey : null);
    
    setZScale(template.zScale || 'log');
    setNormalizationMode(template.defaultNormalizationMode || 'dataset_rank_percentile');
    setImputationMode(template.defaultImputationMode || 'dataset_median');

    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Loaded template: ${template.name}`);
  }, [accessibleMetrics, currentUserTier, getMetricConfigDetails]);

  useEffect(() => {
    if (PREDEFINED_TEMPLATES.length > 0 && !activeTemplateName) {
        loadTemplate(PREDEFINED_TEMPLATES[0].name);
    }
  }, [loadTemplate, activeTemplateName]);
  
  useEffect(() => {
    if(activeTemplateName) { // If a template is active, reload it if accessible metrics change
        loadTemplate(activeTemplateName);
    } else if (PREDEFINED_TEMPLATES.length > 0 && (selectedXMetrics.length === 0 && selectedYMetrics.length === 0)){ // If no template active and axes empty, load default
        loadTemplate(PREDEFINED_TEMPLATES[0].name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessibleMetrics]); // Re-evaluate template metrics when accessibleMetrics list changes (due to tier change)


  const handleTemplateChange = (newTemplateName: string) => {
    loadTemplate(newTemplateName);
  };
  
  const handleAxisMetricChange = (
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => {
    const setSelectedMetrics = axisType === 'X' ? setSelectedXMetrics : setSelectedYMetrics;
    setSelectedMetrics(prevMetrics => {
      let newMetricsArray = JSON.parse(JSON.stringify(prevMetrics)) as AxisMetricConfig[];
      const existingIndex = newMetricsArray.findIndex(m => m.key === metricKey);

      if (action === 'add') {
        if (existingIndex === -1) {
          const metricConfig = getMetricConfigDetails(metricKey);
          if (metricConfig) {
            newMetricsArray.push({
              key: metricKey,
              metricLabel: metricConfig.label,
              weight: 0, 
              userHigherIsBetter: metricConfig.higherIsBetter,
              originalHigherIsBetter: metricConfig.higherIsBetter,
            });
            return normalizeWeights(newMetricsArray);
          }
        }
      } else if (action === 'remove') {
        newMetricsArray = newMetricsArray.filter(m => m.key !== metricKey);
        return normalizeWeights(newMetricsArray);
      } else if (existingIndex !== -1) {
        if (action === 'updateWeight') {
          const newWeight = Number(value); // Ensure value is treated as number
          return normalizeWeights(newMetricsArray, metricKey, newWeight);
        } else if (action === 'toggleHLB') {
          newMetricsArray[existingIndex].userHigherIsBetter = !!value;
          return newMetricsArray; 
        }
      }
      return prevMetrics; 
    });
    setActiveTemplateName(null);
  };
  
  const xTotalWeight = useMemo(() => Math.round(selectedXMetrics.reduce((sum, m) => sum + m.weight, 0)), [selectedXMetrics]);
  const yTotalWeight = useMemo(() => Math.round(selectedYMetrics.reduce((sum, m) => sum + m.weight, 0)), [selectedYMetrics]);

  const handleApplyConfiguration = () => {
    if (selectedXMetrics.length > 0 && xTotalWeight !== 100) {
        alert("Total weight for X-Axis metrics must sum to 100%. Please adjust.");
        return;
    }
    if (selectedYMetrics.length > 0 && yTotalWeight !== 100) {
        alert("Total weight for Y-Axis metrics must sum to 100%. Please adjust.");
        return;
    }
    if (DEBUG_SCATTER_SCORE) {
      console.log("[ScatterScoreProPage] Applying configuration:", {
        activeTemplateName, selectedXMetrics, xTotalWeight,
        selectedYMetrics, yTotalWeight, selectedZMetricKey, zScale,
        normalizationMode, imputationMode,
      });
    }
    // TODO: Trigger actual score calculation and chart data update (Mini PRD-SS-2, SS-3)
  };

  // AvailableMetricsSelector sub-component defined within ScatterScoreProPage
  const AvailableMetricsSelector: React.FC<{
    axisLabel: 'X' | 'Y';
    onMetricSelect: (metricKey: string) => void;
    currentSelectedKeys: string[];
  }> = ({ axisLabel, onMetricSelect, currentSelectedKeys }) => {
    return (
      <div className="my-3">
        <Label className="text-xs font-medium text-muted-foreground">Add Metric to {axisLabel}-Axis</Label>
        <Select onValueChange={(value) => { if(value && value !== "__placeholder__") onMetricSelect(value); }}>
          <SelectTrigger className="text-xs h-9 bg-navy-600/50 border-navy-500 mt-1">
            <SelectValue placeholder={`Select metric to add...`} />
          </SelectTrigger>
          <SelectContent className="max-h-72 z-[60]">
            <SelectItem value="__placeholder__" disabled className="text-xs hidden">Select metric...</SelectItem>
            {Object.entries(metricCategories)
              .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
              .map(([catKey, catLabel]) => {
                const metricsInCat = accessibleMetrics.filter(
                    m => m.category === catKey && !currentSelectedKeys.includes(m.key)
                );
                if (metricsInCat.length === 0) return null;
                return (
                    <SelectGroup key={catKey}>
                        <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{catLabel}</SelectLabel>
                        {metricsInCat.map(m => (
                            <SelectItem key={m.key} value={m.key} className="text-xs pl-4">
                                {m.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                );
            })}
            {accessibleMetrics.filter(m => !currentSelectedKeys.includes(m.key)).length === 0 && (
                <div className="p-2 text-xs text-muted-foreground text-center">All accessible metrics added.</div>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // renderAxisMetricConfigurator sub-component defined within ScatterScoreProPage
  const renderAxisMetricConfigurator = (
    axisTitle: 'X-Axis Score Metrics' | 'Y-Axis Score Metrics',
    currentSelectedMetrics: AxisMetricConfig[],
    axisType: 'X' | 'Y',
    currentTotalWeight: number
  ) => {
    return (
      <Card className="p-3 md:p-4 bg-navy-700/50 border-navy-600">
        <CardHeader className="p-0 mb-2">
            <CardTitle className="text-md font-semibold">{axisTitle}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <AvailableMetricsSelector
                axisLabel={axisType}
                onMetricSelect={(metricKey) => handleAxisMetricChange(axisType, metricKey, 'add')}
                currentSelectedKeys={currentSelectedMetrics.map(m => m.key)}
            />
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mt-2 scrollbar-thin scrollbar-thumb-navy-500 scrollbar-track-navy-700/30">
            {currentSelectedMetrics.length === 0 && <p className="text-xs text-muted-foreground italic py-2 text-center">No metrics selected for this axis.</p>}
            {currentSelectedMetrics.map((sm) => (
                <div key={sm.key} className="p-2.5 border rounded-md bg-navy-600/40 border-navy-500/70 space-y-1.5">
                    <div className="flex justify-between items-center">
                    <Label htmlFor={`weight-${axisType}-${sm.key}`} className="text-xs font-medium text-surface-white truncate flex-grow mr-2" title={sm.metricLabel}>{sm.metricLabel}</Label>
                    <Button variant="ghost" size="icon" className="p-0 h-5 w-5 text-red-500 hover:text-red-400 flex-shrink-0" onClick={() => 
                        handleAxisMetricChange(axisType, sm.key, 'remove')
                    }>
                        <X size={14} />
                    </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                            <Label htmlFor={`weight-${axisType}-${sm.key}`} className="text-xs text-muted-foreground">Wt:</Label>
                            <Input
                                id={`weight-${axisType}-${sm.key}`}
                                type="number"
                                value={sm.weight}
                                onChange={(e) => handleAxisMetricChange(axisType, sm.key, 'updateWeight', parseInt(e.target.value, 10))}
                                className="h-7 text-xs w-16 bg-navy-800 border-navy-500 px-1.5"
                                min={0} max={100} step={1}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                        </div>
                    <Label htmlFor={`hlb-${axisType}-${sm.key}`} className="flex items-center text-xs gap-1.5 cursor-pointer text-surface-white/80">
                        <Checkbox
                        id={`hlb-${axisType}-${sm.key}`}
                        checked={sm.userHigherIsBetter}
                        onCheckedChange={(checked) => 
                            handleAxisMetricChange(axisType, sm.key, 'toggleHLB', !!checked)
                        }
                        className="border-gray-500 data-[state=checked]:bg-accent-teal data-[state=checked]:border-accent-teal-darker h-3.5 w-3.5"
                        />
                        HLB
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild><button type="button" className="cursor-help"><Info size={12} className="text-muted-foreground hover:text-accent-teal"/></button></TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-xs p-2 z-[70]">
                                    <p>Check if a HIGHER value of this metric is better for this axis score. Default: {sm.originalHigherIsBetter ? 'Higher is better' : 'Lower is better'}.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </Label>
                    </div>
                </div>
                ))}
            </div>
            <div className={cn("text-xs mt-2 font-medium", currentTotalWeight !== 100 && currentSelectedMetrics.length > 0 ? "text-destructive" : currentTotalWeight === 100 ? "text-green-400" : "text-muted-foreground")}>
                Total {axisType}-Axis Weight: {currentTotalWeight}% {currentSelectedMetrics.length > 0 && currentTotalWeight !==100 && "(Must sum to 100%)"}
            </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description="Configure multi-metric axes for custom scatter plots and derived scores."
      className="flex flex-col h-full"
      contentClassName="flex flex-col flex-grow min-h-0"
    >
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 flex-grow overflow-hidden">
        <Button 
            onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} 
            variant="outline" 
            className="lg:hidden fixed bottom-4 right-4 z-[60] bg-navy-700 border-navy-600 p-2 h-auto shadow-lg"
            aria-label="Toggle Configuration Panel"
        >
            <Settings size={20}/>
        </Button>

        <motion.div 
            initial={false}
            animate={isConfigPanelOpen ? "open" : "closed"}
            variants={{
                open: { opacity: 1, x: 0, display: 'flex' },
                closed: { opacity: 0, x: "-100%", transitionEnd: { display: 'none' } }
            }}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            className={cn(
                "flex-col space-y-4 overflow-y-auto bg-navy-800/80 border border-navy-700/70 backdrop-blur-lg rounded-xl p-3 md:p-4 flex-shrink-0 lg:w-[400px] xl:w-[450px] scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-navy-700/50",
                "fixed inset-0 z-50 lg:relative lg:z-auto lg:inset-auto lg:h-[calc(100vh-var(--header-height,80px)-3rem)]" 
            )}
            style={{'--header-height': '80px'} as React.CSSProperties}
        >
            <div className="flex justify-between items-center mb-1 sticky top-0 bg-navy-800/90 backdrop-blur-sm py-2 -mx-3 md:-mx-4 px-3 md:px-4 z-10 border-b border-navy-700">
                <h2 className="text-lg xl:text-xl font-semibold text-surface-white">Chart Configuration</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsConfigPanelOpen(false)} className="lg:hidden text-muted-foreground hover:text-surface-white">
                    <X size={20}/>
                </Button>
            </div>
          
            <div className="px-1 space-y-4 pb-4">
                <div>
                  <Label htmlFor="template-selector" className="text-xs font-semibold text-muted-foreground block mb-1">Load Template</Label>
                  <Select value={activeTemplateName || ""} onValueChange={handleTemplateChange}>
                    <SelectTrigger id="template-selector" className="w-full h-9 text-xs bg-navy-700 border-navy-600">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {PREDEFINED_TEMPLATES.map(t => (
                        <SelectItem key={t.name} value={t.name} className="text-xs">
                            {t.name} 
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild><button type="button" className="ml-2 opacity-50 hover:opacity-100" onClick={(e) => e.stopPropagation()}><Info size={12}/></button></TooltipTrigger>
                                    <TooltipContent side="right" className="text-xs max-w-xs p-2 z-[70]">
                                        <p>{t.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {renderAxisMetricConfigurator("X-Axis Score Metrics", selectedXMetrics, 'X', xTotalWeight)}
                {renderAxisMetricConfigurator("Y-Axis Score Metrics", selectedYMetrics, 'Y', yTotalWeight)}

                <Card className="p-3 md:p-4 bg-navy-700/50 border-navy-600">
                  <CardHeader className="p-0 mb-2"><CardTitle className="text-md font-semibold">Z-Axis (Bubble Size)</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <MetricSelector
                        label=""
                        selectedMetric={selectedZMetricKey}
                        onMetricChange={setSelectedZMetricKey}
                        currentTier={currentUserTier}
                        availableMetrics={accessibleMetrics} 
                        filterForNumericOnly={true} 
                        placeholder="Select Z-Axis Metric..."
                    />
                    {selectedZMetricKey && <ScaleToggle scale={zScale} onChange={setZScale} label="Bubble Scale" />}
                  </CardContent>
                </Card>

                <Card className="p-3 md:p-4 bg-navy-700/50 border-navy-600">
                    <CardHeader className="p-0 mb-2"><CardTitle className="text-md font-semibold">Scoring Settings</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="space-y-3">
                          <div>
                              <Label htmlFor="norm-mode" className="text-xs font-medium text-muted-foreground">Normalization Mode</Label>
                              <Select value={normalizationMode} onValueChange={(val) => setNormalizationMode(val as NormalizationMode)}>
                                  <SelectTrigger id="norm-mode" className="h-9 text-xs bg-navy-700 border-navy-600 mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent className="z-[60]">
                                      <SelectItem value="dataset_min_max" className="text-xs">Dataset Min-Max (0-1)</SelectItem>
                                      <SelectItem value="global_min_max" className="text-xs">Global Min-Max (0-1)</SelectItem>
                                      <SelectItem value="dataset_rank_percentile" className="text-xs">Dataset Rank/Percentile (0-1)</SelectItem>
                                      <SelectItem value="dataset_z_score" className="text-xs">Dataset Z-Score (approx 0-1)</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div>
                              <Label htmlFor="impute-mode" className="text-xs font-medium text-muted-foreground">Imputation (Missing Values)</Label>
                              <Select value={imputationMode} onValueChange={(val) => setImputationMode(val as ImputationMode)}>
                                  <SelectTrigger id="impute-mode" className="h-9 text-xs bg-navy-700 border-navy-600 mt-1"><SelectValue /></SelectTrigger>
                                  <SelectContent className="z-[60]">
                                      <SelectItem value="zero_worst" className="text-xs">Zero / Worst Case</SelectItem>
                                      <SelectItem value="dataset_mean" className="text-xs">Dataset Mean</SelectItem>
                                      <SelectItem value="dataset_median" className="text-xs">Dataset Median</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                      </div>
                    </CardContent>
                </Card>

                <Button onClick={handleApplyConfiguration} className="w-full mt-3 bg-accent-teal hover:bg-accent-teal/90 text-sm font-semibold py-2.5">
                  <RefreshCw size={16} className="mr-2"/> Apply & Plot Scores
                </Button>
            </div>
        </motion.div>

        {/* Chart Display Area */}
        <div className="flex-grow bg-navy-800/30 p-4 rounded-lg border border-navy-700 backdrop-blur-sm flex items-center justify-center min-h-[400px] lg:min-h-0">
          <p className="text-center text-gray-400">
            Scatter plot and score results will appear here.
            <br /> (Implementation in Mini PRD-SS-2 & SS-3)
          </p>
        </div>
      </div>
    </PageContainer>
  );
}