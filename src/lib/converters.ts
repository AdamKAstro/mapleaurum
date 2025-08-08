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
  public errors: ConversionError[];

  constructor(message: string, errors: ConversionError[]) {
    super(message);
    this.name = 'RpcConverterError';
    this.errors = errors;
    Object.setPrototypeOf(this, RpcConverterError.prototype);
  }
}

function logDebug(message: string, ...args: any[]) {
  if (DEBUG) {
    console.debug(`[CONVERTERS] ${message}`, ...args);
  }
}

function validateNumber(value: any, fieldNameForError: string): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  if (DEBUG && value !== null && value !== undefined && String(value).trim() !== "") {
    logDebug(`Validation Warning: Field '${fieldNameForError}' received non-finite number value (will be null):`, value);
  }
  return null;
}

function validateString(value: any, fieldNameForError: string, defaultValue: string | null = null): string | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    if (fieldNameForError.includes('company_name') && defaultValue) {
      return defaultValue;
    }
    return null;
  }
  return String(value).trim();
}

function validateStatus(value: any): CompanyStatus | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const statusString = String(value).trim().toLowerCase();
  const validStatuses: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty'];
  if (validStatuses.includes(statusString as CompanyStatus)) {
    return statusString as CompanyStatus;
  }
  if (DEBUG) {
    logDebug(`Validation Warning: Field 'status' received invalid value (will be null):`, value);
  }
  return null;
}

function validateStringArray(value: any, fieldNameForError: string): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.trim() !== "").map(s => s.trim());
  }
  if (typeof value === 'string') {
    if (value.trim() === "") return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => typeof item === 'string' && item.trim() !== "").map(s => s.trim());
      }
      return value.split(',').map(s => s.trim()).filter(Boolean);
    } catch {
      return value.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  if (DEBUG) {
    logDebug(`Validation Warning: Field '${fieldNameForError}' expected string or array, received (will be null):`, typeof value, value);
  }
  return null;
}

