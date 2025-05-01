// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Debug logging configuration
const DEBUG = process.env.NODE_ENV === 'development';
const logDebug = (message: string, data?: any) => {
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

  if (!key) {
    logDebug('getNestedValue: Empty key provided', { obj });
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

      if (!(segment in current)) {
        logDebug(`getNestedValue: Property ${segment} not found`, {
          fullPath: key,
          currentPath: path.slice(0, i).join('.'),
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

// Number formatting with enhanced options and validation
interface NumberFormatOptions {
  decimals?: number;
  compact?: boolean;
  suffix?: string;
  prefix?: string;
  allowNegative?: boolean;
  roundingMethod?: 'floor' | 'ceil' | 'round';
}

export function formatNumber(value: number | null | undefined, options: NumberFormatOptions = {}): string {
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
    roundingMethod = 'round'
  } = options;

  try {
    // Handle negative numbers
    if (!allowNegative && value < 0) {
      logDebug('formatNumber: Negative value provided when not allowed', { value });
      return '-';
    }

    // For small numbers (less than 1), always show more decimal places
    const effectiveDecimals = Math.abs(value) < 1 ? Math.max(decimals, 3) : decimals;

    // Apply rounding method
    let roundedValue = value;
    switch (roundingMethod) {
      case 'floor':
        roundedValue = Math.floor(value * Math.pow(10, effectiveDecimals)) / Math.pow(10, effectiveDecimals);
        break;
      case 'ceil':
        roundedValue = Math.ceil(value * Math.pow(10, effectiveDecimals)) / Math.pow(10, effectiveDecimals);
        break;
      default:
        roundedValue = Number(value.toFixed(effectiveDecimals));
    }

    let formattedValue: string;
    if (compact) {
      const absValue = Math.abs(roundedValue);
      if (absValue >= 1e9) {
        formattedValue = (roundedValue / 1e9).toFixed(effectiveDecimals) + 'B';
      } else if (absValue >= 1e6) {
        formattedValue = (roundedValue / 1e6).toFixed(effectiveDecimals) + 'M';
      } else if (absValue >= 1e3) {
        formattedValue = (roundedValue / 1e3).toFixed(effectiveDecimals) + 'k';
      } else {
        formattedValue = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: effectiveDecimals,
          maximumFractionDigits: effectiveDecimals,
        }).format(roundedValue);
      }
    } else {
      formattedValue = new Intl.NumberFormat('en-US', {
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
    decimals = undefined
  } = options;

  try {
    const currencySymbol = showSymbol ? currency : '';
    const absValue = Math.abs(value);
    
    // Determine number of decimal places based on value magnitude
    let effectiveDecimals = decimals;
    if (effectiveDecimals === undefined) {
      if (roundToWhole) {
        effectiveDecimals = 0;
      } else if (absValue < 0.01) {
        effectiveDecimals = 4; // Show 4 decimals for very small values
      } else if (absValue < 1) {
        effectiveDecimals = 3; // Show 3 decimals for small values
      } else {
        effectiveDecimals = 2; // Standard 2 decimals for normal values
      }
    }

    if (compact && absValue >= 1000) {
      return formatNumber(value, {
        decimals: effectiveDecimals,
        compact: true,
        suffix: ` ${currencySymbol}`,
      });
    }

    return new Intl.NumberFormat('en-US', {
      style: showSymbol ? 'currency' : 'decimal',
      currency,
      maximumFractionDigits: effectiveDecimals,
      minimumFractionDigits: effectiveDecimals,
    }).format(value);
  } catch (error) {
    console.error('formatCurrency: Error formatting value', { value, options, error });
    return formatNumber(value, { decimals: 2 }) + ` ${currency}`;
  }
}

// Enhanced percentage formatting
interface PercentFormatOptions {
  decimals?: number;
  showSymbol?: boolean;
  multiplyBy100?: boolean;
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
    multiplyBy100 = false
  } = options;

  try {
    const adjustedValue = multiplyBy100 ? value * 100 : value;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(adjustedValue);

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
}

export function formatMoz(
  value: number | null | undefined,
  options: MozFormatOptions = {}
): string {
  if (!isValidNumber(value)) {
    logDebug('formatMoz: Invalid value provided', { value, options });
    return '-';
  }

  const { decimals = 2, showUnit = true } = options;
  const suffix = showUnit ? ' Moz' : '';
  return formatNumber(value, { decimals, suffix });
}

// Enhanced Koz (Thousand ounces) formatting
interface KozFormatOptions {
  decimals?: number;
  showUnit?: boolean;
}

export function formatKoz(
  value: number | null | undefined,
  options: KozFormatOptions = {}
): string {
  if (!isValidNumber(value)) {
    logDebug('formatKoz: Invalid value provided', { value, options });
    return '-';
  }

  const { decimals = 0, showUnit = true } = options;
  const suffix = showUnit ? ' koz' : '';
  return formatNumber(value, { decimals, suffix });
}

// Data validation utilities
export const validators = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidDate: (date: any): boolean => {
    if (date instanceof Date) return !isNaN(date.getTime());
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }
    return false;
  }
};

// Array utilities
export const arrayUtils = {
  unique: <T>(arr: T[]): T[] => [...new Set(arr)],
  
  sortBy: <T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },
  
  groupBy: <T>(arr: T[], key: keyof T): Record<string, T[]> => {
    return arr.reduce((acc, item) => {
      const groupKey = String(item[key]);
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
};