// src/pages/filter/index.tsx
import React, { useMemo, useCallback, useEffect } from 'react'; // *** Added useEffect to the import ***
import { Info, Lock } from 'lucide-react'; // FilterX is no longer needed here
import { AnimatePresence, motion } from 'framer-motion';
import { useFilters } from '../../contexts/filter-context';
import { Button } from '../../components/ui/button'; // Still needed for StatusFilter
import { Card } from '../../components/ui/card';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { PageContainer } from '../../components/ui/page-container'; // PageContainer handles reset button
import { StatusBadge } from '../../components/status-badge';
import { PercentageRangeSlider } from '../../components/ui/percentage-range-slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import { TierBadge } from '../../components/ui/tier-badge';
// Ensure these imports are correct and the file exists/exports correctly
import { metrics, metricCategories, getAccessibleMetrics } from '../../lib/metric-types';
import type { MetricConfig, CompanyStatus, ColumnTier, MetricFormat } from '../../lib/types';
import { formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz, isValidNumber } from '../../lib/utils';

const FILTERABLE_STATUSES: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty', 'other'];

// StatusFilter Component (Should be complete as provided before)
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
    // --- Context and Readiness Check ---
    let contextValue: ReturnType<typeof useFilters> | null = null;
    let contextErrorState: string | null = null;
    try {
        contextValue = useFilters();
    } catch (e: any) {
        console.error("Error calling useFilters hook:", e);
        contextErrorState = e.message || "Failed to initialize filter context";
    }

    // Check essential context values/functions are present
    const isContextReady = contextValue &&
        typeof contextValue.resetFilters === 'function' &&
        typeof contextValue.setDevelopmentStatusFilter === 'function' &&
        typeof contextValue.setMetricRange === 'function' &&
        contextValue.filterSettings !== undefined; // Added a state check

    if (contextErrorState) {
        return <PageContainer title="Error"><div className='text-red-500 p-4'>Error loading filter context: {contextErrorState}</div></PageContainer>;
    }

    if (!isContextReady) {
        console.log("FilterPage: Context not ready yet, rendering loading state.");
        return <PageContainer title="Advanced Filters" description="Initializing filters..."><div className="p-4"><LoadingIndicator /></div></PageContainer>;
    }

    // --- Destructure values *after* ensuring context is ready ---
    const {
        filterSettings,
        setDevelopmentStatusFilter,
        setMetricRange,
        // resetFilters is used by PageContainer
        totalCount,
        metricFullRanges,
        loading, // Combined loading state
        loadingRanges,
        loadingFilteredSet,
        error,
        currentUserTier
    } = contextValue; // contextValue is guaranteed to be non-null here

    // --- Logic using context values ---
    const effectiveTier = currentUserTier;

    // DEBUGGING: Log the imported metrics value on component mount
    useEffect(() => {
        console.log("[FilterPage] Imported metrics on mount:", metrics);
        console.log("[FilterPage] Imported metricCategories on mount:", metricCategories);
    }, []); // Empty dependency array ensures this runs only once

    const accessibleMetrics = useMemo(() => {
        try {
            if (!Array.isArray(metrics)) {
                console.error("[FilterPage] 'metrics' imported from metric-types is not an array:", metrics);
                return [];
            }
            return getAccessibleMetrics(effectiveTier);
        }
        catch (e) { console.error("Error in getAccessibleMetrics:", e); return []; }
    }, [effectiveTier]); // Depends on effectiveTier which comes from currentUserTier

    const accessibleMetricDbColumns = useMemo(() => {
        try {
            if (!Array.isArray(accessibleMetrics)) {
                 console.error("[FilterPage] accessibleMetrics is not an array:", accessibleMetrics);
                 return new Set<string>();
            }
            return new Set(accessibleMetrics.map(m => m.db_column));
         }
        catch (e) { console.error("Error creating accessibleMetricDbColumns Set:", e); return new Set<string>(); }
    }, [accessibleMetrics]); // Depends on accessibleMetrics

    const formatDisplayValue = useCallback((value: number | null | undefined, format: MetricFormat | undefined, absoluteDefault: number) => {
        if (!isValidNumber(value)) return "-";
        const numValue = value as number;
        try {
            switch (format) {
                case 'currency': return formatCurrency ? formatCurrency(numValue, { compact: true, decimals: 1 }) : `$${numValue}`;
                case 'percent': return formatPercent ? formatPercent(numValue, 1) : `${numValue}%`;
                case 'moz': return formatMoz ? formatMoz(numValue, 2) : `${numValue} Moz`;
                case 'koz': return formatKoz ? formatKoz(numValue, 0) : `${numValue} koz`;
                case 'years': return formatNumber ? `${formatNumber(numValue, { decimals: 1 })} yrs` : `${numValue} yrs`;
                case 'ratio': return formatNumber ? formatNumber(numValue, { decimals: 2 }) : `${numValue}`;
                case 'number': default:
                    if (Math.abs(numValue) >= 1e6 && Intl?.NumberFormat) { return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(numValue); }
                    return formatNumber ? formatNumber(numValue, { decimals: 0 }) : `${numValue}`;
            }
        } catch (e) { console.error("Formatting error:", value, format, e); return String(numValue); }
    }, []); // Depends on formatNumber, formatCurrency etc. - assuming these are stable imports

    const metricsByCategory = useMemo(() => {
        const grouped: Record<string, MetricConfig[]> = {};
        // console.log("[FilterPage] Calculating metricsByCategory. Imported metrics type:", typeof metrics, "Is Array:", Array.isArray(metrics));
        try {
            if (!Array.isArray(metrics)) {
                console.error("[FilterPage] Cannot calculate metricsByCategory: 'metrics' is not an array.");
                return grouped; // Return empty object
            }
            // Ensure metrics have a category and a filterable format
            const filterableMetrics = metrics.filter(
                m => m && m.category && typeof m.format === 'string' &&
                ['number', 'currency', 'percent', 'moz', 'koz', 'ratio', 'years'].includes(m.format)
            );
            // console.log("[FilterPage] Filterable metrics count:", filterableMetrics.length);
            filterableMetrics.forEach(metric => {
                const category = metric.category!; // Safe due to filter above
                if (!grouped[category]) {
                    grouped[category] = [];
                }
                grouped[category].push(metric);
            });
        } catch (e) {
             console.error("Error processing metricsByCategory:", e);
        }
        // console.log("[FilterPage] Calculated metricsByCategory:", grouped);
        return grouped;
    }, []); // Dependency: relies on imported 'metrics' which is constant

    const descriptionText = loadingRanges || loadingFilteredSet ? "Loading filters/data..."
        : error ? "Error loading data"
        : `${totalCount ?? 0} companies match current filters`;

    return (
        <PageContainer
            title="Advanced Filters"
            description={descriptionText}
            // actions prop removed - reset button handled by PageContainer
        >
            <div className="space-y-4">
                {/* Status Filter Card */}
                <Card className="bg-card border p-4 md:col-span-2">
                    <StatusFilter
                        selectedStatuses={filterSettings?.developmentStatus || []}
                        onStatusChange={setDevelopmentStatusFilter}
                    />
                </Card>

                {/* Metric Filter Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Check if metricCategories exists and is an object */}
                    {metricCategories && typeof metricCategories === 'object' ?
                        Object.entries(metricCategories).map(([categoryKey, categoryLabel]) => {
                            // Check if metricsByCategory is calculated and has the key
                            const categoryMetrics = metricsByCategory?.[categoryKey as keyof typeof metricCategories] || [];

                           // console.log(`[FilterPage] Rendering category: ${categoryLabel}, Metrics count: ${categoryMetrics.length}`);

                            // Render category card only if there are metrics for it
                            if (categoryMetrics.length === 0) {
                                // console.log(`[FilterPage] Skipping empty category: ${categoryLabel}`);
                                return null;
                            }

                            return (
                                <Card key={categoryKey} className="bg-card border p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-card-foreground">{categoryLabel}</h2>
                                    </div>
                                    <div className="space-y-6">
                                        {categoryMetrics.map(metric => {
                                            if (!metric?.db_column || !metric.key) {
                                                console.warn("Skipping metric render due to missing db_column or key:", metric);
                                                return null;
                                            }
                                            const isAccessible = accessibleMetricDbColumns.has(metric.db_column);
                                            const fullRange = metricFullRanges?.[metric.db_column];
                                            const currentRange = filterSettings?.metricRanges?.[metric.db_column] || [null, null];
                                            const [absoluteMin, absoluteMax] = fullRange ?? [0, 0];
                                            const [currentMin, currentMax] = currentRange;
                                            const isRangeAvailable = fullRange !== undefined && !loadingRanges;

                                            return (
                                                <div key={metric.key} className="relative space-y-2">
                                                    {/* Label and Current Value Display */}
                                                    <div className="flex justify-between items-center gap-2 flex-wrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                                <span className={`text-sm font-medium cursor-help ${!isAccessible ? 'text-muted-foreground/60 line-through' : 'text-card-foreground'}`}>
                                                                    {metric.label} {metric.higherIsBetter === true ? (<span className="text-green-400/80">↑</span>) : metric.higherIsBetter === false ? (<span className="text-red-400/80">↓</span>) : null}
                                                                </span>
                                                            </TooltipTrigger><TooltipContent>{metric.description || "No description."}</TooltipContent></Tooltip></TooltipProvider>
                                                            {!isAccessible && <TierBadge tier={metric.tier} className="scale-90" />}
                                                        </div>
                                                        <div className={`text-xs ${!isRangeAvailable ? 'text-muted-foreground italic' : 'text-muted-foreground'}`}>
                                                            {isRangeAvailable ? `${formatDisplayValue(currentMin ?? absoluteMin, metric.format, absoluteMin)} - ${formatDisplayValue(currentMax ?? absoluteMax, metric.format, absoluteMax)}` : loadingRanges ? "(Loading Range...)" : "(Range N/A)"}
                                                        </div>
                                                    </div>
                                                    {/* Slider Area */}
                                                    <div className="relative pt-1 h-10">
                                                        {!isAccessible && (
                                                            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 p-2 text-center cursor-not-allowed">
                                                                <Lock className="h-6 w-6 text-primary/80 mb-2 flex-shrink-0" />
                                                                <TierBadge tier={metric.tier} />
                                                            </div>
                                                        )}
                                                        {isRangeAvailable ? (
                                                            <PercentageRangeSlider
                                                                key={metric.db_column}
                                                                fullRange={fullRange!} // Assert non-null
                                                                currentRange={currentRange}
                                                                onRangeChange={(min, max) => setMetricRange(metric.db_column, min, max)}
                                                                disabled={!isAccessible || loadingRanges}
                                                                className={!isAccessible || loadingRanges ? 'opacity-40' : ''}
                                                            />
                                                        ) : (
                                                            <div className="h-full bg-muted/30 rounded mt-1 flex items-center justify-center">
                                                                <span className="text-xs text-muted-foreground italic">
                                                                    {loadingRanges ? <LoadingIndicator size="sm" /> : "Range filter not available"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </Card>
                            );
                        })
                    : ( <div className="md:col-span-2 text-center text-muted-foreground p-4">Metric categories could not be loaded.</div> )
                    }
                </div>
            </div>

            {/* Global Loading/Error Overlay */}
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