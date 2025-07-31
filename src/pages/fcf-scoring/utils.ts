// src/pages/fcf-scoring/utils.ts
// Enhanced number formatting utilities with intelligent rounding and null handling

const EPSILON = 1e-10;

/**
 * Smart number formatter with context-aware decimal places and rounding
 */
export function formatNumber(
    value: number | null | undefined, 
    options: {
        decimals?: number;
        compact?: boolean;
        suffix?: string;
        prefix?: string;
        smartDecimals?: boolean; // Auto-adjust decimals based on magnitude
        maxDecimals?: number;
        minDecimals?: number;
    } = {}
): string {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    
    const { 
        decimals = 0, 
        compact = false, 
        suffix = '', 
        prefix = '',
        smartDecimals = false,
        maxDecimals = 3,
        minDecimals = 0
    } = options;
    
    // Handle zero and very small numbers
    if (Math.abs(value) < EPSILON) return `${prefix}0${suffix}`;
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (compact) {
        let scaledValue: number;
        let unit: string;
        
        if (absValue >= 1e12) {
            scaledValue = absValue / 1e12;
            unit = 'T';
        } else if (absValue >= 1e9) {
            scaledValue = absValue / 1e9;
            unit = 'B';
        } else if (absValue >= 1e6) {
            scaledValue = absValue / 1e6;
            unit = 'M';
        } else if (absValue >= 1e3) {
            scaledValue = absValue / 1e3;
            unit = 'k';
        } else {
            scaledValue = absValue;
            unit = '';
        }
        
        // Smart decimal adjustment for compact notation
        let finalDecimals = decimals;
        if (smartDecimals) {
            if (scaledValue >= 100) finalDecimals = Math.max(0, Math.min(1, maxDecimals));
            else if (scaledValue >= 10) finalDecimals = Math.max(1, Math.min(2, maxDecimals));
            else finalDecimals = Math.max(1, Math.min(decimals || 2, maxDecimals));
        }
        
        const formattedValue = scaledValue.toFixed(finalDecimals);
        return `${prefix}${sign}${formattedValue}${unit}${suffix}`;
    }
    
    // Standard formatting with smart decimals
    let finalDecimals = decimals;
    if (smartDecimals) {
        if (absValue >= 1000) finalDecimals = Math.max(minDecimals, Math.min(0, maxDecimals));
        else if (absValue >= 1) finalDecimals = Math.max(minDecimals, Math.min(2, maxDecimals));
        else if (absValue >= 0.01) finalDecimals = Math.max(minDecimals, Math.min(4, maxDecimals));
        else finalDecimals = Math.max(minDecimals, maxDecimals);
    }
    
    return `${prefix}${value.toLocaleString('en-US', {
        minimumFractionDigits: finalDecimals,
        maximumFractionDigits: finalDecimals
    })}${suffix}`;
}

/**
 * Enhanced currency formatter with intelligent scaling and precision
 */
export function formatCurrency(
    value: number | null | undefined,
    options: {
        currency?: string;
        compact?: boolean;
        decimals?: number;
        smartDecimals?: boolean;
        showCents?: boolean; // Whether to show cents for small amounts
    } = {}
): string {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    
    const { 
        currency = 'USD', 
        compact = true, 
        decimals,
        smartDecimals = true,
        showCents = false
    } = options;
    
    const absValue = Math.abs(value);
    
    if (compact && absValue >= 1000) {
        // Use compact notation for large amounts
        let finalDecimals = decimals;
        if (smartDecimals && decimals === undefined) {
            finalDecimals = absValue >= 1e9 ? 1 : absValue >= 1e6 ? 1 : 2;
        }
        return formatNumber(value, { 
            decimals: finalDecimals || 0, 
            compact: true, 
            prefix: '$',
            smartDecimals: false // We handled it above
        });
    }
    
    // For smaller amounts or non-compact mode
    let finalDecimals = decimals;
    if (smartDecimals && decimals === undefined) {
        if (showCents || absValue < 100) {
            finalDecimals = 2; // Show cents
        } else {
            finalDecimals = absValue >= 1000 ? 0 : 2;
        }
    }
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: finalDecimals || 0,
        maximumFractionDigits: finalDecimals || 2
    }).format(value);
}

/**
 * Percentage formatter with intelligent precision
 */
export function formatPercent(
    value: number | null | undefined,
    options: {
        decimals?: number;
        multiplyBy100?: boolean;
        smartDecimals?: boolean;
        showSign?: boolean; // Show + for positive values
    } = {}
): string {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    
    const { 
        decimals = 1, 
        multiplyBy100 = false, 
        smartDecimals = true,
        showSign = false
    } = options;
    
    const displayValue = multiplyBy100 ? value * 100 : value;
    const absValue = Math.abs(displayValue);
    
    let finalDecimals = decimals;
    if (smartDecimals) {
        if (absValue >= 100) finalDecimals = 0;
        else if (absValue >= 10) finalDecimals = 1;
        else if (absValue >= 1) finalDecimals = 1;
        else finalDecimals = 2;
    }
    
    const formatted = displayValue.toFixed(finalDecimals);
    const sign = showSign && displayValue > 0 ? '+' : '';
    return `${sign}${formatted}%`;
}

/**
 * Mining-specific formatters
 */
