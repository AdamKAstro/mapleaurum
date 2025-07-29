// src/pages/scatter-chart/index.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Chart as ChartJS, LinearScale, PointElement, LogarithmicScale, Tooltip, Legend, ChartOptions, ScatterDataPoint, ScriptableContext, ChartComponentLike } from 'chart.js';
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
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { PageContainer } from '../../components/ui/page-container';
import { FeatureAccess } from '../../components/ui/feature-access';

// --- Chart.js Registration ---
const chartPlugins: ChartComponentLike[] = [LinearScale, LogarithmicScale, PointElement, Tooltip, Legend, zoomPlugin, gradient, ChartDataLabels];
ChartJS.register(...chartPlugins);

// --- Constants & Types ---
type ScaleType = 'linear' | 'logarithmic';

const EMPTY_COMPANY_ARRAY: Company[] = [];
const NON_LOG_METRICS = ['percent_gold', 'percent_silver', 'f_trailing_pe', 'f_forward_pe', 'f_peg_ratio', 'shareprice'];

const statusColors: Record<string, { background: string; border: string }> = {
    producer: { background: 'rgba(34,197,94,0.7)', border: 'rgb(12,163,74)' },
    developer: { background: 'rgba(59,130,246,0.7)', border: 'rgb(37,99,195)' },
    explorer: { background: 'rgba(168,85,247,0.7)', border: 'rgb(147,51,194)' },
    royalty: { background: 'rgba(244,162,97,0.7)', border: 'rgb(217,119,6)' },
    default: { background: 'rgba(107,114,128,0.7)', border: 'rgb(75,85,99)' }
};

const chartSettingsFunctions = {
    pointRadius: (n: number): number => 3 + (Math.max(0, Math.min(1, n || 0)) * 32),
    pointHoverRadius: (n: number): number => 6 + (Math.max(0, Math.min(1, n || 0)) * 37)
};

// --- Helper Components & Functions ---
function getCompanyValue(company: Company, metricConfig: MetricConfig): any {
    if (metricConfig.nested_path) {
        return getNestedValue(company, metricConfig.nested_path);
    }
    return (company as any)[metricConfig.key] ?? null;
}

