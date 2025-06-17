// src/pages/scatter-score-pro/hooks/useScatterScoreChart.ts
import { useMemo } from 'react';
import type { ChartOptions, ScriptableContext } from 'chart.js';
import type { Context as DataLabelsContext } from 'chartjs-plugin-datalabels';
import type { Currency } from '../../../lib/types';
import type { MetricConfig } from '../../../lib/metric-types';
import type {
  ScatterScorePlotPoint,
  ScatterScorePlotPointData,
  AxisMetricConfig,
  StatusColors,
  ChartSettings,
  TemplateConfig
} from '../types';
import { isValidNumber, toTitleCase } from '../../../lib/utils';
// import { normalizeValues as normalizeZValuesForChart, formatValueWrapper } from '../../scatter-chart/chartUtils'; // NO LONGER NEEDED HERE for Z-normalization
import { formatValueWrapper } from '../../scatter-chart/chartUtils'; // Keep only formatValueWrapper
import { CHART_COLORS, DEBUG_SCATTER_SCORE } from '../constants';

interface UseScatterScoreChartProps {
  plotData: ScatterScorePlotPoint[];
  isCalculatingScores: boolean;
  selectedXMetrics: AxisMetricConfig[];
  selectedYMetrics: AxisMetricConfig[];
  selectedZMetricKey: string | null;
  zScale: 'linear' | 'log';
  currentTemplateConfig: TemplateConfig;
  getMetricConfigDetails: (key: string) => MetricConfig | undefined;
  selectedDisplayCurrency: Currency;
  statusColors: StatusColors;
  chartSettings: ChartSettings;
}

interface UseScatterScoreChartReturn {
  chartDatasets: any[]; // Consider a more specific type if possible later
  chartOptions: ChartOptions<'scatter'>;
}

// Constants for better maintainability
const MIN_LABEL_DISPLAY_RADIUS = 0.1;
const LABEL_FONT_SIZE = 9;
const AXIS_TITLE_FONT_SIZE = 13;
const AXIS_TICK_FONT_SIZE = 10;
const LEGEND_FONT_SIZE = 12;
const TOOLTIP_TITLE_FONT_SIZE = 13;
const TOOLTIP_BODY_FONT_SIZE = 12;
const MAX_AXIS_METRICS_DISPLAY = 1;

