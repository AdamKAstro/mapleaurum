//src/lib/types.ts
import type { ClassValue } from 'clsx';

// --- Base Types ---
export type Theme = 'default' | 'ocean' | 'sunset';
export type ColumnTier = 'free' | 'medium' | 'premium';
export type Currency = 'USD' | 'CAD' | 'AUD' | 'EUR' | 'GBP';
export type CompanyStatus = 'Producer' | 'Developer' | 'Explorer' | 'Royalty' | 'Other';

// Main Company data structure
export interface Company {
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
    market_cap_value: number | null;
    enterprise_value_value: number | null;
    net_financial_assets: number | null;
    free_cash_flow: number | null;
    price_to_book: number | null;
    price_to_sales: number | null;
    enterprise_to_revenue: number | null;
    enterprise_to_ebitda: number | null;
    trailing_pe: number | null;
    forward_pe: number | null;
    revenue_value: number | null;
    ebitda: number | null;
    net_income_value: number | null;
    debt_value: number | null;
    shares_outstanding: number | null;
  };
  capital_structure: {
    existing_shares: number | null;
    fully_diluted_shares: number | null;
    in_the_money_options: number | null;
    options_revenue: number | null;
  };
  mineral_estimates: {
    reserves_total_aueq_moz: number | null;
    measured_indicated_total_aueq_moz: number | null;
    resources_total_aueq_moz: number | null;
    potential_total_aueq_moz: number | null;
    reserves_precious_aueq_moz: number | null;
    measured_indicated_precious_aueq_moz: number | null;
    resources_precious_aueq_moz: number | null;
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
    construction_costs: number | null;
    tco_future: number | null;
    aisc_last_quarter: number | null;
    aisc_last_year: number | null;
  };
}

// Type matching the flat structure returned by the Supabase RPC function
export interface RpcResponseRow extends Record<string, any> {
  total_rows: number;
  company_id: number;
  company_name: string;
  tsx_code: string | null;
  status: string | null;
  headquarters: string | null;
  description: string | null;
  minerals_of_interest: string[] | null;
  percent_gold: number | null;
  percent_silver: number | null;
  share_price: number | null;
  f_cash_value: number | null;
  f_market_cap_value: number | null;
  f_enterprise_value_value: number | null;
  f_net_financial_assets: number | null;
  f_free_cash_flow: number | null;
  f_price_to_book: number | null;
  f_price_to_sales: number | null;
  f_enterprise_to_revenue: number | null;
  f_enterprise_to_ebitda: number | null;
  f_trailing_pe: number | null;
  f_forward_pe: number | null;
  f_revenue_value: number | null;
  f_ebitda: number | null;
  f_net_income_value: number | null;
  f_debt_value: number | null;
  f_shares_outstanding: number | null;
  cs_existing_shares: number | null;
  cs_fully_diluted_shares: number | null;
  cs_in_the_money_options: number | null;
  cs_options_revenue: number | null;
  me_reserves_total_aueq_moz: number | null;
  me_measured_indicated_total_aueq_moz: number | null;
  me_resources_total_aueq_moz: number | null;
  me_potential_total_aueq_moz: number | null;
  me_reserves_precious_aueq_moz: number | null;
  me_measured_indicated_precious_aueq_moz: number | null;
  me_resources_precious_aueq_moz: number | null;
  vm_ev_per_resource_oz_all: number | null;
  vm_ev_per_reserve_oz_all: number | null;
  vm_mkt_cap_per_resource_oz_all: number | null;
  vm_mkt_cap_per_reserve_oz_all: number | null;
  vm_ev_per_resource_oz_precious: number | null;
  vm_ev_per_reserve_oz_precious: number | null;
  vm_mkt_cap_per_resource_oz_precious: number | null;
  vm_mkt_cap_per_reserve_oz_precious: number | null;
  p_current_production_total_aueq_koz: number | null;
  p_future_production_total_aueq_koz: number | null;
  p_reserve_life_years: number | null;
  p_current_production_precious_aueq_koz: number | null;
  p_current_production_non_precious_aueq_koz: number | null;
  c_aisc_future: number | null;
  c_construction_costs: number | null;
  c_tco_future: number | null;
  c_aisc_last_quarter: number | null;
  c_aisc_last_year: number | null;
}

// Type for paginated data result
export interface PaginatedRowData {
  data: RpcResponseRow[];
  count: number | null;
}

// --- UI / Theme / Table Related Types ---
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

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  format?: string;
  description?: string;
  preferredValues?: string;
  access?: {
    tier: ColumnTier;
    description: string;
  };
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export interface ColumnGroup {
  title: string;
  description: string;
  columns: ColumnDef[];
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

// --- Types for Scatter Chart ---
export type MetricFormat = 'number' | 'currency' | 'percent' | 'moz' | 'koz';

export interface MetricConfig {
  key: string;
  label: string;
  path: string;
  format?: MetricFormat;
  higherIsBetter?: boolean;
  description?: string;
  tier: ColumnTier;
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