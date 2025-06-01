// src/pages/scatter-score-pro/hooks/useTemplateLoader.ts
import { useState, useEffect, useCallback } from 'react';
import type { 
  ScatterScoreTemplate, 
  AxisMetricConfig,
  TemplateConfig 
} from '../types';
import type { MetricConfig } from '../../../lib/metric-types';
import type { NormalizationMode, ImputationMode } from '../../../lib/types';
import { DEBUG_SCATTER_SCORE } from '../constants';

interface UseTemplateLoaderProps {
  templates: ScatterScoreTemplate[];
  accessibleMetrics: MetricConfig[];
  getMetricConfigDetails: (key: string) => MetricConfig | undefined;
  normalizeWeights: (
    metrics: AxisMetricConfig[],
    changedMetricKey?: string,
    userSetWeightForChangedMetric?: number,
    isNewMetric?: boolean
  ) => AxisMetricConfig[];
  onTemplateApplied?: () => void;
}

interface UseTemplateLoaderReturn {
  activeTemplateName: string | null;
  selectedXMetrics: AxisMetricConfig[];
  selectedYMetrics: AxisMetricConfig[];
  selectedZMetricKey: string | null;
  zScale: 'linear' | 'log';
  normalizationMode: string;
  imputationMode: string;
  currentTemplateConfig: TemplateConfig;
  isTemplateLoading: boolean;
  isTemplateReady: boolean;
  loadTemplate: (templateName: string | null) => Promise<void>;
  setActiveTemplateName: (name: string | null) => void;
  updateMetrics: (
    x: AxisMetricConfig[], 
    y: AxisMetricConfig[], 
    z: string | null
  ) => void;
  setZScale: (scale: 'linear' | 'log') => void;
  setNormalizationMode: (mode: string) => void;
  setImputationMode: (mode: string) => void;
}

