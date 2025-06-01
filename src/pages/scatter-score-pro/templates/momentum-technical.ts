// src/pages/scatter-score-pro/templates/momentum-technical.ts
import type { ScatterScoreTemplate } from '../types';

export const MomentumTechnicalTemplate: ScatterScoreTemplate = {
  id: 'momentum-technical',
  name: 'Momentum & Technical Strength',
  description: 'Identifies companies with strong market momentum, improving fundamentals, and relative outperformance using available financial metrics.',
  category: 'Quantitative Strategies',
  tags: ['momentum', 'technical', 'trend', 'price-action', 'relative-strength'],
  xAxisThemeLabel: 'Market Momentum & Scale',
  yAxisThemeLabel: 'Fundamental Growth & Efficiency',
  minMetricsRequired: 8,
  maxMetricsToShow: 18,
  
  xMetricsConfig: [
    // Market Scale & Momentum Proxies
    { key: 'financials.market_cap_value', weight: 10, userHigherIsBetter: true, required: true, category: 'market-scale' },
    { key: 'financials.enterprise_value_value', weight: 10, userHigherIsBetter: true, required: true, category: 'enterprise-scale' },
    { key: 'financials.revenue_value', weight: 9, userHigherIsBetter: true, category: 'revenue-momentum' },
    { key: 'financials.shares_outstanding', weight: 7, userHigherIsBetter: false, category: 'share-structure' },
    
    // Valuation Momentum (Lower multiples = potentially oversold)
    { key: 'financials.price_to_book', weight: 8, userHigherIsBetter: false, category: 'valuation-momentum' },
    { key: 'financials.price_to_sales', weight: 8, userHigherIsBetter: false, category: 'valuation-momentum' },
    { key: 'financials.trailing_pe', weight: 7, userHigherIsBetter: false, category: 'earnings-valuation' },
    { key: 'financials.forward_pe', weight: 7, userHigherIsBetter: false, category: 'forward-valuation' },
    
    // Resource Valuation Trends
    { key: 'valuation_metrics.mkt_cap_per_production_oz', weight: 7, userHigherIsBetter: false, category: 'production-value' },
    { key: 'valuation_metrics.ev_per_production_oz', weight: 7, userHigherIsBetter: false, category: 'production-value' },
    { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 6, userHigherIsBetter: false, category: 'resource-value' },
    
    // Financial Strength (Strong companies in uptrends)
    { key: 'financials.cash_value', weight: 6, userHigherIsBetter: true, category: 'financial-strength' },
    { key: 'financials.net_financial_assets', weight: 6, userHigherIsBetter: true, category: 'financial-strength' },
    { key: 'financials.debt_value', weight: 5, userHigherIsBetter: false, category: 'leverage' },
    
    // Capital Structure
    { key: 'capital_structure.existing_shares', weight: 5, userHigherIsBetter: false, category: 'dilution' },
    { key: 'capital_structure.fully_diluted_shares', weight: 5, userHigherIsBetter: false, category: 'dilution' },
    { key: 'capital_structure.in_the_money_options', weight: 4, userHigherIsBetter: false, category: 'dilution' },
    { key: 'capital_structure.options_revenue', weight: 4, userHigherIsBetter: true, category: 'option-value' }
  ],
  
  yMetricsConfig: [
    // Fundamental Growth Indicators
    { key: 'financials.ebitda', weight: 10, userHigherIsBetter: true, required: true, category: 'earnings-growth' },
    { key: 'financials.revenue_value', weight: 10, userHigherIsBetter: true, required: true, category: 'revenue-growth' },
    { key: 'financials.gross_profit', weight: 9, userHigherIsBetter: true, category: 'profit-growth' },
    { key: 'financials.operating_income', weight: 9, userHigherIsBetter: true, category: 'operational-growth' },
    
    // Production Growth
    { key: 'production.current_production_total_aueq_koz', weight: 9, userHigherIsBetter: true, required: true, category: 'production-momentum' },
    { key: 'production.future_production_total_aueq_koz', weight: 8, userHigherIsBetter: true, category: 'future-growth' },
    { key: 'production.current_production_precious_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'precious-production' },
    
    // Resource Expansion
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'reserve-growth' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'resource-growth' },
    { key: 'mineral_estimates.potential_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'exploration-growth' },
    
    // Operational Efficiency Improvements
    { key: 'costs.aisc_last_year', weight: 7, userHigherIsBetter: false, category: 'cost-efficiency' },
    { key: 'costs.aisc_future', weight: 6, userHigherIsBetter: false, category: 'future-efficiency' },
    { key: 'costs.tco_current', weight: 6, userHigherIsBetter: false, category: 'total-costs' },
    
    // Cash Flow Generation
    { key: 'financials.free_cash_flow', weight: 7, userHigherIsBetter: true, category: 'cash-momentum' },
    { key: 'financials.net_income_value', weight: 6, userHigherIsBetter: true, category: 'profit-momentum' },
    
    // Asset Quality
    { key: 'production.reserve_life_years', weight: 5, userHigherIsBetter: true, category: 'sustainability' },
    { key: 'financials.total_assets', weight: 5, userHigherIsBetter: true, category: 'asset-growth' },
    { key: 'financials.working_capital', weight: 4, userHigherIsBetter: true, category: 'liquidity' }
  ],
  
  zMetricKey: 'financials.market_cap_value',
  zScale: 'log',
  defaultNormalizationMode: 'dataset_rank_percentile',
  defaultImputationMode: 'zero_worst',
  
  metricSelectionStrategy: {
    minRequired: 8,
    maxTotal: 18,
    priorityGroups: [
      { category: 'market-scale', minCount: 2 },
      { category: 'revenue-growth', minCount: 2 },
      { category: 'production-momentum', minCount: 1 },
      { category: 'cost-efficiency', minCount: 1 }
    ]
  }
};