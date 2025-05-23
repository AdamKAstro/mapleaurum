// src/pages/scatter-score-pro/index.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  LinearScale,
  LogarithmicScale,
  PointElement,
  Tooltip as ChartJsTooltip,
  Legend as ChartJsLegend,
  type ChartOptions,
  type ScatterDataPoint,
  type ScriptableContext
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import ChartDataLabels, { Context as DataLabelsContext } from 'chartjs-plugin-datalabels';

import { useFilters } from '../../contexts/filter-context';
import { useCurrency } from '../../contexts/currency-context';
import { PageContainer } from '../../components/ui/page-container';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { Info, Lock, ArrowUp, ArrowDown, Settings, RefreshCw, ListPlus, X, ZoomIn, ZoomOut, RotateCcw, Loader2, ChevronLeft } from 'lucide-react';
import { MetricSelector } from '../../components/metric-selector';
import {
  metrics as allMetrics,
  metricCategories,
  getAccessibleMetrics,
  type MetricConfig
} from '../../lib/metric-types';
import type { Company, ColumnTier, NormalizationMode, ImputationMode, Currency, AugmentedPriceInfo } from '../../lib/types';
import { cn, isValidNumber, getNestedValue, toTitleCase } from '../../lib/utils';
import { calculateAxisSpecificScore, calculateDatasetMetricStats, type MetricDatasetStats, type ScoreComponent, type AxisMetricScoreInput } from '../../lib/scoringUtils';
import { normalizeValues as normalizeZValuesForChart, formatValueWrapper } from '../scatter-chart/chartUtils';

ChartJS.register(
  LinearScale, LogarithmicScale, PointElement, ChartJsTooltip, ChartJsLegend, zoomPlugin, ChartDataLabels
);

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
  xAxisThemeLabel?: string;
  yAxisThemeLabel?: string;
}

interface ScatterScorePlotPoint {
  company: Company;
  xScore: number | null;
  yScore: number | null;
  zValue?: number | null;
  r_normalized?: number;
}

interface ScatterScorePlotPointData extends ScatterDataPoint {
  r_normalized: number;
  company: Company;
  xScore: number;
  yScore: number;
  zRawValue?: number | null;
}

const DEBUG_SCATTER_SCORE = process.env.NODE_ENV === 'development';
const DEFAULT_WEIGHT_FOR_NEW_METRIC = 5;

const statusColors: Record<string, { background: string; border: string }> = {
  producer: { background: 'rgba(34,197,94,0.7)', border: 'rgb(12,163,74)' },
  developer: { background: 'rgba(59,130,246,0.7)', border: 'rgb(37,99,195)' },
  explorer: { background: 'rgba(168,85,247,0.7)', border: 'rgb(147,51,194)' },
  royalty: { background: 'rgba(244,162,97,0.7)', border: 'rgb(217,119,6)' },
  other: { background: 'rgba(107,114,128,0.7)', border: 'rgb(75,85,99)' },
  default: { background: 'rgba(107,114,128,0.7)', border: 'rgb(75,85,99)' }
};

const chartSettingsFunctions = {
  pointRadius: (n: number): number => 6 + (Math.max(0, Math.min(1, n || 0)) * 35),
  pointHoverRadius: (n: number): number => 8 + (Math.max(0, Math.min(1, n || 0)) * 48)
};

