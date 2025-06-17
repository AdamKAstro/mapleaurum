// src/pages/scatter-chart/index.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Download, Settings, ZoomIn, ZoomOut, RotateCcw, Lock } from 'lucide-react';
import { Chart as ChartJS, LinearScale, PointElement, LogarithmicScale, Tooltip, Legend, ChartOptions, ScatterDataPoint, ScriptableContext } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import gradient from 'chartjs-plugin-gradient';
import ChartDataLabels, { Context as DataLabelsContext } from 'chartjs-plugin-datalabels';

import { useFilters } from '../../contexts/filter-context';
import { useCurrency } from '../../contexts/currency-context';

import { cn, getNestedValue, isValidNumber } from '../../lib/utils';
import { getMetricByKey, getAccessibleMetrics, MetricConfig } from '../../lib/metric-types';
import { normalizeValues, formatValueWrapper } from './chartUtils';
import type { Company, ColumnTier, Currency } from '../../lib/types';

import { Button } from '../../components/ui/button';
import { MetricSelector } from '../../components/metric-selector';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { PageContainer } from '../../components/ui/page-container';
import { FeatureAccess } from '../../components/ui/feature-access';

ChartJS.register(LinearScale, LogarithmicScale, PointElement, Tooltip, Legend, zoomPlugin, gradient, ChartDataLabels);

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
const EMPTY_COMPANY_ARRAY: Company[] = [];

function ScaleToggle({ scale, onChange, label }: { scale: 'linear' | 'log', onChange: (scale: 'linear' | 'log') => void, label: string }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-surface-white/70">{label}:</span>
            <div className="flex bg-navy-400/20 rounded-lg overflow-hidden p-0.5 gap-0.5">
                <button
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                        scale === 'linear' ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30" : "text-surface-white/70 hover:bg-navy-400/30"
                    )}
                    onClick={() => onChange('linear')}
                    aria-pressed={scale === 'linear'}
                >
                    Linear
                </button>
                <button
                    className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                        scale === 'log' ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30" : "text-surface-white/70 hover:bg-navy-400/30"
                    )}
                    onClick={() => onChange('log')}
                    aria-pressed={scale === 'log'}
                >
                    Log
                </button>
            </div>
        </div>
    );
}

