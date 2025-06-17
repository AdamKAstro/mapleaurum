// src/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

// Optimized cache with WeakMap for object references and Map for paths
// This prevents memory leaks and improves performance
const nestedValueCache = new WeakMap<object, Map<string, { value: any; timestamp: number }>>();
const CACHE_TTL = 5000; // 5 seconds cache TTL to prevent stale data

// Track repeated calls to prevent log spam
const callTracker = new Map<string, number>();
const CALL_THRESHOLD = 10; // Log warning after this many repeated calls

// Enhanced nested value accessor with optimized caching
export function getNestedValue(obj: any, key: string, defaultValue: any = null): any {
  // Input validation
  if (!obj || !key || typeof key !== 'string') {
    const trackKey = `invalid:${key}`;
    const callCount = (callTracker.get(trackKey) || 0) + 1;
    callTracker.set(trackKey, callCount);
    
    if (DEBUG && callCount === 1) {
      if (!obj) logDebug('getNestedValue: Null or undefined object provided', { key });
      if (!key || typeof key !== 'string') logDebug('getNestedValue: Invalid key provided', { key, obj });
    } else if (DEBUG && callCount === CALL_THRESHOLD) {
      logDebug(`getNestedValue: Repeated invalid calls detected (${callCount}x) for key: ${key}. Suppressing further logs.`);
    }
    
    return defaultValue;
  }

  try {
    // Check cache using WeakMap (object) -> Map (path -> value)
    let pathCache = nestedValueCache.get(obj);
    if (!pathCache) {
      pathCache = new Map();
      nestedValueCache.set(obj, pathCache);
    }

    const cached = pathCache.get(key);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      return cached.value;
    }

    // Track repeated cache misses
    const missKey = `miss:${key}`;
    const missCount = (callTracker.get(missKey) || 0) + 1;
    callTracker.set(missKey, missCount);

    const path = key.split('.');
    let current = obj;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      
      if (current === null || current === undefined) {
        if (DEBUG && missCount <= 3) { // Only log first 3 misses
          logDebug(`getNestedValue: Null/undefined at segment ${segment} (${missCount}x)`, {
            fullPath: key,
            currentPath: path.slice(0, i).join('.'),
          });
        }
        pathCache.set(key, { value: defaultValue, timestamp: now });
        return defaultValue;
      }

      if (!Object.prototype.hasOwnProperty.call(current, segment)) {
        if (DEBUG && missCount <= 3) { // Only log first 3 misses
          logDebug(`getNestedValue: Property ${segment} not found (${missCount}x)`, {
            fullPath: key,
            currentPath: path.slice(0, i).join('.'),
            availableKeys: Object.keys(current).slice(0, 10), // Limit keys shown
          });
        }
        pathCache.set(key, { value: defaultValue, timestamp: now });
        return defaultValue;
      }

      current = current[segment];
    }

    const result = current === null || current === undefined ? defaultValue : current;
    pathCache.set(key, { value: result, timestamp: now });
    
    // Clear call tracker periodically to prevent memory buildup
    if (callTracker.size > 1000) {
      callTracker.clear();
    }
    
    return result;
  } catch (error) {
    console.error('getNestedValue: Error accessing nested property', { key, error });
    return defaultValue;
  }
}

// Clear caches periodically to prevent memory issues
if (typeof window !== 'undefined') {
  setInterval(() => {
    callTracker.clear();
  }, 60000); // Clear call tracker every minute
}

export function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

interface NumberFormatOptions {
  decimals?: number;
  compact?: boolean;
  suffix?: string;
  prefix?: string;
  allowNegative?: boolean;
  roundingMethod?: 'floor' | 'ceil' | 'round';
  locale?: string;
}

