// src/pages/scatter-chart/chartUtils.ts
import type { Currency, MetricFormat } from '../../lib/types';
import { formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz, isValidNumber } from '../../lib/utils';

const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * Normalizes an array of values to [0, 1] range for visual scaling
 * Handles both linear and logarithmic scales with edge case protection
 */
export function normalizeValues(values: number[] | undefined | null, scale: 'linear' | 'log'): number[] {
  if (!values || values.length === 0) return [];
  
  const validValues = values.filter(v => Number.isFinite(v) && (scale === 'linear' || v > 0));
  if (validValues.length === 0) {
    return Array(values.length).fill(0);
  }

  // Single value edge case - center it
  if (validValues.length === 1) {
    return values.map(v => (Number.isFinite(v) && (scale === 'linear' || v > 0)) ? 0.5 : 0);
  }

  if (scale === 'log') {
    const logValues = validValues.map(v => Math.log10(Math.max(v, 1e-10))); // Prevent -Infinity
    const minLog = Math.min(...logValues);
    const maxLog = Math.max(...logValues);
    const logRange = maxLog - minLog;

    // Handle near-zero range
    if (logRange < 1e-6) { 
      const midpoint = 0.5;
      return values.map(v => {
        if (!Number.isFinite(v) || v <= 0) return 0;
        const logV = Math.log10(Math.max(v, 1e-10));
        // Spread values slightly around midpoint for visibility
        return midpoint + (logV - minLog) * 0.1;
      });
    }
    
    return values.map(v => {
      if (!Number.isFinite(v) || v <= 0) return 0;
      const normalizedValue = (Math.log10(Math.max(v, 1e-10)) - minLog) / logRange;
      return Math.max(0, Math.min(1, normalizedValue));
    });
  } else { 
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min;

    // Handle near-zero range
    if (Math.abs(range) < 1e-9) { 
      return values.map(v => (Number.isFinite(v) && Math.abs(v - min) < 1e-9) ? 0.5 : 0);
    }

    return values.map(v => {
      if (!Number.isFinite(v)) return 0;
      const normalizedValue = (v - min) / range;
      return Math.max(0, Math.min(1, normalizedValue));
    });
  }
}

/**
 * Intelligent value formatting with metric-aware display rules
 * Provides consistent, readable output across all metric types
 */
