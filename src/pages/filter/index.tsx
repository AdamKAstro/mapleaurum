// src/pages/filter/index.tsx
import React, { useMemo, useCallback, useEffect } from 'react';
import { Info, Lock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFilters } from '../../contexts/filter-context';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { PageContainer } from '../../components/ui/page-container';
import { StatusBadge } from '../../components/status-badge';
import { PercentageRangeSlider } from '../../components/ui/percentage-range-slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { TierBadge } from '../../components/ui/tier-badge';
import { metrics as allMetricsFromTypes, metricCategories, getAccessibleMetrics, MetricConfig } from '../../lib/metric-types';
import type { CompanyStatus, ColumnTier, MetricFormat } from '../../lib/types';
import { formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz, isValidNumber, cn } from '../../lib/utils';

const FILTERABLE_STATUSES: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty', 'other'];

// StatusFilter Component (remains unchanged from your provided version)
function StatusFilter({ selectedStatuses, onStatusChange }: { selectedStatuses: CompanyStatus[]; onStatusChange: (statuses: CompanyStatus[]) => void; }) {
  const statusesToDisplay = FILTERABLE_STATUSES;
  const handleClear = useCallback(() => onStatusChange([]), [onStatusChange]);
  const handleToggle = useCallback((status: CompanyStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    onStatusChange(newStatuses);
  }, [selectedStatuses, onStatusChange]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-card-foreground">Development Status</h3>
      <div className="flex flex-wrap gap-2">
        {statusesToDisplay.map(status => (
          <button key={status} onClick={() => handleToggle(status)} className="transition-transform active:scale-95" aria-pressed={selectedStatuses.includes(status)}>
            <StatusBadge status={status} className={`transition-opacity ${!selectedStatuses.includes(status) ? 'opacity-50 hover:opacity-75' : 'opacity-100 ring-2 ring-offset-2 ring-offset-card ring-primary/50'}`} />
          </button>
        ))}
      </div>
      <Button variant="link" size="sm" onClick={handleClear} className="text-xs h-auto p-0 text-primary/80 hover:text-primary disabled:text-muted-foreground/50 disabled:no-underline" disabled={selectedStatuses.length === 0}>
        Clear Statuses
      </Button>
    </div>
  );
}

