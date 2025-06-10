// src/pages/scatter-score-pro/types.ts
import type { Company, NormalizationMode, ImputationMode } from '../../lib/types';
import type { ScatterDataPoint } from 'chart.js';

export interface AxisMetricConfig {
  key: string;
  metricLabel: string;
  weight: number;
  userHigherIsBetter: boolean;
  originalHigherIsBetter: boolean;
}

export interface TemplateMetricConfig {
  key: string;
  weight: number;
  userHigherIsBetter?: boolean;
  required?: boolean;
  alternativeKeys?: string[];
  category?: string;
  description?: string;
  condition?: (company: Company) => boolean;
}

export interface ScatterScoreTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  tags?: string[];
  xMetricsConfig: TemplateMetricConfig[];
  yMetricsConfig: TemplateMetricConfig[];
  zMetricKey?: string | null;
  zScale?: 'linear' | 'log';
  defaultNormalizationMode?: NormalizationMode;
  defaultImputationMode?: ImputationMode;
  xAxisThemeLabel?: string;
  yAxisThemeLabel?: string;
  minMetricsRequired?: number;
  maxMetricsToShow?: number;
  metricSelectionStrategy?: {
    minRequired: number;
    maxTotal: number;
    priorityGroups?: Array<{
      category: string;
      minCount: number;
    }>;
  };
}

export interface ScatterScorePlotPoint {
  company: Company;
  xScore: number | null;
  yScore: number | null;
  zValue?: number | null;
  r_normalized?: number;
}

export interface ScatterScorePlotPointData extends ScatterDataPoint {
  r_normalized: number;
  company: Company;
  xScore: number;
  yScore: number;
  zRawValue?: number | null;
}

export interface TemplateConfig {
  xAxisThemeLabel?: string;
  yAxisThemeLabel?: string;
}

export interface ChartSettings {
  pointRadius: (n: number) => number;
  pointHoverRadius: (n: number) => number;
}

export interface StatusColors {
  [key: string]: {
    background: string;
    border: string;
  };
}