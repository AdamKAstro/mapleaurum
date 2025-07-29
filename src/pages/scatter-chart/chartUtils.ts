// src/pages/scatter-chart/chartUtils.ts
import type { Currency, MetricFormat } from '../../lib/types';
import { formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz, isValidNumber } from '../../lib/utils';

// --- Constants ---
const MIN_BUBBLE_VALUE = 1e-6; // Minimum value for logarithmic scaling to prevent -Infinity
const BUBBLE_SIZE_BOOST = 1.5; // Amplifies normalized values for more pronounced size differences

/**
 * Normalizes an array of values to [0, 1] range for visual scaling, with enhanced contrast for bubble sizes.
 * Handles both linear and logarithmic scales, ensuring small values remain visible.
 */
export function normalizeValues(values: number[] | undefined | null, scale: 'linear' | 'logarithmic'): number[] {
    if (!values || values.length === 0) return [];

    const validValues = values.filter(v => isValidNumber(v) && (scale === 'linear' || v > 0));
    if (validValues.length === 0) return Array(values.length).fill(0);

    if (validValues.length === 1) {
        // Single value case: return a moderate size to ensure visibility
        return values.map(v => (isValidNumber(v) && (scale === 'linear' || v > 0)) ? 0.5 * BUBBLE_SIZE_BOOST : 0);
    }

    if (scale === 'logarithmic') {
        const logValues = validValues.map(v => Math.log10(Math.max(v, MIN_BUBBLE_VALUE)));
        const minLog = Math.min(...logValues);
        const maxLog = Math.max(...logValues);
        const logRange = maxLog - minLog || 1e-6; // Prevent division by zero

        return values.map(v => {
            if (!isValidNumber(v) || v <= 0) return 0;
            const logV = Math.log10(Math.max(v, MIN_BUBBLE_VALUE));
            const normalized = (logV - minLog) / logRange;
            // BUBBLE SIZE FIX: Boost small values and amplify contrast
            return Math.max(0, Math.min(1, normalized * BUBBLE_SIZE_BOOST));
        });
    } else {
        const min = Math.min(...validValues);
        const max = Math.max(...validValues);
        const range = max - min || 1e-9; // Prevent division by zero

        return values.map(v => {
            if (!isValidNumber(v)) return 0;
            // BUBBLE SIZE FIX: Apply square root to compress large values, boost small ones
            const normalized = Math.sqrt((v - min) / range);
            return Math.max(0, Math.min(1, normalized * BUBBLE_SIZE_BOOST));
        });
    }
}

/**
 * Formats values for display in charts, tooltips, and axes, with metric-aware rules.
 */
export function formatValueWrapper(
    value: number | string | undefined | null,
    format: MetricFormat | undefined,
    currencyCode: Currency = 'USD',
    metricKey?: string
): string {
    if (value === null || value === undefined) return '—';

    if (typeof value === 'string' && format === 'string') return value;

    const numValue = Number(value);
    if (!isValidNumber(numValue)) {
        if (typeof value === 'string' && value.trim() !== '' && !['nan', 'infinity', '-infinity'].includes(value.toLowerCase())) {
            return value;
        }
        return '—';
    }

    switch (format) {
        case 'currency':
            return formatCurrency(numValue, { currency: currencyCode, compact: true });

        case 'percent':
            const preformattedPercentMetrics = ['percent_gold', 'percent_silver'];
            const shouldMultiply = !preformattedPercentMetrics.includes(metricKey || '');
            const displayValue = shouldMultiply ? numValue * 100 : numValue;
            return formatPercent(numValue, {
                decimals: Math.abs(displayValue) >= 100 ? 0 : Math.abs(displayValue) < 10 ? 2 : 1,
                multiplyBy100: shouldMultiply
            });

        case 'number':
            return formatNumber(numValue, { compact: Math.abs(numValue) >= 1e6, decimals: Math.abs(numValue) >= 1e6 ? 1 : 0 });

        case 'moz':
            return formatMoz(numValue, { decimals: numValue >= 100 ? 0 : numValue >= 10 ? 1 : 2 });

        case 'koz':
            return formatKoz(numValue, { decimals: numValue >= 1000 ? 0 : numValue >= 100 ? 1 : 2 });

        case 'ratio':
            return formatNumber(numValue, { decimals: Math.abs(numValue) < 1 ? 3 : Math.abs(numValue) < 10 ? 2 : 1 });

        case 'years':
            return `${formatNumber(numValue, { decimals: numValue >= 10 ? 0 : 1 })} yrs`;

        case 'compact':
            return formatNumber(numValue, { compact: true, decimals: 2 });

        case 'decimal':
            return formatNumber(numValue, { decimals: 2 });

        case 'string':
            return String(value);

        default:
            return formatNumber(numValue, {
                compact: Math.abs(numValue) >= 1e6,
                decimals: Math.abs(numValue) >= 1e6 ? 1 : Number.isInteger(numValue) ? 0 : 2
            });
    }
}

/**
 * Calculates optimal domain bounds for chart axes, with metric-aware padding.
 */
export function getDomain(values: number[], scale: 'linear' | 'logarithmic'): [number, number] {
    if (!values || values.length === 0) return [0, 1];

    const validValues = values.filter(v => isValidNumber(v) && (scale === 'linear' || v > 0));
    if (validValues.length === 0) return [0, 1];

    let min = Math.min(...validValues);
    let max = Math.max(...validValues);

    if (scale === 'logarithmic') {
        min = Math.max(min, MIN_BUBBLE_VALUE);
        max = Math.max(max, min * 2);
        const logMin = Math.log10(min);
        const logMax = Math.log10(max);
        const logRange = logMax - logMin || 1e-6;
        const logPadding = Math.max(0.1, logRange * 0.1);
        return [
            Math.pow(10, Math.floor((logMin - logPadding) * 2) / 2),
            Math.pow(10, Math.ceil((logMax + logPadding) * 2) / 2)
        ];
    } else {
        const range = max - min || 1e-9;
        const padding = range * 0.1;
        const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
        return [
            Math.floor((min - padding) / magnitude) * magnitude,
            Math.ceil((max + padding) / magnitude) * magnitude
        ];
    }
}

/**
 * Generates chart export configuration.
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
                navy: { 400: '#4B5563', 600: '#374151', 700: '#1F2937', 800: '#111827', 900: '#0F172A' },
                'surface-white': '#F8FAFC',
                'accent-teal': '#5EEAD4',
                cyan: { 400: '#22D3EE', 500: '#06B6D4' },
                purple: { 400: '#A78BFA', 500: '#8B5CF6' }
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
 * Downloads data as formatted JSON with metadata.
 */
export function downloadJson(data: object, filename: string, metadata?: object) {
    const exportData = {
        metadata: { exportDate: new Date().toISOString(), version: '1.0.0', ...metadata },
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
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}