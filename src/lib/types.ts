// src/lib/types.ts
// Base content provided by user, AI will ADD new fields for metrics
// and ensure consistency with existing definitions.

import type { ClassValue } from 'clsx'; // Keep if used, though not in current scope of changes

// --- Base Types ---
export type Theme = 'default' | 'ocean' | 'sunset';

export type ColumnTier = 'free' | 'pro' | 'premium';
export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type Currency = 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP';
export type CompanyStatus = 'Producer' | 'Developer' | 'Explorer' | 'Royalty' | 'Other';

// --- Interface for augmented share price details ---
export interface AugmentedPriceInfo {
  share_price_currency_actual?: string | null;
  share_price_date_actual?: string | null;
  share_price_source_actual?: 'stock_prices_table' | 'stock_prices_table_old' | 'calculated_from_market_cap' | null; // Added null
}

// --- Main Company data structure, extended with AugmentedPriceInfo ---
export interface Company extends AugmentedPriceInfo {
  company_id: number;
  company_name: string;
  tsx_code: string | null;
  status: CompanyStatus | null;
  headquarters: string | null;
  description: string | null;
  minerals_of_interest: string[] | null; // Already string[]
  percent_gold: number | null;
  percent_silver: number | null;
  share_price: number | null;

  financials: {
    cash_value: number | null;
    market_cap_value: number | null;
    market_cap_currency?: string | null;
    enterprise_value_value: number | null;
    enterprise_value_currency?: string | null; // From RpcResponseRow
    net_financial_assets: number | null;
    net_financial_assets_currency?: string | null; // From RpcResponseRow
    free_cash_flow: number | null;
    price_to_book: number | null;
    price_to_sales: number | null;
    enterprise_to_revenue: number | null;
    enterprise_to_ebitda: number | null;
    trailing_pe: number | null;
    forward_pe: number | null;
    revenue_value: number | null;
    revenue_currency?: string | null; // From RpcResponseRow
    ebitda: number | null;
    net_income_value: number | null;
    net_income_currency?: string | null; // From RpcResponseRow
    debt_value: number | null;
    debt_currency?: string | null; // From RpcResponseRow
    shares_outstanding: number | null;
    // NEW Financial Metrics (from Overarching PRD Section 3.1)
    peg_ratio: number | null;
    cost_of_revenue: number | null;
    gross_profit: number | null;
    operating_expense: number | null;
    operating_income: number | null;
    liabilities: number | null;
    liabilities_currency?: string | null; // From RpcResponseRow
    // For f_investments_json, f_hedgebook: Add to RpcResponseRow.
    // Add here if they are transformed into specific structures on Company object.
    // For now, assuming they remain as text on RpcResponseRow and might be handled differently if displayed.
  };
  capital_structure: {
    existing_shares: number | null;
    fully_diluted_shares: number | null;
    in_the_money_options: number | null;
    options_revenue: number | null;
    options_revenue_currency?: string | null; // From RpcResponseRow
  };
  mineral_estimates: {
    reserves_total_aueq_moz: number | null;
    measured_indicated_total_aueq_moz: number | null;
    resources_total_aueq_moz: number | null;
    potential_total_aueq_moz: number | null;
    reserves_precious_aueq_moz: number | null;
    measured_indicated_precious_aueq_moz: number | null;
    resources_precious_aueq_moz: number | null;
    // NEW Mineral Estimate Metrics (from Overarching PRD Section 3.2)
    reserves_non_precious_aueq_moz: number | null;
    measured_indicated_non_precious_aueq_moz: number | null;
    resources_non_precious_aueq_moz: number | null;
    potential_non_precious_aueq_moz: number | null;
    mineable_total_aueq_moz: number | null;
    mineable_precious_aueq_moz: number | null;
    mineable_non_precious_aueq_moz: number | null;
  };
  valuation_metrics: {
    ev_per_resource_oz_all: number | null;
    ev_per_reserve_oz_all: number | null;
    mkt_cap_per_resource_oz_all: number | null;
    mkt_cap_per_reserve_oz_all: number | null;
    ev_per_resource_oz_precious: number | null;
    ev_per_reserve_oz_precious: number | null;
    mkt_cap_per_resource_oz_precious: number | null;
    mkt_cap_per_reserve_oz_precious: number | null;
    // NEW Valuation Metrics (from Overarching PRD Section 3.3)
    ev_per_mi_oz_all: number | null;
    ev_per_mi_oz_precious: number | null;
    ev_per_mineable_oz_all: number | null;
    ev_per_mineable_oz_precious: number | null;
    ev_per_production_oz: number | null;
    mkt_cap_per_mi_oz_all: number | null;
    mkt_cap_per_mi_oz_precious: number | null;
    mkt_cap_per_mineable_oz_all: number | null;
    mkt_cap_per_mineable_oz_precious: number | null;
    mkt_cap_per_production_oz: number | null;
  };
  production: {
    current_production_total_aueq_koz: number | null;
    future_production_total_aueq_koz: number | null;
    reserve_life_years: number | null;
    current_production_precious_aueq_koz: number | null;
    current_production_non_precious_aueq_koz: number | null;
  };
  costs: {
    aisc_future: number | null;
    aisc_future_currency?: string | null; // From RpcResponseRow
    construction_costs: number | null;
    construction_costs_currency?: string | null; // From RpcResponseRow
    tco_future: number | null;
    tco_future_currency?: string | null; // From RpcResponseRow
    aisc_last_quarter: number | null;
    aisc_last_quarter_currency?: string | null; // From RpcResponseRow
    aisc_last_year: number | null;
    aisc_last_year_currency?: string | null; // From RpcResponseRow
    // NEW Cost Metrics (from Overarching PRD Section 3.4)
    aic_last_quarter: number | null;
    aic_last_quarter_currency?: string | null; // From RpcResponseRow
    aic_last_year: number | null;
    aic_last_year_currency?: string | null; // From RpcResponseRow
    tco_current: number | null;
    tco_current_currency?: string | null; // From RpcResponseRow
  };
  // Optional: last_updated fields for each sub-object if mapped by converter
  // e.g. f_last_updated?: string | null; (if mapped from row.f_last_updated)
}