export function formatMoz(value: number | null | undefined): string {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    
    const absValue = Math.abs(value);
    let decimals: number;
    
    if (absValue >= 10) decimals = 1;
    else if (absValue >= 1) decimals = 2;
    else if (absValue >= 0.1) decimals = 3;
    else decimals = 4;
    
    return formatNumber(value, { decimals, suffix: ' Moz' });
}

export function formatKoz(value: number | null | undefined): string {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    
    const absValue = Math.abs(value);
    let decimals: number;
    
    if (absValue >= 1000) decimals = 0;
    else if (absValue >= 100) decimals = 0;
    else if (absValue >= 10) decimals = 1;
    else decimals = 2;
    
    return formatNumber(value, { decimals, suffix: ' koz' });
}

/**
 * Smart metric value formatter based on metric type
 */
export function formatMetricValue(value: number | null, metricKey: string): string {
    if (value === null || value === undefined || !isFinite(value)) return '-';
    
    // Cash and debt values
    if (metricKey.includes('cash') || 
        metricKey.includes('debt') || 
        metricKey.includes('financial') || 
        metricKey.includes('enterprise_value')) {
        return formatCurrency(value, { compact: true, smartDecimals: true });
    }
    
    // Share prices and costs per unit
    if (metricKey.includes('share_price') || 
        metricKey.includes('aisc') ||
        metricKey.includes('costs')) {
        return formatCurrency(value, { compact: false, smartDecimals: true, showCents: true });
    }
    
    // Resource estimates
    if (metricKey.includes('moz')) {
        return formatMoz(value);
    }
    
    if (metricKey.includes('koz')) {
        return formatKoz(value);
    }
    
    // Share counts (in millions)
    if (metricKey.includes('shares')) {
        return formatNumber(value, { 
            decimals: 0, 
            compact: true, 
            suffix: 'M',
            smartDecimals: true 
        });
    }
    
    // Time periods
    if (metricKey.includes('years')) {
        return formatNumber(value, { 
            decimals: value >= 10 ? 0 : 1, 
            suffix: ' years' 
        });
    }
    
    // Ratios and multipliers
    if (metricKey.includes('ratio') || metricKey.includes('multiple')) {
        return formatNumber(value, { 
            decimals: value >= 10 ? 1 : 2,
            suffix: 'x'
        });
    }
    
    // Default formatting
    return formatNumber(value, { 
        decimals: 2, 
        compact: true, 
        smartDecimals: true 
    });
}

/**
 * Score formatter for consistency across the app
 */
export function formatScore(score: number | null | undefined): string {
    if (score === null || score === undefined || !isFinite(score)) return '-';
    
    // Always round scores to 1 decimal place
    return (Math.round(score * 10) / 10).toFixed(1);
}

/**
 * Confidence score formatter
 */
export function formatConfidence(confidence: number | null | undefined): string {
    if (confidence === null || confidence === undefined || !isFinite(confidence)) return '-';
    
    return `${Math.round(confidence * 100)}%`;
}

/**
 * Data completeness formatter
 */
export function formatDataCompleteness(completeness: number | null | undefined): string {
    if (completeness === null || completeness === undefined || !isFinite(completeness)) return '-';
    
    const percentage = Math.round(completeness * 100);
    return `${percentage}%`;
}

/**
 * Range formatter for showing min-max values
 */
export function formatRange(
    min: number | null, 
    max: number | null, 
    formatter: (value: number) => string = (v) => formatNumber(v, { decimals: 2 })
): string {
    if (min === null && max === null) return '-';
    if (min === null) return `≤ ${formatter(max!)}`;
    if (max === null) return `≥ ${formatter(min)}`;
    if (Math.abs(min - max) < EPSILON) return formatter(min);
    
    return `${formatter(min)} - ${formatter(max)}`;
}

/**
 * Trend indicator formatter
 */
export function formatTrend(
    current: number | null, 
    previous: number | null,
    formatter: (value: number) => string = (v) => formatNumber(v, { decimals: 1 })
): { 
    current: string; 
    change: string; 
    direction: 'up' | 'down' | 'flat' | 'unknown' 
} {
    const currentFormatted = current !== null ? formatter(current) : '-';
    
    if (current === null || previous === null) {
        return {
            current: currentFormatted,
            change: '-',
            direction: 'unknown'
        };
    }
    
    const change = current - previous;
    const percentChange = previous !== 0 ? (change / Math.abs(previous)) * 100 : 0;
    
    let direction: 'up' | 'down' | 'flat';
    if (Math.abs(change) < EPSILON) {
        direction = 'flat';
    } else {
        direction = change > 0 ? 'up' : 'down';
    }
    
    const changeFormatted = Math.abs(percentChange) < 0.1 
        ? '0.0%' 
        : formatPercent(percentChange / 100, { decimals: 1, showSign: true });
    
    return {
        current: currentFormatted,
        change: changeFormatted,
        direction
    };
}

/**
 * Safe number parser that handles various input types
 */
export function parseNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
        return isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const cleaned = value.replace(/[,\s%$]/g, '');
        const parsed = parseFloat(cleaned);
        return isFinite(parsed) ? parsed : null;
    }
    return null;
}

/**
 * Round to significant digits
 */
export function roundToSignificantDigits(value: number, digits: number = 3): number {
    if (value === 0) return 0;
    if (!isFinite(value)) return value;
    
    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const scale = Math.pow(10, digits - 1 - magnitude);
    return Math.round(value * scale) / scale;
}