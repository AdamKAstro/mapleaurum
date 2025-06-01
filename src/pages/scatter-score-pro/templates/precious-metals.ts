// src/pages/scatter-score-pro/templates/precious-metals.ts
import type { ScatterScoreTemplate } from '../types';

export const PreciousMetalsTemplate: ScatterScoreTemplate = {
  id: 'precious-metals-pure-play',
  name: 'Precious Metals Pure Play',
  description: 'Deep analysis for gold and silver focused companies, emphasizing precious metal resources, production, valuations, and strategic positioning in the precious metals market.',
  category: 'Sector Specific',
  tags: ['gold', 'silver', 'precious-metals', 'commodity', 'pure-play'],
  xAxisThemeLabel: 'Precious Metals Resource Excellence',
  yAxisThemeLabel: 'Precious Metals Value & Efficiency',
  minMetricsRequired: 12,
  maxMetricsToShow: 20,
  
  xMetricsConfig: [
    // Core Precious Metals Resources
    { key: 'mineral_estimates.reserves_precious_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'precious-reserves' },
    { key: 'mineral_estimates.measured_indicated_precious_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'precious-mi' },
    { key: 'mineral_estimates.resources_precious_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'precious-resources' },
    { key: 'mineral_estimates.mineable_precious_aueq_moz', weight: 9, userHigherIsBetter: true, required: true, category: 'precious-mineable' },
    
    // Precious Metals Exposure
    { key: 'company-overview.percent_gold', weight: 9, userHigherIsBetter: true, required: true, category: 'gold-exposure' },
    { key: 'company-overview.percent_silver', weight: 8, userHigherIsBetter: true, category: 'silver-exposure' },
    
    // Production Scale & Quality
    { key: 'production.current_production_precious_aueq_koz', weight: 9, userHigherIsBetter: true, category: 'precious-production' },
    { key: 'production.current_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'total-production' },
    { key: 'production.future_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'future-production' },
    
    // Total Resource Base (Including Precious)
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'total-reserves' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'total-resources' },
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 6, userHigherIsBetter: true, category: 'total-mi' },
    { key: 'mineral_estimates.potential_total_aueq_moz', weight: 6, userHigherIsBetter: true, category: 'total-potential' },
    { key: 'mineral_estimates.mineable_total_aueq_moz', weight: 6, userHigherIsBetter: true, category: 'total-mineable' },
    
    // Non-Precious Components (for context)
    { key: 'mineral_estimates.reserves_non_precious_aueq_moz', weight: 5, userHigherIsBetter: true, category: 'base-metals' },
    { key: 'mineral_estimates.resources_non_precious_aueq_moz', weight: 5, userHigherIsBetter: true, category: 'base-metals' },
    
    // Market Position
    { key: 'financials.market_cap_value', weight: 5, userHigherIsBetter: true, category: 'market-scale' },
    { key: 'production.reserve_life_years', weight: 5, userHigherIsBetter: true, category: 'sustainability' }
  ],
  
  yMetricsConfig: [
    // Precious Metals Specific Valuations
    { key: 'valuation_metrics.mkt_cap_per_reserve_oz_precious', weight: 10, userHigherIsBetter: false, required: true, category: 'precious-reserve-value' },
    { key: 'valuation_metrics.ev_per_reserve_oz_precious', weight: 10, userHigherIsBetter: false, required: true, category: 'precious-reserve-value' },
    { key: 'valuation_metrics.mkt_cap_per_mi_oz_precious', weight: 9, userHigherIsBetter: false, required: true, category: 'precious-mi-value' },
    { key: 'valuation_metrics.ev_per_mi_oz_precious', weight: 9, userHigherIsBetter: false, required: true, category: 'precious-mi-value' },
    
    // Resource-Based Valuations
    { key: 'valuation_metrics.mkt_cap_per_resource_oz_precious', weight: 9, userHigherIsBetter: false, category: 'precious-resource-value' },
    { key: 'valuation_metrics.ev_per_resource_oz_precious', weight: 9, userHigherIsBetter: false, category: 'precious-resource-value' },
    { key: 'valuation_metrics.mkt_cap_per_mineable_oz_precious', weight: 8, userHigherIsBetter: false, category: 'precious-mineable-value' },
    { key: 'valuation_metrics.ev_per_mineable_oz_precious', weight: 8, userHigherIsBetter: false, category: 'precious-mineable-value' },
    
    // Production-Based Valuations
    { key: 'valuation_metrics.mkt_cap_per_production_oz', weight: 8, userHigherIsBetter: false, category: 'production-value' },
    { key: 'valuation_metrics.ev_per_production_oz', weight: 8, userHigherIsBetter: false, category: 'production-value' },
    
    // Enterprise Value (inverted for value focus)
    { key: 'financials.enterprise_value_value', weight: 7, userHigherIsBetter: false, category: 'enterprise-value' },
    
    // Operational Efficiency
    { key: 'costs.aisc_last_year', weight: 7, userHigherIsBetter: false, category: 'precious-costs' },
    { key: 'costs.aisc_last_quarter', weight: 6, userHigherIsBetter: false, category: 'precious-costs' },
    { key: 'costs.tco_current', weight: 6, userHigherIsBetter: false, category: 'total-costs' },
    { key: 'costs.aisc_future', weight: 6, userHigherIsBetter: false, category: 'future-costs' },
    
    // Financial Performance
    { key: 'financials.revenue_value', weight: 6, userHigherIsBetter: true, category: 'revenue' },
    { key: 'financials.ebitda', weight: 6, userHigherIsBetter: true, category: 'profitability' },
    { key: 'financials.free_cash_flow', weight: 5, userHigherIsBetter: true, category: 'cash-flow' },
    
    // Risk Metrics
    { key: 'financials.debt_value', weight: 5, userHigherIsBetter: false, category: 'leverage' },
    { key: 'production.current_production_non_precious_aueq_koz', weight: 4, userHigherIsBetter: false, category: 'base-metals-exposure' }
  ],
  
  zMetricKey: 'production.current_production_precious_aueq_koz',
  zScale: 'log',
  defaultNormalizationMode: 'dataset_min_max',
  defaultImputationMode: 'dataset_median',
  
  metricSelectionStrategy: {
    minRequired: 12,
    maxTotal: 20,
    priorityGroups: [
      { category: 'precious-reserves', minCount: 2 },
      { category: 'precious-reserve-value', minCount: 2 },
      { category: 'gold-exposure', minCount: 1 },
      { category: 'precious-production', minCount: 1 },
      { category: 'precious-costs', minCount: 1 }
    ]
  }
};