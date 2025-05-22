// src/pages/scatter-score-pro/index.tsx
// Imports at the top remain the same as v2.6
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
  metrics as allMetrics,
  metricCategories,
  getAccessibleMetrics,
  type MetricConfig
} from '../../lib/metric-types';
import type { ColumnTier, NormalizationMode, ImputationMode } from '../../lib/types';
import { cn, isValidNumber } from '../../lib/utils';

// --- Local Type Definitions --- (Keep as before)
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

/**
 * Normalizes an array of AxisMetricConfig to ensure their weights sum to 100%.
 * - If only one metric, it gets 100%.
 * - If multiple metrics and a specific one was just changed by user (changedMetricKey), that weight is respected (clamped 0-100).
 * The remaining (100 - changedMetricWeight) is distributed proportionally among other metrics.
 * - If no specific metric was changed (e.g., on add/remove or template load), weights are distributed equally.
 * - Handles edge cases and ensures a final sum of 100 by adjusting one item.
 */
const normalizeWeights = (
    metrics: AxisMetricConfig[],
    changedMetricKey?: string,
    userSetWeightForChangedMetric?: number // The new weight the user set for changedMetricKey
): AxisMetricConfig[] => {
    if (!Array.isArray(metrics) || metrics.length === 0) {
        if (DEBUG_SCATTER_SCORE) console.log("[normalizeWeights] Input is empty or not an array, returning empty.");
        return [];
    }

    let workingMetrics = metrics.map(m => ({ ...m, weight: Math.max(0, Math.min(100, Number(m.weight) || 0)) }));

    if (workingMetrics.length === 1) {
        workingMetrics[0].weight = 100;
        if (DEBUG_SCATTER_SCORE) console.log("[normalizeWeights] Single metric, set weight to 100:", workingMetrics);
        return workingMetrics;
    }

    const totalTargetWeight = 100;
    let sumOfManuallySetWeights = 0;
    let countOfManuallySetMetrics = 0;
    
    // Apply user-set weight first if a specific metric was changed
    if (changedMetricKey && userSetWeightForChangedMetric !== undefined) {
        const idx = workingMetrics.findIndex(m => m.key === changedMetricKey);
        if (idx !== -1) {
            workingMetrics[idx].weight = Math.max(0, Math.min(100, userSetWeightForChangedMetric));
            sumOfManuallySetWeights = workingMetrics[idx].weight;
            countOfManuallySetMetrics = 1;
        }
    }

    const adjustableMetrics = workingMetrics.filter(m => m.key !== changedMetricKey);
    const sumOfOriginalAdjustableWeights = adjustableMetrics.reduce((sum, m) => sum + m.weight, 0);
    let weightToDistributeToAdjustable = totalTargetWeight - sumOfManuallySetWeights;

    if (adjustableMetrics.length > 0) {
        if (weightToDistributeToAdjustable <= 0) { // No room left for others, or negative room
            adjustableMetrics.forEach(m => {
                const idx = workingMetrics.findIndex(wm => wm.key === m.key);
                if (idx !== -1) workingMetrics[idx].weight = 0;
            });
        } else if (sumOfOriginalAdjustableWeights === 0 && changedMetricKey) { // If user set one, and others were 0, distribute remaining equally
            const equalShare = weightToDistributeToAdjustable / adjustableMetrics.length;
            adjustableMetrics.forEach(m => {
                const idx = workingMetrics.findIndex(wm => wm.key === m.key);
                if (idx !== -1) workingMetrics[idx].weight = Math.max(0, equalShare); // equalShare can be rounded later
            });
        } else if (sumOfOriginalAdjustableWeights > 0 && changedMetricKey) { // Distribute proportionally based on their previous share
            const scaleFactor = weightToDistributeToAdjustable / sumOfOriginalAdjustableWeights;
            adjustableMetrics.forEach(m => {
                const idx = workingMetrics.findIndex(wm => wm.key === m.key);
                if (idx !== -1) workingMetrics[idx].weight = Math.max(0, m.weight * scaleFactor);
            });
        } else { // No specific metric changed (add/remove/initial template load with multiple items) -> distribute equally
            const equalShare = totalTargetWeight / workingMetrics.length;
            workingMetrics = workingMetrics.map(m => ({ ...m, weight: equalShare }));
        }
    } else if (workingMetrics.length > 0 && countOfManuallySetMetrics === workingMetrics.length && sumOfManuallySetWeights !== 100) {
      // All metrics were "manually set" (e.g., only one metric existed and its weight was changed)
      // If it's a single metric, its weight should just become 100. This is handled by the first check.
    }


    // Round all weights and make a final pass to ensure sum is exactly 100
    let roundedMetrics = workingMetrics.map(m => ({ ...m, weight: Math.round(m.weight) }));
    let currentSum = roundedMetrics.reduce((sum, m) => sum + m.weight, 0);

    if (roundedMetrics.length > 0 && currentSum !== 100) {
        const diff = 100 - currentSum;
        // Prioritize adjusting a metric that was NOT the one manually changed by the user,
        // or one that has some weight already if possible.
        let adjustIdx = -1;
        if (changedMetricKey) {
            const candidates = roundedMetrics.map((m,i) => ({m, i})).filter(item => item.m.key !== changedMetricKey);
            if (candidates.length > 0) {
                // Try to adjust the one with the largest weight among these "other" metrics
                candidates.sort((a,b) => b.m.weight - a.m.weight);
                if (candidates[0].m.weight + diff >= 0) adjustIdx = candidates[0].i;
            }
        }
        if (adjustIdx === -1) { // If no suitable "other" or no changedKey, find any suitable
           adjustIdx = roundedMetrics.findIndex(m => (m.weight + diff) >=0 && (m.weight + diff) <=100);
           if (adjustIdx === -1) adjustIdx = 0; // Fallback to first if no ideal candidate
        }

        if (roundedMetrics[adjustIdx]) {
             roundedMetrics[adjustIdx].weight = Math.max(0, Math.min(100, roundedMetrics[adjustIdx].weight + diff));
        }

        // If still not 100 (e.g., primary adjustment was clamped), distribute to remaining if possible
        currentSum = roundedMetrics.reduce((sum, m) => sum + m.weight, 0);
        if (roundedMetrics.length > 0 && currentSum !== 100) {
            const finalDiff = 100 - currentSum;
            // Simple distribution of tiny remainder to first element if it won't make it invalid
            if (roundedMetrics[0].weight + finalDiff >= 0 && roundedMetrics[0].weight + finalDiff <= 100) {
                 roundedMetrics[0].weight += finalDiff;
            } else if (roundedMetrics.length > 1 && roundedMetrics[1].weight + finalDiff >= 0 && roundedMetrics[1].weight + finalDiff <= 100) {
                 roundedMetrics[1].weight += finalDiff; // try second
            }
            // Ensure final sum is 100 by adjusting first metric if really needed (can lead to slight non-proportionality but ensures sum)
            currentSum = roundedMetrics.reduce((sum, m) => sum + m.weight, 0);
            if (roundedMetrics.length > 0 && currentSum !== 100) {
                 roundedMetrics[0].weight += (100 - currentSum);
                 roundedMetrics[0].weight = Math.max(0, Math.min(100, roundedMetrics[0].weight)); // Clamp again
            }
        }
    }
    if (DEBUG_SCATTER_SCORE) console.log("[normalizeWeights] Output:", roundedMetrics.map(m=> ({key:m.key, weight: m.weight})));
    return roundedMetrics;
};