const PREDEFINED_TEMPLATES: ScatterScoreTemplate[] = [
  {
    name: "Value Hunter",
    description: "Focuses on undervalued companies with strong fundamentals and asset backing.",
    xAxisThemeLabel: "Valuation Hybrid Score",
    yAxisThemeLabel: "Asset Quality",
    xMetricsConfig: [
      { key: 'financials.market_cap_value', weight: 10, userHigherIsBetter: false },
      { key: 'financials.price_to_book', weight: 9, userHigherIsBetter: false },
      { key: 'financials.price_to_sales', weight: 9, userHigherIsBetter: false },
      { key: 'financials.enterprise_to_ebitda', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.ev_per_reserve_oz_all', weight: 9, userHigherIsBetter: false },
      { key: 'financials.trailing_pe', weight: 9, userHigherIsBetter: false },
      { key: 'financials.forward_pe', weight: 9, userHigherIsBetter: false },
      { key: 'financials.peg_ratio', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.mkt_cap_per_resource_oz_all', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.ev_per_resource_oz_all', weight: 9, userHigherIsBetter: false }
    ],
    yMetricsConfig: [
      { key: 'financials.enterprise_value_value', weight: 10, userHigherIsBetter: true },
      { key: 'financials.net_financial_assets', weight: 9, userHigherIsBetter: true },
      { key: 'financials.debt_value', weight: 9, userHigherIsBetter: false },
      { key: 'financials.free_cash_flow', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'financials.revenue_value', weight: 9, userHigherIsBetter: true },
      { key: 'financials.gross_profit', weight: 9, userHigherIsBetter: true },
      { key: 'financials.operating_income', weight: 9, userHigherIsBetter: true },
      { key: 'financials.ebitda', weight: 9, userHigherIsBetter: true },
      { key: 'production.current_production_total_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'production.reserve_life_years', weight: 9, userHigherIsBetter: true }
    ],
    zMetricKey: 'financials.market_cap_value',
    zScale: 'log',
    defaultNormalizationMode: 'dataset_rank_percentile',
    defaultImputationMode: 'dataset_median'
  },
  {
    name: "Growth Catalyst Seeker",
    description: "Targets companies with high resource expansion and production growth potential.",
    xAxisThemeLabel: "Resource Potential Hybrid Score",
    yAxisThemeLabel: "Growth Metrics",
    xMetricsConfig: [
      { key: 'financials.market_cap_value', weight: 10, userHigherIsBetter: true },
      { key: 'mineral_estimates.potential_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.resources_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.potential_non_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.mineable_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.reserves_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.measured_indicated_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.resources_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.mineable_precious_aueq_moz', weight: 9, userHigherIsBetter: true }
    ],
    yMetricsConfig: [
      { key: 'financials.enterprise_value_value', weight: 10, userHigherIsBetter: true },
      { key: 'production.future_production_total_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'financials.peg_ratio', weight: 9, userHigherIsBetter: false },
      { key: 'financials.forward_pe', weight: 9, userHigherIsBetter: false },
      { key: 'production.current_production_total_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.potential_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.resources_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'financials.revenue_value', weight: 9, userHigherIsBetter: true },
      { key: 'financials.ebitda', weight: 9, userHigherIsBetter: true },
      { key: 'financials.free_cash_flow', weight: 9, userHigherIsBetter: true },
      { key: 'costs.aisc_future', weight: 9, userHigherIsBetter: false }
    ],
    zMetricKey: 'financials.enterprise_value_value',
    zScale: 'log',
    defaultNormalizationMode: 'dataset_min_max',
    defaultImputationMode: 'dataset_mean'
  },
  {
    name: "Producer Profitability Focus",
    description: "For analyzing currently producing companies, emphasizing profitability and operational efficiency.",
    xAxisThemeLabel: "Cost Hybrid Score",
    yAxisThemeLabel: "Profitability",
    xMetricsConfig: [
      { key: 'financials.market_cap_value', weight: 10, userHigherIsBetter: false },
      { key: 'costs.aisc_last_year', weight: 9, userHigherIsBetter: false },
      { key: 'costs.aisc_last_quarter', weight: 9, userHigherIsBetter: false },
      { key: 'costs.tco_current', weight: 9, userHigherIsBetter: false },
      { key: 'costs.aic_last_year', weight: 9, userHigherIsBetter: false },
      { key: 'costs.aisc_future', weight: 9, userHigherIsBetter: false },
      { key: 'costs.tco_future', weight: 9, userHigherIsBetter: false },
      { key: 'costs.aic_last_quarter', weight: 9, userHigherIsBetter: false },
      { key: 'financials.cost_of_revenue', weight: 9, userHigherIsBetter: false },
      { key: 'financials.operating_expense', weight: 9, userHigherIsBetter: false },
      { key: 'costs.construction_costs', weight: 9, userHigherIsBetter: false }
    ],
    yMetricsConfig: [
      { key: 'financials.enterprise_value_value', weight: 10, userHigherIsBetter: true },
      { key: 'financials.ebitda', weight: 9, userHigherIsBetter: true },
      { key: 'financials.net_income_value', weight: 9, userHigherIsBetter: true },
      { key: 'financials.free_cash_flow', weight: 9, userHigherIsBetter: true },
      { key: 'production.current_production_total_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'financials.gross_profit', weight: 9, userHigherIsBetter: true },
      { key: 'financials.operating_income', weight: 9, userHigherIsBetter: true },
      { key: 'financials.revenue_value', weight: 9, userHigherIsBetter: true },
      { key: 'production.current_production_precious_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'production.reserve_life_years', weight: 9, userHigherIsBetter: true },
      { key: 'financials.cash_value', weight: 9, userHigherIsBetter: true }
    ],
    zMetricKey: 'financials.revenue_value',
    zScale: 'log',
    defaultNormalizationMode: 'dataset_rank_percentile',
    defaultImputationMode: 'dataset_median'
  },
  {
    name: "Financial Stability & Low Risk",
    description: "For risk-averse investors prioritizing companies with strong balance sheets and low debt.",
    xAxisThemeLabel: "Financial Strength",
    yAxisThemeLabel: "Operational Stability",
    xMetricsConfig: [
      { key: 'financials.market_cap_value', weight: 10, userHigherIsBetter: true },
      { key: 'financials.cash_value', weight: 9, userHigherIsBetter: true },
      { key: 'financials.debt_value', weight: 9, userHigherIsBetter: false },
      { key: 'financials.net_financial_assets', weight: 9, userHigherIsBetter: true },
      { key: 'financials.liabilities', weight: 9, userHigherIsBetter: false },
      { key: 'capital_structure.existing_shares', weight: 9, userHigherIsBetter: false },
      { key: 'capital_structure.fully_diluted_shares', weight: 9, userHigherIsBetter: false },
      { key: 'financials.shares_outstanding', weight: 9, userHigherIsBetter: false },
      { key: 'capital_structure.in_the_money_options', weight: 9, userHigherIsBetter: false },
      { key: 'capital_structure.options_revenue', weight: 9, userHigherIsBetter: true },
      { key: 'financials.total_assets', weight: 10, userHigherIsBetter: true }
    ],
    yMetricsConfig: [
      { key: 'financials.enterprise_value_value', weight: 10, userHigherIsBetter: true },
      { key: 'production.reserve_life_years', weight: 9, userHigherIsBetter: true },
      { key: 'costs.aisc_last_year', weight: 9, userHigherIsBetter: false },
      { key: 'financials.gross_profit', weight: 9, userHigherIsBetter: true },
      { key: 'financials.revenue_value', weight: 9, userHigherIsBetter: true },
      { key: 'financials.net_income_value', weight: 9, userHigherIsBetter: true },
      { key: 'financials.ebitda', weight: 9, userHigherIsBetter: true },
      { key: 'financials.free_cash_flow', weight: 9, userHigherIsBetter: true },
      { key: 'production.current_production_total_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'costs.tco_current', weight: 9, userHigherIsBetter: false }
    ],
    zMetricKey: 'production.reserve_life_years',
    zScale: 'linear',
    defaultNormalizationMode: 'global_min_max',
    defaultImputationMode: 'zero_worst'
  },
  {
    name: "Precious Metals Pure Play",
    description: "Focusing on companies with high exposure to gold/silver, their precious resources, and related valuations.",
    xAxisThemeLabel: "Precious Metals Resources Hybrid Score",
    yAxisThemeLabel: "Precious Metals Valuation Hybrid Score",
    xMetricsConfig: [
      { key: 'financials.market_cap_value', weight: 10, userHigherIsBetter: true },
      { key: 'mineral_estimates.reserves_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.measured_indicated_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.resources_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.mineable_precious_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'production.current_production_precious_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'company-overview.percent_gold', weight: 9, userHigherIsBetter: true },
      { key: 'company-overview.percent_silver', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.potential_total_aueq_moz', weight: 9, userHigherIsBetter: true },
      { key: 'production.future_production_total_aueq_koz', weight: 9, userHigherIsBetter: true },
      { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 10, userHigherIsBetter: true }
    ],
    yMetricsConfig: [
      { key: 'financials.enterprise_value_value', weight: 10, userHigherIsBetter: false },
      { key: 'valuation_metrics.mkt_cap_per_reserve_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.ev_per_reserve_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.mkt_cap_per_mi_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.ev_per_mi_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.mkt_cap_per_resource_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.ev_per_resource_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.mkt_cap_per_mineable_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.ev_per_mineable_oz_precious', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.mkt_cap_per_production_oz', weight: 9, userHigherIsBetter: false },
      { key: 'valuation_metrics.ev_per_production_oz', weight: 9, userHigherIsBetter: false }
    ],
    zMetricKey: 'production.current_production_precious_aueq_koz',
    zScale: 'log',
    defaultNormalizationMode: 'dataset_min_max',
    defaultImputationMode: 'dataset_median'
  }
];

const ScaleToggle: React.FC<{
  scale: 'linear' | 'log';
  onChange: (newScale: 'linear' | 'log') => void;
  label: string;
}> = ({ scale, onChange, label }) => (
  <div className="flex items-center gap-2 text-xs mt-1">
    <span className="text-surface-white/70">{label}:</span>
    <div className="flex bg-navy-400/20 rounded-lg overflow-hidden p-0.5 gap-0.5">
      <button
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
          scale === 'linear' 
            ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30" 
            : "text-surface-white/70 hover:bg-navy-400/30"
        )}
        onClick={() => onChange('linear')}
        aria-pressed={scale === 'linear'}
      >
        Linear
      </button>
      <button
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
          scale === 'log' 
            ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30" 
            : "text-surface-white/70 hover:bg-navy-400/30"
        )}
        onClick={() => onChange('log')}
        aria-pressed={scale === 'log'}
      >
        Log
      </button>
    </div>
  </div>
);

const normalizeWeights = (
  metrics: AxisMetricConfig[],
  changedMetricKey?: string,
  userSetWeightForChangedMetric?: number,
  isNewMetric: boolean = false
): AxisMetricConfig[] => {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    if (DEBUG_SCATTER_SCORE) console.log("[normalizeWeights] Input is not an array or is empty, returning empty.");
    return [];
  }

  let workingMetrics = metrics.map(m => ({ 
    ...m, 
    weight: Math.max(0, Math.min(100, Number(m.weight) || 0)) 
  }));

  if (workingMetrics.length === 1) {
    workingMetrics[0].weight = 100;
    if (DEBUG_SCATTER_SCORE) console.log("[normalizeWeights] Single metric, set weight to 100:", workingMetrics);
    return workingMetrics;
  }

  let totalTargetWeight = 100;
  let sumOfFixedWeights = 0;
  
  if (isNewMetric && changedMetricKey) {
    const idx = workingMetrics.findIndex(m => m.key === changedMetricKey);
    if (idx !== -1) {
      workingMetrics[idx].weight = DEFAULT_WEIGHT_FOR_NEW_METRIC;
      userSetWeightForChangedMetric = DEFAULT_WEIGHT_FOR_NEW_METRIC;
    }
  }
  
  if (changedMetricKey && userSetWeightForChangedMetric !== undefined) {
    const idx = workingMetrics.findIndex(m => m.key === changedMetricKey);
    if (idx !== -1) {
      workingMetrics[idx].weight = userSetWeightForChangedMetric;
      sumOfFixedWeights = workingMetrics[idx].weight;
    }
  }

  const adjustableMetrics = workingMetrics.filter(m => m.key !== changedMetricKey);
  const sumOfOriginalAdjustableWeights = adjustableMetrics.reduce((sum, m) => sum + m.weight, 0);
  let weightToDistributeToAdjustable = totalTargetWeight - sumOfFixedWeights;

  if (adjustableMetrics.length > 0) {
    if (weightToDistributeToAdjustable < 0) weightToDistributeToAdjustable = 0;

    if (sumOfOriginalAdjustableWeights === 0 || isNewMetric) {
      if (sumOfOriginalAdjustableWeights > 0 && !isNewMetric) {
        const scaleFactor = weightToDistributeToAdjustable / sumOfOriginalAdjustableWeights;
        adjustableMetrics.forEach(m => {
          const idx = workingMetrics.findIndex(wm => wm.key === m.key);
          if (idx !== -1) workingMetrics[idx].weight = m.weight * scaleFactor;
        });
      } else {
        const equalShare = weightToDistributeToAdjustable / adjustableMetrics.length;
        adjustableMetrics.forEach(m => {
          const idx = workingMetrics.findIndex(wm => wm.key === m.key);
          if (idx !== -1) workingMetrics[idx].weight = equalShare;
        });
      }
    } else {
      const scaleFactor = weightToDistributeToAdjustable / sumOfOriginalAdjustableWeights;
      adjustableMetrics.forEach(m => {
        const idx = workingMetrics.findIndex(wm => wm.key === m.key);
        if (idx !== -1) workingMetrics[idx].weight = m.weight * scaleFactor;
      });
    }
  } else if (changedMetricKey && workingMetrics.length === 1) {
    workingMetrics[0].weight = 100;
  }
  
  let roundedMetrics = workingMetrics.map(m => ({ 
    ...m, 
    weight: Math.round(m.weight) 
  }));
  
  let currentSum = roundedMetrics.reduce((sum, m) => sum + m.weight, 0);

  if (roundedMetrics.length > 0 && currentSum !== 100) {
    const diff = 100 - currentSum;
    let adjustIdx = -1;

    if (changedMetricKey) {
      const candidates = roundedMetrics
        .map((m, i) => ({ m, i, weight: m.weight }))
        .filter(item => item.m.key !== changedMetricKey)
        .sort((a, b) => b.weight - a.weight);
      
      if (candidates.length > 0) {
        for (const cand of candidates) {
          if (cand.m.weight + diff >= 0 && cand.m.weight + diff <= 100) {
            adjustIdx = cand.i;
            break;
          }
        }
        if (adjustIdx === -1 && candidates.length > 0) {
          adjustIdx = candidates[0].i;
        }
      }
    }

    if (adjustIdx === -1 && roundedMetrics.length > 0) {
      const maxWeightIdx = roundedMetrics.reduce((maxIdx, m, i) => 
        m.weight > roundedMetrics[maxIdx].weight ? i : maxIdx, 0
      );
      adjustIdx = maxWeightIdx;
    }

    if (adjustIdx !== -1 && roundedMetrics[adjustIdx]) {
      roundedMetrics[adjustIdx].weight += diff;
    }
  }

  return roundedMetrics.map(m => ({
    ...m, 
    weight: Math.max(0, Math.min(100, Math.round(m.weight)))
  }));
};

const AvailableMetricsSelector: React.FC<{
  axisLabel: 'X' | 'Y';
  onMetricSelect: (metricKey: string) => void;
  currentSelectedKeys: string[];
  accessibleMetrics: MetricConfig[];
}> = ({ axisLabel, onMetricSelect, currentSelectedKeys, accessibleMetrics }) => (
  <div className="my-3">
    <Label className="text-xs font-medium text-muted-foreground">Add Metric to {axisLabel}-Axis</Label>
    <Select 
      onValueChange={(value) => { 
        if (value && value !== "__placeholder__") {
          onMetricSelect(value);
        }
      }}
      value=""
    >
      <SelectTrigger className="text-xs h-9 bg-navy-600/50 border-navy-500 mt-1">
        <SelectValue placeholder={`Select metric to add...`} />
      </SelectTrigger>
      <SelectContent className="max-h-72 z-[60]">
        <SelectItem value="__placeholder__" disabled className="text-xs hidden">
          Select metric...
        </SelectItem>
        {Object.entries(metricCategories)
          .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
          .map(([catKey, catLabel]) => {
            const metricsInCat = accessibleMetrics.filter(
              m => m.category === catKey && !currentSelectedKeys.includes(m.key)
            );
            if (metricsInCat.length === 0) return null;
            return (
              <SelectGroup key={catKey}>
                <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {catLabel}
                </SelectLabel>
                {metricsInCat.map(m => (
                  <SelectItem key={m.key} value={m.key} className="text-xs pl-4">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        {accessibleMetrics.filter(m => !currentSelectedKeys.includes(m.key)).length === 0 && (
          <div className="p-2 text-xs text-muted-foreground text-center">
            All accessible metrics added.
          </div>
        )}
      </SelectContent>
    </Select>
  </div>
);

const AxisMetricConfigurator: React.FC<{
  axisTitle: 'X-Axis Score Metrics' | 'Y-Axis Score Metrics';
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
}> = ({
  axisTitle,
  currentSelectedMetricsForAxis = [],
  axisType,
  currentTotalWeightForAxis,
  accessibleMetrics,
  handleAxisMetricChange
}) => (
  <Card className="p-3 md:p-4 bg-navy-700/50 border-navy-600">
    <CardHeader className="p-0 mb-2">
      <CardTitle className="text-md font-semibold">{axisTitle}</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <AvailableMetricsSelector
        axisLabel={axisType}
        onMetricSelect={(metricKey) => handleAxisMetricChange(axisType, metricKey, 'add')}
        currentSelectedKeys={currentSelectedMetricsForAxis.map(m => m.key)}
        accessibleMetrics={accessibleMetrics}
      />
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mt-2 scrollbar-thin scrollbar-thumb-navy-500 scrollbar-track-navy-700/30">
        {currentSelectedMetricsForAxis.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2 text-center">
            No metrics selected for this axis.
          </p>
        )}
        {currentSelectedMetricsForAxis.map((sm) => (
          <div key={sm.key} className="p-2.5 border rounded-md bg-navy-600/40 border-navy-500/70 space-y-1.5">
            <div className="flex justify-between items-center">
              <Label 
                htmlFor={`weight-${axisType}-${sm.key}`} 
                className="text-xs font-medium text-surface-white truncate flex-grow mr-2" 
                title={sm.metricLabel}
              >
                {sm.metricLabel}
              </Label>
              <Button 
                variant="ghost" 
                size="icon" 
                className="p-0 h-5 w-5 text-red-500 hover:text-red-400 hover:bg-transparent flex-shrink-0" 
                onClick={() => handleAxisMetricChange(axisType, sm.key, 'remove')}
              >
                <X size={14} />
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Label htmlFor={`weight-${axisType}-${sm.key}`} className="text-xs text-muted-foreground">
                  Wt:
                </Label>
                <Input 
                  id={`weight-${axisType}-${sm.key}`} 
                  type="number" 
                  value={sm.weight}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value)) {
                      handleAxisMetricChange(axisType, sm.key, 'updateWeight', value);
                    }
                  }}
                  className="h-7 text-xs w-16 bg-navy-800 border-navy-500 px-1.5"
                  min={0} 
                  max={100} 
                  step={1} 
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Label 
                htmlFor={`hlb-${axisType}-${sm.key}`} 
                className="flex items-center text-xs gap-1.5 cursor-pointer text-surface-white/80"
              >
                <Checkbox 
                  id={`hlb-${axisType}-${sm.key}`} 
                  checked={sm.userHigherIsBetter}
                  onCheckedChange={(checked) => handleAxisMetricChange(
                    axisType, 
                    sm.key, 
                    'toggleHLB', 
                    !!checked
                  )}
                  className="border-gray-500 data-[state=checked]:bg-accent-teal data-[state=checked]:border-accent-teal-darker h-3.5 w-3.5" 
                />
                HLB
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="cursor-help">
                        <Info size={12} className="text-muted-foreground hover:text-accent-teal"/>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs max-w-[200px] p-2 z-[70]">
                      <p>
                        Check if a HIGHER value of this metric is better for this axis score. 
                        Default: {sm.originalHigherIsBetter ? 'Higher is better' : 'Lower is better'}.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>
          </div>
        ))}
      </div>
      <div className={cn(
        "text-xs mt-2 font-medium",
        currentTotalWeightForAxis !== 100 && currentSelectedMetricsForAxis.length > 0 
          ? "text-destructive" 
          : currentTotalWeightForAxis === 100 
          ? "text-green-400" 
          : "text-muted-foreground"
      )}>
        Total {axisType}-Axis Weight: {Math.round(currentTotalWeightForAxis)}% 
        {currentSelectedMetricsForAxis.length > 0 && Math.round(currentTotalWeightForAxis) !== 100 && " (Must sum to 100%)"}
      </div>
    </CardContent>
  </Card>
);

export function ScatterScoreProPage() {
  const { 
    currentUserTier, 
    filteredCompanyIds, 
    fetchCompaniesByIds, 
    metricFullRanges: globalMetricRangesFromContext 
  } = useFilters();
  const { currency: selectedDisplayCurrency } = useCurrency();
  
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(() => 
    PREDEFINED_TEMPLATES.length > 0 ? PREDEFINED_TEMPLATES[0].name : null
  );
  const [selectedXMetrics, setSelectedXMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedYMetrics, setSelectedYMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedZMetricKey, setSelectedZMetricKey] = useState<string | null>(
    PREDEFINED_TEMPLATES[0]?.zMetricKey || null
  );
  const [zScale, setZScale] = useState<'linear' | 'log'>(
    PREDEFINED_TEMPLATES[0]?.zScale || 'log'
  );
  const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>(
    PREDEFINED_TEMPLATES[0]?.defaultNormalizationMode || 'dataset_rank_percentile'
  );
  const [imputationMode, setImputationMode] = useState<ImputationMode>(
    PREDEFINED_TEMPLATES[0]?.defaultImputationMode || 'dataset_median'
  );
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true);
  const [currentTemplateConfig, setCurrentTemplateConfig] = useState<{
    xAxisThemeLabel?: string;
    yAxisThemeLabel?: string;
  }>({});

  const [chartDataSource, setChartDataSource] = useState<Company[]>([]);
  const [plotData, setPlotData] = useState<ScatterScorePlotPoint[]>([]);
  const [isCalculatingScores, setIsCalculatingScores] = useState(false);
  const [datasetStatsCache, setDatasetStatsCache] = useState<Map<string, MetricDatasetStats>>(new Map());
  const [axisScoreError, setAxisScoreError] = useState<string | null>(null);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);

  const chartRef = useRef<ChartJS<'scatter', (ScatterDataPoint | null)[], unknown> | null>(null);

  const accessibleMetrics = useMemo(() => 
    getAccessibleMetrics(currentUserTier || 'free'), 
    [currentUserTier]
  );
  
  const getMetricConfigDetails = useCallback((key: string): MetricConfig | undefined => 
    allMetrics.find(m => m.key === key), 
    []
  );
  
  const zMetricConfig = useMemo(() => 
    selectedZMetricKey ? getMetricConfigDetails(selectedZMetricKey) : null, 
    [selectedZMetricKey, getMetricConfigDetails]
  );

  const loadTemplate = useCallback((templateName: string | null) => {
    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] loadTemplate attempting for: '${templateName}'`);
    
    setIsTemplateLoading(true);
    
    const template = PREDEFINED_TEMPLATES.find(t => t.name === templateName) || PREDEFINED_TEMPLATES[0];
    
    if (!template) {
      if (DEBUG_SCATTER_SCORE) console.warn(`[ScatterScoreProPage] No templates available or specified one not found.`);
      setSelectedXMetrics([]);
      setSelectedYMetrics([]);
      setSelectedZMetricKey(null);
      setActiveTemplateName(null);
      setCurrentTemplateConfig({});
      setIsTemplateLoading(false);
      return;
    }
    
    setActiveTemplateName(template.name);
    setCurrentTemplateConfig({
      xAxisThemeLabel: template.xAxisThemeLabel,
      yAxisThemeLabel: template.yAxisThemeLabel
    });
    
    const mapAndFilter = (configs: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>): AxisMetricConfig[] => 
      configs.map(m => {
        const mc = getMetricConfigDetails(m.key);
        if (!mc || !accessibleMetrics.some(am => am.key === m.key)) return null;
        return { 
          key: m.key, 
          metricLabel: mc.label, 
          weight: m.weight, 
          userHigherIsBetter: m.userHigherIsBetter ?? mc.higherIsBetter, 
          originalHigherIsBetter: mc.higherIsBetter 
        };
      }).filter(Boolean) as AxisMetricConfig[];
    
    setSelectedXMetrics(normalizeWeights(mapAndFilter(template.xMetricsConfig)));
    setSelectedYMetrics(normalizeWeights(mapAndFilter(template.yMetricsConfig)));
    
    const zAccessible = template.zMetricKey ? accessibleMetrics.some(am => am.key === template.zMetricKey) : false;
    setSelectedZMetricKey(zAccessible && template.zMetricKey ? template.zMetricKey : null);
    setZScale(template.zScale || 'log');
    setNormalizationMode(template.defaultNormalizationMode || 'dataset_rank_percentile');
    setImputationMode(template.defaultImputationMode || 'dataset_median');
    
    setIsTemplateLoading(false);
    
    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Template '${template.name}' loaded.`);
  }, [accessibleMetrics, getMetricConfigDetails]);

  useEffect(() => {
    if (accessibleMetrics.length > 0 && activeTemplateName && !isTemplateLoading) {
      loadTemplate(activeTemplateName);
    }
  }, [accessibleMetrics]);

  const handleTemplateChange = (newTemplateName: string) => {
    loadTemplate(newTemplateName);
  };
  
  const handleAxisMetricChange = useCallback((
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => {
    const setSelectedMetrics = axisType === 'X' ? setSelectedXMetrics : setSelectedYMetrics;
    
    setSelectedMetrics(prevMetrics => {
      let newMetricsArray = [...prevMetrics];
      const existingIndex = newMetricsArray.findIndex(m => m.key === metricKey);
      
      if (action === 'add') {
        if (existingIndex === -1) {
          const metricConfig = getMetricConfigDetails(metricKey);
          if (metricConfig && accessibleMetrics.some(am => am.key === metricKey)) {
            newMetricsArray.push({
              key: metricKey,
              metricLabel: metricConfig.label,
              weight: DEFAULT_WEIGHT_FOR_NEW_METRIC,
              userHigherIsBetter: metricConfig.higherIsBetter,
              originalHigherIsBetter: metricConfig.higherIsBetter,
            });
            setActiveTemplateName(null);
            return normalizeWeights(newMetricsArray, metricKey, DEFAULT_WEIGHT_FOR_NEW_METRIC, true);
          }
        }
      } else if (action === 'remove') {
        newMetricsArray = newMetricsArray.filter(m => m.key !== metricKey);
        setActiveTemplateName(null);
        return normalizeWeights(newMetricsArray);
      } else if (existingIndex !== -1) {
        if (action === 'updateWeight') {
          const newWeight = Math.max(0, Math.min(100, Number(value) || 0));
          newMetricsArray[existingIndex].weight = newWeight;
          setActiveTemplateName(null);
          return normalizeWeights(newMetricsArray, metricKey, newWeight, false);
        } else if (action === 'toggleHLB') {
          newMetricsArray[existingIndex] = {
            ...newMetricsArray[existingIndex],
            userHigherIsBetter: !!value
          };
          setActiveTemplateName(null);
          return newMetricsArray;
        }
      }
      
      return prevMetrics;
    });
  }, [getMetricConfigDetails, accessibleMetrics]);
  
  const xTotalWeight = useMemo(() => 
    selectedXMetrics.reduce((sum, m) => sum + m.weight, 0), 
    [selectedXMetrics]
  );
  
  const yTotalWeight = useMemo(() => 
    selectedYMetrics.reduce((sum, m) => sum + m.weight, 0), 
    [selectedYMetrics]
  );

  const handleApplyConfigurationAndCalculateScores = useCallback(async () => {
    if (DEBUG_SCATTER_SCORE) console.log("[ScatterScoreProPage] 'Apply & Plot Scores' clicked.");
    
    const finalXMetrics = normalizeWeights(selectedXMetrics);
    const finalYMetrics = normalizeWeights(selectedYMetrics);
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
    if (finalXMetrics.length === 0 && finalYMetrics.length === 0) {
      alert("Please select at least one metric for either X or Y axis.");
      setPlotData([]);
      return;
    }
    
    setIsCalculatingScores(true);
    setAxisScoreError(null);
    setPlotData([]);
    
    try {
      const companiesToScore = await fetchCompaniesByIds(filteredCompanyIds);
      if (!companiesToScore || companiesToScore.length === 0) {
        setPlotData([]);
        setIsCalculatingScores(false);
        return;
      }
      
      setChartDataSource(companiesToScore);
      
      const uniqueMetricKeysForStats = new Set<string>();
      if (normalizationMode.startsWith('dataset_') || imputationMode.startsWith('dataset_')) {
        finalXMetrics.forEach(m => {
          const conf = getMetricConfigDetails(m.key);
          if (conf) uniqueMetricKeysForStats.add(conf.key);
        });
        finalYMetrics.forEach(m => {
          const conf = getMetricConfigDetails(m.key);
          if (conf) uniqueMetricKeysForStats.add(conf.key);
        });
      }
      
      const newDatasetStatsCache = new Map<string, MetricDatasetStats>();
      if (uniqueMetricKeysForStats.size > 0 && companiesToScore.length > 0) {
        for (const metricKey of uniqueMetricKeysForStats) {
          const metricConfig = getMetricConfigDetails(metricKey);
          if (metricConfig) {
            newDatasetStatsCache.set(
              metricKey,
              calculateDatasetMetricStats(companiesToScore, metricConfig)
            );
          }
        }
      }
      setDatasetStatsCache(newDatasetStatsCache);
      
      const newPlotDataPromises = companiesToScore.map(async (company) => {
        const companySpecificLogs: string[] = [];
        
        const axisXInputs: AxisMetricScoreInput[] = finalXMetrics.map(m => ({
          key: m.key,
          weight: m.weight,
          userHigherIsBetter: m.userHigherIsBetter
        }));
        
        const axisYInputs: AxisMetricScoreInput[] = finalYMetrics.map(m => ({
          key: m.key,
          weight: m.weight,
          userHigherIsBetter: m.userHigherIsBetter
        }));
        
        let xScoreResult = { score: null, breakdown: {} };
        if (axisXInputs.length > 0) {
          xScoreResult = calculateAxisSpecificScore(
            company,
            axisXInputs,
            allMetrics,
            normalizationMode,
            imputationMode,
            globalMetricRangesFromContext,
            newDatasetStatsCache,
            companySpecificLogs
          );
        }
        
        let yScoreResult = { score: null, breakdown: {} };
        if (axisYInputs.length > 0) {
          yScoreResult = calculateAxisSpecificScore(
            company,
            axisYInputs,
            allMetrics,
            normalizationMode,
            imputationMode,
            globalMetricRangesFromContext,
            newDatasetStatsCache,
            companySpecificLogs
          );
        }
        
        let zValueForPlot: number | null = null;
        if (selectedZMetricKey) {
          const zConfig = getMetricConfigDetails(selectedZMetricKey);
          if (zConfig) {
            const rawZ = getNestedValue(company, zConfig.nested_path);
            if (isValidNumber(rawZ)) zValueForPlot = rawZ as number;
          }
        }
        
        return {
          company,
          xScore: xScoreResult.score,
          yScore: yScoreResult.score,
          zValue: zValueForPlot
        };
      });
      
      const resolvedPlotData = await Promise.all(newPlotDataPromises);
      setPlotData(resolvedPlotData.filter(p => isValidNumber(p.xScore) && isValidNumber(p.yScore)));
    } catch (error: any) {
      console.error("[ScatterScoreProPage] Error during 'Apply & Plot Scores':", error);
      setAxisScoreError(`Failed to calculate scores: ${error.message || 'Unknown error'}`);
      setPlotData([]);
    } finally {
      setIsCalculatingScores(false);
    }
  }, [
    selectedXMetrics,
    selectedYMetrics,
    normalizationMode,
    imputationMode,
    fetchCompaniesByIds,
    filteredCompanyIds,
    getMetricConfigDetails,
    globalMetricRangesFromContext,
    selectedZMetricKey,
    allMetrics
  ]);

  const chartDatasets = useMemo(() => {
    if (isCalculatingScores || plotData.length === 0) return [];
    
    if (DEBUG_SCATTER_SCORE) {
      console.log("[ScatterScorePage] chartDatasets: Recalculating. PlotData points:", plotData.length);
    }

    let zValuesForNormalization: number[] = [];
    let plotDataWithValidZ: ScatterScorePlotPoint[] = plotData;

    if (selectedZMetricKey && zMetricConfig) {
      plotDataWithValidZ = plotData.filter(p => isValidNumber(p.zValue));
      zValuesForNormalization = plotDataWithValidZ.map(p => p.zValue as number);
    }
    
    const normalizedZArray = zValuesForNormalization.length > 0 
      ? normalizeZValuesForChart(zValuesForNormalization, zScale) 
      : [];

    const dataPointsByStatus: Record<string, ScatterScorePlotPointData[]> = {};

    plotData.forEach((point) => {
      if (!isValidNumber(point.xScore) || !isValidNumber(point.yScore)) return;

      const status = point.company.status?.toLowerCase() || 'default';
      if (!dataPointsByStatus[status]) dataPointsByStatus[status] = [];
      
      let r_normalized = 0.3;
      if (selectedZMetricKey && zMetricConfig && isValidNumber(point.zValue)) {
        const originalZIndex = zValuesForNormalization.indexOf(point.zValue as number);
        if (originalZIndex !== -1 && originalZIndex < normalizedZArray.length) {
          r_normalized = normalizedZArray[originalZIndex];
        }
      }
      
      dataPointsByStatus[status].push({
        x: point.xScore as number,
        y: point.yScore as number,
        r_normalized: r_normalized,
        company: point.company,
        xScore: point.xScore as number,
        yScore: point.yScore as number,
        zRawValue: point.zValue
      });
    });

    return Object.keys(dataPointsByStatus).map(statusKey => ({
      label: toTitleCase(statusKey) || "Unknown",
      data: dataPointsByStatus[statusKey],
      backgroundColor: statusColors[statusKey]?.background || statusColors.default.background,
      borderColor: statusColors[statusKey]?.border || statusColors.default.border,
      borderWidth: 1,
      hoverBorderWidth: 2,
      pointRadius: (ctx: ScriptableContext<'scatter'>) => 
        chartSettingsFunctions.pointRadius((ctx.raw as ScatterScorePlotPointData)?.r_normalized || 0),
      pointHoverRadius: (ctx: ScriptableContext<'scatter'>) => 
        chartSettingsFunctions.pointHoverRadius((ctx.raw as ScatterScorePlotPointData)?.r_normalized || 0),
      datalabels: {
        display: (ctx: DataLabelsContext) => {
          const dp = ctx.dataset?.data?.[ctx.dataIndex] as ScatterScorePlotPointData;
          return dp?.r_normalized > 0.1;
        },
        formatter: (_v: any, ctx: DataLabelsContext) => {
          const dp = ctx.dataset?.data?.[ctx.dataIndex] as ScatterScorePlotPointData;
          return dp?.company?.tsx_code || null;
        },
        backgroundColor: 'rgba(30,41,59,0.75)',
        borderRadius: 3,
        padding: { top: 2, bottom: 1, left: 4, right: 4 },
        color: '#F8FAFC',
        font: { 
          size: 9, 
          weight: '500' as const, 
          family: "'Inter', sans-serif" 
        },
        textAlign: 'center' as const,
        anchor: 'center' as const,
        align: 'center' as const,
        offset: 0,
        clamp: true
      }
    }));
  }, [plotData, isCalculatingScores, selectedZMetricKey, zMetricConfig, zScale]);

  const chartOptions = useMemo((): ChartOptions<'scatter'> => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    elements: {
      point: {
        radius: (ctx: ScriptableContext<'scatter'>) => 
          chartSettingsFunctions.pointRadius((ctx.raw as any)?.r_normalized ?? 0),
        hoverRadius: (ctx: ScriptableContext<'scatter'>) => 
          chartSettingsFunctions.pointHoverRadius((ctx.raw as any)?.r_normalized ?? 0),
        hitRadius: 5,
        hoverBorderWidth: 2,
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: currentTemplateConfig.xAxisThemeLabel 
            ? `X-Axis Score: ${currentTemplateConfig.xAxisThemeLabel}`
            : `X-Axis Score (${selectedXMetrics.length > 0 
              ? selectedXMetrics.map(m => m.metricLabel).slice(0, 1).join(', ') + 
                (selectedXMetrics.length > 1 ? ' & others' : '') 
              : 'Not Set'})`,
          color: '#94A3B8',
          font: { size: 12 }
        },
        ticks: {
          color: '#64748B',
          font: { size: 9 },
          maxTicksLimit: 8,
          precision: 0,
          autoSkipPadding: 15,
          callback: function(value) {
            if (Number.isInteger(value)) return value;
          }
        },
        grid: {
          color: 'rgba(51,65,85,0.2)',
          borderColor: 'rgba(51,65,85,0.5)'
        }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: {
          display: true,
          text: currentTemplateConfig.yAxisThemeLabel 
            ? `Y-Axis Score: ${currentTemplateConfig.yAxisThemeLabel}`
            : `Y-Axis Score (${selectedYMetrics.length > 0 
              ? selectedYMetrics.map(m => m.metricLabel).slice(0, 1).join(', ') + 
                (selectedYMetrics.length > 1 ? ' & others' : '') 
              : 'Not Set'})`,
          color: '#94A3B8',
          font: { size: 12 }
        },
        ticks: {
          color: '#64748B',
          font: { size: 9 },
          maxTicksLimit: 8,
          precision: 0,
          autoSkipPadding: 15,
          callback: function(value) {
            if (Number.isInteger(value)) return value;
          }
        },
        grid: {
          color: 'rgba(51,65,85,0.2)',
          borderColor: 'rgba(51,65,85,0.5)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#CBD5E1',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: { size: 11 }
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(15,23,42,0.9)',
        titleColor: '#5EEAD4',
        bodyColor: '#E2E8F0',
        borderColor: 'rgba(51,65,85,0.7)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          title: (tooltipItems: any[]) => {
            const dp = tooltipItems[0]?.raw as ScatterScorePlotPointData;
            return dp?.company?.company_name || '';
          },
          label: (ctx: any) => {
            const dp = ctx.raw as ScatterScorePlotPointData;
            if (!dp || !dp.company) return '';
            const company = dp.company;
            const lines = [` ${company.tsx_code || 'N/A'}`];
            lines.push(` X-Score: ${dp.xScore?.toFixed(0) ?? 'N/A'}`);
            lines.push(` Y-Score: ${dp.yScore?.toFixed(0) ?? 'N/A'}`);
            if (zMetricConfig && dp.zRawValue !== undefined && dp.zRawValue !== null) {
              lines.push(` ${zMetricConfig.label}: ${formatValueWrapper(
                dp.zRawValue,
                zMetricConfig.format,
                selectedDisplayCurrency as Currency
              )}`);
            }
            return lines;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy' as const,
          threshold: 5
        },
        zoom: {
          wheel: {
            enabled: true,
            speed: 0.1
          },
          pinch: {
            enabled: true
          },
          mode: 'xy' as const
        }
      },
      datalabels: {
        display: false
      }
    }
  }), [selectedXMetrics, selectedYMetrics, zMetricConfig, selectedDisplayCurrency, currentTemplateConfig]);

  const handleZoomIn = useCallback(() => {
    chartRef.current?.zoom(1.2);
  }, []);

  const handleZoomOut = useCallback(() => {
    chartRef.current?.zoom(0.8);
  }, []);

  const handleResetZoom = useCallback(() => {
    chartRef.current?.resetZoom();
  }, []);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description={isCalculatingScores 
        ? "Calculating scores & preparing chart..." 
        : plotData.length > 0 
        ? `Displaying ${plotData.length} companies.` 
        : "Configure axes and apply to plot scores."
      }
      className="relative isolate flex flex-col flex-grow"
      contentClassName="flex flex-col flex-grow min-h-0"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
        style={{ backgroundImage: `url(data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgb(241,196,15);stop-opacity:0.1" /><stop offset="100%" style="stop-color:rgb(34,197,94);stop-opacity:0.1" /></linearGradient></defs><rect width="1200" height="600" fill="url(#g)" /><circle cx="200" cy="150" r="100" fill="rgba(241,196,15,0.05)" /><circle cx="1000" cy="450" r="150" fill="rgba(34,197,94,0.05)" /></svg>')})` }}
        aria-hidden="true"
      />

      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 flex-grow overflow-hidden">
        {/* Mobile toggle button for config panel */}
        <Button 
          onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} 
          variant="outline" 
          className="lg:hidden fixed bottom-4 right-4 z-[60] bg-navy-700 border-navy-600 p-2 h-auto shadow-lg"
          aria-label="Toggle Configuration Panel"
        >
          <Settings size={20}/>
        </Button>

        {/* Configuration Panel */}
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
          style={{ '--header-height': '80px' } as React.CSSProperties}
        >
          {/* Panel Header */}
          <div className="flex justify-between items-center mb-1 sticky top-0 bg-navy-800/90 backdrop-blur-sm py-2 -mx-3 md:-mx-4 px-3 md:px-4 z-10 border-b border-navy-700">
            <h2 className="text-lg xl:text-xl font-semibold text-surface-white">Chart Configuration</h2>
            <div className="flex items-center gap-2">
              {/* Desktop collapse button */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsConfigPanelOpen(false)} 
                className="hidden lg:flex text-muted-foreground hover:text-surface-white"
                aria-label="Collapse configuration panel"
              >
                <ChevronLeft size={20}/>
              </Button>
              {/* Mobile close button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsConfigPanelOpen(false)} 
                className="lg:hidden text-muted-foreground hover:text-surface-white"
              >
                <X size={20}/>
              </Button>
            </div>
          </div>
          
          <div className="px-1 space-y-4 pb-4">
            {/* Template Selector */}
            <div>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label 
                      htmlFor="template-selector" 
                      className="text-xs font-semibold text-muted-foreground block mb-1 cursor-help inline-flex items-center gap-1"
                    >
                      Load Template
                      <Info size={12} className="opacity-50" />
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    align="center" 
                    sideOffset={5}
                    className="text-xs max-w-[350px] p-3 z-[100] bg-navy-700/95 border border-navy-600/80"
                  >
                    <div className="space-y-2">
                      {PREDEFINED_TEMPLATES.map((t, index) => (
                        <div key={t.name} className={cn(
                          "pb-2",
                          index < PREDEFINED_TEMPLATES.length - 1 && "border-b border-navy-600/50"
                        )}>
                          <p className="font-semibold text-accent-teal mb-1">{t.name}</p>
                          <p className="text-surface-white/80">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Select value={activeTemplateName || ""} onValueChange={handleTemplateChange}>
                <SelectTrigger id="template-selector" className="w-full h-9 text-xs bg-navy-700 border-navy-600">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {PREDEFINED_TEMPLATES.map(t => (
                    <SelectItem key={t.name} value={t.name} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* X-Axis Configuration */}
            <AxisMetricConfigurator
              axisTitle="X-Axis Score Metrics"
              currentSelectedMetricsForAxis={selectedXMetrics}
              axisType="X"
              currentTotalWeightForAxis={xTotalWeight}
              accessibleMetrics={accessibleMetrics}
              handleAxisMetricChange={handleAxisMetricChange}
            />
            
            {/* Y-Axis Configuration */}
            <AxisMetricConfigurator
              axisTitle="Y-Axis Score Metrics"
              currentSelectedMetricsForAxis={selectedYMetrics}
              axisType="Y"
              currentTotalWeightForAxis={yTotalWeight}
              accessibleMetrics={accessibleMetrics}
              handleAxisMetricChange={handleAxisMetricChange}
            />

            {/* Z-Axis Configuration */}
            <Card className="p-3 md:p-4 bg-navy-700/50 border-navy-600">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-md font-semibold">Z-Axis (Bubble Size)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MetricSelector
                  label=""
                  selectedMetric={selectedZMetricKey || ""}
                  onMetricChange={(value) => {
                    setSelectedZMetricKey(value || null);
                    setActiveTemplateName(null);
                  }}
                  currentTier={currentUserTier}
                  availableMetrics={accessibleMetrics}
                  filterForNumericOnly={true}
                  placeholder="Select Z-Axis Metric..."
                />
                {selectedZMetricKey && (
                  <ScaleToggle 
                    scale={zScale} 
                    onChange={(newScale) => {
                      setZScale(newScale);
                      setActiveTemplateName(null);
                    }} 
                    label="Bubble Scale" 
                  />
                )}
              </CardContent>
            </Card>

            {/* Scoring Settings */}
            <Card className="p-3 md:p-4 bg-navy-700/50 border-navy-600">
              <CardHeader className="p-0 mb-2">
                <CardTitle className="text-md font-semibold">Scoring Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="norm-mode" className="text-xs font-medium text-muted-foreground">
                      Normalization Mode
                    </Label>
                    <Select 
                      value={normalizationMode} 
                      onValueChange={(val) => {
                        setNormalizationMode(val as NormalizationMode);
                        setActiveTemplateName(null);
                      }}
                    >
                      <SelectTrigger id="norm-mode" className="h-9 text-xs bg-navy-700 border-navy-600 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="dataset_min_max" className="text-xs">Dataset Min-Max (0-1)</SelectItem>
                        <SelectItem value="global_min_max" className="text-xs">Global Min-Max (0-1)</SelectItem>
                        <SelectItem value="dataset_rank_percentile" className="text-xs">Dataset Rank/Percentile (0-1)</SelectItem>
                        <SelectItem value="dataset_z_score" className="text-xs">Dataset Z-Score (approx 0-1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="impute-mode" className="text-xs font-medium text-muted-foreground">
                      Imputation (Missing Values)
                    </Label>
                    <Select 
                      value={imputationMode} 
                      onValueChange={(val) => {
                        setImputationMode(val as ImputationMode);
                        setActiveTemplateName(null);
                      }}
                    >
                      <SelectTrigger id="impute-mode" className="h-9 text-xs bg-navy-700 border-navy-600 mt-1">
                        <SelectValue />
                      </SelectTrigger>
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

            {/* Apply Button */}
            <Button 
              onClick={handleApplyConfigurationAndCalculateScores} 
              className="w-full mt-3 bg-accent-teal hover:bg-accent-teal/90 text-sm font-semibold py-2.5"
              disabled={isCalculatingScores || (selectedXMetrics.length === 0 && selectedYMetrics.length === 0)}
            >
              {isCalculatingScores ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw size={16} className="mr-2"/>
              )}
              Apply & Plot Scores
            </Button>
          </div>
        </motion.div>

        {/* Desktop expand button when collapsed */}
        {!isConfigPanelOpen && (
          <Button
            onClick={() => setIsConfigPanelOpen(true)}
            variant="outline"
            size="icon"
            className="hidden lg:flex fixed right-2 top-1/2 -translate-y-1/2 z-100 bg-navy-800/95 border-navy-500 hover:bg-navy-700 shadow-xl w-14 h-14"
            aria-label="Open configuration panel"
          >
            <Settings size={20} />
          </Button>
        )}

        {/* Chart Container */}
        <div className="flex-grow relative bg-navy-800/70 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-navy-700/50 flex flex-col min-h-[400px] lg:min-h-0">
          {(plotData.length > 0 || isCalculatingScores) && !axisScoreError && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
              <Button 
                variant="outline" 
                size="icon-sm" 
                onClick={handleZoomIn} 
                title="Zoom In" 
                className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon-sm" 
                onClick={handleZoomOut} 
                title="Zoom Out" 
                className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon-sm" 
                onClick={handleResetZoom} 
                title="Reset Zoom" 
                className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="flex-grow min-h-[400px] sm:min-h-[500px]">
            {isCalculatingScores && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <LoadingIndicator message="Calculating scores & preparing chart..." />
              </div>
            )}
            
            {!isCalculatingScores && axisScoreError && (
              <div className="h-full flex items-center justify-center">
                <p className="text-destructive text-center p-4">{axisScoreError}</p>
              </div>
            )}
            
            {!isCalculatingScores && !axisScoreError && plotData.length === 0 && 
             (selectedXMetrics.length > 0 || selectedYMetrics.length > 0) && (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-gray-400 p-4">
                  No data to plot. <br/>
                  This can happen if no companies match global filters, or if selected metrics resulted in no valid scores for any company. <br/>
                  Try adjusting global filters or click "Apply & Plot Scores" again.
                </p>
              </div>
            )}
            
            {!isCalculatingScores && !axisScoreError && plotData.length === 0 && 
             selectedXMetrics.length === 0 && selectedYMetrics.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-gray-400">
                  Please select metrics for at least one axis and click "Apply & Plot Scores".
                </p>
              </div>
            )}

            {!isCalculatingScores && !axisScoreError && plotData.length > 0 && 
             chartDatasets.length > 0 && (
              <Scatter 
                ref={chartRef} 
                data={{ datasets: chartDatasets }} 
                options={chartOptions} 
              />
            )}
            
            {!isCalculatingScores && !axisScoreError && plotData.length > 0 && 
             chartDatasets.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-gray-400 p-4">
                  Scores were calculated for {plotData.length} companies, but no valid data points could be generated for the chart 
                  (e.g., all X or Y scores were null, or Z-axis data was problematic). 
                  Please check your metric selections and try again.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