function MetricSelector({ label, selectedMetric, onMetricChange, currentTier }: { label: string; selectedMetric: string; onMetricChange: (key: string) => void; currentTier: ColumnTier; }) {
    const accessibleMetrics = getAccessibleMetrics(currentTier);
    const groupedMetrics = useMemo(() => accessibleMetrics.reduce((acc, metric) => {
        const category = metric.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(metric);
        return acc;
    }, {} as Record<string, MetricConfig[]>), [accessibleMetrics]);

    return (
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-300 whitespace-nowrap">{label}:</label>
            <select
                value={selectedMetric}
                onChange={(e) => onMetricChange(e.target.value)}
                className="w-full text-xs bg-navy-700 border border-navy-600 rounded-full px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-colors hover:bg-navy-600 appearance-none"
            >
                {Object.entries(groupedMetrics).map(([category, metricsInCategory]) => (
                    <optgroup key={category} label={category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
                        {metricsInCategory.map((config) => (
                            <option key={config.key} value={config.key}>
                                {config.label}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
        </div>
    );
}

function ScaleToggle({ scale, onChange }: { scale: ScaleType, onChange: (scale: ScaleType) => void; }) {
    return (
        <div className="flex items-center gap-4 text-xs">
            <button
                className={cn("font-semibold transition-colors pb-0.5", scale === 'linear' ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-400 hover:text-white")}
                onClick={() => onChange('linear')}
            >
                Linear
            </button>
            <button
                className={cn("font-semibold transition-colors pb-0.5", scale === 'logarithmic' ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-400 hover:text-white")}
                onClick={() => onChange('logarithmic')}
            >
                Log
            </button>
        </div>
    );
}

function getMetricLabelWithArrow(metric: MetricConfig | undefined): string {
    if (!metric) return '';
    const arrow = metric.higherIsBetter === true ? '↑' : metric.higherIsBetter === false ? '↓' : '';
    return `${metric.label} ${arrow}`.trim();
}

// --- Main Chart Page Component ---
export function ScatterChartPage() {
    const { currentUserTier, activeCompanyIds, loadingFilteredSet, error: contextError, fetchCompaniesByIds } = useFilters();
    const { currency } = useCurrency();

    const [chartCompanyData, setChartCompanyData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
    const [isChartDataLoading, setIsChartDataLoading] = useState<boolean>(false);

    const [xMetric, setXMetric] = useState('financials.market_cap_value');
    const [yMetric, setYMetric] = useState('mineral_estimates.reserves_total_aueq_moz');
    const [zMetric, setZMetric] = useState('financials.market_cap_value');

    const [xScale, setXScale] = useState<ScaleType>('logarithmic');
    const [yScale, setYScale] = useState<ScaleType>('logarithmic');
    const [zScale, setZScale] = useState<ScaleType>('logarithmic');

    const chartRef = useRef<ChartJS<'scatter'>>();
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Effects ---
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (!loadingFilteredSet && activeCompanyIds && activeCompanyIds.length > 0) {
                setIsChartDataLoading(true);
                try {
                    const data = await fetchCompaniesByIds(activeCompanyIds);
                    if (isMounted) setChartCompanyData(Array.isArray(data) ? data : EMPTY_COMPANY_ARRAY);
                } catch (e) {
                    console.error("[ScatterChart] Error fetching data:", e);
                    if (isMounted) setChartCompanyData(EMPTY_COMPANY_ARRAY);
                } finally {
                    if (isMounted) setIsChartDataLoading(false);
                }
            } else if (!loadingFilteredSet) {
                setChartCompanyData(EMPTY_COMPANY_ARRAY);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [activeCompanyIds, loadingFilteredSet, fetchCompaniesByIds]);

    useEffect(() => {
        const config = getMetricByKey(xMetric);
        if (config && NON_LOG_METRICS.includes(config.key) && xScale === 'logarithmic') setXScale('linear');
    }, [xMetric, xScale]);

    useEffect(() => {
        const config = getMetricByKey(yMetric);
        if (config && NON_LOG_METRICS.includes(config.key) && yScale === 'logarithmic') setYScale('linear');
    }, [yMetric, yScale]);

    useEffect(() => {
        const config = getMetricByKey(zMetric);
        if (config && NON_LOG_METRICS.includes(config.key) && zScale === 'logarithmic') setZScale('linear');
    }, [zMetric, zScale]);

    // --- Memoized Calculations ---
    const metricConfigs = useMemo(() => ({
        x: getMetricByKey(xMetric),
        y: getMetricByKey(yMetric),
        z: getMetricByKey(zMetric),
    }), [xMetric, yMetric, zMetric]);

    const chartDatasets = useMemo(() => {
        if (isChartDataLoading || !chartCompanyData.length || !metricConfigs.x || !metricConfigs.y || !metricConfigs.z) {
            return [];
        }

        const points = chartCompanyData
            .map(c => ({
                x: getCompanyValue(c, metricConfigs.x!),
                y: getCompanyValue(c, metricConfigs.y!),
                z: getCompanyValue(c, metricConfigs.z!),
                company: c
            }))
            .filter(p => {
                // Ensure valid numbers for x, y, z and positive values for log scales
                if (!isValidNumber(p.x) || !isValidNumber(p.y) || !isValidNumber(p.z)) return false;
                if (xScale === 'logarithmic' && p.x <= 0) return false;
                if (yScale === 'logarithmic' && p.y <= 0) return false;
                if (zScale === 'logarithmic' && p.z <= 0) return false;
                // ZERO FILTER: Exclude points where z is exactly 0 for %gold or %silver when used as size metric
                if (metricConfigs.z?.key === 'percent_gold' && p.z === 0) return false;
                if (metricConfigs.z?.key === 'percent_silver' && p.z === 0) return false;
                return true;
            });

        if (points.length === 0) return [];

        const zValues = points.map(p => p.z as number);
        const normalizedZ = normalizeValues(zValues, zScale);

        return Object.values(points.reduce((acc, point, i) => {
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
                        font: { size: 9, weight: '500' },
                        textAlign: 'center',
                        display: (ctx: DataLabelsContext) => ((ctx.dataset?.data?.[ctx.dataIndex] as any)?.r_normalized ?? 0) > 0.1,
                        formatter: (_v: any, ctx: DataLabelsContext) => {
                            const dp = ctx.chart.data.datasets[ctx.datasetIndex]?.data?.[ctx.dataIndex] as any;
                            return dp?.company?.tsx_code || '';
                        }
                    }
                };
            }
            acc[status].data.push({ x: point.x as number, y: point.y as number, r_normalized: normalizedZ[i] ?? 0, company: point.company });
            return acc;
        }, {} as Record<string, any>));
    }, [chartCompanyData, isChartDataLoading, metricConfigs, xScale, yScale, zScale]);

    const chartOptions = useMemo((): ChartOptions<'scatter'> => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        aspectRatio: 1.2,
        elements: {
            point: {
                radius: (c) => chartSettingsFunctions.pointRadius((c.raw as any)?.r_normalized ?? 0),
                hoverRadius: (c) => chartSettingsFunctions.pointHoverRadius((c.raw as any)?.r_normalized ?? 0),
            }
        },
        scales: {
            x: {
                type: xScale,
                title: { display: true, text: getMetricLabelWithArrow(metricConfigs.x), color: '#94A3B8', font: { size: 12 } },
                ticks: { color: '#64748B', font: { size: 9 }, maxTicksLimit: 8, callback: (v) => formatValueWrapper(typeof v === 'number' ? v : NaN, metricConfigs.x?.format, currency, metricConfigs.x?.key) },
                grid: { color: 'rgba(51,65,85,0.2)' }
            },
            y: {
                type: yScale,
                title: { display: true, text: getMetricLabelWithArrow(metricConfigs.y), color: '#94A3B8', font: { size: 12 } },
                ticks: { color: '#64748B', font: { size: 9 }, maxTicksLimit: 8, callback: (v) => formatValueWrapper(typeof v === 'number' ? v : NaN, metricConfigs.y?.format, currency, metricConfigs.y?.key) },
                grid: { color: 'rgba(51,65,85,0.2)' }
            }
        },
        plugins: {
            legend: { position: 'bottom', labels: { color: '#CBD5E1', usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 11 } } },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(15,23,42,0.9)',
                titleColor: '#5EEAD4',
                bodyColor: '#E2E8F0',
                borderColor: 'rgba(51,65,85,0.7)',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: (ctx) => {
                        const dp = ctx.raw as any;
                        if (!dp?.company) return '';
                        const lines = [` ${dp.company.company_name} (${dp.company.tsx_code || 'N/A'})`];
                        if (metricConfigs.x) lines.push(` ${getMetricLabelWithArrow(metricConfigs.x)}: ${formatValueWrapper(dp.x, metricConfigs.x.format, currency, metricConfigs.x.key)}`);
                        if (metricConfigs.y) lines.push(` ${getMetricLabelWithArrow(metricConfigs.y)}: ${formatValueWrapper(dp.y, metricConfigs.y.format, currency, metricConfigs.y.key)}`);
                        if (metricConfigs.z) {
                            const zValue = getCompanyValue(dp.company, metricConfigs.z);
                            lines.push(` ${getMetricLabelWithArrow(metricConfigs.z)}: ${formatValueWrapper(zValue, metricConfigs.z.format, currency, metricConfigs.z.key)}`);
                        }
                        return lines;
                    }
                }
            },
            zoom: { pan: { enabled: true, mode: 'xy' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' } },
            datalabels: { display: false }
        }
    }), [metricConfigs, xScale, yScale, currency]);

    // --- Handlers and Derived State ---
    const handleResetZoom = useCallback(() => { chartRef.current?.resetZoom(); }, []);
    const isLoading = loadingFilteredSet || isChartDataLoading;
    const descriptionText = isLoading ? "Loading chart data..." : `Comparing ${activeCompanyIds?.length ?? 0} companies`;
    const chartMessage = useMemo(() => {
        if (isLoading) return "Loading chart data...";
        if (contextError) return `Error: ${contextError.message || 'An unknown error occurred.'}`;
        if (!activeCompanyIds || activeCompanyIds.length === 0) return "No companies match the current filters.";
        if (!isChartDataLoading && chartCompanyData.length > 0 && chartDatasets.length === 0) return "No valid data points for the selected metrics. Try different metrics or scales.";
        return null;
    }, [isLoading, contextError, activeCompanyIds, chartCompanyData, chartDatasets]);

    // --- Render ---
    return (
        <PageContainer title="Scatter Analysis" description={descriptionText} className="flex flex-col flex-grow">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-x-6 gap-y-4 bg-navy-400/10 p-4 rounded-lg flex-shrink-0">
                <div className="flex flex-col md:flex-row gap-x-6 gap-y-4 flex-grow">
                    <FeatureAccess requiredTier={metricConfigs.x?.tier ?? 'free'} currentTier={currentUserTier} className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                            <MetricSelector label="X" selectedMetric={xMetric} onMetricChange={setXMetric} currentTier={currentUserTier} />
                            <ScaleToggle scale={xScale} onChange={setXScale} />
                        </div>
                    </FeatureAccess>
                    <FeatureAccess requiredTier={metricConfigs.y?.tier ?? 'free'} currentTier={currentUserTier} className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                            <MetricSelector label="Y" selectedMetric={yMetric} onMetricChange={setYMetric} currentTier={currentUserTier} />
                            <ScaleToggle scale={yScale} onChange={setYScale} />
                        </div>
                    </FeatureAccess>
                    <FeatureAccess requiredTier={metricConfigs.z?.tier ?? 'free'} currentTier={currentUserTier} className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                            <MetricSelector label="Size" selectedMetric={zMetric} onMetricChange={setZMetric} currentTier={currentUserTier} />
                            <ScaleToggle scale={zScale} onChange={setZScale} />
                        </div>
                    </FeatureAccess>
                </div>
                <div className="flex items-center gap-1.5 self-start md:self-center">
                    <Button variant="outline" size="icon-sm" onClick={() => chartRef.current?.zoom(1.2)} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon-sm" onClick={() => chartRef.current?.zoom(0.8)} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon-sm" onClick={handleResetZoom} title="Reset Zoom"><RotateCcw className="h-4 w-4" /></Button>
                </div>
            </div>

            <div className="relative bg-navy-800/70 backdrop-blur-sm rounded-lg p-4 mt-4 shadow-lg border border-navy-700/50 flex flex-col flex-grow min-h-0">
                <div className="flex-grow min-h-[600px]" ref={containerRef}>
                    {chartMessage ? (
                        <div className="h-full flex items-center justify-center">
                            {isLoading && !contextError ? <LoadingIndicator message={chartMessage} /> : <p className="text-gray-400 text-center">{chartMessage}</p>}
                        </div>
                    ) : containerRef.current ? (
                        <Scatter
                            key={`${xScale}-${yScale}-${zScale}-${xMetric}-${yMetric}-${zMetric}-${activeCompanyIds?.join(',')}`}
                            ref={chartRef}
                            data={{ datasets: chartDatasets }}
                            options={chartOptions}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-600">Initializing chart...</div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}