//src/pages/scatter-chart/chartUtils.ts
import type { Currency, MetricFormat } from '../../lib/types';
import { formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz } from '../../lib/utils';

const DEBUG_MODE = import.meta.env.DEV;

export function normalizeValues(values: number[] | undefined | null, scale: 'linear' | 'log'): number[] {
  if (!values || values.length === 0) return [];
  
  // Filter out invalid values and ensure all values are positive for log scale
  const validValues = values.filter(v => Number.isFinite(v) && (scale === 'linear' || v > 0));
  if (validValues.length === 0) return Array(values.length).fill(0);

  if (scale === 'log') {
    // Take log of values first
    const logValues = validValues.map(v => Math.log10(v));
    const minLog = Math.min(...logValues);
    const maxLog = Math.max(...logValues);
    const logRange = maxLog - minLog || 1; // Prevent division by zero

    // Map original values to normalized space
    return values.map(v => {
      if (!Number.isFinite(v) || v <= 0) return 0;
      const normalizedValue = (Math.log10(v) - minLog) / logRange;
      return Math.max(0, Math.min(1, normalizedValue));
    });
  } else {
    // Linear normalization
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min || 1; // Prevent division by zero

    return values.map(v => {
      if (!Number.isFinite(v)) return 0;
      const normalizedValue = (v - min) / range;
      return Math.max(0, Math.min(1, normalizedValue));
    });
  }
}

export function formatValueWrapper(value: number | string | undefined | null, format: MetricFormat | undefined, currencyCode: Currency = 'USD'): string {
  if (value === null || typeof value === 'undefined') return '-';
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return '-';

  try {
    switch (format) {
      case 'currency':
        return formatCurrency(value, { currency: currencyCode });
      case 'percent':
        return formatPercent(value);
      case 'number':
        return formatNumber(value, { decimals: 0 });
      case 'moz':
        return formatMoz(value);
      case 'koz':
        return formatKoz(value);
      default:
        return formatNumber(value, { decimals: 0 });
    }
  } catch (e) {
    console.error("Formatting error:", e);
    return "Error";
  }
}

export function getDomain(values: number[], scale: 'linear' | 'log'): [number | string, number | string] {
  if (!values || values.length === 0) return ['auto', 'auto'];

  const validValues = values.filter(v => Number.isFinite(v) && (scale === 'linear' || v > 0));
  if (validValues.length === 0) return ['auto', 'auto'];

  let min = Math.min(...validValues);
  let max = Math.max(...validValues);

  if (scale === 'log') {
    // For log scale, ensure we don't go below a reasonable minimum
    min = Math.max(min, 0.000001);
    // Add padding in log space
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logPadding = (logMax - logMin) * 0.1;
    return [
      Math.pow(10, logMin - logPadding),
      Math.pow(10, logMax + logPadding)
    ];
  } else {
    // Linear scale padding
    const range = max - min;
    const padding = range * 0.1;
    return [min - padding, max + padding];
  }
}

// Re-export raw content needed for export function
export function exportChartCode(): { [key: string]: string } {
  return {
    'package.json': '// Content from package.json',
    'tailwind.config.js': '// Content from tailwind.config.js',
    'src/pages/scatter-chart/index.tsx': '// Content from index.tsx',
    'src/lib/force-simulation.ts': '// Content from force-simulation.ts',
    'src/lib/metric-types.ts': '// Content from metric-types.ts',
    'src/lib/utils.ts': '// Content from utils.ts',
    'src/lib/types.ts': '// Content from types.ts',
    'src/lib/supabase.ts': '// Content from supabase.ts',
  };
}

export function downloadJson(data: object, filename: string) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to download JSON:", error);
    alert("Failed to prepare download.");
  }
}