// src/pages/scatter-score-pro/index.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Info, Lock, ArrowUp, ArrowDown, Settings, RefreshCw, ListPlus, X, ZoomIn, ZoomOut, RotateCcw, Loader2, ChevronLeft, Plus, Minus, PlayCircle, Sparkles } from 'lucide-react';
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
  <div className="flex items-center gap-2 text-xs font-medium">
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

const MetricListItem: React.FC<{
  metric: AxisMetricConfig;
  axisType: 'X' | 'Y';
  onWeightChange: (value: number) => void;
  onToggleHLB: (value: boolean) => void;
  onRemove: () => void;
}> = ({ metric, axisType, onWeightChange, onToggleHLB, onRemove }) => (
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

const AxisMetricConfigurator: React.FC<{
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
}> = ({
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
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [isTemplateReady, setIsTemplateReady] = useState(false);

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

  const loadTemplate = useCallback((templateName: string | null, autoApply: boolean = false) => {
    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] loadTemplate attempting for: '${templateName}'`);
    
    setIsTemplateLoading(true);
    setIsTemplateReady(false);
    
    const template = PREDEFINED_TEMPLATES.find(t => t.name === templateName) || PREDEFINED_TEMPLATES[0];
    
    if (!template) {
      if (DEBUG_SCATTER_SCORE) console.warn(`[ScatterScoreProPage] No templates available or specified one not found.`);
      setSelectedXMetrics([]);
      setSelectedYMetrics([]);
      setSelectedZMetricKey(null);
      setActiveTemplateName(null);
      setCurrentTemplateConfig({});
      setIsTemplateLoading(false);
      setIsTemplateReady(false);
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
    
    const xMetrics = normalizeWeights(mapAndFilter(template.xMetricsConfig));
    const yMetrics = normalizeWeights(mapAndFilter(template.yMetricsConfig));
    
    setSelectedXMetrics(xMetrics);
    setSelectedYMetrics(yMetrics);
    
    const zAccessible = template.zMetricKey ? accessibleMetrics.some(am => am.key === template.zMetricKey) : false;
    setSelectedZMetricKey(zAccessible && template.zMetricKey ? template.zMetricKey : null);
    setZScale(template.zScale || 'log');
    setNormalizationMode(template.defaultNormalizationMode || 'dataset_rank_percentile');
    setImputationMode(template.defaultImputationMode || 'dataset_median');
    
    setIsTemplateLoading(false);
    setIsTemplateReady(true);
    
    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Template '${template.name}' loaded.`);
    
    // Return a promise that resolves when template is ready
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 50);
    });
  }, [accessibleMetrics, getMetricConfigDetails]);

  const handleApplyConfigurationAndCalculateScores = useCallback(async (skipValidation: boolean = false) => {
    if (DEBUG_SCATTER_SCORE) console.log("[ScatterScoreProPage] 'Apply & Plot Scores' clicked.");
    
    const finalXMetrics = normalizeWeights(selectedXMetrics);
    const finalYMetrics = normalizeWeights(selectedYMetrics);
    setSelectedXMetrics(finalXMetrics);
    setSelectedYMetrics(finalYMetrics);
    
    const currentXTotalOnApply = finalXMetrics.reduce((sum, m) => sum + m.weight, 0);
    const currentYTotalOnApply = finalYMetrics.reduce((sum, m) => sum + m.weight, 0);

    if (!skipValidation) {
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

  // Load template and auto-apply on first mount
  useEffect(() => {
    if (accessibleMetrics.length > 0 && !hasInitialLoad) {
      const performInitialLoad = async () => {
        if (activeTemplateName) {
          await loadTemplate(activeTemplateName, true);
          // Wait a bit more to ensure state is fully updated
          await new Promise(resolve => setTimeout(resolve, 200));
          await handleApplyConfigurationAndCalculateScores(true);
          setHasInitialLoad(true);
        }
      };
      
      performInitialLoad();
    }
  }, [accessibleMetrics, hasInitialLoad]);

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
          family: 'font-sans' 
        },
        textAlign: 'center' as const,
        anchor: 'center' as const,
        align: 'center' as const,
        offset: 0,
        clip: true // This ensures labels are clipped to the chart area
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
          font: { 
            size: 13,
            family: 'font-sans',
            weight: '500' as const
          }
        },
        ticks: {
          color: '#64748B',
          font: { 
            size: 10,
            family: 'font-sans'
          },
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
          font: { 
            size: 13,
            family: 'font-sans',
            weight: '500' as const
          }
        },
        ticks: {
          color: '#64748B',
          font: { 
            size: 10,
            family: 'font-sans'
          },
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
          font: { 
            size: 12,
            family: 'font-sans'
          }
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
        titleFont: {
          size: 13,
          family: 'font-sans',
          weight: 'bold' as const
        },
        bodyFont: {
          size: 12,
          family: 'font-sans'
        },
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
    },
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
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

  // Trigger chart resize when panel state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    }, 350); // Slightly longer than transition duration

    return () => clearTimeout(timer);
  }, [isConfigPanelOpen]);

  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description={isCalculatingScores 
        ? "Calculating scores & preparing chart..." 
        : plotData.length > 0 
        ? `Displaying ${plotData.length} companies.` 
        : "Configure axes and apply to plot scores."
      }
      className="relative isolate flex flex-col flex-grow font-sans"
      contentClassName="flex flex-col flex-grow min-h-0"
    >
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
        style={{ backgroundImage: `url(data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgb(241,196,15);stop-opacity:0.1" /><stop offset="100%" style="stop-color:rgb(34,197,94);stop-opacity:0.1" /></linearGradient></defs><rect width="1200" height="600" fill="url(#g)" /><circle cx="200" cy="150" r="100" fill="rgba(241,196,15,0.05)" /><circle cx="1000" cy="450" r="150" fill="rgba(34,197,94,0.05)" /></svg>')})` }}
        aria-hidden="true"
      />

      <motion.div 
        initial={false}
        animate={{ paddingLeft: isConfigPanelOpen ? '0' : '0' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 flex-grow overflow-hidden"
      >
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
        <AnimatePresence initial={false}>
          {isConfigPanelOpen && (
            <motion.div 
              key="config-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: "auto",
                opacity: 1,
                transition: {
                  width: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2, delay: 0.1 }
                }
              }}
              exit={{ 
                width: 0,
                opacity: 0,
                transition: {
                  width: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.1 }
                }
              }}
              className={cn(
                "flex-shrink-0 overflow-hidden",
                "lg:block fixed inset-0 z-50 lg:relative lg:z-auto lg:inset-auto"
              )}
            >
              <motion.div
                initial={false}
                animate={{ x: 0 }}
                className={cn(
                  "h-full flex flex-col space-y-4 overflow-y-auto bg-navy-800/80 backdrop-blur-sm rounded-xl p-3 md:p-4",
                  "lg:w-[380px] xl:w-[420px] lg:h-[calc(100vh-var(--header-height,80px)-3rem)]",
                  "scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-navy-700/50"
                )}
                style={{ '--header-height': '80px' } as React.CSSProperties}
              >
                {/* Panel Header */}
                <div className="flex justify-between items-center sticky top-0 bg-navy-800/90 backdrop-blur-sm py-2 -mx-3 md:-mx-4 px-3 md:px-4 z-10 border-b border-navy-700">
                  <h2 className="text-xl font-bold text-surface-white">Configuration</h2>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsConfigPanelOpen(false)} 
                    className="text-muted-foreground hover:text-surface-white h-8 w-8"
                  >
                    <X size={18}/>
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {/* Template Selector */}
                  <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/50">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold text-surface-white">Template</Label>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-muted-foreground hover:text-accent-teal">
                              <Info size={14} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="left" 
                            align="end"
                            className="text-xs max-w-[300px] p-3 z-[100] bg-navy-700/95 border border-navy-600/80 font-sans"
                          >
                            <div className="space-y-2">
                              {PREDEFINED_TEMPLATES.map((t, index) => (
                                <div key={t.name} className={cn(
                                  "pb-2",
                                  index < PREDEFINED_TEMPLATES.length - 1 && "border-b border-navy-600/50"
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
                    <Select value={activeTemplateName || ""} onValueChange={handleTemplateChange}>
                      <SelectTrigger className="w-full h-8 text-xs bg-navy-700/50 border-navy-600 font-medium">
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        {PREDEFINED_TEMPLATES.map(t => (
                          <SelectItem key={t.name} value={t.name} className="text-xs font-medium">
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
                    handleAxisMetricChange={handleAxisMetricChange}
                  />
                  
                  <AxisMetricConfigurator
                    axisTitle="Y-Axis Metrics"
                    currentSelectedMetricsForAxis={selectedYMetrics}
                    axisType="Y"
                    currentTotalWeightForAxis={yTotalWeight}
                    accessibleMetrics={accessibleMetrics}
                    handleAxisMetricChange={handleAxisMetricChange}
                  />

                  {/* Z-Axis Configuration */}
                  <div className="bg-navy-700/30 rounded-lg p-3 border border-navy-600/50 space-y-2">
                    <h3 className="text-base font-semibold">Bubble Size (Z-Axis)</h3>
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
                      placeholder="Select metric..."
                      className="text-xs h-8 font-medium"
                    />
                    {selectedZMetricKey && (
                      <ScaleToggle 
                        scale={zScale} 
                        onChange={(newScale) => {
                          setZScale(newScale);
                          setActiveTemplateName(null);
                        }} 
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
                        onValueChange={(val) => {
                          setNormalizationMode(val as NormalizationMode);
                          setActiveTemplateName(null);
                        }}
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
                        onValueChange={(val) => {
                          setImputationMode(val as ImputationMode);
                          setActiveTemplateName(null);
                        }}
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
                  <Button 
                    onClick={() => handleApplyConfigurationAndCalculateScores(false)} 
                    className={cn(
                      "w-full text-base font-bold h-12 relative overflow-hidden group transition-all duration-300",
                      "bg-gradient-to-r from-accent-teal to-teal-500 hover:from-teal-500 hover:to-accent-teal",
                      "shadow-lg hover:shadow-xl shadow-teal-900/20 hover:shadow-teal-900/30",
                      "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
                      "before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700"
                    )}
                    disabled={isCalculatingScores || (selectedXMetrics.length === 0 && selectedYMetrics.length === 0)}
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {isCalculatingScores ? (
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop expand button when collapsed */}
        <AnimatePresence>
          {!isConfigPanelOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="hidden lg:block"
            >
              <Button
                onClick={() => setIsConfigPanelOpen(true)}
                variant="outline"
                size="icon"
                className="fixed left-3 bottom-3 z-[100] bg-accent-teal/90 border-teal-600 hover:bg-accent-teal shadow-md rounded-lg w-12 h-12"
                aria-label="Open configuration panel"
              >
                <Settings size={20} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chart Container */}
        <motion.div 
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex-grow relative bg-navy-800/70 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-navy-700/50 flex flex-col min-h-[400px] lg:min-h-0"
        >
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
                <p className="text-destructive text-center p-4 font-medium">{axisScoreError}</p>
              </div>
            )}
            
            {!isCalculatingScores && !axisScoreError && plotData.length === 0 && 
             (selectedXMetrics.length > 0 || selectedYMetrics.length > 0) && !hasInitialLoad && (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-gray-400 p-4 font-light">
                  No data to plot. <br/>
                  This can happen if no companies match global filters, or if selected metrics resulted in no valid scores for any company. <br/>
                  Try adjusting global filters or click "Apply Configuration & Plot" again.
                </p>
              </div>
            )}
            
            {!isCalculatingScores && !axisScoreError && plotData.length === 0 && 
             selectedXMetrics.length === 0 && selectedYMetrics.length === 0 && !hasInitialLoad && (
              <div className="h-full flex items-center justify-center">
                <p className="text-center text-gray-400 font-light">
                  Please select metrics for at least one axis and click "Apply Configuration & Plot".
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
                <p className="text-center text-gray-400 p-4 font-light">
                  Scores were calculated for {plotData.length} companies, but no valid data points could be generated for the chart 
                  (e.g., all X or Y scores were null, or Z-axis data was problematic). 
                  Please check your metric selections and try again.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}