export function ScatterChartPage() {
    const {
        currentUserTier,
        // OLD: filteredCompanyIds,
        activeCompanyIds, // NEW: Use activeCompanyIds for the final set
        loadingFilteredSet,
        error: contextError,
        fetchCompaniesByIds,
        totalCount,
        excludedCompanyIds
    } = useFilters();
    const { currency } = useCurrency();

    const [chartCompanyData, setChartCompanyData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
    const [isChartDataLoading, setIsChartDataLoading] = useState<boolean>(false);

    const [xMetric, setXMetric] = useState('financials.market_cap_value');
    const [yMetric, setYMetric] = useState('financials.market_cap_value');
    const [zMetric, setZMetric] = useState('financials.market_cap_value');
    const [xScale, setXScale] = useState<'linear' | 'log'>('log');
    const [yScale, setYScale] = useState<'linear' | 'log'>('log');
    const [zScale, setZScale] = useState<'linear' | 'log'>('linear');

    const chartRef = useRef<ChartJS<'scatter', (number | ScatterDataPoint | null)[], unknown> | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const chart = chartRef.current;
        return () => {
            if (chart) {
                console.log("[ScatterChart] Destroying chart instance.");
                chart.destroy();
                chartRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fetchDataForChart = async () => {
            // Use activeCompanyIds to determine which companies to fetch
            if (!loadingFilteredSet && activeCompanyIds && activeCompanyIds.length > 0) {
                setIsChartDataLoading(true);
                setChartCompanyData(EMPTY_COMPANY_ARRAY);
                try {
                    console.log(`[ScatterChart] Fetching company details for ${activeCompanyIds.length} IDs.`);
                    const data = await fetchCompaniesByIds(activeCompanyIds); // Changed to activeCompanyIds
                    if (isMounted) {
                        setChartCompanyData(Array.isArray(data) ? data : EMPTY_COMPANY_ARRAY);
                        console.log(`[ScatterChart] Received data for ${Array.isArray(data) ? data.length : 0} companies.`);
                    }
                } catch (e) {
                    console.error("[ScatterChart] Error in fetchDataForChart:", e);
                    if (isMounted) setChartCompanyData(EMPTY_COMPANY_ARRAY);
                } finally {
                    if (isMounted) setIsChartDataLoading(false);
                }
            } else if (!loadingFilteredSet && isMounted && chartCompanyData.length > 0) {
                console.log("[ScatterChart] No active IDs or context loading, clearing chart data.");
                setChartCompanyData(EMPTY_COMPANY_ARRAY);
            }
        };
        fetchDataForChart();
        // Dependency changed from filteredCompanyIds to activeCompanyIds
    }, [activeCompanyIds, loadingFilteredSet, fetchCompaniesByIds]);

    const accessibleMetrics = useMemo(() => getAccessibleMetrics(currentUserTier), [currentUserTier]);
    const xMetricConfig = useMemo(() => getMetricByKey(xMetric), [xMetric]);
    const yMetricConfig = useMemo(() => getMetricByKey(yMetric), [yMetric]);
    const zMetricConfig = useMemo(() => getMetricByKey(zMetric), [zMetric]);

    useEffect(() => {
        console.log("[ScatterChart DEBUG] Tier or Metric Change Detected:");
        console.log("  currentUserTier:", currentUserTier);
        console.log("  xMetric:", xMetric, "Config Tier:", xMetricConfig?.tier, "Accessible via getAccessibleMetrics:", xMetricConfig ? accessibleMetrics.some(m => m.key === xMetricConfig.key) : 'N/A');
        console.log("  yMetric:", yMetric, "Config Tier:", yMetricConfig?.tier, "Accessible via getAccessibleMetrics:", yMetricConfig ? accessibleMetrics.some(m => m.key === yMetricConfig.key) : 'N/A');
        console.log("  zMetric:", zMetric, "Config Tier:", zMetricConfig?.tier, "Accessible via getAccessibleMetrics:", zMetricConfig ? accessibleMetrics.some(m => m.key === zMetricConfig.key) : 'N/A');
    }, [currentUserTier, xMetric, yMetric, zMetric, xMetricConfig, yMetricConfig, zMetricConfig, accessibleMetrics]);

    const chartDatasets = useMemo(() => {
        if (!Array.isArray(chartCompanyData)) {
            console.warn("[ScatterChart] chartCompanyData not an array. Value:", chartCompanyData);
            return [];
        }
        // No need to filter by excludedCompanyIds here, as chartCompanyData already contains only active companies
        const includedCompanies = chartCompanyData;

        if (isChartDataLoading || !includedCompanies.length || !xMetricConfig?.nested_path || !yMetricConfig?.nested_path || !zMetricConfig?.nested_path) {
            return [];
        }

        const points = includedCompanies
            .map(c => ({
                x: getNestedValue(c, xMetricConfig.nested_path),
                y: getNestedValue(c, yMetricConfig.nested_path),
                z: getNestedValue(c, zMetricConfig.nested_path),
                company: c
            }))
            .filter(p =>
                isValidNumber(p.x) && isValidNumber(p.y) && isValidNumber(p.z) &&
                (xScale !== 'log' || (typeof p.x === 'number' && p.x > 0)) &&
                (yScale !== 'log' || (typeof p.y === 'number' && p.y > 0)) &&
                (zScale !== 'log' || (typeof p.z === 'number' && p.z > 0))
            );

        if (points.length === 0) {
            console.log("[ScatterChart] No valid points after filtering.");
            return [];
        }
        const zValues = points.map(p => p.z as number);
        const normalizedZ = normalizeValues(zValues, zScale);

        const groupedPoints = points.reduce((acc, point, i) => {
            const status = point.company.status?.toLowerCase() || 'default';
            if (!acc[status]) {
                acc[status] = {
                    label: status.charAt(0).toUpperCase() + status.slice(1),
                    data: [],
                    backgroundColor: statusColors[status]?.background || statusColors.default.background,
                    borderColor: statusColors[status]?.border || statusColors.default.border,
                    borderWidth: 1,
                    hoverBorderWidth: 2,
                    datalabels: {
                        backgroundColor: 'rgba(30,41,59,0.75)',
                        borderRadius: 3,
                        padding: { top: 2, bottom: 1, left: 4, right: 4 },
                        color: '#F8FAFC',
                        font: { size: 9, weight: '500', family: "'Inter', sans-serif" },
                        textAlign: 'center',
                        anchor: 'center',
                        align: 'center',
                        offset: 0,
                        clamp: true,
                        display: (ctx: DataLabelsContext) => ((ctx.dataset?.data?.[ctx.dataIndex] as any)?.r_normalized ?? 0) > 0.1,
                        formatter: (_v: any, ctx: DataLabelsContext) => {
                            const dp = ctx.chart.data.datasets[ctx.datasetIndex]?.data?.[ctx.dataIndex] as any;
                            return dp?.company?.tsx_code || null;
                        }
                    }
                };
            }
            acc[status].data.push({
                x: point.x as number,
                y: point.y as number,
                r_normalized: normalizedZ[i] ?? 0,
                company: point.company
            });
            return acc;
        }, {} as Record<string, any>);
        return Object.values(groupedPoints);
    }, [chartCompanyData, isChartDataLoading, xMetricConfig, yMetricConfig, zMetricConfig, xScale, yScale, zScale]);

    const chartOptions = useMemo((): ChartOptions<'scatter'> => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        elements: {
            point: {
                radius: (c: ScriptableContext<'scatter'>) => chartSettingsFunctions.pointRadius((c.raw as any)?.r_normalized ?? 0),
                hoverRadius: (c: ScriptableContext<'scatter'>) => chartSettingsFunctions.pointHoverRadius((c.raw as any)?.r_normalized ?? 0),
                hitRadius: 5,
                hoverBorderWidth: 2,
            }
        },
        scales: {
            x: {
                type: xScale === 'log' ? 'logarithmic' : 'linear',
                position: 'bottom',
                title: {
                    display: true,
                    text: xMetricConfig?.label ? `${xMetricConfig.label}${xScale === 'log' ? ' (Log)' : ''}` : 'X Axis',
                    color: '#94A3B8',
                    font: { size: 12 }
                },
                ticks: {
                    color: '#64748B',
                    font: { size: 9 },
                    callback: (v) => formatValueWrapper(typeof v === 'number' ? v : NaN, xMetricConfig?.format, currency as Currency),
                    maxTicksLimit: 8,
                    autoSkipPadding: 15
                },
                grid: { color: 'rgba(51,65,85,0.2)', borderColor: 'rgba(51,65,85,0.5)' }
            },
            y: {
                type: yScale === 'log' ? 'logarithmic' : 'linear',
                position: 'left',
                title: {
                    display: true,
                    text: yMetricConfig?.label ? `${yMetricConfig.label}${yScale === 'log' ? ' (Log)' : ''}` : 'Y Axis',
                    color: '#94A3B8',
                    font: { size: 12 }
                },
                ticks: {
                    color: '#64748B',
                    font: { size: 9 },
                    callback: (v) => formatValueWrapper(typeof v === 'number' ? v : NaN, yMetricConfig?.format, currency as Currency),
                    maxTicksLimit: 8,
                    autoSkipPadding: 15
                },
                grid: { color: 'rgba(51,65,85,0.2)', borderColor: 'rgba(51,65,85,0.5)' }
            }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#CBD5E1', usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 11 } }
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
                    label: (ctx: any) => {
                        const dp = ctx.raw as any;
                        if (!dp || !dp.company) return '';
                        const company = dp.company as Company;
                        const lines = [` ${company.company_name} (${company.tsx_code || 'N/A'})`];
                        if (xMetricConfig) lines.push(` ${xMetricConfig.label}: ${formatValueWrapper(dp.x, xMetricConfig.format, currency as Currency)}`);
                        if (yMetricConfig) lines.push(` ${yMetricConfig.label}: ${formatValueWrapper(dp.y, yMetricConfig.format, currency as Currency)}`);
                        if (zMetricConfig) {
                            const originalZ = getNestedValue(company, zMetricConfig.nested_path);
                            lines.push(` ${zMetricConfig.label}: ${formatValueWrapper(originalZ, zMetricConfig.format, currency as Currency)}`);
                        }
                        return lines;
                    }
                }
            },
            zoom: {
                pan: { enabled: true, mode: 'xy', threshold: 5 },
                zoom: { wheel: { enabled: true, speed: 0.1 }, pinch: { enabled: true }, mode: 'xy' }
            },
            datalabels: { display: false }
        }
    }), [xScale, yScale, xMetricConfig, yMetricConfig, zMetricConfig, currency]);

    const handleZoomIn = useCallback(() => { chartRef.current?.zoom(1.2); }, []);
    const handleZoomOut = useCallback(() => { chartRef.current?.zoom(0.8); }, []);
    const handleResetZoom = useCallback(() => { chartRef.current?.resetZoom(); }, []);

    const pageActions = (<></>);
    // Effective count should now be derived from the activeCompanyIds directly
    const effectiveCount = activeCompanyIds?.length ?? 0; // Changed to use activeCompanyIds.length
    const isLoading = loadingFilteredSet || isChartDataLoading;
    const descriptionText = isLoading
        ? "Loading chart data..."
        : contextError
        ? "Error loading chart data"
        : `Comparing ${isNaN(effectiveCount) ? 0 : effectiveCount} companies based on filters`;

    const getChartMessage = () => {
        if (isLoading) return "Loading chart data...";
        if (contextError) return `Error: ${contextError}`;
        if (!activeCompanyIds || activeCompanyIds.length === 0) return "No companies match the current filters or selection."; // Updated message
        if (!isChartDataLoading && chartCompanyData.length === 0 && activeCompanyIds.length > 0) return "Could not load company details for the chart.";
        if (!isChartDataLoading && chartDatasets.length === 0 && chartCompanyData.length > 0) return "No valid data points for the selected metrics/scales. (Check data availability or try linear scale)";
        return null;
    };
    const chartMessage = getChartMessage();

    return (
        <PageContainer
            title="Scatter Analysis"
            description={descriptionText}
            actions={pageActions}
            className="relative isolate flex flex-col flex-grow"
            contentClassName="flex flex-col flex-grow min-h-0"
        >
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
                style={{ backgroundImage: "url('/Background2.jpg')" }}
                aria-hidden="true"
            />
            <div className="space-y-6 relative z-0 flex flex-col flex-grow min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start bg-navy-400/10 p-4 rounded-lg flex-shrink-0">
                    <FeatureAccess requiredTier={xMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                        <div className="space-y-2">
                            <MetricSelector
                                label="X Axis"
                                selectedMetric={xMetric}
                                onMetricChange={setXMetric}
                                currentTier={currentUserTier}
                            />
                            <ScaleToggle scale={xScale} onChange={setXScale} label="X Scale" />
                        </div>
                    </FeatureAccess>
                    <FeatureAccess requiredTier={yMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                        <div className="space-y-2">
                            <MetricSelector
                                label="Y Axis"
                                selectedMetric={yMetric}
                                onMetricChange={setYMetric}
                                currentTier={currentUserTier}
                            />
                            <ScaleToggle scale={yScale} onChange={setYScale} label="Y Scale" />
                        </div>
                    </FeatureAccess>
                    <FeatureAccess requiredTier={zMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                        <div className="space-y-2">
                            <MetricSelector
                                label="Bubble Size"
                                selectedMetric={zMetric}
                                onMetricChange={setZMetric}
                                currentTier={currentUserTier}
                            />
                            <ScaleToggle scale={zScale} onChange={setZScale} label="Size Scale" />
                        </div>
                    </FeatureAccess>
                </div>
                <div className="relative bg-navy-800/70 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-navy-700/50 flex flex-col flex-grow min-h-0">
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
                    <div className="flex-grow min-h-[400px] sm:min-h-[500px]" ref={containerRef}>
                        {chartMessage ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                                {isLoading && !contextError ? (
                                    <LoadingIndicator message={chartMessage} />
                                ) : (
                                    <p>{chartMessage}</p>
                                )}
                            </div>
                        ) : containerRef.current ? (
                            <Scatter ref={chartRef} data={{ datasets: chartDatasets }} options={chartOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-600">
                                Initializing chart...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
