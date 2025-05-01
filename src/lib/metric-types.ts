// src/lib/metric-types.ts
import type { ColumnTier, CompanyStatus } from './types';

// Define the categories
export type MetricCategory =
  | 'company-overview'
  | 'financials'
  | 'capital-structure'
  | 'mineral-estimates'
  | 'valuation-metrics'
  | 'production'
  | 'costs';

// Define formatting options
export type MetricFormat = 'number' | 'currency' | 'percent' | 'moz' | 'koz' | 'ratio' | 'years';

// The main configuration interface for each metric
export interface MetricConfig {
  key: string; // Unique key for React lists/internal use (e.g., 'financials.market_cap_value')
  db_column: string; // Flat column name from RpcResponseRow (e.g., 'f_market_cap_value')
  nested_path: string; // Path in the nested Company object (e.g., 'financials.market_cap_value')
  label: string; // Display label (e.g., 'Market Cap')
  description: string; // Detailed description for tooltips/help
  unit: string; // e.g., '$M', '%', 'Moz', 'x', 'yrs', '$/oz'
  higherIsBetter: boolean; // true = Higher is better (↑), false = Lower is better (↓)
  category: MetricCategory; // Grouping for UI
  tier: ColumnTier; // 'free' | 'medium' | 'premium'
  format: MetricFormat; // How to display the number
}

// Display names for categories
export const metricCategories: Record<MetricCategory, string> = {
  'company-overview': 'Company Overview',
  'financials': 'Financial Metrics',
  'capital-structure': 'Capital Structure',
  'mineral-estimates': 'Mineral Estimates',
  'valuation-metrics': 'Valuation Metrics',
  'production': 'Production',
  'costs': 'Cost Metrics'
};