export function formatValueWrapper(
    value: number | string | undefined | null, 
    format: MetricFormat | undefined, 
    currencyCode: Currency = 'USD'
): string {
  if (value === null || value === undefined) return '—'; // Em dash for null values
  
  if (typeof value === 'string' && format === 'string') return value;

  const numValue = Number(value);

  if (!isValidNumber(numValue)) {
    if (typeof value === 'string' && value.trim() !== '' && !['nan', 'infinity', '-infinity'].includes(value.toLowerCase())) {
        return value;
    }
    return '—';
  }

  try {
    switch (format) {
      case 'currency':
        if (!formatCurrency) return `$${numValue.toFixed(2)}`;
        // Smart formatting based on magnitude
        if (Math.abs(numValue) >= 1e9) {
          return formatCurrency(numValue, { currency: currencyCode, compact: true, decimals: 1, compactDisplay: 'short' });
        } else if (Math.abs(numValue) >= 1e6) {
          return formatCurrency(numValue, { currency: currencyCode, compact: true, decimals: 2, compactDisplay: 'short' });
        } else if (Math.abs(numValue) >= 1000) {
          return formatCurrency(numValue, { currency: currencyCode, compact: true, decimals: 0, compactDisplay: 'short' });
        }
        return formatCurrency(numValue, { currency: currencyCode, compact: false, decimals: 2 });
        
      case 'percent':
        const percentValue = numValue * 100; // Assuming input is decimal
        if (!formatPercent) return `${percentValue.toFixed(1)}%`;
        // Smart decimal places based on magnitude
        if (Math.abs(percentValue) >= 100) {
          return formatPercent(numValue, 0);
        } else if (Math.abs(percentValue) >= 10) {
          return formatPercent(numValue, 1);
        }
        return formatPercent(numValue, 2);
        
      case 'number': // Integer display
        if (!formatNumber) return String(Math.round(numValue));
        if (Math.abs(numValue) >= 1e6) {
          return formatNumber(numValue, { compact: true, decimals: 1, compactDisplay: 'short' });
        }
        return formatNumber(numValue, { decimals: 0 });
        
      case 'moz':
        if (!formatMoz) return `${numValue.toFixed(2)} Moz`;
        return formatMoz(numValue, numValue >= 100 ? 0 : (numValue >= 10 ? 1 : 2));
        
      case 'koz':
        if (!formatKoz) return `${Math.round(numValue)} koz`;
        return formatKoz(numValue, numValue >= 1000 ? 0 : (numValue >= 100 ? 1 : 2));
        
      case 'ratio':
        if (!formatNumber) return numValue.toFixed(2);
        // Show more decimals for small ratios
        const ratioDecimals = Math.abs(numValue) < 1 ? 3 : (Math.abs(numValue) < 10 ? 2 : 1);
        return formatNumber(numValue, { decimals: ratioDecimals });
        
      case 'years':
        if (!formatNumber) return `${numValue.toFixed(1)} yrs`;
        const yearDecimals = numValue >= 10 ? 0 : 1;
        return `${formatNumber(numValue, { decimals: yearDecimals })} yrs`;
        
      case 'compact':
        if (!formatNumber) return String(numValue);
        // Progressive compaction based on magnitude
        if (Math.abs(numValue) >= 1e9) {
          return formatNumber(numValue, { compact: true, decimals: 2, compactDisplay: 'short' });
        } else if (Math.abs(numValue) >= 1e6) {
          return formatNumber(numValue, { compact: true, decimals: 1, compactDisplay: 'short' });
        } else if (Math.abs(numValue) >= 1e3) {
          return formatNumber(numValue, { compact: true, decimals: 0, compactDisplay: 'short' });
        }
        return formatNumber(numValue, { decimals: Number.isInteger(numValue) ? 0 : 2 });
        
      case 'decimal':
        if (!formatNumber) return numValue.toFixed(2);
        return formatNumber(numValue, { decimals: 2 });
        
      case 'string':
        return String(value);
        
      default:
        // Intelligent default formatting
        if (!formatNumber) {
          return Number.isInteger(numValue) ? String(numValue) : numValue.toFixed(2);
        }
        
        // Auto-detect best format
        if (Math.abs(numValue) >= 1e6) {
          return formatNumber(numValue, { compact: true, decimals: 1, compactDisplay: 'short' });
        } else if (Number.isInteger(numValue)) {
          return formatNumber(numValue, { decimals: 0 });
        } else if (Math.abs(numValue) < 0.01) {
          return formatNumber(numValue, { decimals: 4 });
        } else if (Math.abs(numValue) < 1) {
          return formatNumber(numValue, { decimals: 3 });
        }
        return formatNumber(numValue, { decimals: 2 });
    }
  } catch (e) {
    if (DEBUG_MODE) {
      console.error("[chartUtils] Formatting error:", { value, format, error: e });
    }
    return String(value);
  }
}

/**
 * Calculates optimal domain bounds for chart axes
 * Includes intelligent padding and log scale handling
 */
