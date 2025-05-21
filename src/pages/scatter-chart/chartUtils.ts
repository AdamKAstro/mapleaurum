// src/pages/scatter-chart/chartUtils.ts
import type { Currency, MetricFormat } from '../../lib/types'; // Correct path
import { formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz, isValidNumber } from '../../lib/utils'; // Correct path

// const DEBUG_MODE = process.env.NODE_ENV === 'development'; // Keep if used for other debugs

export function normalizeValues(values: number[] | undefined | null, scale: 'linear' | 'log'): number[] {
  if (!values || values.length === 0) return [];
  
  const validValues = values.filter(v => Number.isFinite(v) && (scale === 'linear' || v > 0));
  if (validValues.length === 0) {
    return Array(values.length).fill(0);
  }

  if (scale === 'log') {
    const logValues = validValues.map(v => Math.log10(v));
    const minLog = Math.min(...logValues);
    const maxLog = Math.max(...logValues);
    const logRange = maxLog - minLog;

    if (logRange < 1e-9) { 
        return values.map(v => (Number.isFinite(v) && v > 0 && Math.log10(v) === minLog) ? 0.5 : 0);
    }
    
    return values.map(v => {
      if (!Number.isFinite(v) || v <= 0) return 0;
      const normalizedValue = (Math.log10(v) - minLog) / logRange;
      return Math.max(0, Math.min(1, normalizedValue));
    });
  } else { 
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min;

    if (range < 1e-9) { 
        return values.map(v => (Number.isFinite(v) && v === min) ? 0.5 : 0);
    }

    return values.map(v => {
      if (!Number.isFinite(v)) return 0;
      const normalizedValue = (v - min) / range;
      return Math.max(0, Math.min(1, normalizedValue));
    });
  }
}

export function formatValueWrapper(
    value: number | string | undefined | null, 
    format: MetricFormat | undefined, 
    currencyCode: Currency = 'USD'
): string {
  if (value === null || value === undefined) return '-';
  
  if (typeof value === 'string' && format === 'string') return value;

  const numValue = Number(value);

  if (!isValidNumber(numValue)) {
    if (typeof value === 'string' && value.trim() !== '' && !['nan', 'infinity', '-infinity'].includes(value.toLowerCase())) {
        return value;
    }
    return '-';
  }

  try {
    // Use a consistent set of formatting rules, similar to formatValueDisplay
    switch (format) {
      case 'currency':
        return formatCurrency ? formatCurrency(numValue, { currency: currencyCode, compact: Math.abs(numValue) >= 1000000, decimals: (Math.abs(numValue) >= 1000000 ? 1 : 2) }) : `$${numValue.toFixed(2)}`;
      case 'percent':
        return formatPercent ? formatPercent(numValue, 1) : `${(numValue * 100).toFixed(1)}%`; // Assuming input is decimal
      case 'number': // Integer display
        return formatNumber ? formatNumber(numValue, { decimals: 0 }) : String(Math.round(numValue));
      case 'moz':
        return formatMoz ? formatMoz(numValue, 2) : `${numValue.toFixed(2)} Moz`;
      case 'koz':
        return formatKoz ? formatKoz(numValue, 0) : `${Math.round(numValue)} koz`;
      case 'ratio': // Typically 2 decimals
        return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue.toFixed(2));
      case 'years':
        return formatNumber ? `${formatNumber(numValue, { decimals: 1 })} yrs` : `${numValue.toFixed(1)} yrs`;
      case 'compact': // For general large number formatting, trying to be smart
        if (formatNumber) {
            if (Math.abs(numValue) >= 1000000) return formatNumber(numValue, { compact: true, decimals: 1, compactDisplay: 'short' });
            if (Math.abs(numValue) >= 1000) return formatNumber(numValue, { compact: true, decimals: 0, compactDisplay: 'short' });
            // For smaller numbers, show some decimals if not an integer
            return formatNumber(numValue, { decimals: !Number.isInteger(numValue) ? 2 : 0 });
        }
        return String(numValue); // Fallback
      case 'decimal': // Explicitly 2 decimal places
        return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue.toFixed(2));
      case 'string': // Should be caught earlier if typeof value === 'string'
        return String(value);
      default: // Fallback for unspecified or other numeric formats
        if (formatNumber) {
            return Number.isInteger(numValue) ? formatNumber(numValue, { decimals: 0 }) : formatNumber(numValue, { decimals: 2 });
        }
        return String(Number.isInteger(numValue) ? numValue : numValue.toFixed(2));
    }
  } catch (e) {
    console.error("[chartUtils] Formatting error in formatValueWrapper:", { value, format, error: e });
    return String(value); // Fallback
  }
}

// getDomain function (remains as provided by user, already robust)
export function getDomain(values: number[], scale: 'linear' | 'log'): [number | string, number | string] {
  if (!values || values.length === 0) return ['auto', 'auto'];

  const validValues = values.filter(v => Number.isFinite(v) && (scale === 'linear' || v > 0));
  if (validValues.length === 0) return ['auto', 'auto'];

  let min = Math.min(...validValues);
  let max = Math.max(...validValues);

  if (scale === 'log') {
    min = Math.max(min, 1e-6); 
    if (max <= min) { // Ensure max is strictly greater than min for log scale after min adjustment
        if (min > 1e-5) max = min * 10; // If min is reasonably large, scale max up
        else max = min + 1e-5; // If min is tiny, add a small absolute amount
    }


    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    
    const logRange = logMax - logMin;
    const logPadding = logRange === 0 ? (Math.abs(logMin) > 1e-3 ? 0.1 * Math.abs(logMin) : 0.1) : logRange * 0.1; 
    
    return [
      Math.pow(10, logMin - logPadding),
      Math.pow(10, logMax + logPadding)
    ];
  } else { 
    const range = max - min;
    const padding = range === 0 ? Math.max(1, Math.abs(min * 0.1)) : range * 0.1;
    return [min - padding, max + padding];
  }
}

// exportChartCode and downloadJson functions (remain as provided by user)
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