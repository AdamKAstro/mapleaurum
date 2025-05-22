// src/pages/scatter-score-pro/index.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useFilters } from '../../contexts/filter-context'; // Path: ../../contexts/filter-context
import { useCurrency } from '../../contexts/currency-context'; // Path: ../../contexts/currency-context
import { PageContainer } from '../../components/ui/page-container'; // Path: ../../components/ui/page-container
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox'; // CORRECTED PATH (assuming this structure)
import { Input } from '../../components/ui/input';     // CORRECTED PATH
import { Label } from '../../components/ui/label';       // CORRECTED PATH
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Info, Lock, ArrowUp, ArrowDown, Settings, RefreshCw, ListPlus, X } from 'lucide-react'; // Added ListPlus, X
import { MetricSelector } from '../../components/metric-selector'; // Path: ../../components/metric-selector
// Assuming ScaleToggle is exported from ScatterChartPage or moved to a shared UI location.
// If it's within ScatterChartPage and not exported, you'll need to recreate or move it.
// For now, let's assume it can be imported or a similar component will be used.
// import { ScaleToggle } from '../scatter-chart'; // Placeholder path
import {
  allMetricsFromTypes as allMetrics,
  metricCategories,
  getAccessibleMetrics,
  MetricConfig
} from '../../lib/metric-types'; // Path: ../../lib/metric-types
import type { ColumnTier, NormalizationMode, ImputationMode, Currency } from '../../lib/types'; // Path: ../../lib/types
import { cn, isValidNumber } from '../../lib/utils'; // Path: ../../lib/utils

