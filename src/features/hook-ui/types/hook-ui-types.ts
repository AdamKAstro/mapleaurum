// src/features/hook-ui/types/hook-ui-types.ts
import { ReactNode } from 'react';
import type { CompanyStatus } from '../../../lib/types';

// Data structure for the props that the PlayingCard component expects
export interface PlayingCardDisplayData {
  id: string; // Converted from Company.company_id (number)
  name: string; // Company.company_name
  tsxCode: string; // Company.tsx_code
  logo?: string; // URL to the company logo
  status: string; // Company.status (CompanyStatus | null) with fallback
  sharePrice: number | null; // Company.share_price
  marketCap: number | null; // Company.financials.market_cap_value
  production: string; // Formatted from Company.production.current_production_total_aueq_koz
  description: string | null; // Company.description
  jurisdiction: string; // Company.headquarters
  recentNews: string[]; // Array of recent news headlines/snippets
  analystRating: string | null; // e.g., "Buy", "Hold", "Speculative Buy"
  matchedInterests: { id: string; weight: number }[]; // Interests matched by getEnhancedMatchedCompanies
  scoreForPrimaryInterest: string; // Stringified score
  minerals_of_interest: string[]; // Company.minerals_of_interest (string[] | null) with fallback
  percent_gold: number | null; // Company.percent_gold
  percent_silver: number | null; // Company.percent_silver
  enterpriseValue: number | null; // Company.financials.enterprise_value_value
  cashPosition: number | null; // Company.financials.cash_value
  debtToEquity: number | null; // Computed from Company.financials.debt_value / shares_outstanding
  esgScore: number | null; // Placeholder
  reserves: number | null; // Company.mineral_estimates.reserves_total_aueq_moz
  resources: number | null; // Company.mineral_estimates.resources_total_aueq_moz
  f_free_cash_flow: number | null; // Company.financials.free_cash_flow
  f_price_to_book: number | null; // Company.financials.price_to_book
  f_enterprise_to_ebitda: number | null; // Company.financials.enterprise_to_ebitda
  f_peg_ratio: number | null; // Company.financials.peg_ratio
  c_aisc_last_year: number | null; // Company.costs.aisc_last_year
  p_reserve_life_years: number | null; // Company.production.reserve_life_years
  me_measured_indicated_total_aueq_moz: number | null; // Company.mineral_estimates.measured_indicated_total_aueq_moz
  vm_ev_per_resource_oz_all: number | null; // Company.valuation_metrics.ev_per_resource_oz_all
  detailsPageId?: string | number; // Company.company_id or Company.tsx_code
}

// Defines the structure for a metric as part of an InterestProfile
export interface ProfileSpecificMetricInfo {
  metricKey: string; // Corresponds to the `key` in MetricConfig from src/lib/metric-types.ts
  weight: number; // Profile-specific weight (e.g., 1-5)
  profile_notes?: string; // Notes or justification for this metric's inclusion
}

// Defines an Interest Profile that a user can select
export interface InterestProfile {
  id: string; // e.g., "max_potential_returns"
  name: string; // e.g., "Max Potential Returns"
  description: string; // Detailed description for the UI
  metrics: ProfileSpecificMetricInfo[];
  preferredMinerals?: string[]; // Added for calculateInterestAlignment
  preferredCompanyTypes?: CompanyStatus[]; // Added for calculateInterestAlignment
  marketCapRange?: { min: number; max: number }; // Added for calculateInterestAlignment
  geographicFocus?: string[]; // Added for calculateInterestAlignment
  esgImportance?: 'low' | 'medium' | 'high'; // Added for calculateInterestAlignment
}

export interface RiskProfile {
  riskTolerance: number; // 0-100
  investmentHorizon: number; // Years
  preferredMinerals: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  unlocked: boolean;
}

// Superset of PlayingCardDisplayData for additional scoring/filtering data
export interface HookAIFeaturedCompany extends PlayingCardDisplayData {
  // Additional fields for scoring (avoid [key: string]: any for type safety)
  yearOverYearGrowth?: number | null; // Used in calculateFinancialStrength
  aisc?: number | null; // Used in calculateOperationalMetrics (fallback for c_aisc_last_year)
}

export type CompanyStatus = 'producer' | 'developer' | 'explorer' | 'royalty' | 'other';

export interface EnhancedCompanyMatch {
  id: string;
  name: string;
  tsxCode?: string;
  logo?: string;
  sharePrice?: number;
  marketCap?: number;
  description?: string;
  recentNews?: string[];
  status?: string;
  minerals_of_interest?: string[];
  percent_gold?: number;
  percent_silver?: number;
  enterpriseValue?: number;
  cashPosition?: number;
  reserves?: number;
  resources?: number;
  jurisdiction?: string;
  matchScore?: number;
  matchReasons?: string[];
  rankPosition?: number;
  esgScore?: number;
  vm_ev_per_resource_oz_all?: number;
  vm_ev_per_reserve_oz_all?: number;
  c_aisc_last_year?: number;
  aisc?: number;
  p_reserve_life_years?: number;
  f_free_cash_flow?: number;
  debtToEquity?: number;
  f_enterprise_to_ebitda?: number;
  f_price_to_book?: number;
  me_measured_indicated_total_aueq_moz?: number;
  f_peg_ratio?: number;
  matchedInterests?: string[];
  scoreForPrimaryInterest?: string;
}