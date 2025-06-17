// src/lib/types.ts
import type { ClassValue } from 'clsx';

// --- Base Types ---
export type Theme = 'default' | 'ocean' | 'sunset';

export type ColumnTier = 'free' | 'pro' | 'premium';
export type SubscriptionTier = 'free' | 'pro' | 'premium';

export type Currency = 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP';
export type CompanyStatus = 'producer' | 'developer' | 'explorer' | 'royalty' ; // Updated to lowercase to match converters.ts

// --- Interface for augmented share price details ---
export interface AugmentedPriceInfo {
  share_price_currency_actual?: string | null;
  share_price_date_actual?: string | null;
  share_price_source_actual?: 'stock_prices_table' | 'stock_prices_table_old' | 'calculated_from_market_cap' | null;
}

// --- Main Company data structure, extended with AugmentedPriceInfo ---
export interface Company extends AugmentedPriceInfo {
  company_id: number;
  company_name: string;
  tsx_code: string | null;
  status: CompanyStatus | null;
  headquarters: string | null;
  description: string | null;
  minerals_of_interest: string[] | null;
  percent_gold: number | null;
  percent_silver: number | null;
  share_price: number | null;

  financials: {
    cash_value: number | null;
    cash_currency?: string | null;
    cash_date?: string | null;
    market_cap_value: number | null;
    market_cap_currency?: string | null;
    enterprise_value_value: number | null;
    enterprise_value_currency?: string | null;
    net_financial_assets: number | null;
    net_financial_assets_currency?: string | null;
    free_cash_flow: number | null;
    price_to_book: number | null;
    price_to_sales: number | null;
    enterprise_to_revenue: number | null;
    enterprise_to_ebitda: number | null;
    trailing_pe: number | null;
    forward_pe: number | null;
    revenue_value: number | null;
    revenue_currency?: string | null;
    ebitda: number | null;
    net_income_value: number | null;
    net_income_currency?: string | null;
    debt_value: number | null;
    debt_currency?: string | null;
    shares_outstanding: number | null;
    peg_ratio: number | null;
    cost_of_revenue: number | null;
    gross_profit: number | null;
    operating_expense: number | null;
    operating_income: number | null;
    liabilities: number | null;
    liabilities_currency?: string | null;
    other_financial_assets: number | null; // Added for converters.ts
    other_financial_assets_currency: string | null; // Added for converters.ts
  };
  capital_structure: {
    existing_shares: number | null;
    fully_diluted_shares: number | null;
    in_the_money_options: number | null;
    options_revenue: number | null;
    options_revenue_currency?: string | null;
  };
  mineral_estimates: {
    reserves_total_aueq_moz: number | null;
    measured_indicated_total_aueq_moz: number | null;
    resources_total_aueq_moz: number | null;
    potential_total_aueq_moz: number | null;
    reserves_precious_aueq_moz: number | null;
    measured_indicated_precious_aueq_moz: number | null;
    resources_precious_aueq_moz: number | null;
    reserves_non_precious_aueq_moz: number | null;
    measured_indicated_non_precious_aueq_moz: number | null;
    resources_non_precious_aueq_moz: number | null;
    potential_non_precious_aueq_moz: number | null;
    mineable_total_aueq_moz: number | null;
    mineable_precious_aueq_moz: number | null;
    mineable_non_precious_aueq_moz: number | null;
    potential_precious_aueq_moz: number | null; // Added for converters.ts
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
    aisc_future_currency?: string | null;
    construction_costs: number | null;
    construction_costs_currency?: string | null;
    tco_future: number | null;
    tco_future_currency?: string | null;
    aisc_last_quarter: number | null;
    aisc_last_quarter_currency?: string | null;
    aisc_last_year: number | null;
    aisc_last_year_currency?: string | null;
    aic_last_quarter: number | null;
    aic_last_quarter_currency?: string | null;
    aic_last_year: number | null;
    aic_last_year_currency?: string | null;
    tco_current: number | null;
    tco_current_currency?: string | null;
  };
}

// Type matching the flat structure returned by the Supabase RPC function (get_companies_paginated)
export interface RpcResponseRow extends Record<string, any> {
  total_rows: bigint;
  company_id: number;
  company_name: string;
  tsx_code: string | null;
  status: string | null;
  headquarters: string | null;
  description: string | null;
  minerals_of_interest: string | null;
  percent_gold: number | null;
  percent_silver: number | null;
  share_price: number | null;
  share_price_currency: string | null;
  share_price_actual_date: string | null;
  share_price_source: string | null;

  // Financials (f_ prefix from view)
  f_cash_value: number | null;
  f_cash_currency: string | null;
  f_cash_date: string | null;
  f_market_cap_value: number | null;
  f_market_cap_currency: string | null;
  f_enterprise_value_value: number | null;
  f_enterprise_value_currency: string | null;
  f_net_financial_assets: number | null;
  f_net_financial_assets_currency: string | null;
  f_free_cash_flow: number | null;
  f_price_to_book: number | null;
  f_price_to_sales: number | null;
  f_enterprise_to_revenue: number | null;
  f_enterprise_to_ebitda: number | null;
  f_trailing_pe: number | null;
  f_forward_pe: number | null;
  f_revenue_value: number | null;
  f_revenue_currency: string | null;
  f_ebitda: number | null;
  f_net_income_value: number | null;
  f_net_income_currency: string | null;
  f_debt_value: number | null;
  f_debt_currency: string | null;
  f_shares_outstanding: number | null;
  f_peg_ratio: number | null;
  f_cost_of_revenue: number | null;
  f_gross_profit: number | null;
  f_operating_expense: number | null;
  f_operating_income: number | null;
  f_liabilities: number | null;
  f_liabilities_currency: string | null;
  f_investments_json: string | null;
  f_hedgebook: string | null;
  f_other_financial_assets: number | null; // Added for converters.ts
  f_other_financial_assets_currency: string | null; // Added for converters.ts
  f_data_source: string | null;
  f_last_updated: string | null;