// --- The Master List of Metrics ---
// VERIFIED against user list (Apr 4 '25) for higherIsBetter, tier, and descriptions from original file.
export const metrics: MetricConfig[] = [
  // === Company Overview - Free Tier ===
  {
    key: 'company-overview.percent_gold',
    db_column: 'percent_gold', nested_path: 'percent_gold',
    label: 'Gold %', description: 'Percentage of production/resources as gold. Higher is better (↑) for gold-focused investors.', // Original Description
    unit: '%', higherIsBetter: true, category: 'company-overview', tier: 'free', format: 'percent'
  },
  {
    key: 'company-overview.percent_silver',
    db_column: 'percent_silver', nested_path: 'percent_silver',
    label: 'Silver %', description: 'Percentage of production/resources as silver. Higher is better (↑) for silver-focused investors.', // Original Description
    unit: '%', higherIsBetter: true, category: 'company-overview', tier: 'free', format: 'percent'
  },
   {
    key: 'company-overview.share_price',
    db_column: 'share_price', nested_path: 'share_price',
    label: 'Share Price', description: 'Latest stock price ($). Higher is better (↑) for market strength.', // User Description
    unit: '$', higherIsBetter: true, category: 'company-overview', tier: 'free', format: 'currency'
  },

  // === Financials - Free Tier ===
  {
    key: 'financials.cash_value',
    db_column: 'f_cash_value', nested_path: 'financials.cash_value',
    label: 'Cash', description: 'Cash reserves ($M). Higher is better (↑) for financial flexibility.', // Original Description
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'free', format: 'currency'
  },
  {
    key: 'financials.market_cap_value',
    db_column: 'f_market_cap_value', nested_path: 'financials.market_cap_value',
    label: 'Market Cap', description: 'Market capitalization ($M). Higher is better (↑) for company scale.', // Original Description
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'free', format: 'currency'
  },
  {
    key: 'financials.enterprise_value_value',
    db_column: 'f_enterprise_value_value', nested_path: 'financials.enterprise_value_value',
    label: 'Enterprise Value', description: 'Market cap + debt - cash ($M). Higher is better (↑) for total valuation.', // Original Description
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'free', format: 'currency'
  },
   {
    key: 'financials.net_financial_assets',
    db_column: 'f_net_financial_assets', nested_path: 'financials.net_financial_assets',
    label: 'Net Fin Assets', description: 'Assets minus liabilities ($M). Higher is better (↑) for health.', // Shortened label, User Description
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'free', format: 'currency'
  },
  {
    key: 'financials.shares_outstanding',
    db_column: 'f_shares_outstanding', nested_path: 'financials.shares_outstanding',
    label: 'Shares Outstanding', description: 'Issued shares (millions). Lower is better (↓) to minimize dilution.', // Original Description + User Direction
    unit: 'M', higherIsBetter: false, category: 'financials', tier: 'free', format: 'number'
  },

  // === Financials - Medium Tier ('Pro') ===
  {
    key: 'financials.price_to_book',
    db_column: 'f_price_to_book', nested_path: 'financials.price_to_book',
    label: 'P/B Ratio', description: 'Share price vs. book value. Lower is better (↓) for undervaluation.', // Original Description + User Direction
    unit: 'x', higherIsBetter: false, category: 'financials', tier: 'medium', format: 'ratio'
  },
  {
    key: 'financials.price_to_sales',
    db_column: 'f_price_to_sales', nested_path: 'financials.price_to_sales',
    label: 'P/S Ratio', description: 'Share price vs. revenue. Lower is better (↓) for value.', // Original Description + User Direction
    unit: 'x', higherIsBetter: false, category: 'financials', tier: 'medium', format: 'ratio'
  },
  {
    key: 'financials.enterprise_to_revenue',
    db_column: 'f_enterprise_to_revenue', nested_path: 'financials.enterprise_to_revenue',
    label: 'EV/Revenue', description: 'EV vs. revenue. Lower is better (↓) for efficiency.', // Original Description + User Direction
    unit: 'x', higherIsBetter: false, category: 'financials', tier: 'medium', format: 'ratio'
  },
  {
    key: 'financials.enterprise_to_ebitda',
    db_column: 'f_enterprise_to_ebitda', nested_path: 'financials.enterprise_to_ebitda',
    label: 'EV/EBITDA', description: 'EV vs. EBITDA. Lower is better (↓) for valuation.', // Original Description + User Direction
    unit: 'x', higherIsBetter: false, category: 'financials', tier: 'medium', format: 'ratio'
  },
  {
    key: 'financials.trailing_pe',
    db_column: 'f_trailing_pe', nested_path: 'financials.trailing_pe',
    label: 'Trailing P/E', description: 'Trailing price-to-earnings ratio. Lower is better (↓) for past value.', // Original Description + User Direction
    unit: 'x', higherIsBetter: false, category: 'financials', tier: 'medium', format: 'ratio'
  },
  {
    key: 'financials.forward_pe',
    db_column: 'f_forward_pe', nested_path: 'financials.forward_pe',
    label: 'Forward P/E', description: 'Forward price-to-earnings ratio. Lower is better (↓) for future value.', // Original Description + User Direction
    unit: 'x', higherIsBetter: false, category: 'financials', tier: 'medium', format: 'ratio'
  },
  {
    key: 'financials.revenue_value',
    db_column: 'f_revenue_value', nested_path: 'financials.revenue_value',
    label: 'Revenue', description: 'Annual revenue ($M). Higher is better (↑) for income strength.', // Original Description + User Direction
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'medium', format: 'currency'
  },
  {
    key: 'financials.net_income_value',
    db_column: 'f_net_income_value', nested_path: 'financials.net_income_value',
    label: 'Net Income', description: 'Net profit ($M). Higher is better (↑) for bottom-line success.', // Original Description + User Direction
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'medium', format: 'currency'
  },
  {
    key: 'financials.debt_value',
    db_column: 'f_debt_value', nested_path: 'financials.debt_value',
    label: 'Total Debt', description: 'Total debt ($M). Lower is better (↓) for reduced risk.', // Original Description + User Direction
    unit: '$M', higherIsBetter: false, category: 'financials', tier: 'medium', format: 'currency'
  },

  // === Financials - Premium Tier ('Enterprise') ===
  {
    key: 'financials.free_cash_flow',
    db_column: 'f_free_cash_flow', nested_path: 'financials.free_cash_flow',
    label: 'Free Cash Flow', description: 'Cash after operating expenses ($M). Higher is better (↑) for profitability.', // Original Description + User Direction
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'premium', format: 'currency'
  },
  {
    key: 'financials.ebitda',
    db_column: 'f_ebitda', nested_path: 'financials.ebitda',
    label: 'EBITDA', description: 'Earnings before interest, taxes, etc. ($M). Higher is better (↑) for operating profit.', // Original Description + User Direction
    unit: '$M', higherIsBetter: true, category: 'financials', tier: 'premium', format: 'currency'
  },

  // === Capital Structure - Medium Tier ('Pro') ===
  {
    key: 'capital_structure.existing_shares',
    db_column: 'cs_existing_shares', nested_path: 'capital_structure.existing_shares',
    label: 'Existing Shares', description: 'Current shares outstanding (millions). Lower is better (↓) for ownership concentration.', // Original Description + User Direction
    unit: 'M', higherIsBetter: false, category: 'capital-structure', tier: 'medium', format: 'number'
  },
  {
    key: 'capital_structure.fully_diluted_shares',
    db_column: 'cs_fully_diluted_shares', nested_path: 'capital_structure.fully_diluted_shares',
    label: 'Fully Diluted Shares', description: 'Shares including options/warrants (millions). Lower is better (↓) for future dilution.', // Original Description + User Direction
    unit: 'M', higherIsBetter: false, category: 'capital-structure', tier: 'medium', format: 'number'
  },

  // === Capital Structure - Premium Tier ('Enterprise') ===
  {
    key: 'capital_structure.in_the_money_options',
    db_column: 'cs_in_the_money_options', nested_path: 'capital_structure.in_the_money_options',
    label: 'ITM Options', description: 'Profitable exercisable options (millions). Lower is better (↓) for dilution risk.', // Original Description + User Direction
    unit: 'M', higherIsBetter: false, category: 'capital-structure', tier: 'premium', format: 'number'
  },
  {
    key: 'capital_structure.options_revenue',
    db_column: 'cs_options_revenue', nested_path: 'capital_structure.options_revenue',
    label: 'Options Revenue', description: 'Revenue from options ($M). Higher is better (↑) for extra income.', // Original Description + User Direction
    unit: '$M', higherIsBetter: true, category: 'capital-structure', tier: 'premium', format: 'currency'
  },

  // === Mineral Estimates - Medium Tier ('Pro') ===
  {
    key: 'mineral_estimates.reserves_total_aueq_moz',
    db_column: 'me_reserves_total_aueq_moz', nested_path: 'mineral_estimates.reserves_total_aueq_moz',
    label: 'Total Reserves', description: 'Gold-equivalent reserves (million ounces). Higher is better (↑) for asset base.', // Original Description + User Direction
    unit: 'Moz', higherIsBetter: true, category: 'mineral-estimates', tier: 'medium', format: 'moz'
  },
  {
    key: 'mineral_estimates.measured_indicated_total_aueq_moz',
    db_column: 'me_measured_indicated_total_aueq_moz', nested_path: 'mineral_estimates.measured_indicated_total_aueq_moz',
    label: 'Total M&I', description: 'Measured/indicated resources (moz). Higher is better (↑) for potential.', // Original Description + User Direction
    unit: 'Moz', higherIsBetter: true, category: 'mineral-estimates', tier: 'medium', format: 'moz'
  },
  {
    key: 'mineral_estimates.resources_total_aueq_moz',
    db_column: 'me_resources_total_aueq_moz', nested_path: 'mineral_estimates.resources_total_aueq_moz',
    label: 'Total Resources', description: 'Total Measured, Indicated, and Inferred gold equivalent ounces. Higher is better (↑) for scale.', // Original Description + User Direction
    unit: 'Moz', higherIsBetter: true, category: 'mineral-estimates', tier: 'medium', format: 'moz'
  },
   {
    key: 'mineral_estimates.reserves_precious_aueq_moz',
    db_column: 'me_reserves_precious_aueq_moz', nested_path: 'mineral_estimates.reserves_precious_aueq_moz',
    label: 'Precious Reserves', description: 'Precious metal reserves (moz). Higher is better (↑) for value.', // Original Description + User Direction
    unit: 'Moz', higherIsBetter: true, category: 'mineral-estimates', tier: 'medium', format: 'moz'
  },
  {
    key: 'mineral_estimates.measured_indicated_precious_aueq_moz',
    db_column: 'me_measured_indicated_precious_aueq_moz', nested_path: 'mineral_estimates.measured_indicated_precious_aueq_moz',
    label: 'Precious M&I', description: 'Precious Measured & Indicated (moz). Higher is better (↑) for potential.', // Original Description + User Direction
    unit: 'Moz', higherIsBetter: true, category: 'mineral-estimates', tier: 'medium', format: 'moz'
  },
  {
    key: 'mineral_estimates.resources_precious_aueq_moz',
    db_column: 'me_resources_precious_aueq_moz', nested_path: 'mineral_estimates.resources_precious_aueq_moz',
    label: 'Precious Resources', description: 'Precious total resources (moz). Higher is better (↑) for value.', // Original Description + User Direction
    unit: 'Moz', higherIsBetter: true, category: 'mineral-estimates', tier: 'medium', format: 'moz'
  },

  // === Mineral Estimates - Premium Tier ('Enterprise') ===
  {
    key: 'mineral_estimates.potential_total_aueq_moz',
    db_column: 'me_potential_total_aueq_moz', nested_path: 'mineral_estimates.potential_total_aueq_moz',
    label: 'Total Potential', description: 'Potential resources (moz). Higher is better (↑) for upside.', // Original Description + User Direction
    unit: 'Moz', higherIsBetter: true, category: 'mineral-estimates', tier: 'premium', format: 'moz'
  },


  // === Valuation Metrics - Medium Tier ('Pro') ===
  {
    key: 'valuation_metrics.mkt_cap_per_resource_oz_all',
    db_column: 'vm_mkt_cap_per_resource_oz_all', nested_path: 'valuation_metrics.mkt_cap_per_resource_oz_all',
    label: 'MC/Resource oz', description: 'Market cap per total resource ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'medium', format: 'currency'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_reserve_oz_all',
    db_column: 'vm_mkt_cap_per_reserve_oz_all', nested_path: 'valuation_metrics.mkt_cap_per_reserve_oz_all',
    label: 'MC/Reserve oz', description: 'Market cap per total reserve ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'medium', format: 'currency'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_resource_oz_precious',
    db_column: 'vm_mkt_cap_per_resource_oz_precious', nested_path: 'valuation_metrics.mkt_cap_per_resource_oz_precious',
    label: 'MC/Prec Resource oz', description: 'Market cap per precious resource ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'medium', format: 'currency'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_reserve_oz_precious',
    db_column: 'vm_mkt_cap_per_reserve_oz_precious', nested_path: 'valuation_metrics.mkt_cap_per_reserve_oz_precious',
    label: 'MC/Prec Reserve oz', description: 'Market cap per precious reserve ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'medium', format: 'currency'
  },

  // === Valuation Metrics - Premium Tier ('Enterprise') ===
  {
    key: 'valuation_metrics.ev_per_resource_oz_all',
    db_column: 'vm_ev_per_resource_oz_all', nested_path: 'valuation_metrics.ev_per_resource_oz_all',
    label: 'EV/Resource oz', description: 'EV per total resource ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'premium', format: 'currency'
  },
  {
    key: 'valuation_metrics.ev_per_reserve_oz_all',
    db_column: 'vm_ev_per_reserve_oz_all', nested_path: 'valuation_metrics.ev_per_reserve_oz_all',
    label: 'EV/Reserve oz', description: 'EV per total reserve ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'premium', format: 'currency'
  },
  {
    key: 'valuation_metrics.ev_per_resource_oz_precious',
    db_column: 'vm_ev_per_resource_oz_precious', nested_path: 'valuation_metrics.ev_per_resource_oz_precious',
    label: 'EV/Prec Resource oz', description: 'EV per precious resource ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'premium', format: 'currency'
  },
  {
    key: 'valuation_metrics.ev_per_reserve_oz_precious',
    db_column: 'vm_ev_per_reserve_oz_precious', nested_path: 'valuation_metrics.ev_per_reserve_oz_precious',
    label: 'EV/Prec Reserve oz', description: 'EV per precious reserve ounce ($/oz). Lower is better (↓) for value.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'valuation-metrics', tier: 'premium', format: 'currency'
  },

  // === Production - Free Tier ===
  {
    key: 'production.current_production_total_aueq_koz',
    db_column: 'p_current_production_total_aueq_koz', nested_path: 'production.current_production_total_aueq_koz',
    label: 'Current Prod.', description: 'Current annual gold equivalent production (koz). Higher is better (↑) for output.', // Original Description + User Direction
    unit: 'koz', higherIsBetter: true, category: 'production', tier: 'free', format: 'koz'
  },

  // === Production - Medium Tier ('Pro') ===
   {
    key: 'production.reserve_life_years',
    db_column: 'p_reserve_life_years', nested_path: 'production.reserve_life_years',
    label: 'Reserve Life', description: 'Years of reserves at current production. Higher is better (↑) for longevity.', // Original Description + User Direction
    unit: 'years', higherIsBetter: true, category: 'production', tier: 'medium', format: 'years'
  },
  {
    key: 'production.current_production_precious_aueq_koz',
    db_column: 'p_current_production_precious_aueq_koz', nested_path: 'production.current_production_precious_aueq_koz',
    label: 'Precious Prod.', description: 'Precious metal production (koz). Higher is better (↑) for value.', // Original Description + User Direction
    unit: 'koz', higherIsBetter: true, category: 'production', tier: 'medium', format: 'koz'
  },
  {
    key: 'production.current_production_non_precious_aueq_koz',
    db_column: 'p_current_production_non_precious_aueq_koz', nested_path: 'production.current_production_non_precious_aueq_koz',
    label: 'Non-Precious Prod.', description: 'Non-precious production (koz). Higher is better (↑) for output.', // Original Description + User Direction
    unit: 'koz', higherIsBetter: true, category: 'production', tier: 'medium', format: 'koz'
  },

  // === Production - Premium Tier ('Enterprise') ===
  {
    key: 'production.future_production_total_aueq_koz',
    db_column: 'p_future_production_total_aueq_koz', nested_path: 'production.future_production_total_aueq_koz',
    label: 'Future Prod.', description: 'Estimated future annual gold equivalent production (koz). Higher is better (↑) for growth.', // Original Description + User Direction
    unit: 'koz', higherIsBetter: true, category: 'production', tier: 'premium', format: 'koz'
  },

  // === Costs - Premium Tier ('Enterprise') ===
  {
    key: 'costs.aisc_future',
    db_column: 'c_aisc_future', nested_path: 'costs.aisc_future',
    label: 'Future AISC', description: 'Projected All-In Sustaining Cost per ounce ($/oz). Lower is better (↓) for efficiency.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'costs', tier: 'premium', format: 'currency'
  },
  {
    key: 'costs.construction_costs',
    db_column: 'c_construction_costs', nested_path: 'costs.construction_costs',
    label: 'Construction Costs', description: 'Project construction costs ($M). Lower is better (↓) for efficiency.', // Original Description + User Direction
    unit: '$M', higherIsBetter: false, category: 'costs', tier: 'premium', format: 'currency'
  },
  {
    key: 'costs.tco_future',
    db_column: 'c_tco_future', nested_path: 'costs.tco_future',
    label: 'Future TCO', description: 'Future total cash costs ($/oz). Lower is better (↓) for profit.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'costs', tier: 'premium', format: 'currency'
  },
  {
    key: 'costs.aisc_last_quarter',
    db_column: 'c_aisc_last_quarter', nested_path: 'costs.aisc_last_quarter',
    label: 'Last Qtr AISC', description: 'AISC last quarter ($/oz). Lower is better (↓) for performance.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'costs', tier: 'premium', format: 'currency'
  },
  {
    key: 'costs.aisc_last_year',
    db_column: 'c_aisc_last_year', nested_path: 'costs.aisc_last_year',
    label: 'Last Yr AISC', description: 'AISC last year ($/oz). Lower is better (↓) for efficiency.', // Original Description + User Direction
    unit: '$/oz', higherIsBetter: false, category: 'costs', tier: 'premium', format: 'currency'
  }
];

