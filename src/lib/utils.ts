// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Debug logging configuration
const DEBUG = process.env.NODE_ENV === 'development';

export const logDebug = (message: string, data?: any) => {
  if (DEBUG) {
    console.debug(`[Utils] ${message}`, data);
  }
};

// Enhanced class name utility
export function cn(...inputs: ClassValue[]): string {
  try {
    return twMerge(clsx(inputs));
  } catch (error) {
    console.error('[Utils] Error merging classes:', error);
    return '';
  }
}

// Type guard for checking if a value is a valid number
export function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// Enhanced nested value accessor with detailed error handling
export function getNestedValue(obj: any, key: string): any {
  // Input validation
  if (!obj) {
    logDebug('getNestedValue: Null or undefined object provided', { key });
    return null;
  }

  if (!key || typeof key !== 'string') {
    logDebug('getNestedValue: Invalid key provided', { key, obj });
    return null;
  }

  try {
    const path = key.split('.');
    let current = obj;
    
    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      
      if (current === null || current === undefined) {
        logDebug(`getNestedValue: Null/undefined encountered at path segment ${segment}`, {
          fullPath: key,
          currentPath: path.slice(0, i).join('.'),
          remainingPath: path.slice(i).join('.')
        });
        return null;
      }

      // Check if property exists using Object.prototype.hasOwnProperty for safety
      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        logDebug(`getNestedValue: Property ${segment} not found`, {
          fullPath: key,
          currentPath: path.slice(0, i).join('.'),
          availableKeys: Object.keys(current),
          currentValue: current
        });
        return null;
      }

      current = current[segment];
    }

    if (DEBUG && current === null) {
      logDebug('getNestedValue: Null value retrieved', { key, obj });
    }

    return current;
  } catch (error) {
    console.error('getNestedValue: Error accessing nested property', { key, obj, error });
    return null;
  }
}

export function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .replace(/[_-]/g, ' ') // Combined regex for both underscore and hyphen
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim(); // Added trim to remove any extra whitespace
}

// Number formatting with enhanced options and validation
interface NumberFormatOptions {
  decimals?: number;
  compact?: boolean;
  suffix?: string;
  prefix?: string;
  allowNegative?: boolean;
  roundingMethod?: 'floor' | 'ceil' | 'round';
  locale?: string; // Added locale support
}

export function formatNumber(
  value: number | null | undefined, 
  options: NumberFormatOptions = {}
): string {
  // Validate input
  if (!isValidNumber(value)) {
    logDebug('formatNumber: Invalid value provided', { value, options });
    return '-';
  }

  const {
    decimals = 0,
    compact = false,
    suffix = '',
    prefix = '',
    allowNegative = true,
    roundingMethod = 'round',
    locale = 'en-US'
  } = options;

  try {
    // Handle negative numbers
    if (!allowNegative && value < 0) {
      logDebug('formatNumber: Negative value provided when not allowed', { value });
      return '-';
    }

    // For small numbers (less than 1), always show more decimal places
    const effectiveDecimals = Math.abs(value) < 1 && Math.abs(value) > 0 
      ? Math.max(decimals, 3) 
      : decimals;

    // Apply rounding method
    let roundedValue = value;
    const multiplier = Math.pow(10, effectiveDecimals);
    
    switch (roundingMethod) {
      case 'floor':
        roundedValue = Math.floor(value * multiplier) / multiplier;
        break;
      case 'ceil':
        roundedValue = Math.ceil(value * multiplier) / multiplier;
        break;
      default:
        roundedValue = Math.round(value * multiplier) / multiplier;
    }

    let formattedValue: string;
    
    if (compact) {
      const absValue = Math.abs(roundedValue);
      const sign = roundedValue < 0 ? '-' : '';
      
      if (absValue >= 1e12) {
        formattedValue = `${sign}${(absValue / 1e12).toFixed(effectiveDecimals)}T`;
      } else if (absValue >= 1e9) {
        formattedValue = `${sign}${(absValue / 1e9).toFixed(effectiveDecimals)}B`;
      } else if (absValue >= 1e6) {
        formattedValue = `${sign}${(absValue / 1e6).toFixed(effectiveDecimals)}M`;
      } else if (absValue >= 1e3) {
        formattedValue = `${sign}${(absValue / 1e3).toFixed(effectiveDecimals)}k`;
      } else {
        formattedValue = new Intl.NumberFormat(locale, {
          minimumFractionDigits: effectiveDecimals,
          maximumFractionDigits: effectiveDecimals,
        }).format(roundedValue);
      }
    } else {
      formattedValue = new Intl.NumberFormat(locale, {
        minimumFractionDigits: effectiveDecimals,
        maximumFractionDigits: effectiveDecimals,
      }).format(roundedValue);
    }

    return `${prefix}${formattedValue}${suffix}`;
  } catch (error) {
    console.error('formatNumber: Error formatting value', { value, options, error });
    return String(value);
  }
}

// Enhanced currency formatting with validation and error handling
interface CurrencyFormatOptions {
  currency?: string;
  compact?: boolean;
  showSymbol?: boolean;
  roundToWhole?: boolean;
  decimals?: number;
  locale?: string;
}