export function getDomain(values: number[], scale: 'linear' | 'log'): [number, number] {
  if (!values || values.length === 0) return [0, 1];

  const validValues = values.filter(v => Number.isFinite(v) && (scale === 'linear' || v > 0));
  if (validValues.length === 0) return [0, 1];

  let min = Math.min(...validValues);
  let max = Math.max(...validValues);

  if (scale === 'log') {
    // Ensure positive values for log scale
    min = Math.max(min, 1e-6);
    max = Math.max(max, min * 2); // Ensure max > min
    
    // Handle edge case where all values are the same
    if (max / min < 1.01) {
      min = min / 10;
      max = max * 10;
    }

    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logRange = logMax - logMin;
    
    // Calculate padding in log space
    const logPadding = Math.max(0.1, logRange * 0.1);
    
    // Round to nice log boundaries
    const paddedLogMin = Math.floor((logMin - logPadding) * 2) / 2;
    const paddedLogMax = Math.ceil((logMax + logPadding) * 2) / 2;
    
    return [
      Math.pow(10, paddedLogMin),
      Math.pow(10, paddedLogMax)
    ];
  } else { 
    // Linear scale
    const range = max - min;
    
    // Handle single value
    if (range === 0) {
      const magnitude = Math.abs(min) || 1;
      return [min - magnitude * 0.1, max + magnitude * 0.1];
    }
    
    // Calculate smart padding
    const padding = range * 0.1;
    
    // Round to nice boundaries
    const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
    const paddedMin = Math.floor((min - padding) / magnitude) * magnitude;
    const paddedMax = Math.ceil((max + padding) / magnitude) * magnitude;
    
    return [paddedMin, paddedMax];
  }
}

/**
 * Generates chart export configuration
 * Provides all necessary files for standalone chart implementation
 */
export function exportChartCode(): { [key: string]: string } {
  const timestamp = new Date().toISOString();
  
  return {
    'package.json': JSON.stringify({
      name: 'scatter-chart-export',
      version: '1.0.0',
      description: 'Exported scatter chart visualization',
      exportDate: timestamp,
      dependencies: {
        'react': '^18.0.0',
        'react-dom': '^18.0.0',
        'chart.js': '^4.0.0',
        'react-chartjs-2': '^5.0.0',
        'chartjs-plugin-zoom': '^2.0.0',
        'chartjs-plugin-datalabels': '^2.0.0',
        'framer-motion': '^10.0.0',
        'tailwindcss': '^3.0.0'
      }
    }, null, 2),
    
    'README.md': `# Scatter Chart Export
    
Exported on: ${timestamp}

## Setup Instructions

1. Install dependencies: \`npm install\`
2. Configure your data source in \`src/data/\`
3. Update metric configurations in \`src/lib/metric-types.ts\`
4. Run development server: \`npm run dev\`

## Features

- Multi-dimensional scatter plot visualization
- Linear and logarithmic scale support
- Interactive zoom and pan
- Dynamic bubble sizing
- Responsive design with mobile support

## Customization

Edit the theme colors and styling in:
- \`tailwind.config.js\` - Color palette and spacing
- \`src/pages/scatter-chart/index.tsx\` - Chart configuration
- \`src/lib/chartUtils.ts\` - Formatting and normalization logic
`,
    
    'tailwind.config.js': `module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          400: '#4B5563',
          600: '#374151',
          700: '#1F2937',
          800: '#111827',
          900: '#0F172A'
        },
        'surface-white': '#F8FAFC',
        'accent-teal': '#5EEAD4',
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4'
        },
        purple: {
          400: '#A78BFA',
          500: '#8B5CF6'
        }
      }
    }
  },
  plugins: []
}`,
    
    'src/pages/scatter-chart/index.tsx': '// Main scatter chart component - see artifact content',
    'src/pages/scatter-chart/chartUtils.ts': '// Chart utility functions - see current file',
    'src/lib/types.ts': '// Type definitions for Company, Currency, MetricFormat, etc.',
    'src/lib/utils.ts': '// Utility functions including formatters and validators',
    'src/lib/metric-types.ts': '// Metric configuration and access control'
  };
}

/**
 * Downloads data as formatted JSON with metadata
 * Includes chart configuration for reproducibility
 */
export function downloadJson(data: object, filename: string, metadata?: object) {
  try {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        ...metadata
      },
      data
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    if (DEBUG_MODE) {
      console.log(`[chartUtils] Downloaded ${filename}`, { size: blob.size });
    }
  } catch (error) {
    console.error('[chartUtils] Download failed:', error);
    // User-friendly error handling
    alert('Failed to prepare download. Please try again.');
  }
}