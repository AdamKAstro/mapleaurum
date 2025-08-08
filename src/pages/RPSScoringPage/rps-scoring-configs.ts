// src/pages/RPSScoringPage/rps-scoring-configs.ts

/**
 * Defines the configuration for the Relative Performance Score (RPS) system.
 * This file contains the metric baskets, weights, and detailed rationales
 * for each company status: Producer, Developer, Explorer, and Royalty.
 *
 * VERSION 2.0: Updated with corrected nested metric keys and enhanced metric sets.
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
        'Operational Efficiency & Scale': {
            'costs.aisc_last_year': 15,
            'costs.aic_last_year': 5, // NEW
            'production.reserve_life_years': 10,
            '_calc_fcf_margin': 5,
            'production.current_production_total_aueq_koz': 5, // NEW
        },
        'Financial Health': {
            'financials.free_cash_flow': 15,
            '_calc_net_debt_to_ebitda': 5,
            'financials.cash_value': 5,
            'financials.gross_profit': 5, // NEW
        },
        'Valuation & Market': {
            'valuation_metrics.ev_per_production_oz': 8,
            'valuation_metrics.mkt_cap_per_reserve_oz_all': 7,
            'financials.enterprise_to_ebitda': 5,
            'financials.trailing_pe': 5, // NEW
            'financials.price_to_sales': 5, // NEW
        },
    },
    developer: {
        'Project Economics & De-Risking': {
            'mineral_estimates.mineable_total_aueq_moz': 15,
            'mineral_estimates.reserves_total_aueq_moz': 10, // NEW
            'costs.construction_costs': 15,
            'production.future_production_total_aueq_koz': 5,
        },
        'Financial Health & Funding': {
            'financials.cash_value': 20,
            'financials.free_cash_flow': 10, // Represents cash burn
            'financials.debt_value': 5,
            'capital_structure.fully_diluted_shares': 5, // NEW
        },
        'Valuation': {
            'valuation_metrics.ev_per_mineable_oz_all': 5,
            'valuation_metrics.mkt_cap_per_resource_oz_all': 5,
            'valuation_metrics.ev_per_reserve_oz_all': 5, // NEW
        },
    },
    explorer: {
        'Discovery Potential': {
            'mineral_estimates.potential_total_aueq_moz': 20,
            'mineral_estimates.measured_indicated_total_aueq_moz': 15,
            'mineral_estimates.resources_total_aueq_moz': 5, // NEW
        },
        'Financial Health & Dilution Risk': {
            'financials.cash_value': 20,
            'financials.free_cash_flow': 10, // Represents cash burn
            'capital_structure.fully_diluted_shares': 10,
            'financials.debt_value': 5, // NEW
        },
        'Valuation': {
            'valuation_metrics.ev_per_resource_oz_all': 5,
            'valuation_metrics.mkt_cap_per_resource_oz_all': 5,
            'valuation_metrics.ev_per_mi_oz_all': 5, // NEW
        },
    },
    royalty: {
        'Cash Flow Generation': {
            'financials.free_cash_flow': 20,
            '_calc_fcf_ev_yield': 15,
            '_calc_fcf_margin': 10,
        },
        'Portfolio Quality & Growth': {
            'production.current_production_precious_aueq_koz': 10,
            'royalty_portfolios.asset_count_producing': 10,
            'royalty_portfolios.asset_count_total': 5,
            'royalty_portfolios.country_count': 5, // NEW
            'royalty_portfolios.operator_count': 5, // NEW
        },
        'Financial Strength & Valuation': {
            'financials.net_financial_assets': 5,
            'financials.enterprise_to_revenue': 5,
            'financials.price_to_sales': 5, // NEW
            'valuation_metrics.mkt_cap_per_production_oz': 5, // NEW
        },
    },
    other: {
        'Financial Health': {
            'financials.cash_value': 25,
            'financials.debt_value': 20,
            'financials.free_cash_flow': 20,
        },
        'Valuation': {
            'financials.enterprise_value_value': 20,
            'financials.price_to_book': 15,
        },
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
        { metricKey: 'costs.aisc_last_year', label: 'All-In Sustaining Cost', higherIsBetter: false, reasoning: 'AISC is a critical measure of a producer`s operational efficiency. Lower costs provide higher margins, resilience to price volatility, and superior cash flow generation.' },
        { metricKey: 'costs.aic_last_year', label: 'All-In Cost (AIC)', higherIsBetter: false, reasoning: 'A more comprehensive cost measure than AISC, including corporate overheads. It provides a truer picture of the total cost to produce an ounce.' },
        { metricKey: 'production.reserve_life_years', label: 'Reserve Life (Years)', higherIsBetter: true, reasoning: 'Indicates the sustainability of the current production rate. A longer reserve life provides more certainty for future cash flows and time for exploration success.' },
        { metricKey: '_calc_fcf_margin', label: 'FCF Margin', higherIsBetter: true, reasoning: 'Measures how efficiently a company converts revenue into free cash flow. A higher margin indicates strong operational performance and profitability.' },
        { metricKey: 'production.current_production_total_aueq_koz', label: 'Total Production (koz)', higherIsBetter: true, reasoning: 'While relative valuations are key, the absolute scale of production is a direct indicator of a company\'s market significance and operational capacity.' },
        { metricKey: 'financials.free_cash_flow', label: 'Free Cash Flow', higherIsBetter: true, reasoning: 'The ultimate measure of financial health. Represents the cash available to return to shareholders, pay down debt, or reinvest in the business.' },
        { metricKey: '_calc_net_debt_to_ebitda', label: 'Net Debt / EBITDA', higherIsBetter: false, reasoning: 'A key leverage ratio that shows how many years it would take for a company to pay back its debt. A lower ratio indicates a stronger balance sheet.' },
        { metricKey: 'financials.cash_value', label: 'Cash & Equivalents', higherIsBetter: true, reasoning: 'Provides a buffer for operational challenges, funding for growth initiatives, and financial flexibility.' },
        { metricKey: 'financials.gross_profit', label: 'Gross Profit', higherIsBetter: true, reasoning: 'A direct measure of production profitability before corporate overheads. It reflects the health of the core mining operation.' },
        { metricKey: 'valuation_metrics.ev_per_production_oz', label: 'EV / Production (oz)', higherIsBetter: false, reasoning: 'A valuation metric that shows how the market values each ounce of current production. A lower number can indicate an undervalued company relative to its output.' },
        { metricKey: 'valuation_metrics.mkt_cap_per_reserve_oz_all', label: 'Mkt Cap / Reserve (oz)', higherIsBetter: false, reasoning: 'Shows how much the market is paying for each proven and probable ounce in the ground. A lower value can suggest reserves are being undervalued.' },
        { metricKey: 'financials.enterprise_to_ebitda', label: 'EV / EBITDA', higherIsBetter: false, reasoning: 'A core valuation multiple that compares the total company value to its earnings. Lower is generally considered cheaper.' },
        { metricKey: 'financials.trailing_pe', label: 'P/E Ratio (Trailing)', higherIsBetter: false, reasoning: 'A classic valuation metric. A lower P/E ratio can indicate that the company\'s earnings are valued less expensively by the market.' },
        { metricKey: 'financials.price_to_sales', label: 'Price to Sales Ratio', higherIsBetter: false, reasoning: 'Compares the company\'s stock price to its revenues. It\'s a useful valuation metric, especially when comparing companies with different profitability profiles.' },
    ],
    developer: [
        { metricKey: 'mineral_estimates.mineable_total_aueq_moz', label: 'Mineable Ounces (Moz)', higherIsBetter: true, reasoning: 'Represents the size of the prize. A larger mineable resource base is the primary driver of a project`s future value and potential scale.' },
        { metricKey: 'mineral_estimates.reserves_total_aueq_moz', label: 'Total Reserves (Moz)', higherIsBetter: true, reasoning: 'The ultimate de-risking event. Having proven & probable reserves significantly increases project certainty and is a major value driver.' },
        { metricKey: 'costs.construction_costs', label: 'Construction CAPEX', higherIsBetter: false, reasoning: 'The initial capital required to build the mine. Lower CAPEX reduces the funding hurdle, lowers risk, and generally leads to better project economics.' },
        { metricKey: 'production.future_production_total_aueq_koz', label: 'Future Production (koz/yr)', higherIsBetter: true, reasoning: 'The projected annual output of the mine. Higher production accelerates payback and increases cash flow potential.' },
        { metricKey: 'financials.cash_value', label: 'Cash Position', higherIsBetter: true, reasoning: 'Crucial for developers to fund pre-production activities and cover potential cost overruns without excessive dilution. A strong cash balance de-risks the path to production.' },
        { metricKey: 'financials.free_cash_flow', label: 'Cash Burn Rate', higherIsBetter: true, reasoning: 'For developers, FCF is negative (burn). A less negative value is better, indicating strong capital discipline and a longer funding runway.' },
        { metricKey: 'financials.debt_value', label: 'Total Debt', higherIsBetter: false, reasoning: 'Debt is often necessary for construction, but excessive levels increase financial risk before the mine is generating revenue. Lower debt is preferable.' },
        { metricKey: 'capital_structure.fully_diluted_shares', label: 'Fully Diluted Shares', higherIsBetter: false, reasoning: 'Crucial for developers who often rely on equity financing. A lower number indicates less past dilution and more upside for current shareholders.' },
        { metricKey: 'valuation_metrics.ev_per_mineable_oz_all', label: 'EV / Mineable (oz)', higherIsBetter: false, reasoning: 'Shows how the market is valuing the ounces that are planned to be mined. A low value suggests the project may be undervalued relative to its defined scope.' },
        { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_all', label: 'Mkt Cap / Resource (oz)', higherIsBetter: false, reasoning: 'A broader valuation metric for developers, showing the price paid per ounce in the ground. A lower value can indicate a cheaper entry point.' },
        { metricKey: 'valuation_metrics.ev_per_reserve_oz_all', label: 'EV / Reserve (oz)', higherIsBetter: false, reasoning: 'If a developer has established reserves, this becomes the highest-quality valuation metric, showing what the market pays for de-risked ounces.' },
    ],
    explorer: [
        { metricKey: 'mineral_estimates.potential_total_aueq_moz', label: 'Exploration Potential (Moz)', higherIsBetter: true, reasoning: 'Represents the "blue sky" upside of an exploration play. This includes inferred resources and conceptual targets that drive speculative value.' },
        { metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz', label: 'M&I Resources (Moz)', higherIsBetter: true, reasoning: 'These are higher-confidence ounces that have been partially de-risked through drilling. Growth in this category is a key sign of exploration success.' },
        { metricKey: 'mineral_estimates.resources_total_aueq_moz', label: 'Total Resources (Moz)', higherIsBetter: true, reasoning: 'Captures the full scope of the discovered resource, including the Inferred category which is vital for early-stage explorers.' },
        { metricKey: 'financials.cash_value', label: 'Cash Runway', higherIsBetter: true, reasoning: 'Cash is the lifeblood of an explorer. A strong cash position allows the company to execute its exploration plans without being forced into dilutive financings from a position of weakness.' },
        { metricKey: 'financials.free_cash_flow', label: 'Cash Burn Rate', higherIsBetter: true, reasoning: 'Like developers, explorers burn cash. A lower burn rate (less negative FCF) relative to the cash position indicates efficient spending and a longer runway.' },
        { metricKey: 'capital_structure.fully_diluted_shares', label: 'Fully Diluted Shares', higherIsBetter: false, reasoning: 'A measure of potential shareholder dilution. A lower share count means that any exploration success will be more impactful on a per-share basis.' },
        { metricKey: 'financials.debt_value', label: 'Total Debt', higherIsBetter: false, reasoning: 'For an explorer with no revenue, any amount of debt is a significant risk. A clean balance sheet is paramount for survival and flexibility.' },
        { metricKey: 'valuation_metrics.ev_per_resource_oz_all', label: 'EV / Resource (oz)', higherIsBetter: false, reasoning: 'The primary valuation metric for explorers. It shows how much the market is paying for each ounce discovered so far. A low number can signal an undiscovered story.' },
        { metricKey: 'valuation_metrics.mkt_cap_per_resource_oz_all', label: 'Mkt Cap / Resource (oz)', higherIsBetter: false, reasoning: 'Similar to EV/oz, this metric provides a simple valuation check. Comparing this across different explorers helps identify relative value.' },
        { metricKey: 'valuation_metrics.ev_per_mi_oz_all', label: 'EV / M&I Oz', higherIsBetter: false, reasoning: 'Valuing based on Measured & Indicated ounces shows the market is rewarding the company for successfully de-risking resources from the Inferred category.' },
    ],
    royalty: [
        { metricKey: 'financials.free_cash_flow', label: 'Free Cash Flow', higherIsBetter: true, reasoning: 'The primary metric for a royalty company. Their business model is designed to maximize FCF with minimal G&A costs. Consistent, growing FCF is paramount.' },
        { metricKey: '_calc_fcf_ev_yield', label: 'FCF / EV Yield', higherIsBetter: true, reasoning: 'A core valuation metric that shows the cash flow return on the total capital invested in the company (equity and debt). Higher is better.' },
        { metricKey: '_calc_fcf_margin', label: 'FCF Margin', higherIsBetter: true, reasoning: 'For royalty companies, this should be extremely high. It shows how much of their revenue (from royalties/streams) is converted directly into cash.' },
        { metricKey: 'production.current_production_precious_aueq_koz', label: 'Attributable Production (koz)', higherIsBetter: true, reasoning: 'The amount of production that the company receives payments on. This is the direct driver of revenue and near-term cash flow.' },
        { metricKey: 'royalty_portfolios.asset_count_producing', label: 'Number of Producing Assets', higherIsBetter: true, reasoning: 'A key measure of diversification and safety. More producing assets reduces reliance on any single mine or operator.' },
        { metricKey: 'royalty_portfolios.asset_count_total', label: 'Total Asset Count', higherIsBetter: true, reasoning: 'Represents the company`s growth pipeline. A large portfolio with assets at different stages provides future growth potential.' },
        { metricKey: 'royalty_portfolios.country_count', label: 'Country Diversification', higherIsBetter: true, reasoning: 'A key measure of geopolitical risk mitigation. More countries mean less reliance on the stability and tax regime of any single nation.' },
        { metricKey: 'royalty_portfolios.operator_count', label: 'Operator Diversification', higherIsBetter: true, reasoning: 'Reduces operational risk. A failure at a mine run by one operator is less impactful if the portfolio has many different operating partners.' },
        { metricKey: 'financials.net_financial_assets', label: 'Net Financial Assets', higherIsBetter: true, reasoning: 'A strong balance sheet (high net cash) provides the firepower to acquire new, value-accretive royalties and streams.' },
        { metricKey: 'financials.enterprise_to_revenue', label: 'EV / Revenue', higherIsBetter: false, reasoning: 'A common valuation multiple for royalty companies. A lower multiple can suggest the company is undervalued relative to its current revenue generation.' },
        { metricKey: 'financials.price_to_sales', label: 'Price to Sales Ratio', higherIsBetter: false, reasoning: 'A standard and very effective valuation metric for royalty companies, directly comparing market value to the revenue generated from royalties.' },
        { metricKey: 'valuation_metrics.mkt_cap_per_production_oz', label: 'Mkt Cap / Production (oz)', higherIsBetter: false, reasoning: 'Shows how the market values each ounce of attributable production, providing a direct valuation comparison against royalty peers.' },
    ],
    other: [
        { metricKey: 'financials.cash_value', label: 'Cash & Equivalents', higherIsBetter: true, reasoning: 'Provides a buffer for operational challenges, funding for growth initiatives, and financial flexibility.' },
        { metricKey: 'financials.debt_value', label: 'Total Debt', higherIsBetter: false, reasoning: 'Excessive levels of debt increase financial risk and can constrain a company`s ability to grow.' },
        { metricKey: 'financials.free_cash_flow', label: 'Free Cash Flow', higherIsBetter: true, reasoning: 'A key measure of financial health. Represents the cash available to return to shareholders or reinvest.' },
        { metricKey: 'financials.enterprise_value_value', label: 'Enterprise Value', higherIsBetter: false, reasoning: 'A comprehensive measure of a company`s total value, including market capitalization, debt, and cash.' },
        { metricKey: 'financials.price_to_book', label: 'Price to Book Ratio', higherIsBetter: false, reasoning: 'Compares a company`s market capitalization to its book value. A ratio below 1 can indicate undervaluation.' },
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
 * @param {string} metricKey - The metric key (e.g., 'costs.aisc_last_year').
 * @returns {RPSMetricRationale | undefined} The rationale object or undefined if not found.
 */
export function getMetricRationale(
    companyType: CompanyStatus,
    metricKey: string
): RPSMetricRationale | undefined {
    const rationales = RPS_METRIC_RATIONALES[companyType] || RPS_METRIC_RATIONALES.other;
    if (!rationales) return undefined;
    return rationales.find(r => r.metricKey === metricKey);
}