// === Helper Functions === (Preserved from original)

export function getMetricsByCategory(category: MetricCategory): MetricConfig[] {
  return metrics.filter(metric => metric.category === category);
}

export function getMetricByKey(key: string): MetricConfig | undefined {
  return metrics.find(metric => metric.key === key);
}

export function getMetricByDbColumn(dbColumn: string): MetricConfig | undefined {
  return metrics.find(metric => metric.db_column === dbColumn);
}

export function getMetricByNestedPath(nestedPath: string): MetricConfig | undefined {
  return metrics.find(metric => metric.nested_path === nestedPath);
}

export function getAccessibleMetrics(tier: ColumnTier): MetricConfig[] {
  const tierLevels: Record<ColumnTier, number> = { free: 0, medium: 1, premium: 2 };
  const userTierLevel = tierLevels[tier];
  if (userTierLevel === undefined) {
     console.warn(`[metric-types] Unknown user tier provided: ${tier}. Defaulting to free.`);
     return metrics.filter(metric => (tierLevels[metric.tier] ?? 99) <= tierLevels.free);
  }
  return metrics.filter(metric => {
     const metricTierLevel = tierLevels[metric.tier];
     if (metricTierLevel === undefined) {
         console.warn(`[metric-types] Metric ${metric.key} has unknown tier: ${metric.tier}. Assuming inaccessible.`);
         return false;
     }
     return metricTierLevel <= userTierLevel;
  });
}