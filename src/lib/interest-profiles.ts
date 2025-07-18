/src/lib/interest-profiles.ts

// Defines the structure for a metric specifically within the context of an InterestProfile
export interface ProfileSpecificMetricInfo {
  metricKey: string; // Corresponds to the `key` in MetricConfig from metric-types.ts
  weight: number;    // Profile-specific weight for this metric (e.g., 1-5)
  // Optional: notes or justification for this metric's inclusion/weighting in this specific profile
  profile_notes?: string; 
}

// Defines an Interest Profile that a user can select
export interface InterestProfile {
  id: string; // Unique identifier for the profile, e.g., "max_potential_returns"
  name: string; // User-friendly name, e.g., "Max Potential Returns"
  description: string; // Detailed description for the user
  // The metrics that define this profile, referencing the main MetricConfig list
  metrics: ProfileSpecificMetricInfo[]; 
}

// Array to hold all predefined interest profiles
// Note: The `higherIsBetter` and `db_column`/`nested_path` will be looked up from `metric-types.ts` using `metricKey`
export const interestProfiles: InterestProfile[] = [
  {
    id: 'max_potential_returns',
    name: 'Max Potential Returns',
    description: 'Targets companies with the highest growth potential, often involving higher risk but significant upside.',
    metrics: [
      // Key Metrics for High Potential (examples from your list, mapped to metric-types.ts keys)
      { metricKey: 'production.future_production_total_aueq_koz', weight: 5 },
      { metricKey: 'mineral_estimates.potential_total_aueq_moz', weight: 5 },
      { metricKey: 'valuation_metrics.ev_per_resource_oz_all', weight: 4 }, // Lower is better handled by MetricConfig
      { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_all', weight: 3 }, // Lower is better
      { metricKey: 'financials.free_cash_flow', weight: 4, profile_notes: "FCF for reinvestment" },
      { metricKey: 'financials.revenue_value', weight: 4, profile_notes: "Strong revenue indicates growth" },
      { metricKey: 'financials.net_income_value', weight: 3, profile_notes: "Profitability supports expansion" },
      { metricKey: 'costs.aisc_future', weight: 4, profile_notes: "Low future costs improve margins" }, // Lower is better
      { metricKey: 'mineral_estimates.resources_total_aueq_moz', weight: 4 },
      { metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 3 },
      { metricKey: 'company-overview.percent_gold', weight: 1 },
      { metricKey: 'company-overview.percent_silver', weight: 1 },
      { metricKey: 'financials.market_cap_value', weight: 1, profile_notes: "Can be smaller caps with high potential" },
      { metricKey: 'valuation_metrics.ev_per_production_oz', weight: 2 }, // Lower is better
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 2, profile_notes: "Monitor dilution" }, // Lower is better via MetricConfig
      { metricKey: 'capital_structure.options_revenue', weight: 1 },
      { metricKey: 'financials.peg_ratio', weight: 3 }, // Lower is better
      { metricKey: 'financials.forward_pe', weight: 3 }, // Lower is better
      { metricKey: 'mineral_estimates.potential_precious_aueq_moz', weight: 4 },
      { metricKey: 'mineral_estimates.resources_precious_aueq_moz', weight: 3 },
      { metricKey: 'costs.construction_costs', weight: 3 }, // Lower is better
      { metricKey: 'production.reserve_life_years', weight: 2 },
      { metricKey: 'financials.price_to_sales', weight: 2 }, // Lower is better
      { metricKey: 'financials.price_to_book', weight: 2 }, // Lower is better
      { metricKey: 'valuation_metrics.ev_per_reserve_oz_all', weight: 2 }, // Lower is better
      { metricKey: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 2 }, // Lower is better
      { metricKey: 'financials.enterprise_to_revenue', weight: 2 }, // Lower is better
      { metricKey: 'financials.enterprise_to_ebitda', weight: 2 }, // Lower is better
      { metricKey: 'mineral_estimates.mineable_total_aueq_moz', weight: 3 },
      { metricKey: 'mineral_estimates.mineable_precious_aueq_moz', weight: 3 },
      { metricKey: 'capital_structure.existing_shares', weight: 1 }, // Lower is better
      { metricKey: 'capital_structure.in_the_money_options', weight: 1 }, // Lower is better (less dilution overhang)
      { metricKey: 'financials.shares_outstanding', weight: 1 }, // Lower is better
      { metricKey: 'financials.liabilities', weight: 1, profile_notes: "Manageable debt" }, // Lower is better
      { metricKey: 'financials.debt_value', weight: 1 }, // Lower is better
      { metricKey: 'financials.cost_of_revenue', weight: 2 }, // Lower is better
      { metricKey: 'financials.gross_profit', weight: 3 },
      { metricKey: 'financials.operating_expense', weight: 2 }, // Lower is better
      { metricKey: 'financials.operating_income', weight: 3 },
      { metricKey: 'financials.ebitda', weight: 3 },
      { metricKey: 'financials.net_financial_assets', weight: 2, profile_notes: "Positive is good" },
      { metricKey: 'costs.tco_future', weight: 3 }, // Lower is better
      { metricKey: 'costs.aisc_last_year', weight: 1, profile_notes: "Past performance, less focus for future potential" }, // Lower is better
      { metricKey: 'costs.aic_last_year', weight: 1 }, // Lower is better
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 2 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 1, profile_notes: "Current state, less focus for future potential" },
      // Metrics to consider adding to metric-types.ts or handling differently:
      // 'f_other_financial_assets' (New)
      // 'f_hedgebook' (New, likely text/boolean - special handling)
      // 'f_investments_json' (New, complex object - special handling)
      // 'change_1yr_percent' (New, numeric)
    ]
  },
  // TODO: Add other 9 profiles once this structure is confirmed.
];

// Helper function to retrieve the full MetricConfig using a metricKey.
// This will be essential for the company-matcher.ts to get `higherIsBetter`, `nested_path`, etc.
// import { metrics as allMetricConfigs, MetricConfig } from './metric-types'; // Assuming this path
// const metricConfigMap = new Map<string, MetricConfig>(allMetricConfigs.map(m => [m.key, m]));
// export const getFullMetricConfigInfo = (metricKey: string): MetricConfig | undefined => {
//   return metricConfigMap.get(metricKey);
// };