export function ScatterScoreProPage() {
  const { currentUserTier } = useFilters();
  
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(() => 
    PREDEFINED_TEMPLATES.length > 0 ? PREDEFINED_TEMPLATES[0].name : null
  );
  
  const [selectedXMetrics, setSelectedXMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedYMetrics, setSelectedYMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedZMetricKey, setSelectedZMetricKey] = useState<string | null>(null);
  const [zScale, setZScale] = useState<'linear' | 'log'>('log');
  
  const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>('dataset_rank_percentile');
  const [imputationMode, setImputationMode] = useState<ImputationMode>('dataset_median');

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);

  const accessibleMetrics = useMemo(() => {
    const metrics = getAccessibleMetrics(currentUserTier || 'free');
    if (DEBUG_SCATTER_SCORE) console.log("[ScatterScoreProPage] Accessible metrics updated:", metrics.length, "for tier:", currentUserTier);
    return metrics;
  }, [currentUserTier]);

  const getMetricConfigDetails = useCallback((key: string): MetricConfig | undefined => {
    return allMetrics.find(m => m.key === key);
  }, []);

  const loadTemplate = useCallback((templateName: string | null) => {
    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] loadTemplate called for: '${templateName}'`);
    const template = PREDEFINED_TEMPLATES.find(t => t.name === templateName) || PREDEFINED_TEMPLATES[0];

    if (!template) {
        if (DEBUG_SCATTER_SCORE) console.warn(`[ScatterScoreProPage] No templates available or specified one not found.`);
        setSelectedXMetrics([]); setSelectedYMetrics([]); setSelectedZMetricKey(null);
        setActiveTemplateName(null);
        return;
    }

    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Loading template config:`, template);
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
    
    const zMetricIsAccessible = template.zMetricKey ? accessibleMetrics.some(am => am.key === template.zMetricKey) : false;
    setSelectedZMetricKey(zMetricIsAccessible && template.zMetricKey ? template.zMetricKey : null);
    
    setZScale(template.zScale || 'log');
    setNormalizationMode(template.defaultNormalizationMode || 'dataset_rank_percentile');
    setImputationMode(template.defaultImputationMode || 'dataset_median');

    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Template '${template.name}' loaded. X Metrics:`, selectedXMetrics, "Y Metrics:", selectedYMetrics);
  }, [accessibleMetrics, currentUserTier, getMetricConfigDetails]); // Removed selectedX/YMetrics from deps of loadTemplate itself

  useEffect(() => {
    if (DEBUG_SCATTER_SCORE) console.log("[ScatterScoreProPage] accessibleMetrics or currentUserTier changed, considering template reload.");
    if (PREDEFINED_TEMPLATES.length > 0) {
        // Always reload the active template (or default) when accessibleMetrics changes,
        // as it needs to re-filter based on new tier accessibility.
        loadTemplate(activeTemplateName || PREDEFINED_TEMPLATES[0].name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessibleMetrics]); // Re-load template when accessible metrics change

  const handleTemplateChange = (newTemplateName: string) => {
    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] handleTemplateChange: ${newTemplateName}`);
    loadTemplate(newTemplateName);
  };
  
  const handleAxisMetricChange = (
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => {
    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] handleAxisMetricChange: Axis=${axisType}, Key=${metricKey}, Action=${action}, Value=`, value);
    const setSelectedMetrics = axisType === 'X' ? setSelectedXMetrics : setSelectedYMetrics;
    
    setSelectedMetrics(prevMetrics => {
      let newMetricsArray = prevMetrics.map(m => ({...m}));
      const existingIndex = newMetricsArray.findIndex(m => m.key === metricKey);

      if (action === 'add') {
        if (existingIndex === -1) {
          const metricConfig = getMetricConfigDetails(metricKey);
          if (metricConfig && accessibleMetrics.some(am => am.key === metricKey)) {
            newMetricsArray.push({
              key: metricKey,
              metricLabel: metricConfig.label,
              weight: 0, 
              userHigherIsBetter: metricConfig.higherIsBetter,
              originalHigherIsBetter: metricConfig.higherIsBetter,
            });
            return normalizeWeights(newMetricsArray);
          } else {
            if (DEBUG_SCATTER_SCORE) console.warn(`[ScatterScoreProPage] Add failed: Metric ${metricKey} not found or not accessible.`);
             return prevMetrics; // No change if metric can't be added
          }
        }
      } else if (action === 'remove') {
        newMetricsArray = newMetricsArray.filter(m => m.key !== metricKey);
        return normalizeWeights(newMetricsArray);
      } else if (existingIndex !== -1) {
        if (action === 'updateWeight') {
          const newWeight = Math.max(0, Math.min(100, Number(value) || 0));
          newMetricsArray[existingIndex].weight = newWeight; 
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
  
  const xTotalWeight = useMemo(() => selectedXMetrics.reduce((sum, m) => sum + m.weight, 0), [selectedXMetrics]);
  const yTotalWeight = useMemo(() => selectedYMetrics.reduce((sum, m) => sum + m.weight, 0), [selectedYMetrics]);

  const handleApplyConfiguration = () => {
    const finalXMetrics = normalizeWeights(selectedXMetrics);
    const finalYMetrics = normalizeWeights(selectedYMetrics);
    
    // Update state with the potentially re-normalized weights before validation
    setSelectedXMetrics(finalXMetrics);
    setSelectedYMetrics(finalYMetrics);

    const currentXTotalOnApply = finalXMetrics.reduce((sum, m) => sum + m.weight, 0);
    const currentYTotalOnApply = finalYMetrics.reduce((sum, m) => sum + m.weight, 0);

    if (finalXMetrics.length > 0 && Math.round(currentXTotalOnApply) !== 100) {
        alert(`X-Axis weights sum to ${currentXTotalOnApply}%, but must sum to 100%. Please adjust.`);
        return;
    }
    if (finalYMetrics.length > 0 && Math.round(currentYTotalOnApply) !== 100) {
        alert(`Y-Axis weights sum to ${currentYTotalOnApply}%, but must sum to 100%. Please adjust.`);
        return;
    }

    if (DEBUG_SCATTER_SCORE) {
      console.log("[ScatterScoreProPage] APPLYING CONFIGURATION (triggering score calc & chart update):", {
        activeTemplateName, 
        xMetrics: finalXMetrics, xTotalWeight: currentXTotalOnApply,
        yMetrics: finalYMetrics, yTotalWeight: currentYTotalOnApply, 
        selectedZMetricKey, zScale,
        normalizationMode, imputationMode,
      });
    }
    // TODO: Set a state here that triggers the actual score calculation (Mini PRD-SS-2)
    // and chart data update (Mini PRD-SS-3)
  };

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

  const renderAxisMetricConfigurator = (
    axisTitle: 'X-Axis Score Metrics' | 'Y-Axis Score Metrics',
    currentSelectedMetricsForAxis: AxisMetricConfig[],
    axisType: 'X' | 'Y',
    currentTotalWeightForAxis: number
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
                currentSelectedKeys={currentSelectedMetricsForAxis.map(m => m.key)}
            />
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mt-2 scrollbar-thin scrollbar-thumb-navy-500 scrollbar-track-navy-700/30">
            {currentSelectedMetricsForAxis.length === 0 && <p className="text-xs text-muted-foreground italic py-2 text-center">No metrics selected for this axis.</p>}
            {currentSelectedMetricsForAxis.map((sm) => (
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
                                value={sm.weight} // Direct value binding
                                onChange={(e) => {
                                    const newWeight = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    if (!isNaN(newWeight)) {
                                        handleAxisMetricChange(axisType, sm.key, 'updateWeight', newWeight)
                                    }
                                }}
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
            <div className={cn("text-xs mt-2 font-medium", currentTotalWeightForAxis !== 100 && currentSelectedMetricsForAxis.length > 0 ? "text-destructive" : currentTotalWeightForAxis === 100 ? "text-green-400" : "text-muted-foreground")}>
                Total {axisType}-Axis Weight: {currentTotalWeightForAxis}% {currentSelectedMetricsForAxis.length > 0 && currentTotalWeightForAxis !==100 && "(Must sum to 100%)"}
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