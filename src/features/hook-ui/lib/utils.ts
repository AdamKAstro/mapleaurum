// src/features/hook-ui/lib/utils.ts

import { debugLog } from '../config/debug-config';

// Utility functions for data processing and validation
export const safeString = (value: any, defaultValue: string = 'N/A'): string => {
  try {
    if (value === null || value === undefined || value === '') return defaultValue;
    return String(value).trim();
  } catch (error) {
    debugLog('dataProcessing', `safeString error for value: ${value}`, error);
    return defaultValue;
  }
};

export const safeNumber = (value: any, defaultValue: number = 0): number => {
  try {
    if (value === null || value === undefined) return defaultValue;
    const num = Number(value);
    return isFinite(num) ? num : defaultValue;
  } catch (error) {
    debugLog('dataProcessing', `safeNumber error for value: ${value}`, error);
    return defaultValue;
  }
};

export const safeArray = <T,>(value: any, defaultValue: T[] = []): T[] => {
  try {
    if (!Array.isArray(value)) return defaultValue;
    return value.filter(item => item !== null && item !== undefined);
  } catch (error) {
    debugLog('dataProcessing', `safeArray error for value: ${value}`, error);
    return defaultValue;
  }
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    debugLog('logoLoading', `Valid URL: ${url}`);
    return true;
  } catch {
    debugLog('logoLoading', `Invalid URL: ${url}`);
    return false;
  }
};

export const getDefaultLogo = (name: string): string => {
  try {
    const firstLetter = safeString(name, 'X').charAt(0).toUpperCase();
    const defaultLogo = `https://ui-avatars.com/api/?name=${firstLetter}&background=0F172A&color=06B6D4&size=128&bold=true&font-size=0.5`;
    debugLog('logoLoading', `Generated default logo for ${name}: ${defaultLogo}`);
    return defaultLogo;
  } catch (error) {
    debugLog('logoLoading', `Error generating default logo for name: ${name}`, error);
    return 'https://via.placeholder.com/64';
  }
};

// Format currency with options
export const formatCurrency = (value: number, options: { decimals?: number; compact?: boolean } = {}): string => {
  const { decimals = 0, compact = false } = options;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    notation: compact ? 'compact' : 'standard',
  }).format(value);
};

// Format numbers with options
export const formatNumber = (value: number, options: { decimals?: number } = {}): string => {
  const { decimals = 0 } = options;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
  }).format(value);
};

// Format percentage
export const formatPercent = (value: number, options: { decimals?: number } = {}): string => {
  const { decimals = 0 } = options;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: decimals,
  }).format(value);
};

// Array utilities
export const arrayUtils = {
  unique: <T>(array: T[]): T[] => [...new Set(array)],
  
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
  
  shuffle: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
};

// Export cn function if it doesn't exist elsewhere
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};