  // Capital Structure (cs_ prefix from view)
  cs_existing_shares: number | null;
  cs_fully_diluted_shares: number | null;
  cs_in_the_money_options: number | null;
  cs_options_revenue: number | null;
  cs_options_revenue_currency: string | null;
  cs_last_updated: string | null;

  // Mineral Estimates (me_ prefix from view)
  me_reserves_total_aueq_moz: number | null;
  me_measured_indicated_total_aueq_moz: number | null;
  me_resources_total_aueq_moz: number | null;
  me_potential_total_aueq_moz: number | null;
  me_reserves_precious_aueq_moz: number | null;
  me_measured_indicated_precious_aueq_moz: number | null;
  me_resources_precious_aueq_moz: number | null;
  me_reserves_non_precious_aueq_moz: number | null;
  me_measured_indicated_non_precious_aueq_moz: number | null;
  me_resources_non_precious_aueq_moz: number | null;
  me_potential_non_precious_aueq_moz: number | null;
  me_mineable_total_aueq_moz: number | null;
  me_mineable_precious_aueq_moz: number | null;
  me_mineable_non_precious_aueq_moz: number | null;
  me_potential_precious_aueq_moz: number | null; // Added for converters.ts
  me_last_updated: string | null;

  // Valuation Metrics (vm_ prefix from view)
  vm_ev_per_resource_oz_all: number | null;
  vm_ev_per_reserve_oz_all: number | null;
  vm_mkt_cap_per_resource_oz_all: number | null;
  vm_mkt_cap_per_reserve_oz_all: number | null;
  vm_ev_per_resource_oz_precious: number | null;
  vm_ev_per_reserve_oz_precious: number | null;
  vm_mkt_cap_per_resource_oz_precious: number | null;
  vm_mkt_cap_per_reserve_oz_precious: number | null;
  vm_ev_per_mi_oz_all: number | null;
  vm_ev_per_mi_oz_precious: number | null;
  vm_ev_per_mineable_oz_all: number | null;
  vm_ev_per_mineable_oz_precious: number | null;
  vm_ev_per_production_oz: number | null;
  vm_mkt_cap_per_mi_oz_all: number | null;
  vm_mkt_cap_per_mi_oz_precious: number | null;
  vm_mkt_cap_per_mineable_oz_all: number | null;
  vm_mkt_cap_per_mineable_oz_precious: number | null;
  vm_mkt_cap_per_production_oz: number | null;
  vm_last_updated: string | null;

  // Production (p_ prefix from view)
  p_current_production_total_aueq_koz: number | null;
  p_future_production_total_aueq_koz: number | null;
  p_reserve_life_years: number | null;
  p_current_production_precious_aueq_koz: number | null;
  p_current_production_non_precious_aueq_koz: number | null;
  p_last_updated: string | null;

  // Costs (c_ prefix from view)
  c_aisc_future: number | null;
  c_aisc_future_currency: string | null;
  c_construction_costs: number | null;
  c_construction_costs_currency: string | null;
  c_tco_future: number | null;
  c_tco_future_currency: string | null;
  c_aisc_last_quarter: number | null;
  c_aisc_last_quarter_currency: string | null;
  c_aisc_last_year: number | null;
  c_aisc_last_year_currency: string | null;
  c_aic_last_quarter: number | null;
  c_aic_last_quarter_currency: string | null;
  c_aic_last_year: number | null;
  c_aic_last_year_currency: string | null;
  c_tco_current: number | null;
  c_tco_current_currency: string | null;
  cst_last_updated: string | null;
}

export interface PaginatedRowData {
  data: RpcResponseRow[];
  count: number | null;
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

export interface AppColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  format?: MetricFormat | 'compact' | 'decimal';
  description?: string;
  access: {
    tier: ColumnTier;
  };
  width?: string;
  align?: 'left' | 'center' | 'right';
  renderCell?: (row: Company) => React.ReactNode;
}

export interface ColumnGroup {
  title: string;
  description?: string;
  columns: AppColumnDef[];
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

export interface FilterState {
  searchTerm: string | null;
  status: CompanyStatus[] | null;
  market_cap_valueRange?: [number | null, number | null] | null;
  ev_per_resource_oz_allRange?: [number | null, number | null] | null;
  [key: string]: any;
}

export interface FilterSettings {
  developmentStatus: CompanyStatus[];
  metricRanges: { [db_column: string]: [number | null, number | null] };
  searchTerm: string;
}

export type MetricFormat = 'number' | 'currency' | 'percent' | 'moz' | 'koz' | 'ratio' | 'years' | 'string' | 'compact' | 'decimal';

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
  category: MetricCategory;
  tier: ColumnTier;
  format: MetricFormat;
  description?: string;
}

export interface ToleranceSettings {
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

export interface ExchangeRate {
  rate_id: number;
  from_currency: Currency;
  to_currency: Currency;
  rate: number;
  fetch_date: string;
  rate_date: string;
}

export type ExchangeRateMap = {
  [from_currency_code in Currency]?: {
    [to_currency_code in Currency]?: number;
  };
};