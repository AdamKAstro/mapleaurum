// src/pages/RPSScoringPage/rps-scoring-configs.ts

/**
 * Defines the configuration for the Relative Performance Score (RPS) system.
 * This file contains the metric baskets, weights, and detailed rationales
 * for each company status: Producer, Developer, Explorer, and Royalty.
 */

import type { CompanyStatus } from '@/lib/types';

// Defines the structure for a single metric's weighting within a theme.
export interface RPSThemeMetrics {
    [metricKey: string]: number;
}

// Defines the structure for a company type's scoring configuration.
export interface RPSCompanyConfig {
    [themeName: string]: RPSThemeMetrics;
}

// The master configuration object for the entire RPS system.
export interface RPSScoringConfigs {
    producer: RPSCompanyConfig;
    developer: RPSCompanyConfig;
    explorer: RPSCompanyConfig;
    royalty: RPSCompanyConfig;
    other: RPSCompanyConfig; // Fallback for uncategorized companies
}

// Defines the structure for the detailed explanation of each metric's purpose.
export interface RPSMetricRationale {
    metricKey: string;
    label: string;
    higherIsBetter: boolean;
    reasoning: string;
}

// The master object containing all metric rationales.
export interface RPSRationaleConfig {
    [key: string]: RPSMetricRationale[];
}


/**
 * =================================================================
 * MASTER SCORING CONFIGURATIONS
 * =================================================================
 * This is the primary export used by the scoring engine. It defines
 * the themes, metrics, and weights for each company status.
 */
export const RPS_SCORING_CONFIGS: RPSScoringConfigs = {
    producer: {
        'Operational Efficiency': { 'c_aisc_last_year': 20, 'p_reserve_life_years': 10, '_calc_fcf_margin': 10 },
        'Financial Health': { 'f_free_cash_flow': 15, '_calc_net_debt_to_ebitda': 10, 'f_cash_value': 5 },
        'Valuation & Market': { 'vm_ev_per_production_oz': 10, 'vm_mkt_cap_per_reserve_oz_all': 10, 'f_enterprise_to_ebitda': 5, 'f_price_to_book': 5 },
    },
    developer: {
        'Project Economics & De-Risking': { 'me_mineable_total_aueq_moz': 20, 'c_construction_costs': 15, 'p_future_production_total_aueq_koz': 5 },
        'Financial Health & Funding': { 'f_cash_value': 20, 'f_free_cash_flow': 10, 'f_debt_value': 10 },
        'Valuation': { 'vm_ev_per_mineable_oz_all': 10, 'vm_mkt_cap_per_resource_oz_all': 10 },
    },
    explorer: {
        'Discovery Potential': { 'me_potential_total_aueq_moz': 20, 'me_measured_indicated_total_aueq_moz': 20 },
        'Financial Health & Dilution Risk': { 'f_cash_value': 20, 'f_free_cash_flow': 10, 'cs_fully_diluted_shares': 10 },
        'Valuation': { 'vm_ev_per_resource_oz_all': 10, 'vm_mkt_cap_per_resource_oz_all': 10 },
    },
    royalty: {
        'Cash Flow Generation': { 'f_free_cash_flow': 20, '_calc_fcf_ev_yield': 15, '_calc_fcf_margin': 15 },
        'Portfolio Quality & Growth': { 'p_current_production_precious_aueq_koz': 15, 'r_asset_count_producing': 10, 'r_asset_count_total': 5 },
        'Financial Strength & Valuation': { 'f_net_financial_assets': 10, 'f_enterprise_to_revenue': 10 },
    },
    other: {
        'Financial Health': { 'f_cash_value': 25, 'f_debt_value': 20, 'f_free_cash_flow': 20 },
        'Valuation': { 'f_enterprise_value_value': 20, 'f_price_to_book': 15 },
    }
};



/**
 * =================================================================
 * DETAILED METRIC RATIONALES
 * =================================================================
 * This object provides the "why" behind each metric's inclusion,
 * used for tooltips and help pages to make scoring transparent.
 */
