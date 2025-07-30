// src/pages/fcf-scoring/utils.ts

// Number formatting utilities specific to FCF scoring
export function formatNumber(
    value: number | null | undefined, 
    options: {
        decimals?: number;
        compact?: boolean;
        suffix?: string;
        prefix?: string;
    } = {}
): string {
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    const { decimals = 0, compact = false, suffix = '', prefix = '' } = options;
    
    if (compact) {
        const absValue = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        
        if (absValue >= 1e12) {
            return `${prefix}${sign}${(absValue / 1e12).toFixed(decimals)}T${suffix}`;
        } else if (absValue >= 1e9) {
            return `${prefix}${sign}${(absValue / 1e9).toFixed(decimals)}B${suffix}`;
        } else if (absValue >= 1e6) {
            return `${prefix}${sign}${(absValue / 1e6).toFixed(decimals)}M${suffix}`;
        } else if (absValue >= 1e3) {
            return `${prefix}${sign}${(absValue / 1e3).toFixed(decimals)}k${suffix}`;
        }
    }
    
    return `${prefix}${value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    })}${suffix}`;
}

export function formatCurrency(
    value: number | null | undefined,
    options: {
        currency?: string;
        compact?: boolean;
        decimals?: number;
    } = {}
): string {
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    const { currency = 'USD', compact = true, decimals = 0 } = options;
    
    if (compact) {
        return formatNumber(value, { decimals, compact: true, prefix: '$' });
    }
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

export function formatPercent(
    value: number | null | undefined,
    options: {
        decimals?: number;
        multiplyBy100?: boolean;
    } = {}
): string {
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    const { decimals = 1, multiplyBy100 = false } = options;
    const displayValue = multiplyBy100 ? value * 100 : value;
    
    return `${displayValue.toFixed(decimals)}%`;
}

export function formatMoz(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return formatNumber(value, { decimals: 2, suffix: ' Moz' });
}