// Type matching the flat structure returned by the Supabase RPC function (get_companies_paginated)
export interface RpcResponseRow extends Record<string, any> {
  total_rows: bigint; // Keep as bigint as per user's existing type
  company_id: number;
  company_name: string;
  tsx_code: string | null;
  status: string | null; // Raw status string
  headquarters: string | null;
  description: string | null;
  minerals_of_interest: string | null; // Raw comma-separated string from DB (converter handles string[] in Company)
  percent_gold: number | null;
  percent_silver: number | null;
  share_price: number | null;
  share_price_currency: string | null; // Added missing field from your RpcResponseRow definition
  share_price_actual_date: string | null; // Added missing field
  share_price_source: string | null; // Added missing field

  // Financials (f_ prefix from view) - Ensure all these are selected in companies_detailed_view and get_companies_paginated
  f_cash_value: number | null;
  f_cash_currency: string | null; // Added
  f_cash_date: string | null; // Added
  f_market_cap_value: number | null;
  f_market_cap_currency?: string | null;
  f_enterprise_value_value: number | null;
  f_enterprise_value_currency: string | null; // Added
  f_net_financial_assets: number | null;
  f_net_financial_assets_currency: string | null; // Added
  f_free_cash_flow: number | null;
  f_price_to_book: number | null;
  f_price_to_sales: number | null;
  f_enterprise_to_revenue: number | null;
  f_enterprise_to_ebitda: number | null;
  f_trailing_pe: number | null;
  f_forward_pe: number | null;
  f_revenue_value: number | null;
  f_revenue_currency: string | null; // Added
  f_ebitda: number | null;
  f_net_income_value: number | null;
  f_net_income_currency: string | null; // Added
  f_debt_value: number | null;
  f_debt_currency: string | null; // Added
  f_shares_outstanding: number | null;
  f_data_source: string | null; // Added (from your financials table schema)
  f_last_updated: string | null; // Added (from your financials table schema)

