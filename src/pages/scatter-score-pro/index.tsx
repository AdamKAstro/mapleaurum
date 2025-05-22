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
import { Label } from '../../components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { Info, Lock, ArrowUp, ArrowDown, Settings, RefreshCw, ListPlus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MetricSelector } from '../../components/metric-selector';
import {
  metrics as allMetrics, // Correctly import 'metrics' and alias it to 'allMetrics'
  metricCategories,
  getAccessibleMetrics,
  MetricConfig
} from '../../lib/metric-types';
import type { ColumnTier, NormalizationMode, ImputationMode } from '../../lib/types'; // Removed unused Currency import
import { cn, isValidNumber } from '../../lib/utils';

// Local Type Definitions
interface AxisMetricConfig {
  key: string; // MetricConfig.key
  metricLabel: string;
  weight: number; // Percentage 0-100
  userHigherIsBetter: boolean;
  originalHigherIsBetter: boolean; // From MetricConfig, for reference
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

// --- START: PRE-DEFINED TEMPLATES ---
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

// Simple ScaleToggle (can be moved to a shared UI component later)
const ScaleToggle: React.FC<{ scale: 'linear' | 'log'; onChange: (newScale: 'linear' | 'log') => void; label: string }> = ({ scale, onChange, label }) => (
    <div className="flex items-center gap-2 text-xs mt-1">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex bg-muted rounded-md p-0.5">
        <Button variant={scale === 'linear' ? 'secondary' : 'ghost'} size="xs" onClick={() => onChange('linear')} className={cn("px-2 py-0.5 h-7 text-xs", scale === 'linear' && "shadow-md")}>Linear</Button>
        <Button variant={scale === 'log' ? 'secondary' : 'ghost'} size="xs" onClick={() => onChange('log')} className={cn("px-2 py-0.5 h-7 text-xs", scale === 'log' && "shadow-md")}>Log</Button>
      </div>
    </div>
);

export function ScatterScoreProPage() {
  const { currentUserTier } = useFilters(); // Only need tier for accessibleMetrics
  // const { currency } = useCurrency(); // Not directly needed if scores are unitless and tooltips handle raw values

  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(
    PREDEFINED_TEMPLATES.length > 0 ? PREDEFINED_TEMPLATES[0].name : null
  );
  
  const [selectedXMetrics, setSelectedXMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedYMetrics, setSelectedYMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedZMetricKey, setSelectedZMetricKey] = useState<string | null>(null);
  const [zScale, setZScale] = useState<'linear' | 'log'>('log');
  
  const [normalizationMode, setNormalizationMode] = useState<NormalizationMode>('dataset_rank_percentile');
  const [imputationMode, setImputationMode] = useState<ImputationMode>('dataset_median');

  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(true); // Default open for desktop

  const accessibleMetrics = useMemo(() => getAccessibleMetrics(currentUserTier || 'free'), [currentUserTier]);

  const getMetricConfigDetails = useCallback((key: string): MetricConfig | undefined => {
    return allMetrics.find(m => m.key === key);
  }, []);

  const loadTemplate = useCallback((templateName: string | null) => {
    const template = PREDEFINED_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
      if (DEBUG_SCATTER_SCORE && templateName) console.warn(`[ScatterScoreProPage] Template '${templateName}' not found.`);
      const firstTemplate = PREDEFINED_TEMPLATES[0];
      if (!firstTemplate) {
        setSelectedXMetrics([]); setSelectedYMetrics([]); setSelectedZMetricKey(null);
        setActiveTemplateName(null);
        return;
      }
      // Fallback to loading the first template
      setActiveTemplateName(firstTemplate.name);
      templateName = firstTemplate.name; // Use the name of the first template for the rest of the logic
      // This recursive call might be problematic if firstTemplate is also somehow invalid.
      // A direct load of firstTemplate logic is safer:
      // loadTemplate(firstTemplate.name); // Be careful with recursion here
      // Instead, let's directly process the firstTemplate if current templateName fails
      if (!PREDEFINED_TEMPLATES.find(t => t.name === templateName)) return; // Guard if still no valid template
    }
    
    const currentTemplate = template || PREDEFINED_TEMPLATES[0]; // Use selected or first as fallback
    if (!currentTemplate) return; // Should not happen if PREDEFINED_TEMPLATES is not empty

    setActiveTemplateName(currentTemplate.name);

    const mapAndFilterMetrics = (configs: Array<{ key: string; weight: number; userHigherIsBetter?: boolean }>): AxisMetricConfig[] => {
      return configs
        .map(m => {
          const metricConfig = getMetricConfigDetails(m.key);
          if (!metricConfig) {
            if (DEBUG_SCATTER_SCORE) console.warn(`[ScatterScoreProPage] Metric config not found for key: ${m.key} in template '${currentTemplate.name}'`);
            return null;
          }
          if (!accessibleMetrics.some(am => am.key === m.key)) {
            if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Metric ${metricConfig.label} from template '${currentTemplate.name}' not accessible for tier ${currentUserTier}. Skipping.`);
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

    setSelectedXMetrics(mapAndFilterMetrics(currentTemplate.xMetricsConfig));
    setSelectedYMetrics(mapAndFilterMetrics(currentTemplate.yMetricsConfig));
    
    const zMetricIsAccessible = currentTemplate.zMetricKey ? accessibleMetrics.some(am => am.key === currentTemplate.zMetricKey) : true; // Allow null zMetricKey
    setSelectedZMetricKey(zMetricIsAccessible && currentTemplate.zMetricKey ? currentTemplate.zMetricKey : null);
    
    setZScale(currentTemplate.zScale || 'log');
    setNormalizationMode(currentTemplate.defaultNormalizationMode || 'dataset_rank_percentile');
    setImputationMode(currentTemplate.defaultImputationMode || 'dataset_median');

    if (DEBUG_SCATTER_SCORE) console.log(`[ScatterScoreProPage] Loaded template: ${currentTemplate.name}`);

  }, [accessibleMetrics, currentUserTier, getMetricConfigDetails]);

  useEffect(() => {
    if (PREDEFINED_TEMPLATES.length > 0 && !selectedXMetrics.length && !selectedYMetrics.length) { // Load default only if nothing is selected yet
        loadTemplate(PREDEFINED_TEMPLATES[0].name);
    }
  }, [loadTemplate, selectedXMetrics, selectedYMetrics]);


  const handleTemplateChange = (newTemplateName: string) => {
    loadTemplate(newTemplateName);
  };
  
  const handleAxisMetricChange = (
    axisType: 'X' | 'Y',
    metricKey: string,
    action: 'add' | 'remove' | 'updateWeight' | 'toggleHLB',
    value?: any // For weight or HLB boolean
  ) => {
    const setSelectedMetrics = axisType === 'X' ? setSelectedXMetrics : setSelectedYMetrics;
    setSelectedMetrics(prevMetrics => {
      let newMetrics = [...prevMetrics];
      const existingIndex = newMetrics.findIndex(m => m.key === metricKey);

      if (action === 'add') {
        if (existingIndex === -1) {
          const metricConfig = getMetricConfigDetails(metricKey);
          if (metricConfig) {
            newMetrics.push({
              key: metricKey,
              metricLabel: metricConfig.label,
              weight: 0, // Start with 0 weight, user needs to adjust sum to 100
              userHigherIsBetter: metricConfig.higherIsBetter,
              originalHigherIsBetter: metricConfig.higherIsBetter,
            });
          }
        }
      } else if (action === 'remove') {
        newMetrics = newMetrics.filter(m => m.key !== metricKey);
      } else if (existingIndex !== -1) {
        if (action === 'updateWeight') {
          const newWeight = Math.max(0, Math.min(100, Number(value) || 0));
          newMetrics[existingIndex] = { ...newMetrics[existingIndex], weight: newWeight };
        } else if (action === 'toggleHLB') {
          newMetrics[existingIndex] = { ...newMetrics[existingIndex], userHigherIsBetter: !!value };
        }
      }
      // Auto-normalize weights to sum to 100 if there are metrics
      if (newMetrics.length > 0) {
        const currentTotalWeight = newMetrics.reduce((sum, m) => sum + m.weight, 0);
        if (currentTotalWeight === 0 && newMetrics.length > 0) { // Initial add, distribute equally
            const equalWeight = Math.floor(100 / newMetrics.length);
            newMetrics = newMetrics.map(m => ({...m, weight: equalWeight}));
            let sum = newMetrics.reduce((s,m)=> s+m.weight, 0);
            if (newMetrics.length > 0 && sum !== 100) newMetrics[0].weight += (100-sum); // Adjust first to hit 100
        }
        // Note: More sophisticated auto-balancing when a weight changes might be needed,
        // or clear UI indication that total must be 100%. For now, this is a basic distribution on add.
      }
      return newMetrics;
    });
    setActiveTemplateName(null); // Switched to custom configuration
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
    if (selectedXMetrics.length > 0 && xTotalWeight !== 100) {
        alert("Total weight for X-Axis metrics must sum to 100%. Please adjust.");
        return;
    }
    if (selectedYMetrics.length > 0 && yTotalWeight !== 100) {
        alert("Total weight for Y-Axis metrics must sum to 100%. Please adjust.");
        return;
    }
    if (DEBUG_SCATTER_SCORE) console.log("[ScatterScoreProPage] Configuration applied. Score calculation and chart update would be triggered here.");
    // TODO: Implement actual score calculation and chart data update (Mini PRD-SS-2, SS-3)
  };

  const AxisMetricConfigurator: React.FC<{
    axisTitle: string;
    axisType: 'X' | 'Y';
    selectedMetrics: AxisMetricConfig[];
    setSelectedMetrics: React.Dispatch<React.SetStateAction<AxisMetricConfig[]>>;
    totalWeight: number;
  }> = ({ axisTitle, axisType, selectedMetrics, setSelectedMetrics, totalWeight }) => {
    return (
      <Card className="p-4 bg-navy-700/50 border-navy-600">
        <CardTitle className="text-md mb-3">{axisTitle}</CardTitle>
        <AvailableMetricsSelector
            axisLabel={axisType}
            onMetricSelect={(metricKey) => handleAxisMetricChange(axisType, metricKey, 'add')}
            currentSelectedKeys={selectedMetrics.map(m => m.key)}
            accessibleMetrics={accessibleMetrics} // Pass accessible metrics
        />
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 mt-2 scrollbar-thin scrollbar-thumb-navy-500 scrollbar-track-navy-800">
          {selectedMetrics.length === 0 && <p className="text-xs text-muted-foreground italic py-2">No metrics selected for this axis.</p>}
          {selectedMetrics.map((sm) => (
              <div key={sm.key} className="p-2 border rounded-md bg-navy-600/40 border-navy-500/70 space-y-1.5">
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
                            min={0} max={100}
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
                            <TooltipTrigger asChild>
                                <Info size={12} className="text-muted-foreground hover:text-accent-teal"/>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-xs">
                                <p>Check if a higher value of this metric should contribute positively to this axis's score. Uncheck if a lower value is better for this axis's theme. Default is based on the metric's general definition.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              </div>
            ))}
        </div>
        <div className={cn("text-xs mt-2 font-medium", totalWeight !== 100 && selectedMetrics.length > 0 ? "text-destructive" : totalWeight === 100 ? "text-green-400" : "text-muted-foreground")}>
            Total {axisType}-Axis Weight: {totalWeight}% {selectedMetrics.length > 0 && totalWeight !==100 && "(Must be 100%)"}
        </div>
      </Card>
    );
  };
  
  // Simplified metric selector for "Add Metric" functionality
  const AvailableMetricsSelector: React.FC<{
    axisLabel: 'X' | 'Y';
    onMetricSelect: (metricKey: string) => void;
    currentSelectedKeys: string[];
    accessibleMetrics: MetricConfig[];
  }> = ({ axisLabel, onMetricSelect, currentSelectedKeys, accessibleMetrics }) => {
    return (
      <div className="mb-3">
        <Select onValueChange={(value) => { if(value) onMetricSelect(value); }}>
          <SelectTrigger className="text-xs h-9 bg-navy-700 border-navy-600">
            <SelectValue placeholder={`Add Metric to ${axisLabel}-Axis...`} />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(metricCategories).map(([catKey, catLabel]) => {
                const metricsInCat = accessibleMetrics.filter(
                    m => m.category === catKey && !currentSelectedKeys.includes(m.key)
                );
                if (metricsInCat.length === 0) return null;
                return (
                    <React.Fragment key={catKey}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{catLabel}</div>
                        {metricsInCat.map(m => (
                            <SelectItem key={m.key} value={m.key} className="text-xs pl-4">
                                {m.label}
                            </SelectItem>
                        ))}
                    </React.Fragment>
                );
            })}
          </SelectContent>
        </Select>
      </div>
    );
  };


  return (
    <PageContainer
      title="Advanced ScatterScore Analysis"
      description="Configure multi-metric axes for custom scatter plots and derived scores."
    >
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 h-full overflow-hidden">
        {/* Configuration Panel */}
        <Button 
            onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)} 
            variant="outline" 
            className="lg:hidden fixed bottom-4 right-4 z-50 bg-navy-700 border-navy-600 p-2 h-auto"
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
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
                "flex-col lg:flex lg:sticky lg:top-[calc(var(--header-height,64px)+1.5rem)] space-y-4 overflow-y-auto bg-navy-800/60 border border-navy-700 backdrop-blur-md rounded-lg p-3 md:p-4 flex-shrink-0 lg:w-[400px] xl:w-[450px] scrollbar-thin scrollbar-thumb-navy-600 scrollbar-track-navy-700/50",
                "fixed inset-0 z-30 lg:relative lg:inset-auto lg:h-[calc(100vh-var(--header-height,64px)-3rem)]" // Fullscreen on mobile, sticky on desktop
            )}
        >
            <div className="flex justify-between items-center mb-1">
                <h2 className="text-xl font-semibold text-surface-white">Chart Configuration</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsConfigPanelOpen(false)} className="lg:hidden text-muted-foreground hover:text-surface-white">
                    <X size={20}/>
                </Button>
            </div>
          
            <div>
              <Label htmlFor="template-selector" className="text-xs font-semibold text-muted-foreground block mb-1">Load Template</Label>
              <Select value={activeTemplateName || ""} onValueChange={handleTemplateChange}>
                <SelectTrigger id="template-selector" className="w-full h-9 text-xs bg-navy-700 border-navy-600">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_TEMPLATES.map(t => (
                    <SelectItem key={t.name} value={t.name} className="text-xs">
                        {t.name} 
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info size={12} className="inline ml-2 text-muted-foreground opacity-50"/>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs max-w-xs p-2">
                                    <p>{t.description}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {renderAxisMetricConfigurator("X-Axis Score Metrics", selectedXMetrics, (updater) => handleAxisMetricChange('X', '', 'updateWeight', updater), xTotalWeight)}
            {renderAxisMetricConfigurator("Y-Axis Score Metrics", selectedYMetrics, (updater) => handleAxisMetricChange('Y', '', 'updateWeight', updater), yTotalWeight)}

            <Card className="p-4 bg-navy-700/50 border-navy-600">
              <CardTitle className="text-md mb-2">Z-Axis (Bubble Size)</CardTitle>
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
            </Card>

            <Card className="p-4 bg-navy-700/50 border-navy-600">
              <CardTitle className="text-md mb-2">Scoring Settings</CardTitle>
              <div className="space-y-3">
                  <div>
                      <Label htmlFor="norm-mode" className="text-xs font-medium text-muted-foreground">Normalization Mode</Label>
                      <Select value={normalizationMode} onValueChange={(val) => setNormalizationMode(val as NormalizationMode)}>
                          <SelectTrigger id="norm-mode" className="h-9 text-xs bg-navy-700 border-navy-600 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
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
                          <SelectContent>
                              <SelectItem value="zero_worst" className="text-xs">Zero / Worst Case</SelectItem>
                              <SelectItem value="dataset_mean" className="text-xs">Dataset Mean</SelectItem>
                              <SelectItem value="dataset_median" className="text-xs">Dataset Median</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
            </Card>

            <Button onClick={handleApplyConfiguration} className="w-full mt-3 bg-accent-teal hover:bg-accent-teal/90 text-sm font-semibold py-2.5">
              <RefreshCw size={16} className="mr-2"/> Apply & Plot Scores
            </Button>
        </motion.div>

        {/* Chart Display Area */}
        <div className="flex-grow bg-navy-800/30 p-4 rounded-lg border border-navy-700 backdrop-blur-sm flex items-center justify-center min-h-[400px] lg:min-h-0"> {/* Ensure min-h for mobile */}
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

// It's good practice to define component-specific types or interfaces near the component
// or in a dedicated types file for that feature if it grows complex.