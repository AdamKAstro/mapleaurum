// src/pages/scatter-score-pro/templates/producer-profitability.ts
import type { ScatterScoreTemplate } from '../types';

export const ProducerProfitabilityTemplate: ScatterScoreTemplate = {
  id: 'producer-profitability',
  name: 'Producer Profitability Focus',
  description: 'For analyzing currently producing companies, emphasizing profitability and operational efficiency.',
  category: 'Production Analysis',
  tags: ['producer', 'profitability', 'efficiency', 'operations', 'costs'],
  xAxisThemeLabel: 'Cost Efficiency Score',
  yAxisThemeLabel: 'Profitability & Production Scale',
  minMetricsRequired: 10,
  maxMetricsToShow: 20,
  
  xMetricsConfig: [
    // Cost Efficiency Metrics (Lower is Better)
    { key: 'costs.aisc_last_year', weight: 10, userHigherIsBetter: false, required: true, category: 'all-in-costs' },
    { key: 'costs.aisc_last_quarter', weight: 9, userHigherIsBetter: false, required: true, category: 'all-in-costs' },
    { key: 'costs.tco_current', weight: 9, userHigherIsBetter: false, required: true, category: 'total-costs' },
    { key: 'costs.aic_last_year', weight: 8, userHigherIsBetter: false, category: 'all-in-costs' },
    { key: 'costs.aic_last_quarter', weight: 8, userHigherIsBetter: false, category: 'all-in-costs' },
    { key: 'costs.aisc_future', weight: 8, userHigherIsBetter: false, category: 'future-costs' },
    { key: 'costs.tco_future', weight: 8, userHigherIsBetter: false, category: 'future-costs' },
    
    // Operating Expenses
    { key: 'financials.cost_of_revenue', weight: 8, userHigherIsBetter: false, category: 'operating-costs' },
    { key: 'financials.operating_expense', weight: 7, userHigherIsBetter: false, category: 'operating-costs' },
    
    // Development Costs
    { key: 'costs.construction_costs', weight: 6, userHigherIsBetter: false, category: 'capex' },
    
    // Market Valuation (Lower = Better Value)
    { key: 'financials.market_cap_value', weight: 7, userHigherIsBetter: false, category: 'valuation' },
    { key: 'valuation_metrics.mkt_cap_per_production_oz', weight: 6, userHigherIsBetter: false, category: 'production-valuation' },
    { key: 'valuation_metrics.ev_per_production_oz', weight: 6, userHigherIsBetter: false, category: 'production-valuation' },
    
    // Efficiency Ratios
    { key: 'financials.enterprise_to_ebitda', weight: 6, userHigherIsBetter: false, category: 'valuation-ratios' },
    { key: 'financials.price_to_sales', weight: 5, userHigherIsBetter: false, category: 'valuation-ratios' }
  ],
  
  yMetricsConfig: [
    // Profitability Metrics
    { key: 'financials.ebitda', weight: 10, userHigherIsBetter: true, required: true, category: 'earnings' },
    { key: 'financials.net_income_value', weight: 9, userHigherIsBetter: true, required: true, category: 'earnings' },
    { key: 'financials.free_cash_flow', weight: 9, userHigherIsBetter: true, required: true, category: 'cash-flow' },
    { key: 'financials.gross_profit', weight: 8, userHigherIsBetter: true, category: 'profitability' },
    { key: 'financials.operating_income', weight: 8, userHigherIsBetter: true, category: 'profitability' },
    
    // Production Scale
    { key: 'production.current_production_total_aueq_koz', weight: 9, userHigherIsBetter: true, required: true, category: 'production' },
    { key: 'production.current_production_precious_aueq_koz', weight: 8, userHigherIsBetter: true, category: 'precious-production' },
    { key: 'production.current_production_non_precious_aueq_koz', weight: 6, userHigherIsBetter: true, category: 'base-production' },
    
    // Revenue & Scale
    { key: 'financials.revenue_value', weight: 8, userHigherIsBetter: true, category: 'revenue' },
    { key: 'financials.enterprise_value_value', weight: 7, userHigherIsBetter: true, category: 'scale' },
    
    // Sustainability
    { key: 'production.reserve_life_years', weight: 7, userHigherIsBetter: true, category: 'longevity' },
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 6, userHigherIsBetter: true, category: 'resource-base' },
    
    // Financial Strength
    { key: 'financials.cash_value', weight: 7, userHigherIsBetter: true, category: 'balance-sheet' },
    { key: 'financials.net_financial_assets', weight: 6, userHigherIsBetter: true, category: 'balance-sheet' },
    { key: 'financials.debt_value', weight: 6, userHigherIsBetter: false, category: 'leverage' },
    
    // Future Growth
    { key: 'production.future_production_total_aueq_koz', weight: 5, userHigherIsBetter: true, category: 'growth' }
  ],
  
  zMetricKey: 'financials.revenue_value',
  zScale: 'log',
  defaultNormalizationMode: 'dataset_rank_percentile',
  defaultImputationMode: 'dataset_median',
  
  metricSelectionStrategy: {
    minRequired: 10,
    maxTotal: 20,
    priorityGroups: [
      { category: 'all-in-costs', minCount: 2 },
      { category: 'earnings', minCount: 2 },
      { category: 'production', minCount: 1 },
      { category: 'cash-flow', minCount: 1 },
      { category: 'revenue', minCount: 1 }
    ]
  }
};