  // NEW Financial Metrics from Overarching PRD Section 3.1
  f_peg_ratio: number | null;
  f_cost_of_revenue: number | null;
  f_gross_profit: number | null;
  f_operating_expense: number | null;
  f_operating_income: number | null;
  f_liabilities: number | null;
  f_liabilities_currency: string | null; // Added
  f_investments_json: string | null; // Already in your financials schema
  f_hedgebook: string | null;      // Already in your financials schema
  f_other_financial_assets: number | null; // Added (from your financials table schema)
  f_other_financial_assets_currency: string | null; // Added (from your financials table schema)


  // Capital Structure (cs_ prefix from view)
  cs_existing_shares: number | null; // bigint in DB, number here for JS convenience
  cs_fully_diluted_shares: number | null; // bigint
  cs_in_the_money_options: number | null; // bigint
  cs_options_revenue: number | null;
  cs_options_revenue_currency: string | null; // Added
  cs_last_updated: string | null; // Added

  // Mineral Estimates (me_ prefix from view)
  me_reserves_total_aueq_moz: number | null;
  me_measured_indicated_total_aueq_moz: number | null;
  me_resources_total_aueq_moz: number | null;
  me_potential_total_aueq_moz: number | null;
  me_reserves_precious_aueq_moz: number | null;
  me_measured_indicated_precious_aueq_moz: number | null;
  me_resources_precious_aueq_moz: number | null;
  me_reserves_non_precious_aueq_moz: number | null; // NEW
  me_measured_indicated_non_precious_aueq_moz: number | null; // NEW
  me_resources_non_precious_aueq_moz: number | null; // NEW
  me_potential_non_precious_aueq_moz: number | null; // NEW
  me_mineable_total_aueq_moz: number | null; // NEW
  me_mineable_precious_aueq_moz: number | null; // NEW
  me_mineable_non_precious_aueq_moz: number | null; // NEW
  me_last_updated: string | null; // Added

  // Valuation Metrics (vm_ prefix from view)
  vm_ev_per_resource_oz_all: number | null;
  vm_ev_per_reserve_oz_all: number | null;
  vm_mkt_cap_per_resource_oz_all: number | null;
  vm_mkt_cap_per_reserve_oz_all: number | null;
  vm_ev_per_resource_oz_precious: number | null;
  vm_ev_per_reserve_oz_precious: number | null;
  vm_mkt_cap_per_resource_oz_precious: number | null;
  vm_mkt_cap_per_reserve_oz_precious: number | null;
  vm_ev_per_mi_oz_all: number | null; // NEW
  vm_ev_per_mi_oz_precious: number | null; // NEW
  vm_ev_per_mineable_oz_all: number | null; // NEW
  vm_ev_per_mineable_oz_precious: number | null; // NEW
  vm_ev_per_production_oz: number | null; // NEW
  vm_mkt_cap_per_mi_oz_all: number | null; // NEW
  vm_mkt_cap_per_mi_oz_precious: number | null; // NEW
  vm_mkt_cap_per_mineable_oz_all: number | null; // NEW
  vm_mkt_cap_per_mineable_oz_precious: number | null; // NEW
  vm_mkt_cap_per_production_oz: number | null; // NEW
  vm_last_updated: string | null; // Added

  // Production (p_ prefix from view)
  p_current_production_total_aueq_koz: number | null;
  p_future_production_total_aueq_koz: number | null;
  p_reserve_life_years: number | null;
  p_current_production_precious_aueq_koz: number | null;
  p_current_production_non_precious_aueq_koz: number | null;
  p_last_updated: string | null; // Added