// --- Local Type Definitions ---
interface AxisMetricConfig {
  key: string; // MetricConfig.key
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

// --- START: PRE-DEFINED TEMPLATES (User to complete all 5) ---
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
      { key: 'financials.gross_profit', weight: 30, userHigherIsBetter: true }, // Using gross_profit for stability
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
      { key: 'company_overview.percent_silver', weight: 15, userHigherIsBetter: true },
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

// Simple ScaleToggle (can be moved to a shared UI component later)
const ScaleToggle: React.FC<{ scale: 'linear' | 'log'; onChange: (newScale: 'linear' | 'log') => void; label: string }> = ({ scale, onChange, label }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex bg-muted rounded-md p-0.5">
        <Button variant={scale === 'linear' ? 'secondary' : 'ghost'} size="xs" onClick={() => onChange('linear')} className={cn("px-2 py-0.5 h-auto text-xs", scale === 'linear' && "shadow")}>Linear</Button>
        <Button variant={scale === 'log' ? 'secondary' : 'ghost'} size="xs" onClick={() => onChange('log')} className={cn("px-2 py-0.5 h-auto text-xs", scale === 'log' && "shadow")}>Log</Button>
      </div>
    </div>
);


export function ScatterScoreProPage() {
  const { currentUserTier } = useFilters();
  // const { currency } = useCurrency(); // For Z-axis tooltip formatting if needed later

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

  const loadTemplate = useCallback((templateName: string | null) => {
    const template = PREDEFINED_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
        if (DEBUG_SCATTER_SCORE && templateName) console.warn(`[ScatterScoreProPage] Template '${templateName}' not found.`);
        // Fallback to first template if current one is invalid or null
        const firstTemplate = PREDEFINED_TEMPLATES[0];
        if (!firstTemplate) { // No templates defined at all
            setSelectedXMetrics([]);
            setSelectedYMetrics([]);
            setSelectedZMetricKey(null);
            setActiveTemplateName(null);
            return;
        }
        setActiveTemplateName(firstTemplate.name); // Set to first template's name
        // Now load the first template's actual config
        const getMetricConf = (key:string) => allMetrics.find(m=>m.key ===key);
        const mapMetricConfig = (mc: { key: string; weight: number; userHigherIsBetter?: boolean }): AxisMetricConfig | null => {
            const metricDetail = getMetricConf(mc.key);
            if (!metricDetail || !accessibleMetrics.some(am => am.key === mc.key)) return null;
            return {
                key: mc.key,
                metricLabel: metricDetail.label,
                weight: mc.weight,
                userHigherIsBetter: mc.userHigherIsBetter ?? metricDetail.higherIsBetter,
                originalHigherIsBetter: metricDetail.higherIsBetter,
            };
        };
        setSelectedXMetrics(firstTemplate.xMetricsConfig.map(mapMetricConfig).filter(Boolean) as AxisMetricConfig[]);
        setSelectedYMetrics(firstTemplate.yMetricsConfig.map(mapMetricConfig).filter(Boolean) as AxisMetricConfig[]);
        const zAccessible = firstTemplate.zMetricKey ? accessibleMetrics.some(am => am.key === firstTemplate.zMetricKey) : false;
        setSelectedZMetricKey(zAccessible ? firstTemplate.zMetricKey : null);
        setZScale(firstTemplate.zScale || 'log');
        setNormalizationMode(firstTemplate.normalizationMode || 'dataset_rank_percentile');
        setImputationMode(firstTemplate.imputationMode || 'dataset_median');
        return;
    }

    setActiveTemplateName(template.name);
    const getMetricConf = (key:string) => allMetrics.find(m=>m.key ===key);

    const mapAndFilterMetrics = (configs: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>): AxisMetricConfig[] => {
        return configs
            .map(m => {
                const metricConfig = getMetricConf(m.key);
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
            .filter(m => m !== null) as AxisMetricConfig[]; // Filter out nulls (inaccessible/unknown metrics)
    };

    setSelectedXMetrics(mapAndFilterMetrics(template.xMetricsConfig));
    setSelectedYMetrics(mapAndFilterMetrics(template.yMetricsConfig));
    
    const zMetricAccessible = template.zMetricKey ? accessibleMetrics.some(am => am.key === template.zMetricKey) : false;
    setSelectedZMetricKey(zMetricAccessible && template.zMetricKey ? template.zMetricKey : null);

    setZScale(template.zScale || 'log');
    setNormalizationMode(template.normalizationMode || 'dataset_rank_percentile');
    setImputationMode(template.imputationMode || 'dataset_median');

    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Loaded template: ${template.name}`);
  }, [accessibleMetrics, currentUserTier]);

  useEffect(() => {
    if (PREDEFINED_TEMPLATES.length > 0 && !activeTemplateName) {
      loadTemplate(PREDEFINED_TEMPLATES[0].name);
    }
  }, [loadTemplate, activeTemplateName]);

  const handleTemplateChange = (newTemplateName: string) => {
    loadTemplate(newTemplateName);
  };

  const handleAxisMetricChange = (
    axis: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any
  ) => {
    const setSelectedMetrics = axis === 'X' ? setSelectedXMetrics : setSelectedYMetrics;
    setSelectedMetrics(prevMetrics => {
      let newMetrics = [...prevMetrics];
      const existingIndex = newMetrics.findIndex(m => m.key === metricKey);

      if (action === 'add') {
        if (existingIndex === -1) {
          const metricConfig = allMetrics.find(m => m.key === metricKey);
          if (metricConfig) {
            newMetrics.push({
              key: metricKey,
              metricLabel: metricConfig.label,
              weight: Math.floor(100 / (newMetrics.length + 1)), // Simple equal distribution attempt
              userHigherIsBetter: metricConfig.higherIsBetter,
              originalHigherIsBetter: metricConfig.higherIsBetter,
            });
            // Re-normalize weights if adding
            const totalWeight = newMetrics.reduce((sum, m) => sum + m.weight, 0);
            if (totalWeight !== 0 && newMetrics.length > 0) { // Avoid division by zero
                 const scaleFactor = 100 / totalWeight;
                 newMetrics = newMetrics.map(m => ({...m, weight: Math.round(m.weight * scaleFactor)}));
                 // Adjust last item to ensure sum is exactly 100 due to rounding
                 let currentSum = newMetrics.reduce((sum, m) => sum + m.weight, 0);
                 if (newMetrics.length > 0 && currentSum !== 100) {
                    newMetrics[newMetrics.length -1].weight += (100 - currentSum);
                 }
            } else if (newMetrics.length === 1) {
                newMetrics[0].weight = 100;
            }


          }
        }
      } else if (action === 'remove') {
        newMetrics = newMetrics.filter(m => m.key !== metricKey);
        // Re-normalize weights if removing
        const totalWeight = newMetrics.reduce((sum, m) => sum + m.weight, 0);
        if (totalWeight !== 0 && newMetrics.length > 0) {
             const scaleFactor = 100 / totalWeight;
             newMetrics = newMetrics.map(m => ({...m, weight: Math.round(m.weight * scaleFactor)}));
             let currentSum = newMetrics.reduce((sum, m) => sum + m.weight, 0);
             if (newMetrics.length > 0 && currentSum !== 100) {
                newMetrics[newMetrics.length -1].weight += (100 - currentSum);
             }
        } else {
            newMetrics.forEach(m => m.weight = newMetrics.length > 0 ? Math.floor(100 / newMetrics.length) : 0);
             let currentSum = newMetrics.reduce((sum, m) => sum + m.weight, 0);
             if (newMetrics.length > 0 && currentSum !== 100) {
                newMetrics[newMetrics.length -1].weight += (100 - currentSum);
             }
        }


      } else if (action === 'updateWeight' && existingIndex !== -1) {
        const newWeight = Math.max(0, Math.min(100, Number(value) || 0));
        newMetrics[existingIndex] = { ...newMetrics[existingIndex], weight: newWeight };
        // Note: User must manually ensure weights sum to 100, or implement auto-balancing.
      } else if (action === 'toggleHLB' && existingIndex !== -1) {
        newMetrics[existingIndex] = { ...newMetrics[existingIndex], userHigherIsBetter: !!value };
      }
      return newMetrics;
    });
    setActiveTemplateName(null); // User is now in a custom configuration
  };
  
  const xTotalWeight = useMemo(() => Math.round(selectedXMetrics.reduce((sum, m) => sum + m.weight, 0)), [selectedXMetrics]);
  const yTotalWeight = useMemo(() => Math.round(selectedYMetrics.reduce((sum, m) => sum + m.weight, 0)), [selectedYMetrics]);

  const handleApplyConfiguration = () => {
    if (DEBUG_SCATTER_SCORE) {
      console.log("[ScatterScoreProPage] Applying configuration:", {
        template: activeTemplateName,
        xMetrics: selectedXMetrics, xTotalWeight,
        yMetrics: selectedYMetrics, yTotalWeight,
        zMetric: selectedZMetricKey, zScale,
        normalizationMode, imputationMode,
      });
    }
    // TODO: Trigger score calculation and chart update (Mini PRD-SS-2 and SS-3)
    if (xTotalWeight !== 100 || yTotalWeight !== 100) {
        alert("Total weights for X and Y axes must each sum to 100%. Please adjust.");
        return;
    }
    // For now, log that data would be refetched/recalculated
    console.log("[ScatterScoreProPage] Recalculation logic to be implemented based on current state.");
  };

  // A simplified metric selector for adding metrics to an axis
  // In a real app, this would be a modal or a more complex searchable list
  const AvailableMetricsSelector: React.FC<{
    axisLabel: 'X' | 'Y';
    onMetricSelect: (metricKey: string) => void;
    currentSelectedKeys: string[];
  }> = ({ axisLabel, onMetricSelect, currentSelectedKeys }) => {
    return (
      <div className="my-2 p-2 border rounded-md bg-navy-600/30 border-navy-500">
        <p className="text-xs font-medium mb-1">Add Metric to {axisLabel}-Axis:</p>
        <Select onValueChange={(value) => { if(value) onMetricSelect(value); }}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder={`Select metric for ${axisLabel}-Axis...`} />
          </SelectTrigger>
          <SelectContent>
            {accessibleMetrics
              .filter(m => !currentSelectedKeys.includes(m.key)) // Don't show already selected
              .map(m => (
              <SelectItem key={m.key} value={m.key} className="text-xs">
                {metricCategories[m.category]}: {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  const renderAxisMetricConfigurator = (
    axisTitle: 'X-Axis Score Metrics' | 'Y-Axis Score Metrics',
    selectedMetrics: AxisMetricConfig[],
    axisType: 'X' | 'Y',
    totalWeight: number
  ) => {
    return (
      <Card className="p-4 bg-navy-700/50 border-navy-600">
        <CardTitle className="text-md mb-3">{axisTitle}</CardTitle>
        <AvailableMetricsSelector
            axisLabel={axisType}
            onMetricSelect={(metricKey) => handleAxisMetricChange(axisType, metricKey, 'add')}
            currentSelectedKeys={selectedMetrics.map(m => m.key)}
        />
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mt-2 scrollbar-thin scrollbar-thumb-navy-500 scrollbar-track-navy-800">
          {selectedMetrics.length === 0 && <p className="text-xs text-muted-foreground italic">No metrics selected for this axis.</p>}
          {selectedMetrics.map((sm) => (
              <div key={sm.key} className="p-2.5 border rounded-md bg-navy-600/40 border-navy-500/70 space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor={`weight-${axisType}-${sm.key}`} className="text-xs font-medium text-surface-white truncate" title={sm.metricLabel}>{sm.metricLabel}</Label>
                  <Button variant="ghost" size="icon-xs" className="p-0 h-auto text-red-500 hover:text-red-400" onClick={() => 
                      handleAxisMetricChange(axisType, sm.key, 'remove')
                  }>
                    <X size={14} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`weight-${axisType}-${sm.key}`}
                    type="number"
                    value={sm.weight}
                    onChange={(e) => handleAxisMetricChange(axisType, sm.key, 'updateWeight', parseInt(e.target.value, 10))}
                    className="h-7 text-xs w-20 bg-navy-800 border-navy-500"
                    min={0} max={100}
                  />
                  <Label htmlFor={`hlb-${axisType}-${sm.key}`} className="flex items-center text-xs gap-1.5 cursor-pointer text-surface-white/80">
                    <Checkbox
                      id={`hlb-${axisType}-${sm.key}`}
                      checked={sm.userHigherIsBetter}
                      onCheckedChange={(checked) => 
                        handleAxisMetricChange(axisType, sm.key, 'toggleHLB', !!checked)
                      }
                      className="border-gray-500 data-[state=checked]:bg-accent-teal data-[state=checked]:border-accent-teal-darker"
                    />
                    Higher is Better
                  </Label>
                </div>
              </div>
            ))}
        </div>
        <div className={cn("text-xs mt-2 font-medium", totalWeight !== 100 ? "text-destructive" : "text-green-400")}>
            Total {axisType}-Axis Weight: {totalWeight}% (Must be 100%)
        </div>
      </Card>
    );
  };

  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description="Configure multi-metric axes for custom scatter plots and derived scores."
    >
      <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 h-full">
        {/* Configuration Panel */}
        <Card className="lg:w-[400px] xl:w-[450px] p-3 md:p-4 space-y-4 overflow-y-auto bg-navy-800/70 border-navy-700 backdrop-blur-sm flex-shrink-0 scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-navy-700/50" style={{maxHeight: 'calc(100vh - 120px)'}}> {/* Adjust max-height as needed */}
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-surface-white">Chart Configuration</h2>
            <Button variant="ghost" size="icon-sm" onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} className="lg:hidden">
                <Settings size={18}/>
            </Button>
          </div>
          
          <div className={cn(isConfigPanelOpen ? "block" : "hidden", "lg:block space-y-4")}>
            <div>
              <Label htmlFor="template-selector" className="text-xs font-semibold text-muted-foreground block mb-1">Load Template</Label>
              <Select value={activeTemplateName || ""} onValueChange={handleTemplateChange}>
                <SelectTrigger id="template-selector" className="w-full h-9 text-xs bg-navy-700 border-navy-600">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_TEMPLATES.map(t => (
                    <SelectItem key={t.name} value={t.name} className="text-xs">{t.name} <span className="text-muted-foreground/70 ml-2 text-[10px]">({t.description.substring(0,30)}...)</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {renderAxisMetricConfigurator("X-Axis Score Metrics", selectedXMetrics, setSelectedXMetrics, xTotalWeight)}
            {renderAxisMetricConfigurator("Y-Axis Score Metrics", selectedYMetrics, setSelectedYMetrics, yTotalWeight)}

            <Card className="p-4 bg-navy-700/50 border-navy-600">
              <CardTitle className="text-md mb-3">Z-Axis (Bubble Size)</CardTitle>
              <MetricSelector
                  label="" // Label provided by CardTitle
                  selectedMetric={selectedZMetricKey}
                  onMetricChange={setSelectedZMetricKey}
                  currentTier={currentUserTier}
                  availableMetrics={accessibleMetrics} // Pass down filtered metrics
                  filterForNumericOnly={true} 
                  placeholder="Select Z-Axis Metric..."
              />
              {selectedZMetricKey && <div className="mt-2"><ScaleToggle scale={zScale} onChange={setZScale} label="Bubble Size Scale" /></div>}
            </Card>

            <Card className="p-4 bg-navy-700/50 border-navy-600">
              <CardTitle className="text-md mb-3">Scoring Settings</CardTitle>
              <div className="space-y-3">
                  <div>
                      <Label htmlFor="norm-mode" className="text-xs font-medium text-muted-foreground">Normalization Mode</Label>
                      <Select value={normalizationMode} onValueChange={(val) => setNormalizationMode(val as NormalizationMode)}>
                          <SelectTrigger id="norm-mode" className="h-9 text-xs bg-navy-700 border-navy-600 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="dataset_min_max" className="text-xs">Dataset Min-Max</SelectItem>
                              <SelectItem value="global_min_max" className="text-xs">Global Min-Max</SelectItem>
                              <SelectItem value="dataset_rank_percentile" className="text-xs">Dataset Rank/Percentile</SelectItem>
                              <SelectItem value="dataset_z_score" className="text-xs">Dataset Z-Score</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div>
                      <Label htmlFor="impute-mode" className="text-xs font-medium text-muted-foreground">Imputation (Missing Values)</Label>
                      <Select value={imputationMode} onValueChange={(val) => setImputationMode(val as ImputationMode)}>
                          <SelectTrigger id="impute-mode" className="h-9 text-xs bg-navy-700 border-navy-600 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="zero_worst" className="text-xs">Zero / Worst Case</SelectItem>
                              <SelectItem value="dataset_mean" className="text-xs">Dataset Mean</SelectItem>
                              <SelectItem value="dataset_median" className="text-xs">Dataset Median</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
            </Card>

            <Button onClick={handleApplyConfiguration} className="w-full mt-4 bg-accent-teal hover:bg-accent-teal/90 text-sm font-semibold">
              <RefreshCw size={16} className="mr-2"/> Apply Configuration
            </Button>
          </div>
        </Card>

        {/* Chart Display Area */}
        <div className="flex-grow bg-navy-800/30 p-4 rounded-lg border border-navy-700 backdrop-blur-sm flex items-center justify-center">
          <p className="text-center text-gray-400">
            Scatter plot and score results will appear here.
            <br /> (Implementation in Mini PRD-SS-2 & SS-3)
          </p>
          {/* Placeholder for the scatter chart itself */}
        </div>
      </div>
    </PageContainer>
  );
}