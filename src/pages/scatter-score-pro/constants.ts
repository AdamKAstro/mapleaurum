// src/pages/scatter-score-pro/constants.ts
import type { StatusColors, ChartSettings } from './types';

export const DEBUG_SCATTER_SCORE = process.env.NODE_ENV === 'development';

export const DEFAULT_WEIGHT_FOR_NEW_METRIC = 5;

export const STATUS_COLORS: StatusColors = {
  producer: { background: 'rgba(34,197,94,0.7)', border: 'rgb(12,163,74)' },
  developer: { background: 'rgba(59,130,246,0.7)', border: 'rgb(37,99,195)' },
  explorer: { background: 'rgba(168,85,247,0.7)', border: 'rgb(147,51,194)' },
  royalty: { background: 'rgba(244,162,97,0.7)', border: 'rgb(217,119,6)' },
  other: { background: 'rgba(107,114,128,0.7)', border: 'rgb(75,85,99)' },
  default: { background: 'rgba(107,114,128,0.7)', border: 'rgb(75,85,99)' }
};

export const CHART_SETTINGS: ChartSettings = {
  pointRadius: (n: number): number => 6 + (Math.max(0, Math.min(1, n || 0)) * 35),
  pointHoverRadius: (n: number): number => 8 + (Math.max(0, Math.min(1, n || 0)) * 48)
};

export const CHART_COLORS = {
  axisTitle: '#94A3B8',
  axisTicks: '#64748B',
  gridColor: 'rgba(51,65,85,0.2)',
  borderColor: 'rgba(51,65,85,0.5)',
  legendText: '#CBD5E1',
  tooltipBg: 'rgba(15,23,42,0.9)',
  tooltipTitle: '#5EEAD4',
  tooltipBody: '#E2E8F0',
  tooltipBorder: 'rgba(51,65,85,0.7)'
};

export const ANIMATION_CONFIG = {
  panel: {
    type: "spring" as const,
    stiffness: 300,
    damping: 30
  },
  fadeIn: {
    duration: 0.2,
    delay: 0.1
  }
};