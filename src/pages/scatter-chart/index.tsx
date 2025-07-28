// src/pages/scatter-chart/index.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
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
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { PageContainer } from '../../components/ui/page-container';
import { FeatureAccess } from '../../components/ui/feature-access';

// Register Chart.js components and plugins
ChartJS.register(LinearScale, LogarithmicScale, PointElement, Tooltip, Legend, zoomPlugin, gradient, ChartDataLabels);

// Bubble color styling
const statusColors: Record<string, { background: string; border: string }> = {
    producer: { background: 'rgba(34,197,94,0.7)', border: 'rgb(12,163,74)' },
    developer: { background: 'rgba(59,130,246,0.7)', border: 'rgb(37,99,195)' },
    explorer: { background: 'rgba(168,85,247,0.7)', border: 'rgb(147,51,194)' },
    royalty: { background: 'rgba(244,162,97,0.7)', border: 'rgb(217,119,6)' },
    default: { background: 'rgba(107,114,128,0.7)', border: 'rgb(75,85,99)' }
};

const chartSettingsFunctions = {
    pointRadius: (n: number): number => 6 + (Math.max(0, Math.min(1, n || 0)) * 35),
    pointHoverRadius: (n: number): number => 8 + (Math.max(0, Math.min(1, n || 0)) * 48)
};

const EMPTY_COMPANY_ARRAY: Company[] = [];

// --- Child Components with selected styles ---

const MetricSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  currentTier: ColumnTier;
}> = ({ value, onChange, label, currentTier }) => {
  const accessibleMetrics = getAccessibleMetrics(currentTier);
  const groupedMetrics = accessibleMetrics.reduce((acc, metric) => {
    const category = metric.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, MetricConfig[]>);

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-300">{label}:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-56 text-xs bg-navy-800 border border-navy-600 rounded-full px-4 py-2 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all hover:bg-navy-700"
      >
        {Object.entries(groupedMetrics).map(([category, metricsInCategory]) => (
          <optgroup key={category} label={category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}>
            {metricsInCategory.map((config) => (
              <option key={config.nested_path} value={config.nested_path}>
                {config.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};

function ScaleToggle({ scale, onChange, label }: { scale: 'linear' | 'log', onChange: (scale: 'linear' | 'log') => void, label: string }) {
    return (
        <div className="flex items-center gap-2 text-xs">
            <span className="text-surface-white/70">{label}:</span>
            <div className="flex items-center gap-4">
                <button
                    className={cn("text-xs font-semibold transition-colors pb-0.5", scale === 'linear' ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-400 hover:text-white")}
                    onClick={() => onChange('linear')}
                >
                    Linear
                </button>
                <button
                    className={cn("text-xs font-semibold transition-colors pb-0.5", scale === 'log' ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-400 hover:text-white")}
                    onClick={() => onChange('log')}
                >
                    Log
                </button>
            </div>
        </div>
    );
}

// --- Main Page Component ---

export function ScatterChartPage() {
    const {
        currentUserTier,
        activeCompanyIds,
        loadingFilteredSet,
        error: contextError,
        fetchCompaniesByIds,
    } = useFilters();
    const { currency } = useCurrency();

    const [chartCompanyData, setChartCompanyData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
    const [isChartDataLoading, setIsChartDataLoading] = useState<boolean>(false);

    const [xMetric, setXMetric] = useState('financials.market_cap_value');
    const [yMetric, setYMetric] = useState('mineral_estimates.reserves_total_aueq_moz');
    const [zMetric, setZMetric] = useState('financials.market_cap_value');
    const [xScale, setXScale] = useState<'linear' | 'log'>('log');
    const [yScale, setYScale] = useState<'linear' | 'log'>('log');
    const [zScale, setZScale] = useState<'linear' | 'log'>('log');

    const chartRef = useRef<ChartJS<'scatter', (number | ScatterDataPoint | null)[], unknown> | null>(null);

    // Fetch real company data based on active filters
    useEffect(() => {
        let isMounted = true;
        const fetchDataForChart = async () => {
            if (!loadingFilteredSet && activeCompanyIds && activeCompanyIds.length > 0) {
                setIsChartDataLoading(true);
                setChartCompanyData(EMPTY_COMPANY_ARRAY);
                try {
                    const data = await fetchCompaniesByIds(activeCompanyIds);
                    if (isMounted) {
                        setChartCompanyData(Array.isArray(data) ? data : EMPTY_COMPANY_ARRAY);
                    }
                } catch (e) {
                    console.error("[ScatterChart] Error fetching data:", e);
                    if (isMounted) setChartCompanyData(EMPTY_COMPANY_ARRAY);
                } finally {
                    if (isMounted) setIsChartDataLoading(false);
                }
            } else if (!loadingFilteredSet && isMounted) {
                setChartCompanyData(EMPTY_COMPANY_ARRAY);
            }
        };
        fetchDataForChart();
        return () => { isMounted = false; };
    }, [activeCompanyIds, loadingFilteredSet, fetchCompaniesByIds]);

    const xMetricConfig = useMemo(() => getMetricByKey(xMetric), [xMetric]);
    const yMetricConfig = useMemo(() => getMetricByKey(yMetric), [yMetric]);
    const zMetricConfig = useMemo(() => getMetricByKey(zMetric), [zMetric]);

    const chartDatasets = useMemo(() => {
        if (isChartDataLoading || !chartCompanyData.length || !xMetricConfig || !yMetricConfig || !zMetricConfig) {
            return [];
        }
        const points = chartCompanyData
            .map(c => ({
                x: getNestedValue(c, xMetricConfig.nested_path),
                y: getNestedValue(c, yMetricConfig.nested_path),
                z: getNestedValue(c, zMetricConfig.nested_path),
                company: c
            }))
            .filter(p =>
                isValidNumber(p.x) && isValidNumber(p.y) && isValidNumber(p.z) &&
                (xScale !== 'log' || (p.x ?? 0) > 0) &&
                (yScale !== 'log' || (p.y ?? 0) > 0) &&
                (zScale !== 'log' || (p.z ?? 0) > 0)
            );
        if (points.length === 0) return [];
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
                    borderWidth: 1, hoverBorderWidth: 2,
                    datalabels: {
                        color: '#F8FAFC', font: { size: 9, weight: '500' },
                        display: (ctx: DataLabelsContext) => ((ctx.dataset?.data?.[ctx.dataIndex] as any)?.r_normalized ?? 0) > 0.15,
                        formatter: (_v: any, ctx: DataLabelsContext) => (ctx.chart.data.datasets[ctx.datasetIndex]?.data?.[ctx.dataIndex] as any)?.company?.tsx_code || null
                    }
                };
            }
            acc[status].data.push({ x: point.x as number, y: point.y as number, r_normalized: normalizedZ[i] ?? 0, company: point.company });
            return acc;
        }, {} as Record<string, any>);
        return Object.values(groupedPoints);
    }, [chartCompanyData, isChartDataLoading, xMetricConfig, yMetricConfig, zMetricConfig, xScale, yScale, zScale]);

    const chartOptions = useMemo((): ChartOptions<'scatter'> => ({
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        elements: { point: {
            radius: (c: ScriptableContext<'scatter'>) => chartSettingsFunctions.pointRadius((c.raw as any)?.r_normalized ?? 0),
            hoverRadius: (c: ScriptableContext<'scatter'>) => chartSettingsFunctions.pointHoverRadius((c.raw as any)?.r_normalized ?? 0),
        }},
        scales: {
            x: { type: xScale === 'log' ? 'logarithmic' : 'linear', title: { display: true, text: xMetricConfig?.label ? `${xMetricConfig.label}${xScale === 'log' ? ' (Log)' : ''}` : 'X Axis', color: '#94A3B8', font: { size: 12 } }, ticks: { color: '#64748B', font: { size: 9 }, callback: (v) => formatValueWrapper(v as number, xMetricConfig?.format, currency), maxTicksLimit: 8 }, grid: { color: 'rgba(51,65,85,0.2)' } },
            y: { type: yScale === 'log' ? 'logarithmic' : 'linear', title: { display: true, text: yMetricConfig?.label ? `${yMetricConfig.label}${yScale === 'log' ? ' (Log)' : ''}` : 'Y Axis', color: '#94A3B8', font: { size: 12 } }, ticks: { color: '#64748B', font: { size: 9 }, callback: (v) => formatValueWrapper(v as number, yMetricConfig?.format, currency), maxTicksLimit: 8 }, grid: { color: 'rgba(51,65,85,0.2)' } }
        },
        plugins: {
            legend: { position: 'bottom', labels: { color: '#CBD5E1', usePointStyle: true, pointStyle: 'circle', padding: 20, font: { size: 11 } } },
            tooltip: {
                enabled: true, backgroundColor: 'rgba(15,23,42,0.9)', titleColor: '#5EEAD4', bodyColor: '#E2E8F0',
                borderColor: 'rgba(51,65,85,0.7)', borderWidth: 1, padding: 10,
                callbacks: {
                    label: (ctx: any) => {
                        const dp = ctx.raw as any;
                        if (!dp?.company) return '';
                        const lines = [` ${dp.company.company_name} (${dp.company.tsx_code || 'N/A'})`];
                        if (xMetricConfig) lines.push(` ${xMetricConfig.label}: ${formatValueWrapper(dp.x, xMetricConfig.format, currency)}`);
                        if (yMetricConfig) lines.push(` ${yMetricConfig.label}: ${formatValueWrapper(dp.y, yMetricConfig.format, currency)}`);
                        if (zMetricConfig) {
                            const originalZ = getNestedValue(dp.company, zMetricConfig.nested_path);
                            lines.push(` ${zMetricConfig.label}: ${formatValueWrapper(originalZ, zMetricConfig.format, currency)}`);
                        }
                        return lines;
                    }
                }
            },
            zoom: { pan: { enabled: true, mode: 'xy' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' } },
            datalabels: { display: false }
        }
    }), [xScale, yScale, xMetricConfig, yMetricConfig, zMetricConfig, currency]);

    const handleResetZoom = useCallback(() => { chartRef.current?.resetZoom(); }, []);
    const isLoading = loadingFilteredSet || isChartDataLoading;
    const chartMessage = useMemo(() => {
        if (isLoading) return "Loading company data...";
        if (contextError) return `Error: ${contextError}`;
        if (!activeCompanyIds || activeCompanyIds.length === 0) return "No companies selected. Please adjust filters to see data.";
        if (chartCompanyData.length > 0 && chartDatasets.length === 0) return "No valid data points for the selected metrics. Try a linear scale or different metrics.";
        return null;
    }, [isLoading, contextError, activeCompanyIds, chartCompanyData, chartDatasets]);

    return (
        <PageContainer
            title="Scatter Analysis"
            description={isLoading ? "Loading..." : `Comparing ${activeCompanyIds.length} companies`}
            className="flex flex-col h-[calc(100vh-4rem)]"
            contentClassName="flex-1 flex flex-col min-h-0"
        >
            <div className="flex-shrink-0 bg-navy-400/10 p-3 rounded-lg mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <FeatureAccess requiredTier={xMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                            <div className="flex items-center gap-4">
                                <MetricSelector label="X" value={xMetric} onChange={setXMetric} currentTier={currentUserTier} />
                                <ScaleToggle scale={xScale} onChange={setXScale} label="Scale" />
                            </div>
                        </FeatureAccess>
                        <FeatureAccess requiredTier={yMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                            <div className="flex items-center gap-4">
                                <MetricSelector label="Y" value={yMetric} onChange={setYMetric} currentTier={currentUserTier} />
                                <ScaleToggle scale={yScale} onChange={setYScale} label="Scale" />
                            </div>
                        </FeatureAccess>
                        <FeatureAccess requiredTier={zMetricConfig?.tier ?? 'free'} currentTier={currentUserTier}>
                             <div className="flex items-center gap-4">
                                <MetricSelector label="Size" value={zMetric} onChange={setZMetric} currentTier={currentUserTier} />
                                <ScaleToggle scale={zScale} onChange={setZScale} label="Scale" />
                            </div>
                        </FeatureAccess>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon-sm" onClick={() => chartRef.current?.zoom(1.2)} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon-sm" onClick={() => chartRef.current?.zoom(0.8)} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon-sm" onClick={handleResetZoom} title="Reset Zoom"><RotateCcw className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>

            <div className="relative bg-navy-800/70 backdrop-blur-sm rounded-lg shadow-lg border border-navy-700/50 flex-grow min-h-0">
                {chartMessage ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                        {isLoading && !contextError ? <LoadingIndicator message={chartMessage} /> : <p>{chartMessage}</p>}
                    </div>
                ) : (
                    <Scatter
                        key={`${xScale}-${yScale}`}
                        ref={chartRef}
                        data={{ datasets: chartDatasets }}
                        options={chartOptions}
                    />
                )}
            </div>
        </PageContainer>
    );
}