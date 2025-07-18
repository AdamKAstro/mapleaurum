// src/features/hook-ui/lib/interest-profiles-config.ts

import { InterestProfile } from '../types/hook-ui-types';

// Array to hold all predefined interest profiles
// The `metricKey` should correspond to a `key` in your main `src/lib/metric-types.ts`
// The `higherIsBetter` logic will be derived from the MetricConfig found using that key during scoring.
export const interestProfiles: InterestProfile[] = [
  {
    id: 'max_potential_returns',
    name: 'Max Potential Returns',
    description: 'Targets companies with the highest growth potential, often involving higher risk but significant upside.',
    metrics: [
      { metricKey: 'production.future_production_total_aueq_koz', weight: 5 },
      { metricKey: 'mineral_estimates.potential_total_aueq_moz', weight: 5 },
      { metricKey: 'valuation_metrics.ev_per_resource_oz_all', weight: 4 },
      { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_all', weight: 3 },
      { metricKey: 'financials.free_cash_flow', weight: 4, profile_notes: "FCF for reinvestment" },
      { metricKey: 'financials.revenue_value', weight: 4, profile_notes: "Strong revenue indicates growth" },
      { metricKey: 'financials.net_income_value', weight: 3, profile_notes: "Profitability supports expansion" },
      { metricKey: 'costs.aisc_future', weight: 4, profile_notes: "Low future costs improve margins" },
      { metricKey: 'mineral_estimates.resources_total_aueq_moz', weight: 4 },
      { metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 3 },
      { metricKey: 'company-overview.percent_gold', weight: 1 },
      { metricKey: 'company-overview.percent_silver', weight: 1 },
      { metricKey: 'financials.market_cap_value', weight: 2, profile_notes: "Can be smaller caps with high potential" },
      { metricKey: 'valuation_metrics.ev_per_production_oz', weight: 2 },
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 2, profile_notes: "Monitor dilution" },
      { metricKey: 'capital_structure.options_revenue', weight: 1 },
      { metricKey: 'financials.peg_ratio', weight: 3 },
      { metricKey: 'financials.forward_pe', weight: 3 },
      { metricKey: 'mineral_estimates.potential_precious_aueq_moz', weight: 4 },
      { metricKey: 'mineral_estimates.resources_precious_aueq_moz', weight: 3 },
      { metricKey: 'costs.construction_costs', weight: 3 },
      { metricKey: 'production.reserve_life_years', weight: 2 },
      { metricKey: 'financials.price_to_sales', weight: 2 },
      { metricKey: 'financials.price_to_book', weight: 2 },
      { metricKey: 'valuation_metrics.ev_per_reserve_oz_all', weight: 2 },
      { metricKey: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 2 },
      { metricKey: 'financials.enterprise_to_revenue', weight: 2 },
      { metricKey: 'financials.enterprise_to_ebitda', weight: 2 },
      { metricKey: 'mineral_estimates.mineable_total_aueq_moz', weight: 3 },
      { metricKey: 'mineral_estimates.mineable_precious_aueq_moz', weight: 3 },
      { metricKey: 'capital_structure.existing_shares', weight: 1 },
      { metricKey: 'capital_structure.in_the_money_options', weight: 1 },
      { metricKey: 'financials.shares_outstanding', weight: 1 },
      // { metricKey: 'financials.other_financial_assets', weight: 1 }, // Needs key in metric-types.ts (e.g. 'financials.other_financial_assets')
      { metricKey: 'financials.liabilities', weight: 1, profile_notes: "Manageable debt" },
      { metricKey: 'financials.debt_value', weight: 1 },
      { metricKey: 'financials.cost_of_revenue', weight: 2 },
      { metricKey: 'financials.gross_profit', weight: 3 },
      { metricKey: 'financials.operating_expense', weight: 2 },
      { metricKey: 'financials.operating_income', weight: 3 },
      { metricKey: 'financials.ebitda', weight: 3 },
      { metricKey: 'financials.net_financial_assets', weight: 2, profile_notes: "Positive is good" },
      // { metricKey: 'financials.hedgebook', weight: 1 }, // Needs key in metric-types.ts & special handling
      { metricKey: 'costs.tco_future', weight: 3 },
      { metricKey: 'costs.aisc_last_year', weight: 1, profile_notes: "Past performance, less focus for future potential" },
      { metricKey: 'costs.aic_last_year', weight: 1 },
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 2 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 1, profile_notes: "Current state, less focus for future potential" },
      // { metricKey: 'financials.investments_json', weight: 1 }, // Needs key in metric-types.ts & special handling
      // { metricKey: 'company-overview.change_1yr_percent', weight: 2 }, // Needs key in metric-types.ts (e.g., 'company-overview.change_1yr_percent')
    ]
  },
  {
    id: 'cautious_safe_ounces',
    name: 'Cautious Safe Ounces',
    description: 'Focuses on stability, low risk, and consistent performance for risk-averse investors.',
    metrics: [
      { metricKey: 'financials.cash_value', weight: 5 },
      { metricKey: 'financials.debt_value', weight: 5 }, 
      { metricKey: 'financials.net_financial_assets', weight: 4 },
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 4 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 4 },
      { metricKey: 'financials.trailing_pe', weight: 3 },
      { metricKey: 'financials.price_to_book', weight: 3 },
      // { metricKey: 'financials.dividend_yield', weight: 4 }, // Needs key in metric-types.ts
      { metricKey: 'costs.aisc_last_year', weight: 4 },
      { metricKey: 'production.reserve_life_years', weight: 3 },
      { metricKey: 'financials.liabilities', weight: 3 },
      { metricKey: 'financials.shares_outstanding', weight: 2 },
      { metricKey: 'financials.peg_ratio', weight: 2 },
      { metricKey: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 3 },
      { metricKey: 'capital_structure.existing_shares', weight: 2 },
      { metricKey: 'financials.net_income_value', weight: 3 },
      { metricKey: 'financials.operating_income', weight: 3 },
      { metricKey: 'financials.gross_profit', weight: 3 },
      { metricKey: 'financials.revenue_value', weight: 2 },
      { metricKey: 'costs.aic_last_year', weight: 3 },
      { metricKey: 'mineral_estimates.mineable_total_aueq_moz', weight: 2 },
      { metricKey: 'financials.enterprise_to_ebitda', weight: 2 },
      { metricKey: 'financials.enterprise_to_revenue', weight: 2 },
      { metricKey: 'financials.cost_of_revenue', weight: 2 },
      { metricKey: 'financials.operating_expense', weight: 2 },
      { metricKey: 'financials.ebitda', weight: 3 },
      { metricKey: 'financials.free_cash_flow', weight: 4 },
      // { metricKey: 'financials.other_financial_assets', weight: 1 }, // Needs key
      // { metricKey: 'financials.hedgebook', weight: 2 }, // Needs key & special handling
      { metricKey: 'costs.tco_current', weight: 3 },
      { metricKey: 'costs.aisc_last_quarter', weight: 3 },
      { metricKey: 'costs.aic_last_quarter', weight: 3 },
      { metricKey: 'mineral_estimates.reserves_precious_aueq_moz', weight: 3 },
      { metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 2 },
      { metricKey: 'production.current_production_precious_aueq_koz', weight: 3 },
      { metricKey: 'financials.market_cap_value', weight: 2 },
      { metricKey: 'financials.enterprise_value_value', weight: 1 },
      { metricKey: 'valuation_metrics.ev_per_production_oz', weight: 2 },
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 2 },
      // { metricKey: 'financials.investments_json', weight: 1 }, // Needs key & special handling
      // { metricKey: 'company-overview.change_1yr_percent', weight: 1 }, // Needs key
    ]
  },
  {
    id: 'near_term_producers',
    name: 'Near-Term Producers',
    description: 'Targets companies nearing production start, offering short-term growth potential.',
    metrics: [
      // 'status' handled by direct filter
      { metricKey: 'production.future_production_total_aueq_koz', weight: 5 },
      { metricKey: 'costs.construction_costs', weight: 4 },
      { metricKey: 'financials.cash_value', weight: 4, profile_notes: "Cash for development" },
      { metricKey: 'financials.debt_value', weight: 3, profile_notes: "Manageable debt during ramp-up" },
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 4 },
      { metricKey: 'mineral_estimates.mineable_total_aueq_moz', weight: 4 },
      { metricKey: 'costs.tco_future', weight: 3 },
      { metricKey: 'financials.net_financial_assets', weight: 3 },
      { metricKey: 'financials.free_cash_flow', weight: 2, profile_notes: "May be negative but improving" },
      { metricKey: 'valuation_metrics.ev_per_mineable_oz_all', weight: 3 },
      { metricKey: 'capital_structure.in_the_money_options', weight: 1 },
      { metricKey: 'financials.revenue_value', weight: 1, profile_notes: "May not have revenue yet" },
      { metricKey: 'financials.operating_expense', weight: 2 },
      { metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 3 },
      { metricKey: 'costs.aisc_future', weight: 4 },
      { metricKey: 'production.reserve_life_years', weight: 3 },
      { metricKey: 'financials.market_cap_value', weight: 2 },
      { metricKey: 'financials.enterprise_value_value', weight: 2 },
      { metricKey: 'valuation_metrics.ev_per_resource_oz_all', weight: 2 },
      { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_all', weight: 2 },
      { metricKey: 'financials.price_to_sales', weight: 1 },
      { metricKey: 'financials.price_to_book', weight: 2 },
      { metricKey: 'financials.trailing_pe', weight: 1 },
      { metricKey: 'financials.forward_pe', weight: 3 },
      { metricKey: 'financials.peg_ratio', weight: 2 },
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 2 },
      { metricKey: 'capital_structure.options_revenue', weight: 1 },
      { metricKey: 'financials.shares_outstanding', weight: 1 },
      // { metricKey: 'financials.other_financial_assets', weight: 1 }, // Needs key
      { metricKey: 'financials.liabilities', weight: 2 },
      { metricKey: 'financials.cost_of_revenue', weight: 1 },
      { metricKey: 'financials.gross_profit', weight: 1 },
      { metricKey: 'financials.operating_income', weight: 1 },
      { metricKey: 'financials.ebitda', weight: 1 },
      { metricKey: 'financials.net_income_value', weight: 1 },
      { metricKey: 'mineral_estimates.potential_total_aueq_moz', weight: 2 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 1, profile_notes: "Likely zero or low" },
      // { metricKey: 'financials.investments_json', weight: 2 }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 2 }, // Needs key
    ]
  },
  {
    id: 'high_grade_discoveries',
    name: 'High-Grade Discoveries',
    description: 'Focuses on companies with high-grade precious metal deposits for higher profitability.',
    metrics: [
      { metricKey: 'mineral_estimates.resources_precious_aueq_moz', weight: 5 },
      { metricKey: 'mineral_estimates.measured_indicated_precious_aueq_moz', weight: 5 },
      { metricKey: 'company-overview.percent_gold', weight: 4 },
      { metricKey: 'company-overview.percent_silver', weight: 4 },
      { metricKey: 'mineral_estimates.potential_precious_aueq_moz', weight: 4 },
      { metricKey: 'financials.market_cap_value', weight: 2, profile_notes: "Often smaller cap initially" },
      { metricKey: 'valuation_metrics.ev_per_resource_oz_precious', weight: 3 },
      { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_precious', weight: 3 },
      { metricKey: 'costs.aisc_future', weight: 3, profile_notes: "High grade can lead to low AISC" },
      { metricKey: 'mineral_estimates.resources_total_aueq_moz', weight: 2 },
      { metricKey: 'mineral_estimates.potential_total_aueq_moz', weight: 2 },
      { metricKey: 'financials.enterprise_value_value', weight: 1 },
      { metricKey: 'financials.price_to_sales', weight: 1 }, 
      { metricKey: 'financials.forward_pe', weight: 2 }, 
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 2 },
      { metricKey: 'mineral_estimates.mineable_precious_aueq_moz', weight: 3 },
      { metricKey: 'mineral_estimates.mineable_total_aueq_moz', weight: 2 },
      { metricKey: 'production.current_production_precious_aueq_koz', weight: 1, profile_notes: "May not be producing yet" },
      { metricKey: 'production.future_production_total_aueq_koz', weight: 3 },
      { metricKey: 'costs.construction_costs', weight: 2 },
      { metricKey: 'financials.free_cash_flow', weight: 2 },
      { metricKey: 'financials.revenue_value', weight: 1 },
      { metricKey: 'financials.net_income_value', weight: 1 },
      { metricKey: 'financials.operating_income', weight: 1 },
      { metricKey: 'financials.ebitda', weight: 1 },
      { metricKey: 'financials.gross_profit', weight: 1 },
      { metricKey: 'financials.cost_of_revenue', weight: 1 },
      { metricKey: 'financials.operating_expense', weight: 2 },
      { metricKey: 'financials.debt_value', weight: 2 },
      { metricKey: 'financials.cash_value', weight: 3, profile_notes: "Cash for exploration/development" },
      { metricKey: 'financials.net_financial_assets', weight: 2 },
      { metricKey: 'financials.liabilities', weight: 1 },
      // { metricKey: 'financials.other_financial_assets', weight: 1 }, // Needs key
      { metricKey: 'capital_structure.existing_shares', weight: 1 },
      { metricKey: 'capital_structure.in_the_money_options', weight: 1 },
      { metricKey: 'capital_structure.options_revenue', weight: 1 },
      { metricKey: 'financials.shares_outstanding', weight: 1 },
      { metricKey: 'valuation_metrics.ev_per_production_oz', weight: 1 },
      // { metricKey: 'financials.investments_json', weight: 2, profile_notes: "Exploration investments" }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 2 }, // Needs key
    ]
  },
  {
    id: 'established_dividend_payers',
    name: 'Established Dividend Payers',
    description: 'Targets stable companies with consistent dividends.',
    metrics: [
      // { metricKey: 'financials.dividend_yield', weight: 5 }, // Needs key in metric-types.ts
      // { metricKey: 'financials.payout_ratio', weight: 4 }, // Needs key in metric-types.ts
      { metricKey: 'financials.free_cash_flow', weight: 5, profile_notes: "Critical for dividend sustainability" },
      { metricKey: 'financials.net_income_value', weight: 4 },
      { metricKey: 'financials.revenue_value', weight: 3 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 4 },
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 3 },
      { metricKey: 'financials.trailing_pe', weight: 3 },
      { metricKey: 'financials.operating_income', weight: 3 },
      { metricKey: 'costs.aisc_last_year', weight: 4 },
      { metricKey: 'production.reserve_life_years', weight: 3 },
      { metricKey: 'financials.gross_profit', weight: 3 },
      { metricKey: 'financials.ebitda', weight: 3 },
      { metricKey: 'financials.debt_value', weight: 3 }, 
      { metricKey: 'financials.cash_value', weight: 3 },
      { metricKey: 'valuation_metrics.mkt_cap_per_production_oz', weight: 2 },
      { metricKey: 'financials.price_to_book', weight: 2 },
      { metricKey: 'financials.price_to_sales', weight: 2 },
      { metricKey: 'financials.forward_pe', weight: 2 },
      { metricKey: 'financials.peg_ratio', weight: 1 },
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 1 },
      { metricKey: 'capital_structure.existing_shares', weight: 1 },
      { metricKey: 'financials.shares_outstanding', weight: 1 },
      // { metricKey: 'financials.other_financial_assets', weight: 1 }, // Needs key
      { metricKey: 'financials.liabilities', weight: 2 },
      { metricKey: 'financials.cost_of_revenue', weight: 2 },
      { metricKey: 'financials.operating_expense', weight: 2 },
      { metricKey: 'financials.net_financial_assets', weight: 3 },
      // { metricKey: 'financials.hedgebook', weight: 1 }, // Needs key
      { metricKey: 'costs.tco_current', weight: 3 },
      { metricKey: 'costs.aisc_last_quarter', weight: 3 },
      { metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 2 },
      { metricKey: 'production.future_production_total_aueq_koz', weight: 1, profile_notes: "Less focus on future growth" },
      // { metricKey: 'financials.investments_json', weight: 1 }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 1 }, // Needs key
    ]
  },
  {
    id: 'speculative_exploration',
    name: 'Speculative Exploration',
    description: 'Focuses on high-risk, high-reward early-stage exploration companies.',
    metrics: [
      // 'status' handled by direct filter
      { metricKey: 'mineral_estimates.potential_total_aueq_moz', weight: 5 },
      { metricKey: 'financials.market_cap_value', weight: 4, profile_notes: "Typically very low market cap" },
      { metricKey: 'mineral_estimates.resources_total_aueq_moz', weight: 3, profile_notes: "Any defined resource is a plus" },
      { metricKey: 'costs.aisc_future', weight: 1, profile_notes: "Highly speculative if available" },
      { metricKey: 'company-overview.percent_gold', weight: 2 },
      { metricKey: 'company-overview.percent_silver', weight: 2 },
      { metricKey: 'mineral_estimates.potential_precious_aueq_moz', weight: 4 },
      { metricKey: 'valuation_metrics.ev_per_resource_oz_all', weight: 2, profile_notes: "Hard to value" },
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 3, profile_notes: "High dilution risk" },
      { metricKey: 'financials.cash_value', weight: 4, profile_notes: "Cash runway for exploration is key" },
      { metricKey: 'financials.debt_value', weight: 2 }, 
      { metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz', weight: 1, profile_notes: "Rare for early explorers" },
      // { metricKey: 'financials.other_financial_assets', weight: 1 }, // Needs key
      { metricKey: 'capital_structure.options_revenue', weight: 1 }, 
      { metricKey: 'mineral_estimates.potential_non_precious_aueq_moz', weight: 1 },
      { metricKey: 'financials.operating_expense', weight: 2, profile_notes: "Exploration G&A" },
      { metricKey: 'financials.liabilities', weight: 1 },
      { metricKey: 'capital_structure.existing_shares', weight: 2 },
      { metricKey: 'financials.shares_outstanding', weight: 2 },
      { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_all', weight: 1 },
      { metricKey: 'financials.enterprise_value_value', weight: 1 },
      // { metricKey: 'financials.investments_json', weight: 3, profile_notes: "Look for exploration activity" }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 2 }, // Needs key
    ]
  },
  {
    id: 'environmentally_focused',
    name: 'Environmentally Focused',
    description: 'Targets companies with strong ESG (Environmental, Social, Governance) practices.',
    metrics: [
      // 'description' for ESG keywords (special handling)
      // 'headquarters' for regulatory jurisdiction (special handling)
      { metricKey: 'costs.aisc_future', weight: 3, profile_notes: "Efficient ops can align with ESG" },
      // { metricKey: 'financials.other_financial_assets', weight: 2, profile_notes: "Green tech investments?" }, // Needs key
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 2, profile_notes: "Sustainable resource management" },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 2, profile_notes: "Responsible production levels" },
      { metricKey: 'financials.revenue_value', weight: 2 },
      { metricKey: 'financials.net_income_value', weight: 2 },
      { metricKey: 'costs.tco_current', weight: 3 },
      { metricKey: 'costs.tco_future', weight: 3 },
      { metricKey: 'financials.liabilities', weight: 2, profile_notes: "Incl. environmental liabilities" },
      { metricKey: 'financials.operating_expense', weight: 2, profile_notes: "Incl. compliance costs" },
      { metricKey: 'mineral_estimates.potential_total_aueq_moz', weight: 1 },
      { metricKey: 'financials.free_cash_flow', weight: 3 },
      { metricKey: 'financials.debt_value', weight: 2 },
      { metricKey: 'financials.cash_value', weight: 2 },
      // { metricKey: 'financials.investments_json', weight: 3, profile_notes: "Investments in ESG initiatives" }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 1 }, // Needs key
    ]
  },
  {
    id: 'undervalued_assets',
    name: 'Undervalued Assets',
    description: 'Focuses on companies with low valuation metrics, suggesting they may be overlooked by the market.',
    metrics: [
      { metricKey: 'valuation_metrics.ev_per_resource_oz_all', weight: 5 },
      { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_all', weight: 5 },
      { metricKey: 'financials.price_to_book', weight: 4 },
      { metricKey: 'financials.price_to_sales', weight: 4 },
      { metricKey: 'financials.trailing_pe', weight: 3 },
      { metricKey: 'financials.forward_pe', weight: 3 },
      { metricKey: 'valuation_metrics.ev_per_reserve_oz_all', weight: 4 },
      { metricKey: 'valuation_metrics.mkt_cap_per_reserve_oz_all', weight: 4 },
      { metricKey: 'financials.peg_ratio', weight: 3 },
      { metricKey: 'financials.enterprise_to_ebitda', weight: 4 },
      { metricKey: 'financials.enterprise_to_revenue', weight: 4 },
      { metricKey: 'capital_structure.existing_shares', weight: 1 },
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 1 },
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 2 },
      { metricKey: 'mineral_estimates.resources_total_aueq_moz', weight: 2 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 2 },
      { metricKey: 'financials.net_financial_assets', weight: 3 },
      { metricKey: 'financials.free_cash_flow', weight: 3 },
      { metricKey: 'financials.revenue_value', weight: 1 },
      { metricKey: 'financials.net_income_value', weight: 1 },
      { metricKey: 'financials.operating_income', weight: 1 },
      { metricKey: 'financials.ebitda', weight: 1 },
      { metricKey: 'financials.gross_profit', weight: 1 },
      { metricKey: 'financials.cost_of_revenue', weight: 1 },
      { metricKey: 'financials.debt_value', weight: 2 },
      { metricKey: 'financials.cash_value', weight: 2 },
      // { metricKey: 'financials.investments_json', weight: 1 }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 1 }, // Needs key
    ]
  },
  {
    id: 'high_cash_flow_generators',
    name: 'High Cash Flow Generators',
    description: 'Targets companies with strong and consistent cash flow generation.',
    metrics: [
      { metricKey: 'financials.free_cash_flow', weight: 5 },
      { metricKey: 'financials.ebitda', weight: 5 },
      { metricKey: 'financials.operating_income', weight: 4 },
      { metricKey: 'financials.revenue_value', weight: 3 },
      { metricKey: 'costs.aisc_last_year', weight: 4 },
      { metricKey: 'financials.gross_profit', weight: 4 },
      { metricKey: 'financials.net_income_value', weight: 3 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 3 },
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 2 },
      { metricKey: 'financials.cost_of_revenue', weight: 3 },
      { metricKey: 'financials.operating_expense', weight: 2 },
      { metricKey: 'costs.aic_last_year', weight: 3 },
      { metricKey: 'financials.debt_value', weight: 2 }, 
      { metricKey: 'financials.cash_value', weight: 3 },
      { metricKey: 'valuation_metrics.ev_per_production_oz', weight: 3 },
      { metricKey: 'financials.price_to_sales', weight: 2 }, 
      { metricKey: 'financials.price_to_book', weight: 1 },
      { metricKey: 'financials.trailing_pe', weight: 2 },
      { metricKey: 'capital_structure.fully_diluted_shares', weight: 1 },
      // { metricKey: 'financials.investments_json', weight: 1 }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 1 }, // Needs key
    ]
  },
  {
    id: 'low_cost_producers',
    name: 'Low-Cost Producers',
    description: 'Focuses on companies with demonstrably low production costs, offering higher margins.',
    metrics: [
      { metricKey: 'costs.aisc_last_quarter', weight: 5 },
      { metricKey: 'costs.aisc_last_year', weight: 5 },
      { metricKey: 'costs.aisc_future', weight: 4 },
      { metricKey: 'costs.aic_last_quarter', weight: 4 },
      { metricKey: 'costs.aic_last_year', weight: 4 },
      { metricKey: 'costs.tco_current', weight: 3 },
      { metricKey: 'costs.tco_future', weight: 3 },
      { metricKey: 'financials.gross_profit', weight: 4, profile_notes: "Gross margin % would be better" },
      { metricKey: 'financials.operating_income', weight: 3 },
      { metricKey: 'production.current_production_total_aueq_koz', weight: 3 },
      { metricKey: 'mineral_estimates.reserves_total_aueq_moz', weight: 2 },
      { metricKey: 'financials.cost_of_revenue', weight: 4 },
      { metricKey: 'financials.revenue_value', weight: 2, profile_notes: "Revenue relative to costs" },
      { metricKey: 'financials.ebitda', weight: 3, profile_notes: "EBITDA margin would be better" },
      { metricKey: 'costs.construction_costs', weight: 2, profile_notes: "For new low-cost projects" },
      { metricKey: 'mineral_estimates.mineable_total_aueq_moz', weight: 2 },
      { metricKey: 'valuation_metrics.ev_per_mineable_oz_all', weight: 2 },
      { metricKey: 'financials.free_cash_flow', weight: 3 },
      { metricKey: 'financials.net_income_value', weight: 2 },
      { metricKey: 'financials.debt_value', weight: 1 }, 
      { metricKey: 'financials.cash_value', weight: 1 },
      // { metricKey: 'financials.investments_json', weight: 1 }, // Needs key
      // { metricKey: 'company-overview.change_1yr_percent', weight: 1 }, // Needs key
    ]
  }
];

// Example: How you might want to add a helper to get a profile by ID
export const getInterestProfileById = (id: string): InterestProfile | undefined => {
  return interestProfiles.find(p => p.id === id);
};