export function convertRpcRowsToCompanies(
  rows: RpcResponseRow[],
  options: {
    throwOnError?: boolean;
    debugMode?: boolean;
  } = {}
): Company[] {
  const { throwOnError = false, debugMode = DEBUG } = options;
  const overallConversionErrors: ConversionError[] = [];
  const companies: Company[] = [];

  if (!Array.isArray(rows)) {
    const errorMsg = '[CONVERTERS] CRITICAL: Input to convertRpcRowsToCompanies must be an array. Received type: ' + typeof rows;
    console.error(errorMsg, rows);
    if (throwOnError) {
      throw new TypeError('Input must be an array of RPC response rows');
    }
    return [];
  }

  if (debugMode) logDebug(`Starting conversion for ${rows.length} RPC rows.`);

  rows.forEach((row, rowIndex) => {
    const rowSpecificFieldErrors: ConversionError[] = [];
    let isRowCriticallyInvalid = false;

    const company_id = validateNumber(row.company_id, `company_id (row ${rowIndex})`);
    if (company_id === null) {
      rowSpecificFieldErrors.push({ row: rowIndex, field: 'company_id', error: 'Invalid or missing company_id', value: row.company_id });
      isRowCriticallyInvalid = true;
    }

    const company_name = validateString(row.company_name ?? row.name, `company_name (row ${rowIndex})`, 'Unknown');
    if (company_name === null) {
      rowSpecificFieldErrors.push({ row: rowIndex, field: 'company_name', error: 'Invalid or missing company_name', value: row.company_name ?? row.name });
      isRowCriticallyInvalid = true;
    }

    if (isRowCriticallyInvalid) {
      overallConversionErrors.push(...rowSpecificFieldErrors);
      if (debugMode) {
        logDebug(`Row ${rowIndex} skipped due to critical errors (company_id or company_name). Errors for this row:`, rowSpecificFieldErrors);
      }
      return;
    }

    const company: Company = {
      company_id: company_id as number,
      company_name: company_name as string,
      tsx_code: validateString(row.tsx_code, `row[${rowIndex}].tsx_code`),
      status: validateStatus(row.status),
      headquarters: validateString(row.headquarters, `row[${rowIndex}].headquarters`),
      description: validateString(row.description, `row[${rowIndex}].description`),
      minerals_of_interest: validateStringArray(row.minerals_of_interest, `row[${rowIndex}].minerals_of_interest`),
      percent_gold: validateNumber(row.percent_gold, `row[${rowIndex}].percent_gold`),
      percent_silver: validateNumber(row.percent_silver, `row[${rowIndex}].percent_silver`),
      share_price: validateNumber(row.share_price, `row[${rowIndex}].share_price`),
      share_price_currency_actual: validateString(row.share_price_currency, `row[${rowIndex}].share_price_currency`),
      share_price_date_actual: validateString(row.share_price_actual_date, `row[${rowIndex}].share_price_actual_date`),
      share_price_source_actual: row.share_price_source as Company['share_price_source_actual'],
      financials: {
        cash_value: validateNumber(row.f_cash_value ?? row.cash_value, `row[${rowIndex}].f_cash_value`),
        cash_currency: validateString(row.f_cash_currency ?? row.cash_currency, `row[${rowIndex}].f_cash_currency`),
        cash_date: validateString(row.f_cash_date ?? row.cash_date, `row[${rowIndex}].f_cash_date`),
        market_cap_value: validateNumber(row.f_market_cap_value ?? row.market_cap ?? 0, `row[${rowIndex}].f_market_cap_value`),
        market_cap_currency: validateString(row.f_market_cap_currency ?? row.market_cap_currency, `row[${rowIndex}].f_market_cap_currency`),
        enterprise_value_value: validateNumber(row.f_enterprise_value_value ?? row.enterprise_value_value, `row[${rowIndex}].f_enterprise_value_value`),
        enterprise_value_currency: validateString(row.f_enterprise_value_currency ?? row.enterprise_value_currency, `row[${rowIndex}].f_enterprise_value_currency`),
        net_financial_assets: validateNumber(row.f_net_financial_assets ?? row.net_financial_assets, `row[${rowIndex}].f_net_financial_assets`),
        net_financial_assets_currency: validateString(row.f_net_financial_assets_currency ?? row.net_financial_assets_currency, `row[${rowIndex}].f_net_financial_assets_currency`),
        free_cash_flow: validateNumber(row.f_free_cash_flow ?? row.free_cash_flow, `row[${rowIndex}].f_free_cash_flow`),
        price_to_book: validateNumber(row.f_price_to_book ?? row.price_to_book, `row[${rowIndex}].f_price_to_book`),
        price_to_sales: validateNumber(row.f_price_to_sales ?? row.price_to_sales, `row[${rowIndex}].f_price_to_sales`),
        enterprise_to_revenue: validateNumber(row.f_enterprise_to_revenue ?? row.enterprise_to_revenue, `row[${rowIndex}].f_enterprise_to_revenue`),
        enterprise_to_ebitda: validateNumber(row.f_enterprise_to_ebitda ?? row.enterprise_to_ebitda, `row[${rowIndex}].f_enterprise_to_ebitda`),
        trailing_pe: validateNumber(row.f_trailing_pe ?? row.trailing_pe, `row[${rowIndex}].f_trailing_pe`),
        forward_pe: validateNumber(row.f_forward_pe ?? row.forward_pe, `row[${rowIndex}].f_forward_pe`),
        revenue_value: validateNumber(row.f_revenue_value ?? row.revenue_value, `row[${rowIndex}].f_revenue_value`),
        revenue_currency: validateString(row.f_revenue_currency ?? row.revenue_currency, `row[${rowIndex}].f_revenue_currency`),
        ebitda: validateNumber(row.f_ebitda ?? row.ebitda, `row[${rowIndex}].f_ebitda`),
        net_income_value: validateNumber(row.f_net_income_value ?? row.net_income_value, `row[${rowIndex}].f_net_income_value`),
        net_income_currency: validateString(row.f_net_income_currency ?? row.net_income_currency, `row[${rowIndex}].f_net_income_currency`),
        debt_value: validateNumber(row.f_debt_value ?? row.debt_value, `row[${rowIndex}].f_debt_value`),
        debt_currency: validateString(row.f_debt_currency ?? row.debt_currency, `row[${rowIndex}].f_debt_currency`),
        shares_outstanding: validateNumber(row.f_shares_outstanding ?? row.shares_outstanding, `row[${rowIndex}].f_shares_outstanding`),
        peg_ratio: validateNumber(row.f_peg_ratio ?? row.peg_ratio, `row[${rowIndex}].f_peg_ratio`),
        cost_of_revenue: validateNumber(row.f_cost_of_revenue ?? row.cost_of_revenue, `row[${rowIndex}].f_cost_of_revenue`),
        gross_profit: validateNumber(row.f_gross_profit ?? row.gross_profit, `row[${rowIndex}].f_gross_profit`),
        operating_expense: validateNumber(row.f_operating_expense ?? row.operating_expense, `row[${rowIndex}].f_operating_expense`),
        operating_income: validateNumber(row.f_operating_income ?? row.operating_income, `row[${rowIndex}].f_operating_income`),
        liabilities: validateNumber(row.f_liabilities ?? row.liabilities, `row[${rowIndex}].f_liabilities`),
        liabilities_currency: validateString(row.f_liabilities_currency ?? row.liabilities_currency, `row[${rowIndex}].f_liabilities_currency`),
        other_financial_assets: validateNumber(row.f_other_financial_assets ?? row.other_financial_assets, `row[${rowIndex}].f_other_financial_assets`),
        other_financial_assets_currency: validateString(row.f_other_financial_assets_currency ?? row.other_financial_assets_currency, `row[${rowIndex}].f_other_financial_assets_currency`),
      },
      capital_structure: {
        existing_shares: validateNumber(row.cs_existing_shares ?? row.existing_shares, `row[${rowIndex}].cs_existing_shares`),
        fully_diluted_shares: validateNumber(row.cs_fully_diluted_shares ?? row.fully_diluted_shares, `row[${rowIndex}].cs_fully_diluted_shares`),
        in_the_money_options: validateNumber(row.cs_in_the_money_options ?? row.in_the_money_options, `row[${rowIndex}].cs_in_the_money_options`),
        options_revenue: validateNumber(row.cs_options_revenue ?? row.options_revenue, `row[${rowIndex}].cs_options_revenue`),
        options_revenue_currency: validateString(row.cs_options_revenue_currency ?? row.options_revenue_currency, `row[${rowIndex}].cs_options_revenue_currency`),
      },
      mineral_estimates: {
        reserves_total_aueq_moz: validateNumber(row.me_reserves_total_aueq_moz ?? row.reserves_total_aueq_moz, `row[${rowIndex}].me_reserves_total_aueq_moz`),
        measured_indicated_total_aueq_moz: validateNumber(row.me_measured_indicated_total_aueq_moz ?? row.measured_indicated_total_aueq_moz, `row[${rowIndex}].me_measured_indicated_total_aueq_moz`),
        resources_total_aueq_moz: validateNumber(row.me_resources_total_aueq_moz ?? row.resources_total_aueq_moz, `row[${rowIndex}].me_resources_total_aueq_moz`),
        potential_total_aueq_moz: validateNumber(row.me_potential_total_aueq_moz ?? row.potential_total_aueq_moz, `row[${rowIndex}].me_potential_total_aueq_moz`),
        reserves_precious_aueq_moz: validateNumber(row.me_reserves_precious_aueq_moz ?? row.reserves_precious_aueq_moz, `row[${rowIndex}].me_reserves_precious_aueq_moz`),
        measured_indicated_precious_aueq_moz: validateNumber(row.me_measured_indicated_precious_aueq_moz ?? row.measured_indicated_precious_aueq_moz, `row[${rowIndex}].me_measured_indicated_precious_aueq_moz`),
        resources_precious_aueq_moz: validateNumber(row.me_resources_precious_aueq_moz ?? row.resources_precious_aueq_moz, `row[${rowIndex}].me_resources_precious_aueq_moz`),
        reserves_non_precious_aueq_moz: validateNumber(row.me_reserves_non_precious_aueq_moz ?? row.reserves_non_precious_aueq_moz, `row[${rowIndex}].me_reserves_non_precious_aueq_moz`),
        measured_indicated_non_precious_aueq_moz: validateNumber(row.me_measured_indicated_non_precious_aueq_moz ?? row.measured_indicated_non_precious_aueq_moz, `row[${rowIndex}].me_measured_indicated_non_precious_aueq_moz`),
        resources_non_precious_aueq_moz: validateNumber(row.me_resources_non_precious_aueq_moz ?? row.resources_non_precious_aueq_moz, `row[${rowIndex}].me_resources_non_precious_aueq_moz`),
        potential_non_precious_aueq_moz: validateNumber(row.me_potential_non_precious_aueq_moz ?? row.potential_non_precious_aueq_moz, `row[${rowIndex}].me_potential_non_precious_aueq_moz`),
        mineable_total_aueq_moz: validateNumber(row.me_mineable_total_aueq_moz ?? row.mineable_total_aueq_moz, `row[${rowIndex}].me_mineable_total_aueq_moz`),
        mineable_precious_aueq_moz: validateNumber(row.me_mineable_precious_aueq_moz ?? row.mineable_precious_aueq_moz, `row[${rowIndex}].me_mineable_precious_aueq_moz`),
        mineable_non_precious_aueq_moz: validateNumber(row.me_mineable_non_precious_aueq_moz ?? row.mineable_non_precious_aueq_moz, `row[${rowIndex}].me_mineable_non_precious_aueq_moz`),
        potential_precious_aueq_moz: validateNumber(row.me_potential_precious_aueq_moz ?? row.potential_precious_aueq_moz, `row[${rowIndex}].me_potential_precious_aueq_moz`),
      },
      valuation_metrics: {
        ev_per_resource_oz_all: validateNumber(row.vm_ev_per_resource_oz_all ?? row.ev_per_resource_oz_all, `row[${rowIndex}].vm_ev_per_resource_oz_all`),
        ev_per_reserve_oz_all: validateNumber(row.vm_ev_per_reserve_oz_all ?? row.ev_per_reserve_oz_all, `row[${rowIndex}].vm_ev_per_reserve_oz_all`),
        mkt_cap_per_resource_oz_all: validateNumber(row.vm_mkt_cap_per_resource_oz_all ?? row.mkt_cap_per_resource_oz_all, `row[${rowIndex}].vm_mkt_cap_per_resource_oz_all`),
        mkt_cap_per_reserve_oz_all: validateNumber(row.vm_mkt_cap_per_reserve_oz_all ?? row.mkt_cap_per_reserve_oz_all, `row[${rowIndex}].vm_mkt_cap_per_reserve_oz_all`),
        ev_per_resource_oz_precious: validateNumber(row.vm_ev_per_resource_oz_precious ?? row.ev_per_resource_oz_precious, `row[${rowIndex}].vm_ev_per_resource_oz_precious`),
        ev_per_reserve_oz_precious: validateNumber(row.vm_ev_per_reserve_oz_precious ?? row.ev_per_reserve_oz_precious, `row[${rowIndex}].vm_ev_per_reserve_oz_precious`),
        mkt_cap_per_resource_oz_precious: validateNumber(row.vm_mkt_cap_per_resource_oz_precious ?? row.mkt_cap_per_resource_oz_precious, `row[${rowIndex}].vm_mkt_cap_per_resource_oz_precious`),
        mkt_cap_per_reserve_oz_precious: validateNumber(row.vm_mkt_cap_per_reserve_oz_precious ?? row.mkt_cap_per_reserve_oz_precious, `row[${rowIndex}].vm_mkt_cap_per_reserve_oz_precious`),
        ev_per_mi_oz_all: validateNumber(row.vm_ev_per_mi_oz_all ?? row.ev_per_mi_oz_all, `row[${rowIndex}].vm_ev_per_mi_oz_all`),
        ev_per_mi_oz_precious: validateNumber(row.vm_ev_per_mi_oz_precious ?? row.ev_per_mi_oz_precious, `row[${rowIndex}].vm_ev_per_mi_oz_precious`),
        ev_per_mineable_oz_all: validateNumber(row.vm_ev_per_mineable_oz_all ?? row.ev_per_mineable_oz_all, `row[${rowIndex}].vm_ev_per_mineable_oz_all`),
        ev_per_mineable_oz_precious: validateNumber(row.vm_ev_per_mineable_oz_precious ?? row.ev_per_mineable_oz_precious, `row[${rowIndex}].vm_ev_per_mineable_oz_precious`),
        ev_per_production_oz: validateNumber(row.vm_ev_per_production_oz ?? row.ev_per_production_oz, `row[${rowIndex}].vm_ev_per_production_oz`),
        mkt_cap_per_mi_oz_all: validateNumber(row.vm_mkt_cap_per_mi_oz_all ?? row.mkt_cap_per_mi_oz_all, `row[${rowIndex}].vm_mkt_cap_per_mi_oz_all`),
        mkt_cap_per_mi_oz_precious: validateNumber(row.vm_mkt_cap_per_mi_oz_precious ?? row.mkt_cap_per_mi_oz_precious, `row[${rowIndex}].vm_mkt_cap_per_mi_oz_precious`),
        mkt_cap_per_mineable_oz_all: validateNumber(row.vm_mkt_cap_per_mineable_oz_all ?? row.mkt_cap_per_mineable_oz_all, `row[${rowIndex}].vm_mkt_cap_per_mineable_oz_all`),
        mkt_cap_per_mineable_oz_precious: validateNumber(row.vm_mkt_cap_per_mineable_oz_precious ?? row.mkt_cap_per_mineable_oz_precious, `row[${rowIndex}].vm_mkt_cap_per_mineable_oz_precious`),
        mkt_cap_per_production_oz: validateNumber(row.vm_mkt_cap_per_production_oz ?? row.mkt_cap_per_production_oz, `row[${rowIndex}].vm_mkt_cap_per_production_oz`),
      },
      production: {
        current_production_total_aueq_koz: validateNumber(row.p_current_production_total_aueq_koz ?? row.current_production_total_aueq_koz, `row[${rowIndex}].p_current_production_total_aueq_koz`),
        future_production_total_aueq_koz: validateNumber(row.p_future_production_total_aueq_koz ?? row.future_production_total_aueq_koz, `row[${rowIndex}].p_future_production_total_aueq_koz`),
        reserve_life_years: validateNumber(row.p_reserve_life_years ?? row.reserve_life_years, `row[${rowIndex}].p_reserve_life_years`),
        current_production_precious_aueq_koz: validateNumber(row.p_current_production_precious_aueq_koz ?? row.current_production_precious_aueq_koz, `row[${rowIndex}].p_current_production_precious_aueq_koz`),
        current_production_non_precious_aueq_koz: validateNumber(row.p_current_production_non_precious_aueq_koz ?? row.current_production_non_precious_aueq_koz, `row[${rowIndex}].p_current_production_non_precious_aueq_koz`),
      },
      costs: {
        aisc_future: validateNumber(row.c_aisc_future ?? row.aisc_future, `row[${rowIndex}].c_aisc_future`),
        aisc_future_currency: validateString(row.c_aisc_future_currency ?? row.aisc_future_currency, `row[${rowIndex}].c_aisc_future_currency`),
        construction_costs: validateNumber(row.c_construction_costs ?? row.construction_costs, `row[${rowIndex}].c_construction_costs`),
        construction_costs_currency: validateString(row.c_construction_costs_currency ?? row.construction_costs_currency, `row[${rowIndex}].c_construction_costs_currency`),
        tco_future: validateNumber(row.c_tco_future ?? row.tco_future, `row[${rowIndex}].c_tco_future`),
        tco_future_currency: validateString(row.c_tco_future_currency ?? row.tco_future_currency, `row[${rowIndex}].c_tco_future_currency`),
        aisc_last_quarter: validateNumber(row.c_aisc_last_quarter ?? row.aisc_last_quarter, `row[${rowIndex}].c_aisc_last_quarter`),
        aisc_last_quarter_currency: validateString(row.c_aisc_last_quarter_currency ?? row.aisc_last_quarter_currency, `row[${rowIndex}].c_aisc_last_quarter_currency`),
        aisc_last_year: validateNumber(row.c_aisc_last_year ?? row.aisc_last_year, `row[${rowIndex}].c_aisc_last_year`),
        aisc_last_year_currency: validateString(row.c_aisc_last_year_currency ?? row.aisc_last_year_currency, `row[${rowIndex}].c_aisc_last_year_currency`),
        aic_last_quarter: validateNumber(row.c_aic_last_quarter ?? row.aic_last_quarter, `row[${rowIndex}].c_aic_last_quarter`),
        aic_last_quarter_currency: validateString(row.c_aic_last_quarter_currency ?? row.aic_last_quarter_currency, `row[${rowIndex}].c_aic_last_quarter_currency`),
        aic_last_year: validateNumber(row.c_aic_last_year ?? row.aic_last_year, `row[${rowIndex}].c_aic_last_year`),
        aic_last_year_currency: validateString(row.c_aic_last_year_currency ?? row.aic_last_year_currency, `row[${rowIndex}].c_aic_last_year_currency`),
        tco_current: validateNumber(row.c_tco_current ?? row.tco_current, `row[${rowIndex}].c_tco_current`),
        tco_current_currency: validateString(row.c_tco_current_currency ?? row.tco_current_currency, `row[${rowIndex}].c_tco_current_currency`),
      },
      royalty_portfolios: {
        r_asset_count_total: validateNumber(row.r_asset_count_total ?? null, `row[${rowIndex}].r_asset_count_total`),
        r_asset_count_producing: validateNumber(row.r_asset_count_producing ?? null, `row[${rowIndex}].r_asset_count_producing`),
        r_asset_count_developing: validateNumber(row.r_asset_count_developing ?? null, `row[${rowIndex}].r_asset_count_developing`),
        r_asset_count_exploration: validateNumber(row.r_asset_count_exploration ?? null, `row[${rowIndex}].r_asset_count_exploration`),
        r_operator_count: validateNumber(row.r_operator_count ?? null, `row[${rowIndex}].r_operator_count`),
        r_country_count: validateNumber(row.r_country_count ?? null, `row[${rowIndex}].r_country_count`),
      },
    };

    companies.push(company);

    if (rowSpecificFieldErrors.length > 0) {
      overallConversionErrors.push(...rowSpecificFieldErrors);
      if (debugMode) {
        logDebug(`Row ${rowIndex} (ID: ${company_id}) converted with ${rowSpecificFieldErrors.length} non-critical field validation warnings (values set to null). Details:`, rowSpecificFieldErrors);
      }
    }
  });

  if (overallConversionErrors.length > 0) {
    const criticalRowCount = overallConversionErrors.filter(e => e.field === 'company_id' || e.field === 'company_name').length;
    const fieldErrorCount = overallConversionErrors.length - criticalRowCount;

    let summaryMessage = `Conversion of ${rows.length} rows completed. Resulted in ${companies.length} valid Company objects.`;
    if (criticalRowCount > 0) {
      summaryMessage += ` ${criticalRowCount} row(s) were skipped due to missing/invalid essential identifiers (company_id or company_name).`;
    }
    if (fieldErrorCount > 0) {
      summaryMessage += ` Encountered ${fieldErrorCount} non-critical field validation issue(s) where problematic values were set to null.`;
    }

    if (throwOnError && criticalRowCount > 0) {
      logDebug(summaryMessage + " Throwing RpcConverterError due to critical row errors.", overallConversionErrors);
      throw new RpcConverterError(summaryMessage, overallConversionErrors);
    } else {
      console.warn(`[CONVERTERS] ${summaryMessage}`);
      if (debugMode && fieldErrorCount > 0) {
        logDebug("Details of non-critical field conversion warnings:");
        overallConversionErrors.forEach(err => {
          if (err.field !== 'company_id' && err.field !== 'company_name') {
            console.warn(`  Row ${err.row}, Field '${err.field}', Msg: '${err.error}', Received Value:`, err.value);
          }
        });
      }
      if (debugMode && criticalRowCount > 0) {
        logDebug("Details of critical row errors (rows skipped):");
        overallConversionErrors.forEach(err => {
          if (err.field === 'company_id' || err.field === 'company_name') {
            console.warn(`  Row ${err.row}, Field '${err.field}', Msg: '${err.error}', Received Value:`, err.value);
          }
        });
      }
    }
  } else {
    if (debugMode) logDebug(`Successfully converted ${companies.length} Company objects from ${rows.length} RPC rows with no field validation warnings.`);
  }

  return companies;
}