export function formatNumber(value: number | null | undefined, options: NumberFormatOptions = {}): string {
  if (!isValidNumber(value)) {
    if (DEBUG) logDebug('formatNumber: Invalid value provided', { value, options });
    return '-';
  }

  const {
    decimals = 0,
    compact = false,
    suffix = '',
    prefix = '',
    allowNegative = true,
    roundingMethod = 'round',
    locale = 'en-US',
  } = options;

  try {
    if (!allowNegative && value < 0) {
      if (DEBUG) logDebug('formatNumber: Negative value provided when not allowed', { value });
      return '-';
    }

    const effectiveDecimals = Math.abs(value) < 1 && Math.abs(value) > 0 ? Math.max(decimals, 3) : decimals;
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

interface CurrencyFormatOptions {
  currency?: string;
  compact?: boolean;
  showSymbol?: boolean;
  roundToWhole?: boolean;
  decimals?: number;
  locale?: string;
}

export function formatCurrency(value: number | null | undefined, options: CurrencyFormatOptions = {}): string {
  if (!isValidNumber(value)) {
    if (DEBUG) logDebug('formatCurrency: Invalid value provided', { value, options });
    return '-';
  }

  const {
    currency = 'USD',
    compact = true,
    showSymbol = true,
    roundToWhole = false,
    decimals = undefined,
    locale = 'en-US',
  } = options;

  try {
    const currencySymbol = showSymbol ? currency : '';
    const absValue = Math.abs(value);
    let effectiveDecimals = decimals;
    if (effectiveDecimals === undefined) {
      if (roundToWhole) {
        effectiveDecimals = 0;
      } else if (absValue < 0.001 && absValue > 0) {
        effectiveDecimals = 4;
      } else if (absValue < 1) {
        effectiveDecimals = 3;
      } else if (absValue >= 1000000) {
        effectiveDecimals = 1;
      } else {
        effectiveDecimals = 2;
      }
    }

    if (compact && absValue >= 1000) {
      return formatNumber(value, {
        decimals: effectiveDecimals,
        compact: true,
        suffix: showSymbol ? ` ${currencySymbol}` : '',
        locale,
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

interface PercentFormatOptions {
  decimals?: number;
  showSymbol?: boolean;
  multiplyBy100?: boolean;
  locale?: string;
}

export function formatPercent(value: number | null | undefined, options: PercentFormatOptions = {}): string {
  if (!isValidNumber(value)) {
    if (DEBUG) logDebug('formatPercent: Invalid value provided', { value, options });
    return '-';
  }

  const {
    decimals = 1,
    showSymbol = true,
    multiplyBy100 = false,
    locale = 'en-US',
  } = options;

  try {
    const adjustedValue = multiplyBy100 ? value * 100 : value;
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

interface MozFormatOptions {
  decimals?: number;
  showUnit?: boolean;
  locale?: string;
}

export function formatMoz(value: number | null | undefined, options: MozFormatOptions = {}): string {
  if (!isValidNumber(value)) {
    if (DEBUG) logDebug('formatMoz: Invalid value provided', { value, options });
    return '-';
  }

  const { decimals = 2, showUnit = true, locale = 'en-US' } = options;
  const suffix = showUnit ? ' Moz' : '';
  return formatNumber(value, { decimals, suffix, locale });
}

interface KozFormatOptions {
  decimals?: number;
  showUnit?: boolean;
  locale?: string;
}

export function formatKoz(value: number | null | undefined, options: KozFormatOptions = {}): string {
  if (!isValidNumber(value)) {
    if (DEBUG) logDebug('formatKoz: Invalid value provided', { value, options });
    return '-';
  }

  const { decimals = 0, showUnit = true, locale = 'en-US' } = options;
  const suffix = showUnit ? ' koz' : '';
  return formatNumber(value, { decimals, suffix, locale });
}

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
  },
};

export const arrayUtils = {
  unique: <T>(arr: T[]): T[] => {
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr)];
  },
  sortBy: <T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === 'asc' ? -1 : 1;
      if (bVal == null) return direction === 'asc' ? 1 : -1;
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
  chunk: <T>(arr: T[], size: number): T[][] => {
    if (!Array.isArray(arr) || size <= 0) return [];
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },
};

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a.constructor !== b.constructor) return false;

  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a) {
      if (!b.has(key) || !deepEqual(val, b.get(key))) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    const bValues = [...b];
    for (const valA of a) {
      if (!bValues.some(valB => deepEqual(valA, valB))) return false;
    }
    return true;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// FIXED: Added the missing debounce utility function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function(this: ThisParameterType<T>, ...args: Parameters<T>): void {
    const context = this;
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      func.apply(context, args);
    }, wait);
  };
}