export function FilterPage() {
  let contextValue: ReturnType<typeof useFilters> | null = null;
  let contextErrorState: string | null = null;
  try {
    contextValue = useFilters();
  } catch (e: any) {
    console.error("[FilterPage] CRITICAL: Error calling useFilters hook:", e);
    contextErrorState = e.message || "Failed to initialize filter context. Ensure FilterProvider wraps this component.";
  }

  if (contextErrorState) {
    return <PageContainer title="Error"><div className='text-red-500 p-4'>Error loading filter context: {contextErrorState}</div></PageContainer>;
  }

  if (!contextValue || !contextValue.filterSettings || !contextValue.metricFullRanges) {
    if (process.env.NODE_ENV === 'development') {
        console.log("[FilterPage][DEBUG] Context not fully ready yet (contextValue, filterSettings, or metricFullRanges missing), rendering loading state.");
    }
    return <PageContainer title="Advanced Filters" description="Initializing filters..."><div className="p-4"><LoadingIndicator /></div></PageContainer>;
  }

  const {
    filterSettings,
    setDevelopmentStatusFilter,
    setMetricRange,
    totalCount,
    metricFullRanges,
    loadingRanges,
    loadingFilteredSet,
    error,
    currentUserTier
  } = contextValue;

  const effectiveTier = currentUserTier || 'free';

  const accessibleMetrics = useMemo(() => {
    try {
      if (!Array.isArray(allMetricsFromTypes)) {
        console.error("[FilterPage] 'allMetricsFromTypes' imported from metric-types is not an array:", allMetricsFromTypes);
        return [];
      }
      return getAccessibleMetrics(effectiveTier);
    }
    catch (e) { console.error("[FilterPage] Error in getAccessibleMetrics:", e); return []; }
  }, [effectiveTier]);

  const accessibleMetricDbColumns = useMemo(() => {
    try {
      if (!Array.isArray(accessibleMetrics)) {
        console.error("[FilterPage] accessibleMetrics is not an array:", accessibleMetrics);
        return new Set<string>();
      }
      return new Set(accessibleMetrics.map(m => m.db_column));
    }
    catch (e) { console.error("[FilterPage] Error creating accessibleMetricDbColumns Set:", e); return new Set<string>(); }
  }, [accessibleMetrics]);

  const formatDisplayValue = useCallback((value: number | null | undefined, format: MetricFormat | undefined) => {
    if (!isValidNumber(value)) return "-";
    const numValue = value as number;
    try {
      switch (format) {
        case 'currency': return formatCurrency ? formatCurrency(numValue, { compact: true, decimals: 1 }) : `$${numValue.toFixed(1)}`;
        case 'percent': return formatPercent ? formatPercent(numValue, 1) : `${(numValue * 100).toFixed(1)}%`;
        case 'moz': return formatMoz ? formatMoz(numValue, 2) : `${numValue.toFixed(2)} Moz`;
        case 'koz': return formatKoz ? formatKoz(numValue, 0) : `${Math.round(numValue)} koz`;
        case 'years': return formatNumber ? `${formatNumber(numValue, { decimals: 1 })} yrs` : `${numValue.toFixed(1)} yrs`;
        case 'ratio': return formatNumber ? formatNumber(numValue, { decimals: 2 }) : `${numValue.toFixed(2)}`;
        case 'compact':
            if (formatNumber) {
                 if (Math.abs(numValue) >= 1000) { // General compacting for >1000
                     return formatNumber(numValue, { compact: true, decimals: (Math.abs(numValue) >= 10000 && Math.abs(numValue) < 1000000) ? 1 : 0 });
                 } // For values < 1000 but potentially decimal
                 return formatNumber(numValue, { decimals: (Math.abs(numValue) < 10 && numValue !== 0 && !Number.isInteger(numValue)) ? 2 : 0 });
            }
            return String(numValue); // Fallback
        case 'decimal':
            return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue.toFixed(2));
        case 'number': default:
          if (formatNumber) {
            if (Math.abs(numValue) >= 1000000) return formatNumber(numValue, { compact: true, decimals: 1, compactDisplay: 'short' });
            if (Math.abs(numValue) >= 1000) return formatNumber(numValue, { compact: true, decimals: 0, compactDisplay: 'short' });
            return formatNumber(numValue, { decimals: Number.isInteger(numValue) ? 0 : 2 });
          }
          return String(Number.isInteger(numValue) ? numValue : numValue.toFixed(2));
      }
    } catch (e) { 
        console.error("[FilterPage] Formatting error in formatDisplayValue:", {value, format, error: e}); 
        return String(value); // Fallback to string representation of original value
    }
  }, [formatCurrency, formatPercent, formatMoz, formatKoz, formatNumber]); // Added all format utils to dependency array

  const metricsByCategory = useMemo(() => {
    const grouped: Record<string, MetricConfig[]> = {};
    if (!Array.isArray(allMetricsFromTypes)) {
      console.error("[FilterPage] Cannot calculate metricsByCategory: 'allMetricsFromTypes' is not an array (metric-types.ts).");
      return grouped;
    }
    // Filter for metrics that are numeric and suitable for range sliders
    const filterableMetrics = allMetricsFromTypes.filter(
      m => m && m.category && typeof m.format === 'string' &&
      ['number', 'currency', 'percent', 'moz', 'koz', 'ratio', 'years', 'compact', 'decimal'].includes(m.format)
    );

    filterableMetrics.forEach(metric => {
      const category = metric.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(metric);
    });

    // Sort metrics within each category alphabetically by label
    for (const catKey in grouped) {
        grouped[catKey].sort((a, b) => a.label.localeCompare(b.label));
    }
    return grouped;
  }, []); // allMetricsFromTypes is imported and considered stable

  const descriptionText = loadingRanges || loadingFilteredSet ? "Loading filters & company data..."
    : error ? `Error: ${error}`
    : `${totalCount ?? 0} companies match current filters (before client-side exclusions)`;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("[FilterPage][DEBUG] Status Update: EffectiveTier:", effectiveTier, "AccessibleMetrics Count:", accessibleMetrics.length, "MetricRanges Loaded:", !loadingRanges, "FilteredSet (IDs) Loaded:", !loadingFilteredSet);
      if(Object.keys(metricFullRanges).length < 5 && !loadingRanges) { // Log if few ranges loaded
          console.log("[FilterPage][DEBUG] Small number of metricFullRanges loaded:", metricFullRanges);
      }
      // console.log("[FilterPage][DEBUG] Current FilterSettings:", filterSettings); // Can be very verbose
    }
  }, [effectiveTier, accessibleMetrics.length, loadingRanges, loadingFilteredSet, metricFullRanges, filterSettings]);

  return (
    <PageContainer
      title="Advanced Company Filters"
      description={descriptionText}
    >
      <div className="space-y-6"> {/* Increased base spacing */}
        <Card className="bg-card border p-4 md:p-6"> {/* Consistent padding */}
          <StatusFilter
            selectedStatuses={filterSettings?.developmentStatus || []}
            onStatusChange={setDevelopmentStatusFilter}
          />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Increased gap */}
          {metricCategories && typeof metricCategories === 'object' ?
            Object.entries(metricCategories)
              .sort(([keyA, labelA_unused], [keyB, labelB_unused]) => { // Sort categories by their display label from metricCategories
                  const labelA = metricCategories[keyA as MetricCategory] || keyA;
                  const labelB = metricCategories[keyB as MetricCategory] || keyB;
                  return labelA.localeCompare(labelB);
              })
              .map(([categoryKey, categoryLabel]) => {
              const categoryMetrics = metricsByCategory?.[categoryKey as MetricCategory] || [];
              if (categoryMetrics.length === 0) {
                return null; // Don't render card for empty/inaccessible categories
              }

              return (
                <Card key={categoryKey} className="bg-card border p-4 md:p-6 space-y-4"> {/* Consistent padding */}
                  <CardHeader className="p-0 mb-3 -mt-1"> {/* Adjusted spacing */}
                    <CardTitle className="text-lg font-semibold text-card-foreground">{categoryLabel}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="space-y-6">
                      {categoryMetrics.map(metric => {
                        // Basic check for essential metric properties
                        if (!metric?.db_column || !metric.key || !metric.format) {
                          if (process.env.NODE_ENV === 'development') {
                            console.warn("[FilterPage][DEBUG] Skipping metric render due to missing db_column, key, or format:", metric);
                          }
                          return null;
                        }
                        const isAccessible = accessibleMetricDbColumns.has(metric.db_column);
                        const fullRange = metricFullRanges?.[metric.db_column];
                        const currentRange = filterSettings?.metricRanges?.[metric.db_column] || [null, null];
                        
                        // Determine absolute min/max for the slider, defaulting if range not loaded/valid
                        const [absoluteMin, absoluteMax] = (fullRange && isValidNumber(fullRange[0]) && isValidNumber(fullRange[1])) 
                                                            ? fullRange 
                                                            : [0, 100]; // Fallback range for slider if API range is bad/missing
                        
                        const [currentMin, currentMax] = currentRange;
                        
                        const isRangeDataActuallyLoaded = metricFullRanges.hasOwnProperty(metric.db_column) && !loadingRanges;
                        const isRangeValidForSlider = isRangeDataActuallyLoaded && fullRange && isValidNumber(fullRange[0]) && isValidNumber(fullRange[1]);
                        
                        if (process.env.NODE_ENV === 'development' && metric.db_column === 'f_peg_ratio') { // Example specific debug
                             console.log(`[FilterPage][DEBUG] Metric: ${metric.label} (${metric.db_column}) | Accessible: ${isAccessible} | FullRange: ${JSON.stringify(fullRange)} | CurrentRange: ${JSON.stringify(currentRange)} | RangeDataLoaded: ${isRangeDataActuallyLoaded} | RangeValidForSlider: ${isRangeValidForSlider}`);
                        }

                        return (
                          <div key={metric.key} className="relative space-y-2">
                            <div className="flex justify-between items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                  <span className={cn(`text-sm font-medium cursor-help`, !isAccessible ? 'text-muted-foreground/60 line-through' : 'text-card-foreground')}>
                                    {metric.label} {metric.higherIsBetter === true ? (<span className="text-green-500">↑</span>) : metric.higherIsBetter === false ? (<span className="text-red-500">↓</span>) : null}
                                  </span>
                                </TooltipTrigger><TooltipContent><p className="max-w-xs text-xs p-2">{metric.description || "No description."}</p></TooltipContent></Tooltip></TooltipProvider>
                                {!isAccessible && <TierBadge tier={metric.tier} className="scale-90" />}
                              </div>
                              <div className={cn(`text-xs min-w-[100px] text-right`, (!isRangeValidForSlider && !isAccessible) ? 'text-muted-foreground/60 italic' : 'text-muted-foreground')}>
                                {isRangeValidForSlider ? `${formatDisplayValue(currentMin ?? absoluteMin, metric.format)} - ${formatDisplayValue(currentMax ?? absoluteMax, metric.format)}` 
                                  : loadingRanges ? "(Loading...)" 
                                  : isRangeDataActuallyLoaded ? "(N/A)" 
                                  : "(Pending)"
                                }
                              </div>
                            </div>
                            <div className="relative pt-1 h-10"> {/* Ensure consistent height for slider area */}
                              {!isAccessible && (
                                <div className="absolute inset-0 bg-card/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 p-2 text-center cursor-not-allowed">
                                  <Lock className="h-5 w-5 text-primary/80 mb-1 flex-shrink-0" />
                                  <TierBadge tier={metric.tier} />
                                </div>
                              )}
                              {isRangeValidForSlider ? (
                                <PercentageRangeSlider
                                  key={metric.db_column} 
                                  metricIdentifier={metric.db_column}
                                  fullRange={fullRange!} 
                                  currentRange={currentRange}
                                  onRangeChange={(min, max) => setMetricRange(metric.db_column, min, max)}
                                  disabled={!isAccessible || loadingRanges} 
                                  className={cn((!isAccessible || loadingRanges) && 'opacity-40')} // pointer-events-none handled by disabled
                                  metricFormat={metric.format}
                                  percentageStep={0.1} // Finer step for percentage slider
                                />
                              ) : (
                                <div className="h-8 bg-muted/30 rounded mt-1 flex items-center justify-center"> {/* Adjusted height to match slider */}
                                  <span className="text-xs text-muted-foreground italic">
                                    {loadingRanges ? <LoadingIndicator size="sm" message="" /> : 
                                     isRangeDataActuallyLoaded && (!isValidNumber(fullRange?.[0]) || !isValidNumber(fullRange?.[1])) ? "No data for range" :
                                     "Range unavailable"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
            : ( <div className="md:col-span-2 text-center text-muted-foreground p-4">Metric categories could not be loaded. Or no filterable metrics defined.</div> )
          }
        </div>
      </div>

      <AnimatePresence>
        {(loadingFilteredSet && !error) && (
          <motion.div key="loadingOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <LoadingIndicator message="Applying filters..." />
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg z-50" role="alert">
          <p className="text-sm font-medium">Error:</p>
          <p className="text-xs">{error}</p>
        </div>
      )}
    </PageContainer>
  );
}