export function useScatterScoreChart({
  plotData,
  isCalculatingScores,
  selectedXMetrics,
  selectedYMetrics,
  selectedZMetricKey,
  zScale,
  currentTemplateConfig,
  getMetricConfigDetails,
  selectedDisplayCurrency,
  statusColors,
  chartSettings
}: UseScatterScoreChartProps): UseScatterScoreChartReturn {

  const zMetricConfig = useMemo(() =>
    selectedZMetricKey ? getMetricConfigDetails(selectedZMetricKey) : null,
    [selectedZMetricKey, getMetricConfigDetails]
  );

  // Memoize axis labels separately for better performance
  const xAxisLabel = useMemo(() => {
    if (currentTemplateConfig.xAxisThemeLabel) {
      return `X-Axis Score: ${currentTemplateConfig.xAxisThemeLabel}`;
    }

    if (selectedXMetrics.length === 0) {
      return 'X-Axis Score (Not Set)';
    }

    const displayMetrics = selectedXMetrics
      .slice(0, MAX_AXIS_METRICS_DISPLAY)
      .map(m => m.metricLabel)
      .join(', ');

    const suffix = selectedXMetrics.length > MAX_AXIS_METRICS_DISPLAY ? ' & others' : '';
    return `X-Axis Score (${displayMetrics}${suffix})`;
  }, [currentTemplateConfig.xAxisThemeLabel, selectedXMetrics]);

  const yAxisLabel = useMemo(() => {
    if (currentTemplateConfig.yAxisThemeLabel) {
      return `Y-Axis Score: ${currentTemplateConfig.yAxisThemeLabel}`;
    }

    if (selectedYMetrics.length === 0) {
      return 'Y-Axis Score (Not Set)';
    }

    const displayMetrics = selectedYMetrics
      .slice(0, MAX_AXIS_METRICS_DISPLAY)
      .map(m => m.metricLabel)
      .join(', ');

    const suffix = selectedYMetrics.length > MAX_AXIS_METRICS_DISPLAY ? ' & others' : '';
    return `Y-Axis Score (${displayMetrics}${suffix})`;
  }, [currentTemplateConfig.yAxisThemeLabel, selectedYMetrics]);

  const chartDatasets = useMemo(() => {
    if (isCalculatingScores || plotData.length === 0) return [];

    if (DEBUG_SCATTER_SCORE) {
      console.log("[useScatterScoreChart] Building chart datasets for", plotData.length, "points");
    }

    try {
      // Group data points by status
      const dataPointsByStatus: Record<string, ScatterScorePlotPointData[]> = {};

      plotData.forEach((point) => {
        // Ensure xScore, yScore, and r_normalized are valid numbers for charting
        if (!isValidNumber(point.xScore) || !isValidNumber(point.yScore) || !isValidNumber(point.r_normalized)) {
            if (DEBUG_SCATTER_SCORE) {
                console.warn(`[useScatterScoreChart] Skipping point for ${point.company.company_name} due to invalid score or normalized radius.`, point);
            }
            return;
        }

        const status = point.company.status?.toLowerCase() || 'default';
        if (!dataPointsByStatus[status]) {
          dataPointsByStatus[status] = [];
        }

        dataPointsByStatus[status].push({
          x: point.xScore as number,
          y: point.yScore as number,
          r_normalized: point.r_normalized as number, // Use the pre-calculated normalized radius
          company: point.company,
          xScore: point.xScore as number,
          yScore: point.yScore as number,
          zRawValue: point.zValue
        });
      });

      // Build datasets with consistent configuration
      return Object.entries(dataPointsByStatus).map(([statusKey, dataPoints]) => ({
        label: toTitleCase(statusKey) || "Unknown",
        data: dataPoints,
        backgroundColor: statusColors[statusKey]?.background || statusColors.default.background,
        borderColor: statusColors[statusKey]?.border || statusColors.default.border,
        borderWidth: 1,
        hoverBorderWidth: 2,
        pointRadius: (ctx: ScriptableContext<'scatter'>) => {
          const point = ctx.raw as ScatterScorePlotPointData;
          return chartSettings.pointRadius(point?.r_normalized || 0); // Ensure fallback to 0
        },
        pointHoverRadius: (ctx: ScriptableContext<'scatter'>) => {
          const point = ctx.raw as ScatterScorePlotPointData;
          return chartSettings.pointHoverRadius(point?.r_normalized || 0); // Ensure fallback to 0
        },
        datalabels: {
          display: (ctx: DataLabelsContext) => {
            const dp = ctx.dataset?.data?.[ctx.dataIndex] as ScatterScorePlotPointData;
            return !!dp && dp.r_normalized > MIN_LABEL_DISPLAY_RADIUS;
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
            size: LABEL_FONT_SIZE,
            weight: '500' as const,
            family: 'font-sans'
          },
          textAlign: 'center' as const,
          anchor: 'center' as const,
          align: 'center' as const,
          offset: 0,
          clip: true
        }
      }));
    } catch (error) {
      console.error('[useScatterScoreChart] Error building datasets:', error);
      return [];
    }
  }, [plotData, isCalculatingScores, statusColors, chartSettings]); // Removed zMetricConfig, zScale from dependencies as r_normalized is pre-calculated

  const chartOptions = useMemo((): ChartOptions<'scatter'> => {
    // Helper function for consistent axis configuration
    const createAxisConfig = (axisLabel: string, position: 'bottom' | 'left') => ({
      type: 'linear' as const,
      position,
      title: {
        display: true,
        text: axisLabel,
        color: CHART_COLORS.axisTitle,
        font: {
          size: AXIS_TITLE_FONT_SIZE,
          family: 'font-sans',
          weight: '500' as const
        }
      },
      ticks: {
        color: CHART_COLORS.axisTicks,
        font: {
          size: AXIS_TICK_FONT_SIZE,
          family: 'font-sans'
        },
        maxTicksLimit: 8,
        precision: 0,
        autoSkipPadding: 15,
        callback: function(value: any) {
          // Only show integer ticks for score axes
          return Number.isInteger(value) ? value : undefined;
        }
      },
      grid: {
        color: CHART_COLORS.gridColor,
        borderColor: CHART_COLORS.borderColor
      }
    });

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      elements: {
        point: {
          hitRadius: 5,
          hoverBorderWidth: 2,
        }
      },
      scales: {
        x: createAxisConfig(xAxisLabel, 'bottom'),
        y: createAxisConfig(yAxisLabel, 'left')
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: CHART_COLORS.legendText,
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 20,
            font: {
              size: LEGEND_FONT_SIZE,
              family: 'font-sans'
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: CHART_COLORS.tooltipBg,
          titleColor: CHART_COLORS.tooltipTitle,
          bodyColor: CHART_COLORS.tooltipBody,
          borderColor: CHART_COLORS.tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 4,
          boxPadding: 4,
          usePointStyle: true,
          titleFont: {
            size: TOOLTIP_TITLE_FONT_SIZE,
            family: 'font-sans',
            weight: 'bold' as const
          },
          bodyFont: {
            size: TOOLTIP_BODY_FONT_SIZE,
            family: 'font-sans'
          },
          callbacks: {
            title: (tooltipItems: any[]) => {
              const dp = tooltipItems[0]?.raw as ScatterScorePlotPointData;
              return dp?.company?.company_name || 'Unknown Company';
            },
            label: (ctx: any) => {
              const dp = ctx.raw as ScatterScorePlotPointData;
              if (!dp || !dp.company) return '';

              const lines: string[] = [];
              const { company, xScore, yScore, zRawValue } = dp;

              lines.push(` ${company.tsx_code || 'N/A'}`);
              lines.push(` X-Score: ${xScore?.toFixed(0) ?? 'N/A'}`);
              lines.push(` Y-Score: ${yScore?.toFixed(0) ?? 'N/A'}`);

              if (zMetricConfig && zRawValue !== undefined && zRawValue !== null) {
                try {
                  const formattedZ = formatValueWrapper(
                    zRawValue,
                    zMetricConfig.format,
                    selectedDisplayCurrency
                  );
                  lines.push(` ${zMetricConfig.label}: ${formattedZ}`);
                } catch (error) {
                  console.error('[useScatterScoreChart] Error formatting Z value:', error);
                  lines.push(` ${zMetricConfig.label}: ${zRawValue}`);
                }
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
    };
  }, [xAxisLabel, yAxisLabel, zMetricConfig, selectedDisplayCurrency]);

  return {
    chartDatasets,
    chartOptions
  };
}