export function formatCurrency(
  value: number | null | undefined,
  options: CurrencyFormatOptions = {}
): string {
  if (!isValidNumber(value)) {
    logDebug('formatCurrency: Invalid value provided', { value, options });
    return '-';
  }

  const {
    currency = 'USD',
    compact = true,
    showSymbol = true,
    roundToWhole = false,
    decimals = undefined,
    locale = 'en-US'
  } = options;

  try {
    const currencySymbol = showSymbol ? currency : '';
    const absValue = Math.abs(value);
    
    // Determine number of decimal places based on value magnitude
    let effectiveDecimals = decimals;
    if (effectiveDecimals === undefined) {
      if (roundToWhole) {
        effectiveDecimals = 0;
      } else if (absValue < 0.001 && absValue > 0) {
        effectiveDecimals = 4; // Show 4 decimals for very small values
      } else if (absValue < 1) {
        effectiveDecimals = 3; // Show 3 decimals for small values
      } else if (absValue >= 1000000) {
        effectiveDecimals = 1; // Less precision for large numbers in compact mode
      } else {
        effectiveDecimals = 2; // Standard 2 decimals for normal values
      }
    }

    if (compact && absValue >= 1000) {
      return formatNumber(value, {
        decimals: effectiveDecimals,
        compact: true,
        suffix: showSymbol ? ` ${currencySymbol}` : '',
        locale
      });
    }

    return new Intl.NumberFormat(locale, {
      style: showSymbol ? 'currency' : 'decimal',
      currency,
      maximumFractionDigits: effectiveDecimals,
      minimumFractionDigits: effectiveDecimals,
    }).format(value);
  } catch (error) {
    console.error('formatCurrency: Error formatting value', { value, options, error });
    return formatNumber(value, { decimals: 2, locale }) + (showSymbol ? ` ${currency}` : '');
  }
}

// Enhanced percentage formatting
interface PercentFormatOptions {
  decimals?: number;
  showSymbol?: boolean;
  multiplyBy100?: boolean;
  locale?: string;
}

export function formatPercent(
  value: number | null | undefined,
  options: PercentFormatOptions = {}
): string {
  if (!isValidNumber(value)) {
    logDebug('formatPercent: Invalid value provided', { value, options });
    return '-';
  }

  const {
    decimals = 1,
    showSymbol = true,
    multiplyBy100 = false,
    locale = 'en-US'
  } = options;

  try {
    const adjustedValue = multiplyBy100 ? value * 100 : value;
    
    // Clamp percentage values to reasonable bounds
    const clampedValue = Math.max(-9999, Math.min(9999, adjustedValue));
    
    const formatted = new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(clampedValue);

    return showSymbol ? `${formatted}%` : formatted;
  } catch (error) {
    console.error('formatPercent: Error formatting value', { value, options, error });
    return `${value}${showSymbol ? '%' : ''}`;
  }
}

// Enhanced Moz (Million ounces) formatting
interface MozFormatOptions {
  decimals?: number;
  showUnit?: boolean;
  locale?: string;
}

export function formatMoz(
  value: number | null | undefined,
  options: MozFormatOptions = {}
): string {
  if (!isValidNumber(value)) {
    logDebug('formatMoz: Invalid value provided', { value, options });
    return '-';
  }

  const { decimals = 2, showUnit = true, locale = 'en-US' } = options;
  const suffix = showUnit ? ' Moz' : '';
  return formatNumber(value, { decimals, suffix, locale });
}

// Enhanced Koz (Thousand ounces) formatting
interface KozFormatOptions {
  decimals?: number;
  showUnit?: boolean;
  locale?: string;
}

export function formatKoz(
  value: number | null | undefined,
  options: KozFormatOptions = {}
): string {
  if (!isValidNumber(value)) {
    logDebug('formatKoz: Invalid value provided', { value, options });
    return '-';
  }

  const { decimals = 0, showUnit = true, locale = 'en-US' } = options;
  const suffix = showUnit ? ' koz' : '';
  return formatNumber(value, { decimals, suffix, locale });
}

// Data validation utilities with improved type safety
export const validators = {
  isValidEmail: (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },
  
  isValidUrl: (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidDate: (date: any): date is Date => {
    if (date instanceof Date) return !isNaN(date.getTime());
    if (typeof date === 'string' || typeof date === 'number') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    return false;
  }
};

// Improved array utilities with better type safety
export const arrayUtils = {
  unique: <T>(arr: T[]): T[] => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr)];
  },
  
  sortBy: <T>(
    arr: T[], 
    key: keyof T, 
    direction: 'asc' | 'desc' = 'asc'
  ): T[] => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? -1 : 1;
      if (bVal == null) return direction === 'asc' ? 1 : -1;
      
      // Compare values
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },
  
  groupBy: <T>(arr: T[], key: keyof T): Record<string, T[]> => {
    if (!Array.isArray(arr)) return {};
    
    return arr.reduce((acc, item) => {
      if (item && key in item) {
        const groupKey = String(item[key]);
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
      }
      return acc;
    }, {} as Record<string, T[]>);
  },
  
  // New utility: chunk array into smaller arrays
  chunk: <T>(arr: T[], size: number): T[][] => {
    if (!Array.isArray(arr) || size <= 0) return [];
    
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
};
