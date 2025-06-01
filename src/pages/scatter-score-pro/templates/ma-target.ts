// src/pages/scatter-score-pro/templates/ma-target.ts
import type { ScatterScoreTemplate } from '../types';

export const MATargetTemplate: ScatterScoreTemplate = {
  id: 'ma-target-identification',
  name: 'M&A Target Identification',
  description: 'Identifies potential acquisition targets based on strategic assets, undervaluation, and characteristics that make companies attractive to acquirers.',
  category: 'Quantitative Strategies',
  tags: ['m&a', 'takeover', 'acquisition', 'strategic-value', 'event-driven'],
  xAxisThemeLabel: 'Strategic Asset Value & Scale',
  yAxisThemeLabel: 'Deep Value & Acquisition Attractiveness',
  minMetricsRequired: 10,
  maxMetricsToShow: 20,
  
  xMetricsConfig: [
    // Strategic Asset Value
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'resource-assets' },
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'resource-quality' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 9, userHigherIsBetter: true, category: 'resource-potential' },
    { key: 'production.reserve_life_years', weight: 9, userHigherIsBetter: true, category: 'asset-longevity' },
    
    // Resource Base by Type
    { key: 'mineral_estimates.reserves_precious_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'precious-assets' },
    { key: 'mineral_estimates.resources_precious_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'precious-resources' },
    { key: 'mineral_estimates.potential_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'exploration-value' },
    { key: 'mineral_estimates.mineable_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'mineable-resources' },
    
    // Production Capability
    { key: 'production.current_production_total_aueq_koz', weight: 8, userHigherIsBetter: true, category: 'cash-generation' },
    { key: 'production.future_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'growth-potential' },
    { key: 'production.current_production_precious_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'precious-production' },
    
    // Financial Scale & Health
    { key: 'financials.revenue_value', weight: 7, userHigherIsBetter: true, category: 'revenue-scale' },
    { key: 'financials.free_cash_flow', weight: 6, userHigherIsBetter: true, category: 'self-funding' },
    { key: 'financials.cash_value', weight: 6, userHigherIsBetter: true, category: 'balance-sheet' },
    { key: 'financials.total_assets', weight: 6, userHigherIsBetter: true, category: 'asset-base' },
    
    // Clean Structure Indicators
    { key: 'financials.debt_value', weight: 5, userHigherIsBetter: false, category: 'clean-balance-sheet' },
    { key: 'capital_structure.existing_shares', weight: 5, userHigherIsBetter: false, category: 'share-structure' },
    { key: 'capital_structure.fully_diluted_shares', weight: 5, userHigherIsBetter: false, category: 'dilution' },
    { key: 'financials.liabilities', weight: 4, userHigherIsBetter: false, category: 'obligations' },
    { key: 'company-overview.percent_gold', weight: 4, userHigherIsBetter: true, category: 'precious-focus' }
  ],
  
  yMetricsConfig: [
    // Deep Value Metrics
    { key: 'financials.price_to_book', weight: 10, userHigherIsBetter: false, required: true, category: 'book-discount' },
    { key: 'valuation_metrics.ev_per_reserve_oz_all', weight: 10, userHigherIsBetter: false, required: true, category: 'resource-value' },
    { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 9, userHigherIsBetter: false, required: true, category: 'resource-value' },
    { key: 'valuation_metrics.ev_per_resource_oz_all', weight: 9, userHigherIsBetter: false, category: 'resource-value' },
    
    // Production-Based Valuation
    { key: 'valuation_metrics.mkt_cap_per_production_oz', weight: 9, userHigherIsBetter: false, category: 'production-value' },
    { key: 'valuation_metrics.ev_per_production_oz', weight: 8, userHigherIsBetter: false, category: 'production-value' },
    { key: 'valuation_metrics.mkt_cap_per_mi_oz_all', weight: 8, userHigherIsBetter: false, category: 'mi-value' },
    { key: 'valuation_metrics.ev_per_mi_oz_all', weight: 8, userHigherIsBetter: false, category: 'mi-value' },
    
    // Traditional Valuation
    { key: 'financials.price_to_sales', weight: 8, userHigherIsBetter: false, category: 'revenue-multiple' },
    { key: 'financials.enterprise_to_ebitda', weight: 7, userHigherIsBetter: false, category: 'ebitda-multiple' },
    { key: 'financials.trailing_pe', weight: 7, userHigherIsBetter: false, category: 'earnings-multiple' },
    { key: 'financials.forward_pe', weight: 6, userHigherIsBetter: false, category: 'forward-multiple' },
    
    // Acquisition Size & Feasibility
    { key: 'financials.market_cap_value', weight: 7, userHigherIsBetter: false, category: 'bite-size' },
    { key: 'financials.enterprise_value_value', weight: 7, userHigherIsBetter: false, category: 'acquisition-cost' },
    
    // Precious Metals Specific Value
    { key: 'valuation_metrics.mkt_cap_per_reserve_oz_precious', weight: 6, userHigherIsBetter: false, category: 'precious-value' },
    { key: 'valuation_metrics.ev_per_reserve_oz_precious', weight: 6, userHigherIsBetter: false, category: 'precious-value' },
    
    // Financial Flexibility
    { key: 'financials.net_financial_assets', weight: 5, userHigherIsBetter: true, category: 'financial-position' },
    { key: 'financials.working_capital', weight: 5, userHigherIsBetter: true, category: 'liquidity' },
    { key: 'financials.current_ratio', weight: 4, userHigherIsBetter: true, category: 'short-term-health' },
    { key: 'financials.debt_to_equity', weight: 4, userHigherIsBetter: false, category: 'leverage' }
  ],
  
  zMetricKey: 'financials.market_cap_value',
  zScale: 'log',
  defaultNormalizationMode: 'dataset_min_max',
  defaultImputationMode: 'dataset_median',
  
  metricSelectionStrategy: {
    minRequired: 10,
    maxTotal: 20,
    priorityGroups: [
      { category: 'resource-assets', minCount: 2 },
      { category: 'resource-value', minCount: 2 },
      { category: 'book-discount', minCount: 1 },
      { category: 'bite-size', minCount: 1 },
      { category: 'production-value', minCount: 1 }
    ]
  }
};