-- Indexes for underlying tables to optimize get_companies_paginated
-- Run this once to create indexes on frequently filtered, sorted, and joined columns

-- Companies table: primary key and search fields
CREATE INDEX IF NOT EXISTS idx_companies_company_id ON public.companies (company_id);
CREATE INDEX IF NOT EXISTS idx_companies_company_name ON public.companies (company_name);
CREATE INDEX IF NOT EXISTS idx_companies_tsx_code ON public.companies (tsx_code);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies (status);

-- Financials table: join and filter fields
CREATE INDEX IF NOT EXISTS idx_financials_company_id ON public.financials (company_id);
CREATE INDEX IF NOT EXISTS idx_financials_market_cap_value ON public.financials (market_cap_value);
CREATE INDEX IF NOT EXISTS idx_financials_cash_value ON public.financials (cash_value);
CREATE INDEX IF NOT EXISTS idx_financials_share_price ON public.financials (share_price);

-- Capital Structure table: join field
CREATE INDEX IF NOT EXISTS idx_capital_structure_company_id ON public.capital_structure (company_id);
CREATE INDEX IF NOT EXISTS idx_capital_structure_existing_shares ON public.capital_structure (existing_shares);

-- Mineral Estimates table: join and filter fields
CREATE INDEX IF NOT EXISTS idx_mineral_estimates_company_id ON public.mineral_estimates (company_id);
CREATE INDEX IF NOT EXISTS idx_mineral_estimates_reserves_total_aueq_moz ON public.mineral_estimates (reserves_total_aueq_moz);

-- Valuation Metrics table: join and filter fields
CREATE INDEX IF NOT EXISTS idx_valuation_metrics_company_id ON public.valuation_metrics (company_id);
CREATE INDEX IF NOT EXISTS idx_valuation_metrics_ev_per_resource_oz_all ON public.valuation_metrics (ev_per_resource_oz_all);

-- Production table: join and filter fields
CREATE INDEX IF NOT EXISTS idx_production_company_id ON public.production (company_id);
CREATE INDEX IF NOT EXISTS idx_production_current_production_total_aueq_koz ON public.production (current_production_total_aueq_koz);

-- Costs table: join and filter fields
CREATE INDEX IF NOT EXISTS idx_costs_company_id ON public.costs (company_id);
CREATE INDEX IF NOT EXISTS idx_costs_aisc_future ON public.costs (aisc_future);

-- Stock Prices table: join and latest price lookup
CREATE INDEX IF NOT EXISTS idx_stock_prices_company_id ON public.stock_prices (company_id);
CREATE INDEX IF NOT EXISTS idx_stock_prices_price_date ON public.stock_prices (price_date DESC, last_updated DESC);