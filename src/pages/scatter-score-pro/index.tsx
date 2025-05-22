// src/pages/scatter-score-pro/index.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useFilters } from '../../contexts/filter-context';
import { useCurrency } from '../../contexts/currency-context';
import { PageContainer } from '../../components/ui/page-container';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label'; // Assuming you have this
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Info, Lock, ArrowUp, ArrowDown, Settings, RefreshCw } from 'lucide-react';
import { MetricSelector } from '../../components/metric-selector'; // Re-use if suitable for single Z select
import { ScaleToggle } from '../../pages/scatter-chart/index'; // Assuming ScaleToggle can be imported or recreated
import {
  allMetricsFromTypes as allMetrics, // Renaming for clarity
  metricCategories,
  getAccessibleMetrics,
  MetricConfig
} from '../../lib/metric-types';
import type { ColumnTier, NormalizationMode, ImputationMode, Currency } from '../../lib/types';
import { cn, isValidNumber } from '../../lib/utils';

// Types for this page's specific state
interface AxisMetricConfig {
  key: string; // MetricConfig.key
  metricLabel: string; // For display
  weight: number; // Percentage 0-100
  userHigherIsBetter: boolean; // User's override for this axis
  originalHigherIsBetter: boolean; // From MetricConfig
}

interface ScatterScoreTemplate {
  name: string;
  description: string;
  xMetricsConfig: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>;
  yMetricsConfig: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>;
  zMetricKey?: string | null;
  zScale?: 'linear' | 'log';
  normalizationMode?: NormalizationMode;
  imputationMode?: ImputationMode;
}

const DEBUG_SCATTER_SCORE = process.env.NODE_ENV === 'development';

