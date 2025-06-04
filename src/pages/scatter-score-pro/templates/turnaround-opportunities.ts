// src/pages/scatter-score-pro/templates/turnaround-opportunities.ts
import type { ScatterScoreTemplate } from '../types';

export const TurnaroundOpportunitiesTemplate: ScatterScoreTemplate = {
  id: 'turnaround-opportunities',
  name: 'Turnaround & Recovery Plays',
  description: 'Identifies potentially distressed or underperforming companies with strong underlying assets that could benefit from operational improvements or market recovery, using available metrics.',
  category: 'Value Investing', 
  tags: ['turnaround', 'recovery', 'contrarian', 'available-metrics'], 
  xAxisThemeLabel: 'Distress & Undervaluation Indicators', 
  yAxisThemeLabel: 'Recovery Potential & Asset Quality', 
  minMetricsRequired: 8, 
  maxMetricsToShow: 18, 

  xMetricsConfig: [
    // Valuation Distress Indicators (Lower = More Distressed/Undervalued)
    { key: 'financials.price_to_book', weight: 10, userHigherIsBetter: false, required: true, category: 'valuation-distress' },
    { key: 'financials.price_to_sales', weight: 10, userHigherIsBetter: false, required: true, category: 'valuation-distress' },
    { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 9, userHigherIsBetter: false, category: 'resource-discount' },
    { key: 'valuation_metrics.ev_per_reserve_oz_all', weight: 9, userHigherIsBetter: false, category: 'resource-discount' },
    { key: 'financials.market_cap_value', weight: 6, userHigherIsBetter: false, category: 'market-pessimism' },
    
    // Financial Stress Indicators (Higher = More Stress, except for cash)
    { key: 'financials.debt_value', weight: 8, userHigherIsBetter: true, category: 'debt-burden' }, // Higher debt = more distress
    { key: 'financials.cash_value', weight: 7, userHigherIsBetter: false, category: 'liquidity-stress' }, // Lower cash = more distress
    { key: 'financials.shares_outstanding', weight: 5, userHigherIsBetter: true, category: 'dilution-risk' }, // Higher shares = more dilution/distress
    { key: 'capital_structure.fully_diluted_shares', weight: 5, userHigherIsBetter: true, category: 'dilution-risk' },

    // Operational Challenges (Higher costs = More distressed)
    { key: 'costs.aisc_last_year', weight: 8, userHigherIsBetter: true, category: 'cost-problems' },
    { key: 'costs.tco_current', weight: 7, userHigherIsBetter: true, category: 'total-cost-issues' },
    { key: 'financials.operating_expense', weight: 7, userHigherIsBetter: true, category: 'opex-burden' }, // Higher opex can be sign of inefficiency/distress
    
    // Underperformance Indicators (Lower = More distressed)
    { key: 'financials.net_income_value', weight: 6, userHigherIsBetter: false, category: 'profitability-issues' },
    { key: 'financials.free_cash_flow', weight: 6, userHigherIsBetter: false, category: 'cash-flow-issues' },
    { key: 'financials.ebitda', weight: 6, userHigherIsBetter: false, category: 'earnings-weakness' }
  ],

  yMetricsConfig: [
    // Core Asset Quality
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'asset-base' },
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 10, userHigherIsBetter: true, required: true, category: 'resource-quality' },
    { key: 'production.reserve_life_years', weight: 9, userHigherIsBetter: true, category: 'longevity' },
    { key: 'mineral_estimates.resources_total_aueq_moz', weight: 9, userHigherIsBetter: true, category: 'resource-upside' },
    { key: 'mineral_estimates.potential_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'exploration-value' },
    // { key: 'financials.total_assets', weight: 7, userHigherIsBetter: true, category: 'asset-foundation' }, // Assuming this maps via metric-types.ts

    // Financial Strength for Recovery
    { key: 'financials.net_financial_assets', weight: 8, userHigherIsBetter: true, category: 'balance-sheet-value' },
    { key: 'financials.cash_value', weight: 8, userHigherIsBetter: true, category: 'liquidity-cushion' },

    // Production & Revenue Potential for Recovery
    { key: 'production.future_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'growth-potential' },
    { key: 'financials.revenue_value', weight: 7, userHigherIsBetter: true, category: 'revenue-base' },
    
    // Operational Improvement Potential / Performance
    { key: 'costs.aisc_future', weight: 7, userHigherIsBetter: false, category: 'cost-improvement' }, // Lower future costs = recovery
    { key: 'financials.ebitda', weight: 6, userHigherIsBetter: true, category: 'earnings-recovery' } // Higher EBITDA = recovery
  ],

  zMetricKey: 'financials.market_cap_value', 
  zScale: 'log', 
  defaultNormalizationMode: 'dataset_rank_percentile', 
  defaultImputationMode: 'zero_worst', 

  metricSelectionStrategy: { 
    minRequired: 8,
    maxTotal: 18,
    priorityGroups: [
      { category: 'valuation-distress', minCount: 2 },
      { category: 'asset-base', minCount: 2 },
      { category: 'resource-quality', minCount: 1 }
    ]
  }
};