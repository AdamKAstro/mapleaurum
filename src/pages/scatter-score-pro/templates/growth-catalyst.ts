// src/pages/scatter-score-pro/templates/growth-catalyst.ts
import type { ScatterScoreTemplate } from '../types';

export const GrowthCatalystTemplate: ScatterScoreTemplate = {
  id: 'growth-catalyst',
  name: 'Growth Catalyst Seeker',
  description: 'Comprehensive growth analysis targeting companies with high resource expansion potential, production growth trajectory, and strategic development opportunities.',
  category: 'Growth Strategies',
  tags: ['growth', 'expansion', 'development', 'momentum', 'future-potential'],
  xAxisThemeLabel: 'Resource & Expansion Potential',
  yAxisThemeLabel: 'Growth & Development Metrics',
  minMetricsRequired: 10,
  maxMetricsToShow: 18,
  
  xMetricsConfig: [
    // Core Resource Growth Potential
    { key: 'mineral_estimates.potential_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'exploration-potential' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'resource-base' },
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 9, userHigherIsBetter: true, required: true, category: 'resource-quality' },
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 9, userHigherIsBetter: true, category: 'proven-resources' },
    
    // Resource Expansion by Type
    { key: 'mineral_estimates.potential_precious_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'precious-potential' },
    { key: 'mineral_estimates.potential_non_precious_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'base-metals-potential' },
    
    // Resource Quality & Development Stage
    { key: 'mineral_estimates.mineable_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'development-ready' },
    { key: 'mineral_estimates.resources_precious_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'precious-resources' },
    { key: 'mineral_estimates.resources_non_precious_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'base-metals-resources' },
    
    // Project Pipeline & Scale
    { key: 'financials.market_cap_value', weight: 7, userHigherIsBetter: true, category: 'market-scale' },
    { key: 'financials.enterprise_value_value', weight: 7, userHigherIsBetter: true, category: 'enterprise-scale' },
    { key: 'mineral_estimates.reserves_precious_aueq_moz', weight: 6, userHigherIsBetter: true, category: 'precious-reserves' },
    { key: 'mineral_estimates.measured_indicated_precious_aueq_moz', weight: 6, userHigherIsBetter: true, category: 'precious-mi' },
    
    // Additional Expansion Indicators
    { key: 'mineral_estimates.reserves_non_precious_aueq_moz', weight: 5, userHigherIsBetter: true, category: 'base-metals-reserves' },
    { key: 'mineral_estimates.measured_indicated_non_precious_aueq_moz', weight: 5, userHigherIsBetter: true, category: 'base-metals-mi' },
    { key: 'mineral_estimates.mineable_precious_aueq_moz', weight: 5, userHigherIsBetter: true, category: 'precious-mineable' },
    { key: 'mineral_estimates.mineable_non_precious_aueq_moz', weight: 5, userHigherIsBetter: true, category: 'base-metals-mineable' }
  ],
  
  yMetricsConfig: [
    // Production Growth Trajectory
    { key: 'production.future_production_total_aueq_koz', weight: 10, userHigherIsBetter: true, required: true, category: 'production-growth' },
    { key: 'production.current_production_total_aueq_koz', weight: 9, userHigherIsBetter: true, required: true, category: 'current-production' },
    
    // Financial Growth Indicators
    { key: 'financials.revenue_value', weight: 9, userHigherIsBetter: true, category: 'revenue-scale' },
    { key: 'financials.peg_ratio', weight: 8, userHigherIsBetter: false, category: 'growth-valuation' },
    { key: 'financials.forward_pe', weight: 7, userHigherIsBetter: false, category: 'forward-valuation' },
    
    // Development & Expansion Capability
    { key: 'financials.free_cash_flow', weight: 8, userHigherIsBetter: true, category: 'growth-funding' },
    { key: 'financials.cash_value', weight: 8, userHigherIsBetter: true, category: 'development-capital' },
    { key: 'financials.ebitda', weight: 7, userHigherIsBetter: true, category: 'earnings' },
    
    // Resource Expansion Potential
    { key: 'mineral_estimates.potential_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'total-potential' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'total-resources' },
    
    // Operational Growth Potential
    { key: 'production.current_production_precious_aueq_koz', weight: 6, userHigherIsBetter: true, category: 'precious-production' },
    { key: 'production.current_production_non_precious_aueq_koz', weight: 6, userHigherIsBetter: true, category: 'base-metals-production' },
    { key: 'costs.aisc_future', weight: 7, userHigherIsBetter: false, category: 'future-efficiency' },
    { key: 'costs.tco_future', weight: 6, userHigherIsBetter: false, category: 'future-costs' },
    { key: 'costs.construction_costs', weight: 6, userHigherIsBetter: false, category: 'development-costs' },
    
    // Sustainability & Longevity
    { key: 'production.reserve_life_years', weight: 6, userHigherIsBetter: true, category: 'longevity' },
    
    // Balance Sheet Strength for Growth
    { key: 'financials.debt_value', weight: 5, userHigherIsBetter: false, category: 'leverage-risk' },
    { key: 'financials.net_financial_assets', weight: 5, userHigherIsBetter: true, category: 'financial-strength' }
  ],
  
  zMetricKey: 'financials.enterprise_value_value',
  zScale: 'log',
  defaultNormalizationMode: 'dataset_min_max',
  defaultImputationMode: 'dataset_mean',
  
  metricSelectionStrategy: {
    minRequired: 10,
    maxTotal: 18,
    priorityGroups: [
      { category: 'exploration-potential', minCount: 2 },
      { category: 'resource-base', minCount: 2 },
      { category: 'production-growth', minCount: 2 },
      { category: 'growth-funding', minCount: 2 },
      { category: 'growth-valuation', minCount: 1 }
    ]
  }
};