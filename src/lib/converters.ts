// src/lib/converters.ts
import type { Company, RpcResponseRow, CompanyStatus } from './types';

const DEBUG = process.env.NODE_ENV === 'development';

interface ConversionError {
  row: number;
  field: string;
  error: string;
  value?: any;
}

class RpcConverterError extends Error {
  errors: ConversionError[];
  
  constructor(message: string, errors: ConversionError[]) {
    super(message);
    this.name = 'RpcConverterError';
    this.errors = errors;
  }
}

function logDebug(message: string, ...args: any[]) {
  if (DEBUG) {
    console.debug(`[RPC Converter] ${message}`, ...args);
  }
}

function validateNumber(value: any, field: string): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function validateString(value: any, field: string): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function validateStatus(value: any): CompanyStatus | null {
  if (!value) return null;
  const status = String(value).toLowerCase() as CompanyStatus;
  const validStatuses: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty', 'other'];
  return validStatuses.includes(status) ? status : null;
}

function validateStringArray(value: any): string[] | null {
  if (!value) return null;
  if (!Array.isArray(value)) {
    // Handle comma-separated string case
    if (typeof value === 'string') {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
    return null;
  }
  return value.filter(item => typeof item === 'string');
}

/**
 * Converts RPC response rows to Company objects with robust validation
 */
export function convertRpcRowsToCompanies(
  rows: RpcResponseRow[],
  options: {
    throwOnError?: boolean;
    debugMode?: boolean;
  } = {}
): Company[] {
  const { throwOnError = false, debugMode = DEBUG } = options;
  const errors: ConversionError[] = [];
  const companies: Company[] = [];

  if (!Array.isArray(rows)) {
    throw new Error('Input must be an array of RPC response rows');
  }

  logDebug(`Converting ${rows.length} rows`);

  rows.forEach((row, index) => {
    try {
      // Validate core fields first
      const company_id = validateNumber(row.company_id, 'company_id');
      if (!company_id) {
        throw new Error('Invalid or missing company_id');
      }

      const company_name = validateString(row.company_name, 'company_name');
      if (!company_name) {
        throw new Error('Invalid or missing company_name');
      }

      // Build the company object with validated data
      const company: Company = {
        company_id,
        company_name,
        tsx_code: validateString(row.tsx_code, 'tsx_code'),
        status: validateStatus(row.status),
        headquarters: validateString(row.headquarters, 'headquarters'),
        description: validateString(row.description, 'description'),
        minerals_of_interest: validateStringArray(row.minerals_of_interest),
        percent_gold: validateNumber(row.percent_gold, 'percent_gold'),
        percent_silver: validateNumber(row.percent_silver, 'percent_silver'),
        share_price: validateNumber(row.share_price, 'share_price'),

        financials: {
          cash_value: validateNumber(row.f_cash_value, 'f_cash_value'),
          market_cap_value: validateNumber(row.f_market_cap_value, 'f_market_cap_value'),
          enterprise_value_value: validateNumber(row.f_enterprise_value_value, 'f_enterprise_value_value'),
          net_financial_assets: validateNumber(row.f_net_financial_assets, 'f_net_financial_assets'),
          free_cash_flow: validateNumber(row.f_free_cash_flow, 'f_free_cash_flow'),
          price_to_book: validateNumber(row.f_price_to_book, 'f_price_to_book'),
          price_to_sales: validateNumber(row.f_price_to_sales, 'f_price_to_sales'),
          enterprise_to_revenue: validateNumber(row.f_enterprise_to_revenue, 'f_enterprise_to_revenue'),
          enterprise_to_ebitda: validateNumber(row.f_enterprise_to_ebitda, 'f_enterprise_to_ebitda'),
          trailing_pe: validateNumber(row.f_trailing_pe, 'f_trailing_pe'),
          forward_pe: validateNumber(row.f_forward_pe, 'f_forward_pe'),
          revenue_value: validateNumber(row.f_revenue_value, 'f_revenue_value'),
          ebitda: validateNumber(row.f_ebitda, 'f_ebitda'),
          net_income_value: validateNumber(row.f_net_income_value, 'f_net_income_value'),
          debt_value: validateNumber(row.f_debt_value, 'f_debt_value'),
          shares_outstanding: validateNumber(row.f_shares_outstanding, 'f_shares_outstanding'),
        },

        capital_structure: {
          existing_shares: validateNumber(row.cs_existing_shares, 'cs_existing_shares'),
          fully_diluted_shares: validateNumber(row.cs_fully_diluted_shares, 'cs_fully_diluted_shares'),
          in_the_money_options: validateNumber(row.cs_in_the_money_options, 'cs_in_the_money_options'),
          options_revenue: validateNumber(row.cs_options_revenue, 'cs_options_revenue'),
        },

        mineral_estimates: {
          reserves_total_aueq_moz: validateNumber(row.me_reserves_total_aueq_moz, 'me_reserves_total_aueq_moz'),
          measured_indicated_total_aueq_moz: validateNumber(row.me_measured_indicated_total_aueq_moz, 'me_measured_indicated_total_aueq_moz'),
          resources_total_aueq_moz: validateNumber(row.me_resources_total_aueq_moz, 'me_resources_total_aueq_moz'),
          potential_total_aueq_moz: validateNumber(row.me_potential_total_aueq_moz, 'me_potential_total_aueq_moz'),
          reserves_precious_aueq_moz: validateNumber(row.me_reserves_precious_aueq_moz, 'me_reserves_precious_aueq_moz'),
          measured_indicated_precious_aueq_moz: validateNumber(row.me_measured_indicated_precious_aueq_moz, 'me_measured_indicated_precious_aueq_moz'),
          resources_precious_aueq_moz: validateNumber(row.me_resources_precious_aueq_moz, 'me_resources_precious_aueq_moz'),
        },

        valuation_metrics: {
          ev_per_resource_oz_all: validateNumber(row.vm_ev_per_resource_oz_all, 'vm_ev_per_resource_oz_all'),
          ev_per_reserve_oz_all: validateNumber(row.vm_ev_per_reserve_oz_all, 'vm_ev_per_reserve_oz_all'),
          mkt_cap_per_resource_oz_all: validateNumber(row.vm_mkt_cap_per_resource_oz_all, 'vm_mkt_cap_per_resource_oz_all'),
          mkt_cap_per_reserve_oz_all: validateNumber(row.vm_mkt_cap_per_reserve_oz_all, 'vm_mkt_cap_per_reserve_oz_all'),
          ev_per_resource_oz_precious: validateNumber(row.vm_ev_per_resource_oz_precious, 'vm_ev_per_resource_oz_precious'),
          ev_per_reserve_oz_precious: validateNumber(row.vm_ev_per_reserve_oz_precious, 'vm_ev_per_reserve_oz_precious'),
          mkt_cap_per_resource_oz_precious: validateNumber(row.vm_mkt_cap_per_resource_oz_precious, 'vm_mkt_cap_per_resource_oz_precious'),
          mkt_cap_per_reserve_oz_precious: validateNumber(row.vm_mkt_cap_per_reserve_oz_precious, 'vm_mkt_cap_per_reserve_oz_precious'),
        },

        production: {
          current_production_total_aueq_koz: validateNumber(row.p_current_production_total_aueq_koz, 'p_current_production_total_aueq_koz'),
          future_production_total_aueq_koz: validateNumber(row.p_future_production_total_aueq_koz, 'p_future_production_total_aueq_koz'),
          reserve_life_years: validateNumber(row.p_reserve_life_years, 'p_reserve_life_years'),
          current_production_precious_aueq_koz: validateNumber(row.p_current_production_precious_aueq_koz, 'p_current_production_precious_aueq_koz'),
          current_production_non_precious_aueq_koz: validateNumber(row.p_current_production_non_precious_aueq_koz, 'p_current_production_non_precious_aueq_koz'),
        },

        costs: {
          aisc_future: validateNumber(row.c_aisc_future, 'c_aisc_future'),
          construction_costs: validateNumber(row.c_construction_costs, 'c_construction_costs'),
          tco_future: validateNumber(row.c_tco_future, 'c_tco_future'),
          aisc_last_quarter: validateNumber(row.c_aisc_last_quarter, 'c_aisc_last_quarter'),
          aisc_last_year: validateNumber(row.c_aisc_last_year, 'c_aisc_last_year'),
        }
      };

      if (debugMode) {
        logDebug(`Converted row ${index}:`, {
          id: company.company_id,
          name: company.company_name,
          status: company.status,
          minerals: company.minerals_of_interest
        });
      }

      companies.push(company);

    } catch (error: any) {
      const conversionError: ConversionError = {
        row: index,
        field: error.field || 'unknown',
        error: error.message,
        value: error.value
      };
      
      errors.push(conversionError);
      
      if (debugMode) {
        console.error(`Row ${index} conversion error:`, conversionError);
      }
    }
  });

  if (errors.length > 0) {
    const errorMessage = `Failed to convert ${errors.length} rows`;
    if (throwOnError) {
      throw new RpcConverterError(errorMessage, errors);
    } else {
      console.warn(errorMessage, errors);
    }
  }

  logDebug(`Successfully converted ${companies.length} companies`);
  return companies;
}