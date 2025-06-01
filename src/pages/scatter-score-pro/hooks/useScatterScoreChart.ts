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
import { normalizeValues as normalizeZValuesForChart, formatValueWrapper } from '../../scatter-chart/chartUtils';
import { CHART_COLORS } from '../constants';
import { DEBUG_SCATTER_SCORE } from '../constants';

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
  chartDatasets: any[];
  chartOptions: ChartOptions<'scatter'>;
}

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

  const chartDatasets = useMemo(() => {
    if (isCalculatingScores || plotData.length === 0) return [];
    
    if (DEBUG_SCATTER_SCORE) {
      console.log("[useScatterScoreChart] Building chart datasets for", plotData.length, "points");
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
        chartSettings.pointRadius((ctx.raw as ScatterScorePlotPointData)?.r_normalized || 0),
      pointHoverRadius: (ctx: ScriptableContext<'scatter'>) => 
        chartSettings.pointHoverRadius((ctx.raw as ScatterScorePlotPointData)?.r_normalized || 0),
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
        clip: true
      }
    }));
  }, [plotData, isCalculatingScores, selectedZMetricKey, zMetricConfig, zScale, statusColors, chartSettings]);

  const chartOptions = useMemo((): ChartOptions<'scatter'> => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    elements: {
      point: {
        radius: (ctx: ScriptableContext<'scatter'>) => 
          chartSettings.pointRadius((ctx.raw as any)?.r_normalized ?? 0),
        hoverRadius: (ctx: ScriptableContext<'scatter'>) => 
          chartSettings.pointHoverRadius((ctx.raw as any)?.r_normalized ?? 0),
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
          color: CHART_COLORS.axisTitle,
          font: { 
            size: 13,
            family: 'font-sans',
            weight: '500' as const
          }
        },
        ticks: {
          color: CHART_COLORS.axisTicks,
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
          color: CHART_COLORS.gridColor,
          borderColor: CHART_COLORS.borderColor
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
          color: CHART_COLORS.axisTitle,
          font: { 
            size: 13,
            family: 'font-sans',
            weight: '500' as const
          }
        },
        ticks: {
          color: CHART_COLORS.axisTicks,
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
          color: CHART_COLORS.gridColor,
          borderColor: CHART_COLORS.borderColor
        }
      }
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
            size: 12,
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
                selectedDisplayCurrency
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
  }), [selectedXMetrics, selectedYMetrics, zMetricConfig, selectedDisplayCurrency, currentTemplateConfig, chartSettings]);

  return {
    chartDatasets,
    chartOptions
  };
}