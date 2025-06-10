// src/pages/scatter-score-pro/hooks/useTemplateLoader.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type { 
  ScatterScoreTemplate, 
  AxisMetricConfig,
  TemplateConfig,
  TemplateMetricConfig
} from '../types';
import type { MetricConfig, NormalizationMode, ImputationMode } from '../../../lib/types';
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
  normalizationMode: NormalizationMode;
  imputationMode: ImputationMode;
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
  setNormalizationMode: (mode: NormalizationMode) => void;
  setImputationMode: (mode: ImputationMode) => void;
}

// Default values for better maintainability
const DEFAULT_Z_SCALE: 'linear' | 'log' = 'log';
const DEFAULT_NORMALIZATION_MODE: NormalizationMode = 'dataset_rank_percentile';
const DEFAULT_IMPUTATION_MODE: ImputationMode = 'dataset_median';
const STATE_UPDATE_DELAY = 50; // ms

// Helper function for safe JSON logging
const safeJSONLog = (obj: any): any => {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    return 'Unable to stringify object';
  }
};

export function useTemplateLoader({
  templates,
  accessibleMetrics,
  getMetricConfigDetails,
  normalizeWeights,
  onTemplateApplied
}: UseTemplateLoaderProps): UseTemplateLoaderReturn {
  // State management with stable initial values
  const [activeTemplateName, setActiveTemplateName] = useState<string | null>(() => 
    templates?.length > 0 ? templates[0].name : null
  );
  const [selectedXMetrics, setSelectedXMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedYMetrics, setSelectedYMetrics] = useState<AxisMetricConfig[]>([]);
  const [selectedZMetricKey, setSelectedZMetricKey] = useState<string | null>(null);
  const [zScale, setZScale] = useState<'linear' | 'log'>(DEFAULT_Z_SCALE);
  const [normalizationMode, setNormalizationModeState] = useState<NormalizationMode>(DEFAULT_NORMALIZATION_MODE);
  const [imputationMode, setImputationModeState] = useState<ImputationMode>(DEFAULT_IMPUTATION_MODE);
  const [currentTemplateConfig, setCurrentTemplateConfig] = useState<TemplateConfig>({});
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isTemplateReady, setIsTemplateReady] = useState(false);
  const [hasInitialLoadAttempted, setHasInitialLoadAttempted] = useState(false);

  // Refs for cleanup and state tracking
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastLoadedTemplateRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Helper function to validate metric accessibility
  const isMetricAccessible = useCallback((metricKey: string): boolean => {
    if (!metricKey || typeof metricKey !== 'string') {
      if (DEBUG_SCATTER_SCORE) {
        console.warn(`[useTemplateLoader] Invalid metric key provided: ${metricKey}`);
      }
      return false;
    }
    return accessibleMetrics.some(am => am.key === metricKey);
  }, [accessibleMetrics]);

  // Enhanced metric filtering with comprehensive error handling and logging
  const filterAndMapMetrics = useCallback((
    templateMetrics: TemplateMetricConfig[],
    axisName: 'X' | 'Y' = 'X'
  ): AxisMetricConfig[] => {
    if (DEBUG_SCATTER_SCORE) {
      console.log(
        `%c[useTemplateLoader][filterAndMapMetrics] Processing ${axisName}-Axis`,
        'color: orange; font-weight: bold;'
      );
      console.log(
        `%c  Input metrics:`,
        'color: orange;',
        templateMetrics?.length ? safeJSONLog(templateMetrics) : 'Empty or Undefined'
      );
      console.log(
        `%c  Accessible metrics count: ${accessibleMetrics.length}`,
        'color: orange;'
      );
    }

    // Input validation
    if (!Array.isArray(templateMetrics)) {
      if (DEBUG_SCATTER_SCORE) {
        console.warn(
          `%c[useTemplateLoader] Invalid templateMetrics for ${axisName} axis: not an array`,
          'color: red;'
        );
      }
      return [];
    }

    if (templateMetrics.length === 0) {
      if (DEBUG_SCATTER_SCORE) {
        console.log(`[useTemplateLoader] Empty templateMetrics for ${axisName} axis`);
      }
      return [];
    }

    // Track metrics processing for debugging
    const processingResults = {
      total: templateMetrics.length,
      primaryFound: 0,
      alternativeUsed: 0,
      notFound: 0,
      errors: 0
    };

    const mapped = templateMetrics
      .map((templateMetric, index) => {
        try {
          // Validate template metric structure
          if (!templateMetric || typeof templateMetric.key !== 'string') {
            processingResults.errors++;
            if (DEBUG_SCATTER_SCORE) {
              console.error(
                `[useTemplateLoader] Invalid metric structure at index ${index}:`,
                templateMetric
              );
            }
            return null;
          }

          let metricDetail = getMetricConfigDetails(templateMetric.key);
          let currentKey = templateMetric.key;

          // Check if primary key is accessible
          const isPrimaryAccessible = metricDetail && isMetricAccessible(templateMetric.key);
          
          if (isPrimaryAccessible) {
            processingResults.primaryFound++;
          } else {
            if (DEBUG_SCATTER_SCORE) {
              console.log(
                `%c[useTemplateLoader] Primary metric '${templateMetric.key}' not accessible, checking alternatives...`,
                'color: yellow;'
              );
            }

            // Try alternative keys
            if (templateMetric.alternativeKeys && Array.isArray(templateMetric.alternativeKeys)) {
              let foundAlternative = false;
              
              for (const altKey of templateMetric.alternativeKeys) {
                if (typeof altKey !== 'string') {
                  if (DEBUG_SCATTER_SCORE) {
                    console.warn(`[useTemplateLoader] Invalid alternative key type: ${typeof altKey}`);
                  }
                  continue;
                }

                const altMc = getMetricConfigDetails(altKey);
                if (altMc && isMetricAccessible(altKey)) {
                  metricDetail = altMc;
                  currentKey = altKey;
                  foundAlternative = true;
                  processingResults.alternativeUsed++;
                  
                  if (DEBUG_SCATTER_SCORE) {
                    console.log(
                      `%c[useTemplateLoader] ✓ Using alternative key '${altKey}' for metric '${templateMetric.key}'`,
                      'color: green;'
                    );
                  }
                  break;
                }
              }

              if (!foundAlternative && DEBUG_SCATTER_SCORE) {
                console.log(
                  `[useTemplateLoader] No accessible alternatives found for '${templateMetric.key}'`
                );
              }
            }
          }
          
          // Final validation
          if (!metricDetail || !isMetricAccessible(currentKey)) {
            processingResults.notFound++;
            if (DEBUG_SCATTER_SCORE) {
              console.warn(
                `%c[useTemplateLoader] ✗ Metric '${templateMetric.key}' (and alternatives) not accessible for ${axisName} axis`,
                'color: red;'
              );
            }
            return null;
          }

          // Validate and normalize weight
          const rawWeight = templateMetric.weight;
          let weight = Number(rawWeight);
          
          if (rawWeight === undefined || rawWeight === null) {
            weight = 0;
            if (DEBUG_SCATTER_SCORE) {
              console.log(`[useTemplateLoader] No weight specified for ${currentKey}, defaulting to 0`);
            }
          } else if (isNaN(weight)) {
            weight = 0;
            if (DEBUG_SCATTER_SCORE) {
              console.warn(
                `[useTemplateLoader] Invalid weight '${rawWeight}' for metric ${currentKey}, defaulting to 0`
              );
            }
          } else if (weight < 0 || weight > 100) {
            const clampedWeight = Math.max(0, Math.min(100, weight));
            if (DEBUG_SCATTER_SCORE) {
              console.warn(
                `[useTemplateLoader] Weight ${weight} out of range for metric ${currentKey}, clamping to ${clampedWeight}`
              );
            }
            weight = clampedWeight;
          }

          // Construct the metric config
          const axisMetric: AxisMetricConfig = {
            key: currentKey,
            metricLabel: metricDetail.label || currentKey,
            weight,
            userHigherIsBetter: templateMetric.userHigherIsBetter ?? metricDetail.higherIsBetter ?? true,
            originalHigherIsBetter: metricDetail.higherIsBetter ?? true
          };

          // Include optional category for validation
          if (templateMetric.category && typeof templateMetric.category === 'string') {
            axisMetric.category = templateMetric.category;
          }

          return axisMetric;
        } catch (error) {
          processingResults.errors++;
          console.error(
            `[useTemplateLoader] Error processing metric at index ${index} ('${templateMetric?.key}'):`,
            error
          );
          return null;
        }
      })
      .filter((metric): metric is AxisMetricConfig => metric !== null);

    // Log processing summary
    if (DEBUG_SCATTER_SCORE) {
      console.log(
        `%c[useTemplateLoader][filterAndMapMetrics] ${axisName}-Axis processing complete:`,
        'color: green; font-weight: bold;'
      );
      console.log(`%c  Summary:`, 'color: green;', processingResults);
      console.log(
        `%c  Output metrics (${mapped.length}):`,
        'color: green;',
        safeJSONLog(mapped)
      );
    }
    
    return mapped;
  }, [accessibleMetrics, getMetricConfigDetails, isMetricAccessible]);

  // Main template loading function with comprehensive error handling
  const loadTemplate = useCallback(async (templateName: string | null): Promise<void> => {
    if (!isMountedRef.current) {
      if (DEBUG_SCATTER_SCORE) {
        console.log('[useTemplateLoader] Component unmounted, skipping template load');
      }
      return;
    }

    // Log loading initiation
    if (DEBUG_SCATTER_SCORE) {
      console.log(
        `%c[useTemplateLoader] loadTemplate() CALLED`,
        'color: purple; font-weight: bold; font-size: 14px;'
      );
      console.log(`%c  Template name: '${templateName}'`, 'color: purple;');
      console.log(`%c  Accessible metrics: ${accessibleMetrics.length}`, 'color: purple;');
      console.log(
        `%c  Available templates: ${templates?.map(t => t.name).join(', ') || 'None'}`,
        'color: purple;'
      );
    }

    // Prevent duplicate loads
    if (templateName && templateName === lastLoadedTemplateRef.current && isTemplateReady) {
      if (DEBUG_SCATTER_SCORE) {
        console.log(
          `%c[useTemplateLoader] Template '${templateName}' already loaded, skipping`,
          'color: blue;'
        );
      }
      return;
    }

    // Validate templates availability
    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      if (DEBUG_SCATTER_SCORE) {
        console.warn(
          '%c[useTemplateLoader] No templates available to load',
          'color: red; font-weight: bold;'
        );
      }
      setIsTemplateLoading(false);
      setIsTemplateReady(true);
      return;
    }

    setIsTemplateLoading(true);
    setIsTemplateReady(false);

    try {
      // Find template with validation
      const template = templateName 
        ? templates.find(t => t.name === templateName) 
        : templates[0];

      if (DEBUG_SCATTER_SCORE) {
        if (template) {
          console.log(
            `%c[useTemplateLoader] Found template: '${template.name}'`,
            'color: purple;',
            safeJSONLog(template)
          );
        } else {
          console.log(
            `%c[useTemplateLoader] Template '${templateName}' not found`,
            'color: red;'
          );
        }
      }

      if (!template) {
        console.warn(`[useTemplateLoader] Template "${templateName}" not found, resetting to empty state`);
        
        // Reset to empty state
        if (isMountedRef.current) {
          setSelectedXMetrics([]);
          setSelectedYMetrics([]);
          setSelectedZMetricKey(null);
          setActiveTemplateName(null);
          setCurrentTemplateConfig({});
          setZScale(DEFAULT_Z_SCALE);
          setNormalizationModeState(DEFAULT_NORMALIZATION_MODE);
          setImputationModeState(DEFAULT_IMPUTATION_MODE);
          setIsTemplateLoading(false);
          setIsTemplateReady(true);
          lastLoadedTemplateRef.current = null;
        }
        return;
      }

      // Update template name and config
      if (isMountedRef.current) {
        setActiveTemplateName(template.name);
        setCurrentTemplateConfig({
          xAxisThemeLabel: template.xAxisThemeLabel || '',
          yAxisThemeLabel: template.yAxisThemeLabel || ''
        });
      }
      
      // Process metrics with validation
      const xMetricsRaw = filterAndMapMetrics(template.xMetricsConfig || [], 'X');
      const yMetricsRaw = filterAndMapMetrics(template.yMetricsConfig || [], 'Y');

      if (DEBUG_SCATTER_SCORE) {
        console.log(
          `%c[useTemplateLoader] Metrics before normalization:`,
          'color: purple;'
        );
        console.log(`  X metrics: ${xMetricsRaw.length}`);
        console.log(`  Y metrics: ${yMetricsRaw.length}`);
      }

      // Normalize weights only if metrics exist
      const xMetrics = xMetricsRaw.length > 0 ? normalizeWeights(xMetricsRaw) : [];
      const yMetrics = yMetricsRaw.length > 0 ? normalizeWeights(yMetricsRaw) : [];
      
      if (DEBUG_SCATTER_SCORE) {
        console.log(
          `%c[useTemplateLoader] Metrics after normalization for '${template.name}':`,
          'color: purple; font-weight: bold;'
        );
        console.log(
          `%c  X-axis: ${template.xMetricsConfig?.length || 0} → filtered: ${xMetricsRaw.length} → normalized: ${xMetrics.length}`,
          xMetrics.length > 0 ? 'color: green;' : 'color: orange;'
        );
        console.log(
          `%c  Y-axis: ${template.yMetricsConfig?.length || 0} → filtered: ${yMetricsRaw.length} → normalized: ${yMetrics.length}`,
          yMetrics.length > 0 ? 'color: green;' : 'color: orange;'
        );
        
        if (xMetrics.length === 0 && template.xMetricsConfig?.length > 0) {
          console.warn(
            `%c[useTemplateLoader] ⚠ All X-axis metrics were filtered out for template '${template.name}'`,
            'color: orange; font-weight: bold;'
          );
        }
        if (yMetrics.length === 0 && template.yMetricsConfig?.length > 0) {
          console.warn(
            `%c[useTemplateLoader] ⚠ All Y-axis metrics were filtered out for template '${template.name}'`,
            'color: orange; font-weight: bold;'
          );
        }
      }
      
      // Validate Z metric with detailed logging
      let finalZMetricKey: string | null = null;
      
      if (template.zMetricKey) {
        const zMetricDetail = getMetricConfigDetails(template.zMetricKey);
        const zAccessible = zMetricDetail && isMetricAccessible(template.zMetricKey);
        
        if (zAccessible) {
          finalZMetricKey = template.zMetricKey;
          if (DEBUG_SCATTER_SCORE) {
            console.log(
              `%c[useTemplateLoader] ✓ Z-metric '${template.zMetricKey}' is accessible`,
              'color: green;'
            );
          }
        } else {
          if (DEBUG_SCATTER_SCORE) {
            console.warn(
              `%c[useTemplateLoader] ✗ Z-metric '${template.zMetricKey}' not accessible`,
              'color: orange;'
            );
          }
        }
      }

      // Validate scale values
      const validatedZScale = (template.zScale === 'linear' || template.zScale === 'log') 
        ? template.zScale 
        : DEFAULT_Z_SCALE;

      // Update state atomically
      if (isMountedRef.current) {
        setSelectedXMetrics(xMetrics);
        setSelectedYMetrics(yMetrics);
        setSelectedZMetricKey(finalZMetricKey);
        setZScale(validatedZScale);
        setNormalizationModeState(template.defaultNormalizationMode || DEFAULT_NORMALIZATION_MODE);
        setImputationModeState(template.defaultImputationMode || DEFAULT_IMPUTATION_MODE);
      }

      // Allow state to propagate
      await new Promise(resolve => {
        loadingTimeoutRef.current = setTimeout(resolve, STATE_UPDATE_DELAY);
      });

      if (isMountedRef.current) {
        setIsTemplateLoading(false);
        setIsTemplateReady(true);
        lastLoadedTemplateRef.current = template.name;

        if (DEBUG_SCATTER_SCORE) {
          console.log(
            `%c[useTemplateLoader] ✓ Template '${template.name}' loaded successfully`,
            'color: green; font-weight: bold; font-size: 14px;'
          );
          console.log(`%c  Final state:`, 'color: green;');
          console.log(`    X metrics: ${xMetrics.length}`);
          console.log(`    Y metrics: ${yMetrics.length}`);
          console.log(`    Z metric: ${finalZMetricKey || 'None'}`);
          console.log(`    Z scale: ${validatedZScale}`);
        }

        if (onTemplateApplied) {
          try {
            onTemplateApplied();
          } catch (error) {
            console.error('[useTemplateLoader] Error in onTemplateApplied callback:', error);
          }
        }
      }
    } catch (error) {
      console.error('[useTemplateLoader] Error loading template:', error);
      
      if (isMountedRef.current) {
        setIsTemplateLoading(false);
        setIsTemplateReady(false);
        lastLoadedTemplateRef.current = null;
        
        // User-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        alert(`Failed to load template: ${errorMessage}. Please try again.`);
      }
    }
  }, [
    templates, 
    accessibleMetrics, 
    getMetricConfigDetails, 
    normalizeWeights, 
    filterAndMapMetrics, 
    onTemplateApplied,
    isMetricAccessible,
    isTemplateReady
  ]);

  // Initial load effect with improved timing and error handling
  useEffect(() => {
    if (DEBUG_SCATTER_SCORE) {
      console.log(
        `%c[useTemplateLoader] Initial load effect check`,
        'color: teal;'
      );
      console.log(`  hasInitialLoadAttempted: ${hasInitialLoadAttempted}`);
      console.log(`  templates count: ${templates?.length || 0}`);
      console.log(`  accessibleMetrics count: ${accessibleMetrics?.length || 0}`);
      console.log(`  activeTemplateName: ${activeTemplateName}`);
    }

    if (!hasInitialLoadAttempted && 
        templates && 
        Array.isArray(templates) &&
        templates.length > 0 && 
        accessibleMetrics && 
        Array.isArray(accessibleMetrics) &&
        accessibleMetrics.length > 0) {
      
      setHasInitialLoadAttempted(true);
      const initialTemplateName = activeTemplateName || templates[0]?.name || null;
      
      if (initialTemplateName) {
        if (DEBUG_SCATTER_SCORE) {
          console.log(
            `%c[useTemplateLoader] Queueing initial load for: '${initialTemplateName}'`,
            'color: teal; font-weight: bold;'
          );
        }
        
        // Use setTimeout to avoid race conditions
        setTimeout(() => {
          if (isMountedRef.current) {
            loadTemplate(initialTemplateName).catch(error => {
              console.error('[useTemplateLoader] Initial load failed:', error);
            });
          }
        }, 0);
      } else {
        if (DEBUG_SCATTER_SCORE) {
          console.log('[useTemplateLoader] No initial template to load');
        }
        setIsTemplateReady(true);
      }
    } else if (!hasInitialLoadAttempted && 
               accessibleMetrics?.length === 0 && 
               templates?.length > 0) {
      if (DEBUG_SCATTER_SCORE) {
        console.log(
          '%c[useTemplateLoader] Waiting for accessibleMetrics to populate',
          'color: yellow;'
        );
      }
    }
  }, [hasInitialLoadAttempted, templates, activeTemplateName, accessibleMetrics, loadTemplate]);

  // Manual metric update with comprehensive validation
  const updateMetrics = useCallback((
    x: AxisMetricConfig[], 
    y: AxisMetricConfig[], 
    z: string | null
  ) => {
    try {
      // Validate input arrays
      const validX = Array.isArray(x) ? x.filter(metric => 
        metric && 
        typeof metric.key === 'string' && 
        typeof metric.weight === 'number'
      ) : [];
      
      const validY = Array.isArray(y) ? y.filter(metric => 
        metric && 
        typeof metric.key === 'string' && 
        typeof metric.weight === 'number'
      ) : [];
      
      // Validate Z metric
      const validZ = (z && typeof z === 'string' && isMetricAccessible(z)) ? z : null;

      if (DEBUG_SCATTER_SCORE) {
        console.log(
          '%c[useTemplateLoader] Manual metrics update',
          'color: blue; font-weight: bold;'
        );
        console.log(`  X metrics: ${x?.length || 0} → valid: ${validX.length}`);
        console.log(`  Y metrics: ${y?.length || 0} → valid: ${validY.length}`);
        console.log(`  Z metric: ${z} → valid: ${validZ}`);
      }

      setSelectedXMetrics(validX);
      setSelectedYMetrics(validY);
      setSelectedZMetricKey(validZ);
      setActiveTemplateName(null); // Clear template on manual update
      setIsTemplateReady(true);
      lastLoadedTemplateRef.current = null;
      
    } catch (error) {
      console.error('[useTemplateLoader] Error updating metrics:', error);
      // Don't throw - fail gracefully
      setIsTemplateReady(true);
    }
  }, [isMetricAccessible]);

  // Settings update handlers with validation
  const handleZScaleChange = useCallback((scale: 'linear' | 'log') => {
    if (scale === 'linear' || scale === 'log') {
      setZScale(scale);
      setActiveTemplateName(null);
      lastLoadedTemplateRef.current = null;
      
      if (DEBUG_SCATTER_SCORE) {
        console.log(`[useTemplateLoader] Z scale changed to: ${scale}`);
      }
    } else {
      console.warn(`[useTemplateLoader] Invalid Z scale value: ${scale}`);
    }
  }, []);

  const handleNormalizationChange = useCallback((mode: NormalizationMode) => {
    setNormalizationModeState(mode);
    setActiveTemplateName(null);
    lastLoadedTemplateRef.current = null;
    
    if (DEBUG_SCATTER_SCORE) {
      console.log(`[useTemplateLoader] Normalization mode changed to: ${mode}`);
    }
  }, []);

  const handleImputationChange = useCallback((mode: ImputationMode) => {
    setImputationModeState(mode);
    setActiveTemplateName(null);
    lastLoadedTemplateRef.current = null;
    
    if (DEBUG_SCATTER_SCORE) {
      console.log(`[useTemplateLoader] Imputation mode changed to: ${mode}`);
    }
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
    setActiveTemplateName: (name: string | null) => {
      setActiveTemplateName(name);
      if (name !== lastLoadedTemplateRef.current) {
        lastLoadedTemplateRef.current = null;
      }
    },
    updateMetrics,
    setZScale: handleZScaleChange,
    setNormalizationMode: handleNormalizationChange,
    setImputationMode: handleImputationChange
  };
}