// --- PRE-DEFINED TEMPLATES --- (User to refine specific metric keys and weights)
const PREDEFINED_TEMPLATES: ScatterScoreTemplate[] = [
  {
    name: "Value Hunter",
    description: "Focuses on undervalued companies with strong fundamentals and asset backing.",
    xMetricsConfig: [ // Valuation Attractiveness (For this axis, a HIGHER score means MORE attractive valuation)
      { key: 'financials.price_to_book', weight: 20, userHigherIsBetter: false }, // Lower P/B = better value -> contributes positively to score
      { key: 'financials.price_to_sales', weight: 20, userHigherIsBetter: false }, // Lower P/S = better value
      { key: 'financials.enterprise_to_ebitda', weight: 20, userHigherIsBetter: false }, // Lower EV/EBITDA = better value
      { key: 'valuation_metrics.vm_mkt_cap_per_reserve_oz_all', weight: 20, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_ev_per_reserve_oz_all', weight: 20, userHigherIsBetter: false },
    ],
    yMetricsConfig: [ // Financial Strength & Asset Quality (Higher Y-Score = Stronger)
      { key: 'financials.net_financial_assets', weight: 25, userHigherIsBetter: true },
      { key: 'financials.debt_value', weight: 25, userHigherIsBetter: false }, // Lower debt = stronger
      { key: 'financials.free_cash_flow', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_reserves_total_aueq_moz', weight: 25, userHigherIsBetter: true },
    ],
    zMetricKey: 'financials.market_cap_value', zScale: 'log',
    defaultNormalizationMode: 'dataset_rank_percentile',
    defaultImputationMode: 'dataset_median',
  },
  {
    name: "Growth Catalyst Seeker",
    description: "Targets companies with high resource expansion and production growth potential.",
    xMetricsConfig: [ // Resource Growth & Exploration Potential (Higher X-Score = More Potential)
      { key: 'mineral_estimates.me_potential_total_aueq_moz', weight: 30, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_resources_total_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_measured_indicated_total_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_potential_non_precious_aueq_moz', weight: 20, userHigherIsBetter: true }, // Added new non-precious potential
    ],
    yMetricsConfig: [ // Production Expansion & Forward Outlook (Higher Y-Score = Better Growth Outlook)
      { key: 'production.p_future_production_total_aueq_koz', weight: 40, userHigherIsBetter: true },
      { key: 'financials.peg_ratio', weight: 30, userHigherIsBetter: false }, // Lower PEG is better for growth value
      { key: 'financials.forward_pe', weight: 30, userHigherIsBetter: false }, // Lower Fwd P/E suggests growth value
    ],
    zMetricKey: 'financials.enterprise_value_value', zScale: 'log',
    defaultNormalizationMode: 'dataset_min_max',
    defaultImputationMode: 'dataset_mean',
  },
  {
    name: "Producer Profitability Focus",
    description: "For analyzing currently producing companies, emphasizing profitability and operational efficiency.",
    xMetricsConfig: [ // Cost Efficiency (Higher X-Score = Better Cost Control -> lower actual costs)
      { key: 'costs.c_aisc_last_year', weight: 30, userHigherIsBetter: false },
      { key: 'costs.c_aisc_last_quarter', weight: 30, userHigherIsBetter: false },
      { key: 'costs.c_tco_current', weight: 20, userHigherIsBetter: false },
      { key: 'costs.c_aic_last_year', weight: 20, userHigherIsBetter: false }, // Added new AIC
    ],
    yMetricsConfig: [ // Current Profitability & Output (Higher Y-Score = More Profitable/Productive)
      { key: 'financials.ebitda', weight: 25, userHigherIsBetter: true },
      { key: 'financials.net_income_value', weight: 25, userHigherIsBetter: true },
      { key: 'financials.free_cash_flow', weight: 25, userHigherIsBetter: true },
      { key: 'production.p_current_production_total_aueq_koz', weight: 25, userHigherIsBetter: true },
    ],
    zMetricKey: 'financials.revenue_value', zScale: 'log',
    defaultNormalizationMode: 'dataset_rank_percentile',
    defaultImputationMode: 'dataset_median',
  },
  {
    name: "Financial Stability & Low Risk",
    description: "For risk-averse investors prioritizing companies with strong balance sheets and low debt.",
    xMetricsConfig: [ // Balance Sheet Strength (Higher X-Score = Stronger/Safer)
      { key: 'financials.cash_value', weight: 30, userHigherIsBetter: true },
      { key: 'financials.debt_value', weight: 30, userHigherIsBetter: false }, // Lower debt is stronger
      { key: 'financials.net_financial_assets', weight: 20, userHigherIsBetter: true },
      { key: 'financials.liabilities', weight: 20, userHigherIsBetter: false }, // Lower liabilities is stronger
    ],
    yMetricsConfig: [ // Operational Stability & Longevity (Higher Y-Score = More Stable)
      { key: 'production.p_reserve_life_years', weight: 40, userHigherIsBetter: true },
      { key: 'costs.c_aisc_last_year', weight: 30, userHigherIsBetter: false }, // Lower cost = more stable
      { key: 'financials.gross_profit', weight: 30, userHigherIsBetter: true }, // Consistent gross profit = stable
    ],
    zMetricKey: 'production.p_reserve_life_years', zScale: 'linear',
    defaultNormalizationMode: 'global_min_max', // Compare against absolute stability benchmarks
    defaultImputationMode: 'zero_worst',     // Penalize missing stability data
  },
  {
    name: "Precious Metals Pure Play",
    description: "Focusing on companies with high exposure to gold/silver, their precious resources, and related valuations.",
    xMetricsConfig: [ // Precious Metal Resource Base (Higher X-Score = Larger Precious Base)
      { key: 'mineral_estimates.me_reserves_precious_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_measured_indicated_precious_aueq_moz', weight: 25, userHigherIsBetter: true },
      { key: 'mineral_estimates.me_resources_precious_aueq_moz', weight: 20, userHigherIsBetter: true },
      { key: 'company_overview.percent_gold', weight: 15, userHigherIsBetter: true },
      { key: 'company_overview.percent_silver', weight: 15, userHigherIsBetter: true },
    ],
    yMetricsConfig: [ // Valuation for Precious Metals (Higher Y-Score = More Attractive Valuation)
      { key: 'valuation_metrics.vm_mkt_cap_per_reserve_oz_precious', weight: 25, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_ev_per_reserve_oz_precious', weight: 25, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_mkt_cap_per_mi_oz_precious', weight: 25, userHigherIsBetter: false },
      { key: 'valuation_metrics.vm_ev_per_mi_oz_precious', weight: 25, userHigherIsBetter: false },
    ],
    zMetricKey: 'production.p_current_production_precious_aueq_koz', zScale: 'log',
    defaultNormalizationMode: 'dataset_min_max',
    defaultImputationMode: 'dataset_median',
  }
];


export function ScatterScoreProPage() {
  const { currentUserTier, filteredCompanyIds, fetchCompaniesByIds, loadingFilteredSet } = useFilters();
  const { currency } = useCurrency();

  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(PREDEFINED_TEMPLATES[0]?.name || null);
  
  // State for user selections
  const [selectedXMetrics, setSelectedXMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedYMetrics, setSelectedYMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedZMetricKey, setSelectedZMetricKey] = useState<string | null>(null);
  const [zScale, setZScale] = useState<'linear' | 'log'>('log');
  
  const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>('dataset_rank_percentile');
  const [imputationMode, setImputationMode] = useState<ImputationMode>('dataset_median');

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true); // Default open

  const accessibleMetrics = useMemo(() => getAccessibleMetrics(currentUserTier || 'free'), [currentUserTier]);

  // Function to load a template into state
  const loadTemplate = useCallback((templateName: string | null) => {
    const template = PREDEFINED_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
        if (DEBUG_SCATTER_SCORE) console.warn(`Template ${templateName} not found.`);
        // Optionally reset to a very basic default or the first template
        const firstTemplate = PREDEFINED_TEMPLATES[0];
        if(firstTemplate) {
            setActiveTemplateName(firstTemplate.name);
            // Fallback logic to load first template
            const getMetric = (key:string) => allMetrics.find(m=>m.key ===key);

            setSelectedXMetrics(firstTemplate.xMetricsConfig.map(m => {
                const config = getMetric(m.key);
                return { ...m, metricLabel: config?.label || m.key, originalHigherIsBetter: config?.higherIsBetter || false, userHigherIsBetter: m.userHigherIsBetter ?? config?.higherIsBetter ?? false };
            }).filter(m => accessibleMetrics.some(am => am.key === m.key))
            );
            setSelectedYMetrics(firstTemplate.yMetricsConfig.map(m => {
                const config = getMetric(m.key);
                return { ...m, metricLabel: config?.label || m.key, originalHigherIsBetter: config?.higherIsBetter || false, userHigherIsBetter: m.userHigherIsBetter ?? config?.higherIsBetter ?? false };
            }).filter(m => accessibleMetrics.some(am => am.key === m.key))
            );
            setSelectedZMetricKey(firstTemplate.zMetricKey || null);
            setZScale(firstTemplate.zScale || 'log');
            setNormalizationMode(firstTemplate.normalizationMode || 'dataset_rank_percentile');
            setImputationMode(firstTemplate.imputationMode || 'dataset_median');
        }
        return;
    }

    setActiveTemplateName(template.name);
    const getMetric = (key:string) => allMetrics.find(m=>m.key ===key);

    const filterAndMapMetrics = (configs: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>): AxisMetricConfig[] => {
        return configs
            .map(m => {
                const metricConfig = getMetric(m.key);
                if (!metricConfig) return null;
                return {
                    key: m.key,
                    metricLabel: metricConfig.label,
                    weight: m.weight,
                    userHigherIsBetter: m.userHigherIsBetter ?? metricConfig.higherIsBetter,
                    originalHigherIsBetter: metricConfig.higherIsBetter,
                };
            })
            .filter(m => m !== null && accessibleMetrics.some(am => am.key === m.key)) as AxisMetricConfig[];
    };

    setSelectedXMetrics(filterAndMapMetrics(template.xMetricsConfig));
    setSelectedYMetrics(filterAndMapMetrics(template.yMetricsConfig));
    
    const zMetricAccessible = template.zMetricKey ? accessibleMetrics.some(am => am.key === template.zMetricKey) : true;
    setSelectedZMetricKey(zMetricAccessible && template.zMetricKey ? template.zMetricKey : null);
    setZScale(template.zScale || 'log');
    setNormalizationMode(template.normalizationMode || 'dataset_rank_percentile');
    setImputationMode(template.imputationMode || 'dataset_median');

    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Loaded template: ${template.name}`, {x: filterAndMapMetrics(template.xMetricsConfig), y: filterAndMapMetrics(template.yMetricsConfig)});

  }, [accessibleMetrics]);

  // Load default template on mount
  useEffect(() => {
    if (PREDEFINED_TEMPLATES.length > 0) {
      loadTemplate(PREDEFINED_TEMPLATES[0].name);
    }
  }, [loadTemplate]); // loadTemplate depends on accessibleMetrics, which depends on currentUserTier

  const handleTemplateChange = (templateName: string) => {
    loadTemplate(templateName);
  };
  
  // TODO: Handlers for adding/removing metrics, changing weights, toggling userHigherIsBetter
  // These will modify selectedXMetrics and selectedYMetrics arrays.
  // Example:
  const handleXMetricWeightChange = (metricKey: string, newWeight: number) => {
      setSelectedXMetrics(prev => prev.map(m => m.key === metricKey ? {...m, weight: Math.max(0, Math.min(100, newWeight))} : m));
  };
  const handleXMetricHLBChange = (metricKey: string, newHlb: boolean) => {
      setSelectedXMetrics(prev => prev.map(m => m.key === metricKey ? {...m, userHigherIsBetter: newHlb} : m));
  };
  // Similar handlers for Y-axis.
  // Handlers for adding/removing metrics will involve updating the arrays and potentially re-normalizing weights.

  const xTotalWeight = useMemo(() => selectedXMetrics.reduce((sum, m) => sum + m.weight, 0), [selectedXMetrics]);
  const yTotalWeight = useMemo(() => selectedYMetrics.reduce((sum, m) => sum + m.weight, 0), [selectedYMetrics]);


  // Placeholder for apply/recalculate logic
  const handleApplyConfiguration = () => {
    if (DEBUG_SCATTER_SCORE) {
      console.log("[ScatterScoreProPage] Applying configuration:", {
        template: activeTemplateName,
        xMetrics: selectedXMetrics,
        yMetrics: selectedYMetrics,
        xWeightTotal: xTotalWeight,
        yWeightTotal: yTotalWeight,
        zMetric: selectedZMetricKey,
        zScale,
        normalizationMode,
        imputationMode,
      });
    }
    // This will eventually trigger score calculation and chart update
    // For now, we can just log. The chart itself will react to changes in selectedX/Y/ZMetricKey
    // and the scoring will react to selectedX/YMetrics.
  };


  // UI for metric selection within an axis (reusable component or inline)
  const renderAxisMetricConfigurator = (
    axisTitle: string,
    selectedMetrics: AxisMetricConfig[],
    setSelectedMetrics: React.Dispatch<React.SetStateAction<AxisMetricConfig[]>>,
    totalWeight: number
  ) => {
    // TODO: Build UI for multi-selecting from `accessibleMetrics`
    // For each selected metric, show label, weight input, HLB toggle, remove button
    return (
      <Card className="p-4">
        <CardTitle className="text-md mb-3">{axisTitle}</CardTitle>
        {/* Multi-select component to choose from `accessibleMetrics` goes here */}
        <div className="text-xs text-muted-foreground mb-2">Select metrics from available list.</div>
        
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {selectedMetrics.map((sm) => {
            const metricDetail = allMetrics.find(m => m.key === sm.key);
            return (
              <div key={sm.key} className="p-2 border rounded-md bg-navy-700/50 border-navy-600">
                <div className="flex justify-between items-center mb-1">
                  <Label htmlFor={`weight-${axisTitle}-${sm.key}`} className="text-xs font-medium">{sm.metricLabel}</Label>
                  <Button variant="ghost" size="icon-xs" onClick={() => 
                      setSelectedMetrics(prev => prev.filter(m => m.key !== sm.key))
                  }>
                    <span className="text-red-500 text-xs">Remove</span>
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`weight-${axisTitle}-${sm.key}`}
                    type="number"
                    value={sm.weight}
                    onChange={(e) => {
                        const newWeight = parseInt(e.target.value, 10);
                        setSelectedMetrics(prev => prev.map(m => m.key === sm.key ? {...m, weight: isNaN(newWeight) ? 0 : Math.max(0,Math.min(100,newWeight))} : m));
                    }}
                    className="h-8 text-xs w-20"
                    min={0} max={100}
                  />
                  <Label htmlFor={`hlb-${axisTitle}-${sm.key}`} className="flex items-center text-xs gap-1 cursor-pointer">
                    <Checkbox
                      id={`hlb-${axisTitle}-${sm.key}`}
                      checked={sm.userHigherIsBetter}
                      onCheckedChange={(checked) => 
                        setSelectedMetrics(prev => prev.map(m => m.key === sm.key ? {...m, userHigherIsBetter: !!checked} : m))
                      }
                    />
                    Higher is Better?
                  </Label>
                </div>
              </div>
            );
          })}
        </div>
        <div className={cn("text-xs mt-2", totalWeight !== 100 ? "text-destructive" : "text-green-400")}>
            Total Weight: {totalWeight}% (Must be 100%)
        </div>
        {/* Button to trigger a modal to add metrics from accessibleMetrics */}
         <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => alert("Metric selection modal/UI to be implemented here.")}>
            Add/Remove Metrics for {axisTitle}
        </Button>
      </Card>
    );
  };


  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description="Configure multi-metric axes to generate custom scatter plots and scores."
    >
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Configuration Panel */}
        <Card className="lg:w-1/3 xl:w-1/4 p-4 space-y-4 overflow-y-auto bg-navy-700/30 border-navy-600">
          <h2 className="text-xl font-semibold mb-3 text-surface-white">Chart Configuration</h2>

          <div>
            <Label htmlFor="template-selector" className="text-xs font-medium">Load Template</Label>
            <Select value={activeTemplateName || ""} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template-selector" className="w-full mt-1">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_TEMPLATES.map(t => (
                  <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {renderAxisMetricConfigurator("X-Axis Score Metrics", selectedXMetrics, setSelectedXMetrics, xTotalWeight)}
          {renderAxisMetricConfigurator("Y-Axis Score Metrics", selectedYMetrics, setSelectedYMetrics, yTotalWeight)}

          <Card className="p-4">
            <CardTitle className="text-md mb-3">Z-Axis (Bubble Size)</CardTitle>
            <MetricSelector
                label="Metric for Bubble Size"
                selectedMetric={selectedZMetricKey}
                onMetricChange={setSelectedZMetricKey}
                currentTier={currentUserTier}
                filterForNumericOnly={true} // Assuming MetricSelector can filter
            />
            {selectedZMetricKey && <ScaleToggle scale={zScale} onChange={setZScale} label="Bubble Size Scale" />}
          </Card>

           <Card className="p-4">
            <CardTitle className="text-md mb-3">Scoring Settings</CardTitle>
            <div className="space-y-3">
                <div>
                    <Label htmlFor="norm-mode" className="text-xs font-medium">Normalization Mode</Label>
                    <Select value={normalizationMode} onValueChange={(val) => setNormalizationMode(val as NormalizationMode)}>
                        <SelectTrigger id="norm-mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="dataset_min_max">Dataset Min-Max</SelectItem>
                            <SelectItem value="global_min_max">Global Min-Max</SelectItem>
                            <SelectItem value="dataset_rank_percentile">Dataset Rank/Percentile</SelectItem>
                            <SelectItem value="dataset_z_score">Dataset Z-Score</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="impute-mode" className="text-xs font-medium">Imputation Mode (for missing values)</Label>
                    <Select value={imputationMode} onValueChange={(val) => setImputationMode(val as ImputationMode)}>
                        <SelectTrigger id="impute-mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="zero_worst">Zero / Worst Case</SelectItem>
                            <SelectItem value="dataset_mean">Dataset Mean</SelectItem>
                            <SelectItem value="dataset_median">Dataset Median</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </Card>

          <Button onClick={handleApplyConfiguration} className="w-full mt-4 bg-accent-teal hover:bg-accent-teal/90">
            <RefreshCw size={16} className="mr-2"/> Apply & Recalculate Scores
          </Button>
        </Card>

        {/* Chart Display Area */}
        <div className="flex-grow lg:w-2/3 xl:w-3/4 bg-navy-800/50 p-4 rounded-lg border border-navy-600">
          <p className="text-center text-gray-400">
            Scatter plot and score results will appear here. (Implementation in Mini PRD-SS-2 & SS-3)
          </p>
          {/* Placeholder for the scatter chart */}
        </div>
      </div>
    </PageContainer>
  );
}