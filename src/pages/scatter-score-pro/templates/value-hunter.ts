// src/pages/scatter-score-pro/templates/value-hunter.ts
import type { ScatterScoreTemplate } from '../types';

export const ValueHunterTemplate: ScatterScoreTemplate = {
  id: 'value-hunter',
  name: 'Value Hunter',
  description: 'Comprehensive value analysis focusing on undervalued companies with strong fundamentals, asset backing, and multiple valuation metrics.',
  category: 'Value Investing',
  tags: ['value', 'fundamentals', 'contrarian', 'deep-value'],
  xAxisThemeLabel: 'Comprehensive Valuation Score',
  yAxisThemeLabel: 'Asset Quality & Fundamentals',
  minMetricsRequired: 8,
  maxMetricsToShow: 20,
  
  xMetricsConfig: [
    // Core Valuation Metrics (Always included if available)
    { key: 'financials.market_cap_value', weight: 10, userHigherIsBetter: false, required: true, category: 'market-valuation' },
    { key: 'financials.enterprise_value_value', weight: 9, userHigherIsBetter: false, required: true, category: 'market-valuation' },
    { key: 'financials.price_to_book', weight: 9, userHigherIsBetter: false, required: true, category: 'traditional-ratios' },
    { key: 'financials.price_to_sales', weight: 9, userHigherIsBetter: false, required: true, category: 'traditional-ratios' },
    { key: 'financials.enterprise_to_ebitda', weight: 9, userHigherIsBetter: false, category: 'traditional-ratios' },
    { key: 'financials.enterprise_to_revenue', weight: 8, userHigherIsBetter: false, category: 'traditional-ratios' },
    
    // Resource-Based Valuation (For mining companies)
    { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 9, userHigherIsBetter: false, category: 'resource-valuation' },
    { key: 'valuation_metrics.ev_per_reserve_oz_all', weight: 9, userHigherIsBetter: false, category: 'resource-valuation' },
    { key: 'valuation_metrics.mkt_cap_per_resource_oz_all', weight: 8, userHigherIsBetter: false, category: 'resource-valuation' },
    { key: 'valuation_metrics.ev_per_resource_oz_all', weight: 8, userHigherIsBetter: false, category: 'resource-valuation' },
    { key: 'valuation_metrics.mkt_cap_per_mi_oz_all', weight: 8, userHigherIsBetter: false, category: 'resource-valuation' },
    { key: 'valuation_metrics.ev_per_mi_oz_all', weight: 8, userHigherIsBetter: false, category: 'resource-valuation' },
    { key: 'valuation_metrics.mkt_cap_per_mineable_oz_all', weight: 7, userHigherIsBetter: false, category: 'resource-valuation' },
    { key: 'valuation_metrics.ev_per_mineable_oz_all', weight: 7, userHigherIsBetter: false, category: 'resource-valuation' },
    
    // PE Ratios
    { key: 'financials.trailing_pe', weight: 8, userHigherIsBetter: false, category: 'earnings-ratios' },
    { key: 'financials.forward_pe', weight: 8, userHigherIsBetter: false, category: 'earnings-ratios' },
    { key: 'financials.peg_ratio', weight: 7, userHigherIsBetter: false, category: 'growth-adjusted' },
    
    // Production-Based Valuation
    { key: 'valuation_metrics.mkt_cap_per_production_oz', weight: 7, userHigherIsBetter: false, category: 'production-valuation' },
    { key: 'valuation_metrics.ev_per_production_oz', weight: 7, userHigherIsBetter: false, category: 'production-valuation' }
  ],
  
  yMetricsConfig: [
    // Core Asset Metrics
    { key: 'financials.enterprise_value_value', weight: 10, userHigherIsBetter: true, required: true, category: 'scale' },
    { key: 'financials.net_financial_assets', weight: 9, userHigherIsBetter: true, required: true, category: 'balance-sheet' },
    { key: 'financials.cash_value', weight: 9, userHigherIsBetter: true, required: true, category: 'balance-sheet' },
    { key: 'financials.debt_value', weight: 9, userHigherIsBetter: false, required: true, category: 'balance-sheet' },
    
    // Profitability & Cash Flow
    { key: 'financials.free_cash_flow', weight: 9, userHigherIsBetter: true, category: 'cash-flow' },
    { key: 'financials.ebitda', weight: 9, userHigherIsBetter: true, category: 'profitability' },
    { key: 'financials.operating_income', weight: 8, userHigherIsBetter: true, category: 'profitability' },
    { key: 'financials.gross_profit', weight: 8, userHigherIsBetter: true, category: 'profitability' },
    { key: 'financials.net_income_value', weight: 8, userHigherIsBetter: true, category: 'profitability' },
    { key: 'financials.revenue_value', weight: 8, userHigherIsBetter: true, category: 'revenue' },
    
    // Resource Base (Critical for mining value)
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 9, userHigherIsBetter: true, category: 'resources' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'resources' },
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'resources' },
    { key: 'mineral_estimates.mineable_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'resources' },
    
    // Production Capability
    { key: 'production.current_production_total_aueq_koz', weight: 8, userHigherIsBetter: true, category: 'production' },
    { key: 'production.future_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'production' },
    { key: 'production.reserve_life_years', weight: 8, userHigherIsBetter: true, category: 'production' },
    
    // Other Financial Assets
    { key: 'financials.other_financial_assets', weight: 6, userHigherIsBetter: true, category: 'assets' },
    { key: 'financials.shares_outstanding', weight: 5, userHigherIsBetter: false, category: 'shares' }
  ],
  
  zMetricKey: 'financials.market_cap_value',
  zScale: 'log',
  defaultNormalizationMode: 'dataset_rank_percentile',
  defaultImputationMode: 'dataset_median',
  
  metricSelectionStrategy: {
    minRequired: 8,
    maxTotal: 15,
    priorityGroups: [
      { category: 'market-valuation', minCount: 2 },
      { category: 'traditional-ratios', minCount: 3 },
      { category: 'balance-sheet', minCount: 3 },
      { category: 'resources', minCount: 2 }
    ]
  }
};