  // Costs (c_ prefix from view, maps to cst_ from costs table)
  c_aisc_future: number | null;
  c_aisc_future_currency: string | null; // Added
  c_construction_costs: number | null;
  c_construction_costs_currency: string | null; // Added
  c_tco_future: number | null;
  c_tco_future_currency: string | null; // Added
  c_aisc_last_quarter: number | null;
  c_aisc_last_quarter_currency: string | null; // Added
  c_aisc_last_year: number | null;
  c_aisc_last_year_currency: string | null; // Added
  c_aic_last_quarter: number | null;         // NEW
  c_aic_last_quarter_currency: string | null; // NEW
  c_aic_last_year: number | null;            // NEW
  c_aic_last_year_currency: string | null;   // NEW
  c_tco_current: number | null;              // NEW
  c_tco_current_currency: string | null;     // NEW
  cst_last_updated: string | null; // From costs table, aliased as c_last_updated in view sometimes. Ensure consistency.
}

export interface PaginatedRowData {
  data: RpcResponseRow[];
  count: number | null; // Kept as number | null based on your existing code
}

export interface ThemeConfig {
  name: Theme;
  label: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
    muted: string;
  };
}

// Using AppColumnDef as the primary definition for table columns, aligning with company-data-table.tsx
export interface AppColumnDef { // Renamed from ColumnDef to AppColumnDef for clarity
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  format?: MetricFormat | 'compact' | 'decimal'; // Updated MetricFormat
  description?: string;
  // preferredValues?: string; // This was in your original ColumnDef, seems unused in company-data-table, can be removed if not needed
  access: { // Matched structure from company-data-table
    tier: ColumnTier;
    // description was in your original ColumnDef's access object, not typically here.
  };
  width?: string; // Matched string type from company-data-table
  align?: 'left' | 'center' | 'right';
  renderCell?: (row: Company) => React.ReactNode; // Kept this, as it's a common pattern
}

export interface ColumnGroup {
  title: string;
  description?: string; // Your company-data-table uses description here
  columns: AppColumnDef[]; // Uses AppColumnDef
  className?: string;
}

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

// FilterState: This structure from your original types.ts seems for individual filter inputs.
// The FilterProvider uses `FilterSettings` for its primary state. We should align or clarify.
// For now, keeping both but noting that FilterSettings is what filter-context.tsx uses.
export interface FilterState {
  searchTerm: string | null;
  status: CompanyStatus[] | null;
  market_cap_valueRange?: [number | null, number | null] | null;
  ev_per_resource_oz_allRange?: [number | null, number | null] | null;
  // To make this truly dynamic for all new filters, it might also use a structure like metricRanges:
  // metricRanges?: { [db_column: string]: [number | null, number | null] };
  [key: string]: any; // Allows for dynamic metric range filters but less type-safe
}

// FilterSettings: This is the primary structure for filters in FilterProvider.
// This is well-suited for the new metrics.
export interface FilterSettings {
  developmentStatus: CompanyStatus[];
  metricRanges: { [db_column: string]: [number | null, number | null] }; // Keyed by MetricConfig.db_column
  searchTerm: string;
}

// MetricFormat: Updated to include 'string', 'compact', 'decimal' as used/implied elsewhere.
export type MetricFormat = 'number' | 'currency' | 'percent' | 'moz' | 'koz' | 'ratio' | 'years' | 'string' | 'compact' | 'decimal';

// MetricCategory: Added based on your metric-types.ts for strong typing.
export type MetricCategory =
  | 'company-overview'
  | 'financials'
  | 'capital-structure'
  | 'mineral-estimates'
  | 'valuation-metrics'
  | 'production'
  | 'costs';

export interface MetricConfig {
  key: string;
  label: string;
  db_column: string;
  nested_path: string;
  unit: string;
  higherIsBetter: boolean;
  category: MetricCategory; // Using the strong type
  tier: ColumnTier;
  format: MetricFormat;
  description?: string;
}

export interface ToleranceSettings { // Kept from your original file
  labelCollisionRadius: number;
  labelForceStrength: number;
  labelYOffset: number;
  labelDensityThreshold: number;
  labelSimulationIterations: number;
  xAxisTitleOffset: number;
  yAxisTitleOffset: number;
  chartMarginTop: number;
  chartMarginRight: number;
  chartMarginBottom: number;
  chartMarginLeft: number;
}

export interface ScatterPoint {
  x: number;
  y: number;
  z: number;
  normalizedZ: number;
  company: Company;
}