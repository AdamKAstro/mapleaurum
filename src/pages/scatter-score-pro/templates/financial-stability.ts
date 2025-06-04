// src/pages/scatter-score-pro/templates/financial-stability.ts
import type { ScatterScoreTemplate } from '../types';

export const FinancialStabilityTemplate: ScatterScoreTemplate = {
  id: 'financial-stability',
  name: 'Financial Stability & Low Risk',
  description: 'Risk-averse investment analysis prioritizing companies with fortress balance sheets, low leverage, strong liquidity, and sustainable operations through market cycles.',
  category: 'Risk Management',
  tags: ['stability', 'risk-averse', 'balance-sheet', 'liquidity', 'conservative'],
  xAxisThemeLabel: 'Financial Fortress Score',
  yAxisThemeLabel: 'Operational Stability & Quality',
  minMetricsRequired: 10,
  maxMetricsToShow: 22,

  xMetricsConfig: [
    // Core Balance Sheet Strength
    { key: 'financials.cash_value', weight: 10, userHigherIsBetter: true, required: true, category: 'liquidity' },
    { key: 'financials.net_financial_assets', weight: 10, userHigherIsBetter: true, required: true, category: 'net-position' },
    { key: 'financials.debt_value', weight: 10, userHigherIsBetter: false, required: true, category: 'leverage' },
    { key: 'financials.liabilities', weight: 9, userHigherIsBetter: false, category: 'total-obligations' },

    // Market Confidence & Scale
    { key: 'financials.market_cap_value', weight: 9, userHigherIsBetter: true, required: true, category: 'market-confidence' },
    { key: 'financials.enterprise_value_value', weight: 8, userHigherIsBetter: true, category: 'enterprise-scale' },

    // Share Structure (Dilution Risk)
    { key: 'capital_structure.existing_shares', weight: 8, userHigherIsBetter: false, category: 'share-dilution' },
    { key: 'capital_structure.fully_diluted_shares', weight: 8, userHigherIsBetter: false, category: 'share-dilution' },
    { key: 'financials.shares_outstanding', weight: 7, userHigherIsBetter: false, category: 'share-dilution' },
    { key: 'capital_structure.in_the_money_options', weight: 7, userHigherIsBetter: false, category: 'share-dilution' },
    { key: 'capital_structure.options_revenue', weight: 6, userHigherIsBetter: true, category: 'share-dilution' },

    // Other Financial Assets
    { key: 'financials.other_financial_assets', weight: 6, userHigherIsBetter: true, category: 'financial-assets' },

    // Valuation (Lower = Better for stability)
    { key: 'financials.price_to_book', weight: 6, userHigherIsBetter: false, category: 'valuation' },
    { key: 'financials.price_to_sales', weight: 6, userHigherIsBetter: false, category: 'valuation' },
    { key: 'financials.enterprise_to_ebitda', weight: 5, userHigherIsBetter: false, category: 'valuation' },
    { key: 'financials.enterprise_to_revenue', weight: 5, userHigherIsBetter: false, category: 'valuation' }
  ],

  yMetricsConfig: [
    // Operational Stability
    { key: 'production.reserve_life_years', weight: 10, userHigherIsBetter: true, required: true, category: 'longevity' },
    { key: 'financials.revenue_value', weight: 9, userHigherIsBetter: true, required: true, category: 'revenue-scale' },
    { key: 'financials.ebitda', weight: 9, userHigherIsBetter: true, required: true, category: 'earnings-quality' },
    { key: 'financials.free_cash_flow', weight: 9, userHigherIsBetter: true, required: true, category: 'cash-generation' },

    // Profitability
    { key: 'financials.gross_profit', weight: 8, userHigherIsBetter: true, category: 'core-profitability' },
    { key: 'financials.operating_income', weight: 8, userHigherIsBetter: true, category: 'operational-earnings' },
    { key: 'financials.net_income_value', weight: 8, userHigherIsBetter: true, category: 'net-earnings' },

    // Asset Quality
    { key: 'mineral_estimates.reserves_total_aueq_moz', weight: 8, userHigherIsBetter: true, category: 'resource-base' },
    { key: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 7, userHigherIsBetter: true, category: 'resource-quality' },
    { key: 'production.current_production_total_aueq_koz', weight: 7, userHigherIsBetter: true, category: 'production-base' },

    // Cost Management
    { key: 'costs.aisc_last_year', weight: 7, userHigherIsBetter: false, category: 'cost-control' },
    { key: 'costs.tco_current', weight: 6, userHigherIsBetter: false, category: 'total-costs' },
    { key: 'costs.aisc_last_quarter', weight: 6, userHigherIsBetter: false, category: 'cost-control' },
    { key: 'costs.aic_last_year', weight: 5, userHigherIsBetter: false, category: 'all-in-costs' },

    // Operating Efficiency
    { key: 'financials.cost_of_revenue', weight: 5, userHigherIsBetter: false, category: 'efficiency' },
    { key: 'financials.operating_expense', weight: 5, userHigherIsBetter: false, category: 'efficiency' }
  ],

  zMetricKey: 'production.reserve_life_years',
  zScale: 'linear',
  defaultNormalizationMode: 'global_min_max',
  defaultImputationMode: 'zero_worst',

  metricSelectionStrategy: {
    minRequired: 10,
    maxTotal: 22, // Matches maxMetricsToShow
    priorityGroups: [
      { category: 'liquidity', minCount: 2 },
      { category: 'leverage', minCount: 2 },
      { category: 'earnings-quality', minCount: 2 },
      { category: 'longevity', minCount: 1 },
      { category: 'cash-generation', minCount: 1 }
    ]
  }
};