export const RPS_METRIC_RATIONALES: RPSRationaleConfig = {
    producer: [
        { metricKey: 'c_aisc_last_year', label: 'All-In Sustaining Cost', higherIsBetter: false, reasoning: 'AISC is the most critical measure of a producer`s operational efficiency. Lower costs provide higher margins, resilience to price volatility, and superior cash flow generation.' },
        { metricKey: 'p_reserve_life_years', label: 'Reserve Life (Years)', higherIsBetter: true, reasoning: 'Indicates the sustainability of the current production rate. A longer reserve life provides more certainty for future cash flows and time for exploration success.' },
        { metricKey: '_calc_fcf_margin', label: 'FCF Margin', higherIsBetter: true, reasoning: 'Measures how efficiently a company converts revenue into free cash flow. A higher margin indicates strong operational performance and profitability.' },
        { metricKey: 'f_free_cash_flow', label: 'Free Cash Flow', higherIsBetter: true, reasoning: 'The ultimate measure of financial health. Represents the cash available to return to shareholders, pay down debt, or reinvest in the business.' },
        { metricKey: '_calc_net_debt_to_ebitda', label: 'Net Debt / EBITDA', higherIsBetter: false, reasoning: 'A key leverage ratio that shows how many years it would take for a company to pay back its debt. A lower ratio indicates a stronger balance sheet.' },
        { metricKey: 'f_cash_value', label: 'Cash & Equivalents', higherIsBetter: true, reasoning: 'Provides a buffer for operational challenges, funding for growth initiatives, and financial flexibility.' },
        { metricKey: 'vm_ev_per_production_oz', label: 'EV / Production (oz)', higherIsBetter: false, reasoning: 'A valuation metric that shows how the market values each ounce of current production. A lower number can indicate an undervalued company relative to its output.' },
        { metricKey: 'vm_mkt_cap_per_reserve_oz_all', label: 'Mkt Cap / Reserve (oz)', higherIsBetter: false, reasoning: 'Shows how much the market is paying for each proven and probable ounce in the ground. A lower value can suggest reserves are being undervalued.' },
        { metricKey: 'f_enterprise_to_ebitda', label: 'EV / EBITDA', higherIsBetter: false, reasoning: 'A core valuation multiple that compares the total company value to its earnings. Lower is generally considered cheaper.' },
        { metricKey: 'f_price_to_book', label: 'Price to Book Ratio', higherIsBetter: false, reasoning: 'Compares a company`s market capitalization to its book value of assets. A ratio below 1 can indicate undervaluation.' },
    ],
    developer: [
        { metricKey: 'me_mineable_total_aueq_moz', label: 'Mineable Ounces (Moz)', higherIsBetter: true, reasoning: 'Represents the size of the prize. A larger mineable resource base is the primary driver of a project`s future value and potential scale.' },
        { metricKey: 'c_construction_costs', label: 'Construction CAPEX', higherIsBetter: false, reasoning: 'The initial capital required to build the mine. Lower CAPEX reduces the funding hurdle, lowers risk, and generally leads to better project economics.' },
        { metricKey: 'p_future_production_total_aueq_koz', label: 'Future Production (koz/yr)', higherIsBetter: true, reasoning: 'The projected annual output of the mine. Higher production accelerates payback and increases cash flow potential.' },
        { metricKey: 'f_cash_value', label: 'Cash Position', higherIsBetter: true, reasoning: 'Crucial for developers to fund pre-production activities and cover potential cost overruns without excessive dilution. A strong cash balance de-risks the path to production.' },
        { metricKey: 'f_free_cash_flow', label: 'Cash Burn Rate', higherIsBetter: true, reasoning: 'For developers, FCF is negative (burn). A less negative value is better, indicating strong capital discipline and a longer funding runway.' },
        { metricKey: 'f_debt_value', label: 'Total Debt', higherIsBetter: false, reasoning: 'Debt is often necessary for construction, but excessive levels increase financial risk before the mine is generating revenue. Lower debt is preferable.' },
        { metricKey: 'vm_ev_per_mineable_oz_all', label: 'EV / Mineable (oz)', higherIsBetter: false, reasoning: 'Shows how the market is valuing the ounces that are planned to be mined. A low value suggests the project may be undervalued relative to its defined scope.' },
        { metricKey: 'vm_mkt_cap_per_resource_oz_all', label: 'Mkt Cap / Resource (oz)', higherIsBetter: false, reasoning: 'A broader valuation metric for developers, showing the price paid per ounce in the ground. A lower value can indicate a cheaper entry point.' },
    ],
    explorer: [
        { metricKey: 'me_potential_total_aueq_moz', label: 'Exploration Potential (Moz)', higherIsBetter: true, reasoning: 'Represents the "blue sky" upside of an exploration play. This includes inferred resources and conceptual targets that drive speculative value.' },
        { metricKey: 'me_measured_indicated_total_aueq_moz', label: 'M&I Resources (Moz)', higherIsBetter: true, reasoning: 'These are higher-confidence ounces that have been partially de-risked through drilling. Growth in this category is a key sign of exploration success.' },
        { metricKey: 'f_cash_value', label: 'Cash Runway', higherIsBetter: true, reasoning: 'Cash is the lifeblood of an explorer. A strong cash position allows the company to execute its exploration plans without being forced into dilutive financings from a position of weakness.' },
        { metricKey: 'f_free_cash_flow', label: 'Cash Burn Rate', higherIsBetter: true, reasoning: 'Like developers, explorers burn cash. A lower burn rate (less negative FCF) relative to the cash position indicates efficient spending and a longer runway.' },
        { metricKey: 'cs_fully_diluted_shares', label: 'Fully Diluted Shares', higherIsBetter: false, reasoning: 'A measure of potential shareholder dilution. A lower share count means that any exploration success will be more impactful on a per-share basis.' },
        { metricKey: 'vm_ev_per_resource_oz_all', label: 'EV / Resource (oz)', higherIsBetter: false, reasoning: 'The primary valuation metric for explorers. It shows how much the market is paying for each ounce discovered so far. A low number can signal an undiscovered story.' },
        { metricKey: 'vm_mkt_cap_per_resource_oz_all', label: 'Mkt Cap / Resource (oz)', higherIsBetter: false, reasoning: 'Similar to EV/oz, this metric provides a simple valuation check. Comparing this across different explorers helps identify relative value.' },
    ],
    royalty: [
        { metricKey: 'f_free_cash_flow', label: 'Free Cash Flow', higherIsBetter: true, reasoning: 'The primary metric for a royalty company. Their business model is designed to maximize FCF with minimal G&A costs. Consistent, growing FCF is paramount.' },
        { metricKey: '_calc_fcf_ev_yield', label: 'FCF / EV Yield', higherIsBetter: true, reasoning: 'A core valuation metric that shows the cash flow return on the total capital invested in the company (equity and debt). Higher is better.' },
        { metricKey: '_calc_fcf_margin', label: 'FCF Margin', higherIsBetter: true, reasoning: 'For royalty companies, this should be extremely high. It shows how much of their revenue (from royalties/streams) is converted directly into cash.' },
        { metricKey: 'p_current_production_precious_aueq_koz', label: 'Attributable Production (koz)', higherIsBetter: true, reasoning: 'The amount of production that the company receives payments on. This is the direct driver of revenue and near-term cash flow.' },
        { metricKey: 'r_asset_count_producing', label: 'Number of Producing Assets', higherIsBetter: true, reasoning: 'A key measure of diversification and safety. More producing assets reduces reliance on any single mine or operator.' },
        { metricKey: 'r_asset_count_total', label: 'Total Asset Count', higherIsBetter: true, reasoning: 'Represents the company`s growth pipeline. A large portfolio with assets at different stages provides future growth potential.' },
        { metricKey: 'f_net_financial_assets', label: 'Net Financial Assets', higherIsBetter: true, reasoning: 'A strong balance sheet (high net cash) provides the firepower to acquire new, value-accretive royalties and streams.' },
        { metricKey: 'f_enterprise_to_revenue', label: 'EV / Revenue', higherIsBetter: false, reasoning: 'A common valuation multiple for royalty companies. A lower multiple can suggest the company is undervalued relative to its current revenue generation.' },
    ],
    other: [
        { metricKey: 'f_cash_value', label: 'Cash & Equivalents', higherIsBetter: true, reasoning: 'Provides a buffer for operational challenges, funding for growth initiatives, and financial flexibility.' },
        { metricKey: 'f_debt_value', label: 'Total Debt', higherIsBetter: false, reasoning: 'Excessive levels of debt increase financial risk and can constrain a company`s ability to grow.' },
        { metricKey: 'f_free_cash_flow', label: 'Free Cash Flow', higherIsBetter: true, reasoning: 'A key measure of financial health. Represents the cash available to return to shareholders or reinvest.' },
        { metricKey: 'f_enterprise_value_value', label: 'Enterprise Value', higherIsBetter: false, reasoning: 'A comprehensive measure of a company`s total value, including market capitalization, debt, and cash.' },
        { metricKey: 'f_price_to_book', label: 'Price to Book Ratio', higherIsBetter: false, reasoning: 'Compares a company`s market capitalization to its book value. A ratio below 1 can indicate undervaluation.' },
    ],
};

/**
 * =================================================================
 * HELPER FUNCTIONS
 * =================================================================
 */

/**
 * Gets a flattened list of all metric keys used for a given company type.
 * @param {CompanyStatus} companyType - The status of the company.
 * @returns {string[]} A list of metric keys.
 */
export function getRPSMetricsForCompanyType(companyType: CompanyStatus): string[] {
    const config = RPS_SCORING_CONFIGS[companyType] || RPS_SCORING_CONFIGS.other;
    let allMetrics: string[] = [];
    for (const theme in config) {
        allMetrics = [...allMetrics, ...Object.keys(config[theme])];
    }
    return allMetrics;
}

/**
 * Retrieves the detailed rationale for a specific metric and company type.
 * @param {CompanyStatus} companyType - The status of the company.
 * @param {string} metricKey - The metric key (e.g., 'c_aisc_last_year').
 * @returns {RPSMetricRationale | undefined} The rationale object or undefined if not found.
 */
export function getMetricRationale(
    companyType: CompanyStatus,
    metricKey: string
): RPSMetricRationale | undefined {
    const rationales = RPS_METRIC_RATIONALES[companyType];
    if (!rationales) return undefined;
    return rationales.find(r => r.metricKey === metricKey);
}