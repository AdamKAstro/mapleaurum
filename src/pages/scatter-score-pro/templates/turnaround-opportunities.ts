// src/pages/scatter-score-pro/templates/turnaround-opportunities.ts
import type { ScatterScoreTemplate } from '../types';

export const TurnaroundOpportunitiesTemplate: ScatterScoreTemplate = {
  id: 'turnaround-opportunities',
  name: 'Turnaround & Recovery Plays',
  description: 'Identifies potentially distressed or underperforming companies with strong underlying assets that could benefit from operational improvements or market recovery.',
  category: 'Value Investing',
  tags: ['turnaround', 'distressed', 'recovery', 'contrarian', 'special-situations'],
  xAxisThemeLabel: 'Distress & Undervaluation Indicators',
  yAxisThemeLabel: 'Recovery Potential & Asset Quality',
  minMetricsRequired: 10,
  maxMetricsToShow: 20,
  
  xMetricsConfig: [
    // Valuation Distress Indicators (Lower = More Distressed)
    { key: 'financials.price_to_book', weight: 10, userHigherIsBetter: false, required: true, category: 'valuation-distress' },
    { key: 'financials.price_to_sales', weight: 10, userHigherIsBetter: false, required: true, category: 'valuation-distress' },
    { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 9, userHigherIsBetter: false, required: true, category: 'resource-discount' },
    { key: 'valuation_metrics.ev_per_reserve_oz_all', weight: 9, userHigherIsBetter: false, category: 'resource-discount' },
    
    // Financial Stress Indicators
    { key: 'financials.debt_to_equity', weight: 9, userHigherIsBetter: true, category: 'leverage-concern' },
    { key: 'financials.debt_value', weight: 8, userHigherIsBetter: true, category: 'debt-burden' },
    { key: 'financials.current_ratio', weight: 8, userHigherIsBetter: false, category: 'liquidity-stress' },
    { key: 'financials.quick_ratio', weight: 8, userHigherIsBetter: false, category: 'liquidity-stress' },
    
    // Operational Challenges (Higher costs = More distressed)
    { key: 'costs.aisc_last_year', weight: 8, userHigherIsBetter: true, category: 'cost-problems' },
    { key: 'costs.aisc_last_quarter', weight: 7, userHigherIsBetter: true, category: 'recent-costs' },
    { key: 'costs.tco_current', weight: 7, userHigherIsBetter: true, category: 'total-cost-issues' },
    { key: 'financials.operating_expense', weight: 7, userHigherIsBetter: true, category: 'opex-burden' },
    
    // Underperformance Indicators
    { key: 'financials.net_income_value', weight: 6, userHigherIsBetter: false, category: 'profitability-issues' },
    { key: 'financials.free_cash_flow', weight: 6, userHigherIsBetter: false, category: 'cash-flow-issues' },
    { key: 'financials.ebitda', weight: 6, userHigherIsBetter: false, category: 'earnings-weakness' },
    
    // Market Cap Depression
    { key: 'financials.market_cap_value', weight: 5, userHigherIsBetter: false, category: 'market-pessimism' },
    { key: 'financials.enterprise_value_value', weight: 5, userHigherIsBetter: false, category: 'enterprise-discount' },
    { key: 'financials.shares_outstanding', weight: 4, userHigherIsBetter: true, category: 'dilution' },
    { key: 'capital_structure.fully_diluted_shares', weight: 4, userHigherIsBetter: true, category: 'dilution' }
  ],
  
  yMetricsConfig: [
    // Core Asset Quality (What makes it worth saving)
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'asset-base' },
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'resource-quality' },
    { key: 'production.reserve_life_years', weight: 9, userHigherIsBetter: true, required: true, category: 'longevity' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 9, userHigherIsBetter: true, category: 'resource-upside' },
    
    // Hidden Value & Upside
    { key: 'mineral_estimates.potential_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'exploration-value' },
    { key: 'mineral_estimates.mineable_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'development-ready' },
    { key: 'financials.net_financial_assets', weight: 8, userHigherIsBetter: true, category: 'balance-sheet-value' },
    { key: 'financials.cash_value', weight: 8, userHigherIsBetter: true, category: 'liquidity-cushion' },
    
    // Production Potential
    { key: 'production.current_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'current-production' },
    { key: 'production.future_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'growth-potential' },
    { key: 'production.current_production_precious_aueq_koz', weight: 6, userHigherIsBetter: true, category: 'precious-production' },
    
    // Operational Improvement Potential
    { key: 'costs.aisc_future', weight: 7, userHigherIsBetter: false, category: 'cost-improvement' },
    { key: 'costs.tco_future', weight: 6, userHigherIsBetter: false, category: 'future-efficiency' },
    { key: 'production.number_of_projects', weight: 6, userHigherIsBetter: true, category: 'project-pipeline' },
    
    // Financial Recovery Indicators
    { key: 'financials.revenue_value', weight: 6, userHigherIsBetter: true, category: 'revenue-base' },
    { key: 'financials.gross_profit', weight: 6, userHigherIsBetter: true, category: 'gross-margins' },
    { key: 'financials.working_capital', weight: 5, userHigherIsBetter: true, category: 'working-capital' },
    
    // Asset Base for Recovery
    { key: 'financials.total_assets', weight: 5, userHigherIsBetter: true, category: 'asset-foundation' },
    { key: 'financials.total_shareholders_equity', weight: 5, userHigherIsBetter: true, category: 'equity-cushion' },
    { key: 'company-overview.percent_gold', weight: 4, userHigherIsBetter: true, category: 'quality-focus' }
  ],
  
  zMetricKey: 'financials.market_cap_value',
  zScale: 'log',
  defaultNormalizationMode: 'dataset_rank_percentile',
  defaultImputationMode: 'zero_worst',
  
  metricSelectionStrategy: {
    minRequired: 10,
    maxTotal: 20,
    priorityGroups: [
      { category: 'valuation-distress', minCount: 2 },
      { category: 'asset-base', minCount: 2 },
      { category: 'resource-quality', minCount: 1 },
      { category: 'cost-problems', minCount: 1 },
      { category: 'liquidity-stress', minCount: 1 }
    ]
  }
};