export function useTemplateLoader({
  templates,
  accessibleMetrics,
  getMetricConfigDetails,
  normalizeWeights,
  onTemplateApplied
}: UseTemplateLoaderProps): UseTemplateLoaderReturn {
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(() => 
    templates.length > 0 ? templates[0].name : null
  );
  const [selectedXMetrics, setSelectedXMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedYMetrics, setSelectedYMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedZMetricKey, setSelectedZMetricKey] = useState<string | null>(null);
  const [zScale, setZScale] = useState<'linear' | 'log'>('log');
  const [normalizationMode, setNormalizationMode] = useState('dataset_rank_percentile');
  const [imputationMode, setImputationMode] = useState('dataset_median');
  const [currentTemplateConfig, setCurrentTemplateConfig] = useState<TemplateConfig>({});
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isTemplateReady, setIsTemplateReady] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  const filterAndMapMetrics = useCallback((
    templateMetrics: ScatterScoreTemplate['xMetricsConfig'],
    maxMetrics?: number
  ): AxisMetricConfig[] => {
    const mapped = templateMetrics
      .map(m => {
        const mc = getMetricConfigDetails(m.key);
        if (!mc || !accessibleMetrics.some(am => am.key === m.key)) {
          // Try alternative keys if provided
          if (m.alternativeKeys) {
            for (const altKey of m.alternativeKeys) {
              const altMc = getMetricConfigDetails(altKey);
              if (altMc && accessibleMetrics.some(am => am.key === altKey)) {
                return {
                  key: altKey,
                  metricLabel: altMc.label,
                  weight: m.weight,
                  userHigherIsBetter: m.userHigherIsBetter ?? altMc.higherIsBetter,
                  originalHigherIsBetter: altMc.higherIsBetter
                };
              }
            }
          }
          return null;
        }
        return {
          key: m.key,
          metricLabel: mc.label,
          weight: m.weight,
          userHigherIsBetter: m.userHigherIsBetter ?? mc.higherIsBetter,
          originalHigherIsBetter: mc.higherIsBetter
        };
      })
      .filter(Boolean) as AxisMetricConfig[];

    // Apply max metrics limit if specified
    if (maxMetrics && mapped.length > maxMetrics) {
      // Sort by weight descending and take top N
      return mapped
        .sort((a, b) => b.weight - a.weight)
        .slice(0, maxMetrics);
    }

    return mapped;
  }, [accessibleMetrics, getMetricConfigDetails]);

  const loadTemplate = useCallback(async (templateName: string | null): Promise<void> => {
    if (DEBUG_SCATTER_SCORE) {
      console.log(`[useTemplateLoader] Loading template: '${templateName}'`);
    }

    setIsTemplateLoading(true);
    setIsTemplateReady(false);

    const template = templates.find(t => t.name === templateName) || templates[0];

    if (!template) {
      if (DEBUG_SCATTER_SCORE) {
        console.warn('[useTemplateLoader] No template found');
      }
      setSelectedXMetrics([]);
      setSelectedYMetrics([]);
      setSelectedZMetricKey(null);
      setActiveTemplateName(null);
      setCurrentTemplateConfig({});
      setIsTemplateLoading(false);
      setIsTemplateReady(false);
      return;
    }

    setActiveTemplateName(template.name);
    setCurrentTemplateConfig({
      xAxisThemeLabel: template.xAxisThemeLabel,
      yAxisThemeLabel: template.yAxisThemeLabel
    });

    // Filter and map metrics with smart selection
    const maxToShow = template.maxMetricsToShow || 15;
    const xMetrics = normalizeWeights(
      filterAndMapMetrics(template.xMetricsConfig, maxToShow)
    );
    const yMetrics = normalizeWeights(
      filterAndMapMetrics(template.yMetricsConfig, maxToShow)
    );

    setSelectedXMetrics(xMetrics);
    setSelectedYMetrics(yMetrics);

    // Handle Z metric
    const zAccessible = template.zMetricKey 
      ? accessibleMetrics.some(am => am.key === template.zMetricKey) 
      : false;
    setSelectedZMetricKey(zAccessible && template.zMetricKey ? template.zMetricKey : null);
    
    // Set other template settings
    setZScale(template.zScale || 'log');
    setNormalizationMode(template.defaultNormalizationMode || 'dataset_rank_percentile');
    setImputationMode(template.defaultImputationMode || 'dataset_median');

    // Small delay to ensure all state updates complete
    await new Promise(resolve => setTimeout(resolve, 50));

    setIsTemplateLoading(false);
    setIsTemplateReady(true);

    if (DEBUG_SCATTER_SCORE) {
      console.log(`[useTemplateLoader] Template '${template.name}' loaded successfully`);
      console.log(`  X Metrics: ${xMetrics.length}, Y Metrics: ${yMetrics.length}`);
    }
  }, [templates, accessibleMetrics, normalizeWeights, filterAndMapMetrics]);

  // Initial load effect - ensures template loads and applies on mount
  useEffect(() => {
    if (!hasInitialLoad && activeTemplateName && accessibleMetrics.length > 0) {
      const performInitialLoad = async () => {
        if (DEBUG_SCATTER_SCORE) {
          console.log('[useTemplateLoader] Performing initial load');
        }
        
        await loadTemplate(activeTemplateName);
        setHasInitialLoad(true);
        
        // Wait for template to be ready, then trigger application
        setTimeout(() => {
          if (onTemplateApplied) {
            onTemplateApplied();
          }
        }, 100);
      };

      performInitialLoad();
    }
  }, [hasInitialLoad, activeTemplateName, accessibleMetrics.length, loadTemplate, onTemplateApplied]);

  const updateMetrics = useCallback((
    x: AxisMetricConfig[], 
    y: AxisMetricConfig[], 
    z: string | null
  ) => {
    setSelectedXMetrics(x);
    setSelectedYMetrics(y);
    setSelectedZMetricKey(z);
    // Clear active template when manually updating metrics
    setActiveTemplateName(null);
  }, []);

  return {
    activeTemplateName,
    selectedXMetrics,
    selectedYMetrics,
    selectedZMetricKey,
    zScale,
    normalizationMode,
    imputationMode,
    currentTemplateConfig,
    isTemplateLoading,
    isTemplateReady,
    loadTemplate,
    setActiveTemplateName,
    updateMetrics,
    setZScale,
    setNormalizationMode,
    setImputationMode
  };
}