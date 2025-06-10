# ScatterScore Pro Refactoring Plan

## Proposed File Structure

```
src/pages/scatter-score-pro/
├── index.tsx                    # Main component (simplified)
├── types.ts                     # All interfaces and types
├── constants.ts                 # Constants and status colors
├── templates/
│   ├── index.ts                # Template registry and loader
│   ├── types.ts                # Template-specific types
│   ├── value-hunter.ts         # Individual template definitions
│   ├── growth-catalyst.ts      
│   ├── producer-profitability.ts
│   ├── financial-stability.ts
│   ├── precious-metals.ts
│   └── [future templates...]
├── components/
│   ├── ScaleToggle.tsx
│   ├── MetricListItem.tsx
│   ├── AxisMetricConfigurator.tsx
│   ├── ChartControls.tsx       # Zoom controls
│   └── ConfigurationPanel.tsx  # Entire config panel
├── hooks/
│   ├── useScatterScoreChart.ts # Chart data and options
│   ├── useTemplateLoader.ts    # Template loading logic
│   ├── useScoreCalculation.ts  # Score calculation logic
│   └── useMetricWeights.ts     # Weight normalization
└── utils/
    ├── normalizeWeights.ts
    ├── chartHelpers.ts
    └── scoreHelpers.ts
```

## Key Benefits

1. **Easier Template Management**: Each template in its own file makes adding new ones trivial
2. **Reusable Components**: Small, focused components that are easy to test and maintain
3. **Separation of Concerns**: Business logic separated from UI components
4. **Better Performance**: Memoization and logic isolation can reduce unnecessary re-renders
5. **Improved Testability**: Each piece can be unit tested independently

## Implementation Strategy

### Phase 1: Extract Types and Constants
```typescript
// types.ts
export interface AxisMetricConfig {
  key: string;
  metricLabel: string;
  weight: number;
  userHigherIsBetter: boolean;
  originalHigherIsBetter: boolean;
}

export interface ScatterScoreTemplate {
  id: string;
  name: string;
  description: string;
  category?: string; // For grouping templates
  tags?: string[];   // For searching/filtering
  xMetricsConfig: TemplateMetricConfig[];
  yMetricsConfig: TemplateMetricConfig[];
  zMetricKey?: string | null;
  zScale?: 'linear' | 'log';
  defaultNormalizationMode?: NormalizationMode;
  defaultImputationMode?: ImputationMode;
  xAxisThemeLabel?: string;
  yAxisThemeLabel?: string;
  minMetricsRequired?: number; // Minimum metrics to use
  maxMetricsToShow?: number;   // For templates with many metrics
}
```

### Phase 2: Template System Enhancement
```typescript
// templates/types.ts
export interface TemplateMetricConfig {
  key: string;
  weight: number;
  userHigherIsBetter?: boolean;
  required?: boolean;      // Core metric for this template
  alternativeKeys?: string[]; // Fallback metrics if primary unavailable
  category?: string;       // For grouping within template
  description?: string;    // Why this metric matters for this strategy
}

// templates/value-hunter.ts
export const ValueHunterTemplate: ScatterScoreTemplate = {
  id: 'value-hunter',
  name: 'Value Hunter',
  description: 'Focuses on undervalued companies with strong fundamentals',
  category: 'Value Investing',
  tags: ['value', 'fundamentals', 'contrarian'],
  minMetricsRequired: 5,
  xAxisThemeLabel: 'Valuation Composite Score',
  yAxisThemeLabel: 'Asset Quality Score',
  xMetricsConfig: [
    // Core valuation metrics
    {
      key: 'financials.market_cap_value',
      weight: 10,
      userHigherIsBetter: false,
      required: true,
      category: 'market-valuation'
    },
    // ... expanded to include 20-30 relevant metrics
  ]
};
```

### Phase 3: Fix Initial Load Issue
```typescript
// hooks/useTemplateLoader.ts
export function useTemplateLoader(
  initialTemplateName: string | null,
  onTemplateLoaded: (template: ScatterScoreTemplate) => void
) {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<ScatterScoreTemplate | null>(null);

  // Ensure template loads and renders on mount
  useEffect(() => {
    if (initialTemplateName && !activeTemplate) {
      const loadAndApply = async () => {
        setIsLoading(true);
        
        // Load template
        const template = await loadTemplate(initialTemplateName);
        setActiveTemplate(template);
        
        // Small delay to ensure state updates propagate
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Trigger calculation
        onTemplateLoaded(template);
        
        setIsLoading(false);
      };
      
      loadAndApply();
    }
  }, [initialTemplateName]);
  
  return { activeTemplate, isLoading, setActiveTemplate };
}
```

### Phase 4: Enhanced Template Features
```typescript
// Template with smart metric selection
export const EnhancedValueTemplate: ScatterScoreTemplate = {
  // ... base config
  xMetricsConfig: [
    // Primary metrics (always included if available)
    { key: 'financials.market_cap_value', weight: 10, required: true },
    { key: 'financials.price_to_book', weight: 9, required: true },
    
    // Secondary metrics (included based on company type)
    { 
      key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', 
      weight: 8,
      condition: (company) => company.status === 'producer'
    },
    
    // Tertiary metrics (fill to desired count)
    { key: 'financials.debt_to_equity', weight: 5 },
    // ... many more metrics
  ],
  
  // Dynamic metric selection
  metricSelectionStrategy: {
    minRequired: 5,
    maxTotal: 15,
    priorityGroups: [
      { category: 'core-valuation', minCount: 3 },
      { category: 'asset-quality', minCount: 2 },
      { category: 'profitability', minCount: 2 }
    ]
  }
};
```

## Migration Path

1. **Start with non-breaking extractions**: Move types, constants, and utils first
2. **Extract components one by one**: Start with smallest (ScaleToggle) to largest
3. **Create hooks progressively**: Extract logic while keeping main component working
4. **Template system last**: Once structure is in place, enhance template system
5. **Add new templates**: With new structure, adding templates becomes trivial

## Next Steps

Would you like me to:
1. Start implementing the refactored structure with the first few files?
2. Focus on fixing the initial load issue first?
3. Create an enhanced template example with 20-30 metrics?
4. Build a template builder/editor component for easier template creation?