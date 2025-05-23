// src/lib/metric-types.ts
import type { ColumnTier, MetricCategory, MetricFormat } from './types';

// The main configuration interface for each metric
export interface MetricConfig {
  key: string;             // Unique key for React lists/internal use
  label: string;           // Display label
  db_column: string;       // Flat column name from RpcResponseRow
  nested_path: string;     // Dot-notation path in the nested Company object
  unit: string;            // e.g., "USD", "$M", "%", "Moz", "x", "yrs", "$/oz"
  higherIsBetter: boolean; // true = Higher is better (↑), false = Lower is better (↓)
  category: MetricCategory; // Grouping for UI
  tier: ColumnTier;        // 'free' | 'pro' | 'premium'
  format: MetricFormat;    // How to display the number/value
  description: string;     // Detailed description for tooltips/help
}

// Display names for categories (ensure this matches MetricCategory type from types.ts)
export const metricCategories: Readonly<Record<MetricCategory, string>> = {
  'company-overview': 'Company Overview',
  'financials': 'Financial Metrics',
  'capital-structure': 'Capital Structure',
  'mineral-estimates': 'Mineral Estimates',
  'valuation-metrics': 'Valuation Metrics',
  'production': 'Production',
  'costs': 'Cost Metrics'
} as const;

// --- The Master List of Metrics ---
// Made readonly to prevent accidental mutations
export const metrics: Readonly<MetricConfig[]> = Object.freeze([
  // === Company Overview - Free Tier ===
  {
    key: 'company-overview.percent_gold',
    db_column: 'percent_gold',
    nested_path: 'percent_gold',
    label: 'Gold %',
    description: "The percentage of a company's total production or resources derived from gold, expressed as a proportion of gold-equivalent output. This metric is critical for investors prioritizing gold exposure, as it reflects the company's focus on this precious metal relative to others (e.g., silver, copper). A higher percentage is generally preferred by gold-focused investors, as it aligns with strategies betting on gold price appreciation. However, its significance depends on market dynamics—e.g., during a silver bull market, a lower gold percentage might be advantageous. This metric is derived from production reports or resource estimates, typically standardized to gold-equivalent ounces to account for varying metal values. Context matters: a high percentage could indicate over-reliance on a single commodity, increasing risk if gold prices fall.",
    unit: '%',
    higherIsBetter: true,
    category: 'company-overview',
    tier: 'free',
    format: 'percent'
  },
  {
    key: 'company-overview.percent_silver',
    db_column: 'percent_silver',
    nested_path: 'percent_silver',
    label: 'Silver %',
    description: "The percentage of a company's production or resources attributed to silver, calculated as a proportion of silver-equivalent or gold-equivalent output. This metric is essential for investors targeting silver exposure, given silver's industrial and investment demand. A higher percentage is typically favored in silver-focused portfolios, especially during periods of strong silver price performance. Like percent_gold, it's derived from production data or resource estimates, often normalized to account for price differences across metals. Investors should consider market trends (e.g., silver's volatility) and the company's diversification strategy—a high silver percentage may increase risk if silver prices stagnate. Comparing this metric across peers helps gauge a company's silver emphasis.",
    unit: '%',
    higherIsBetter: true,
    category: 'company-overview',
    tier: 'free',
    format: 'percent'
  },
  {
    key: 'company-overview.share_price',
    db_column: 'share_price',
    nested_path: 'share_price',
    label: 'Share Price',
    description: "The most recent closing price of a company's stock, quoted in dollars per share ($). This metric reflects the market's current valuation of each share, driven by factors like earnings, growth prospects, and market sentiment. While a higher share price is often associated with market confidence or growth, it's not inherently \"better\" without context. For example, a high price relative to earnings (high P/E ratio) may suggest overvaluation, while a low price could indicate undervaluation or distress. Share price alone is a starting point—investors must analyze it alongside valuation metrics (e.g., P/E, P/B) and market conditions to assess whether it reflects true value or speculative hype.",
    unit: '$',
    higherIsBetter: true,
    category: 'company-overview',
    tier: 'free',
    format: 'currency'
  },

  // === Financials - Free Tier ===
  {
    key: 'financials.cash_value',
    db_column: 'f_cash_value',
    nested_path: 'financials.cash_value',
    label: 'Cash',
    description: 'The total cash and cash equivalents held by a company, reported in millions of dollars ($M). This metric, often sourced from the balance sheet, represents liquid assets available for operations, investments, or debt repayment. A higher cash balance enhances financial flexibility, allowing a company to fund exploration, acquisitions, or dividends without borrowing. However, excessive cash may signal underinvestment or lack of growth opportunities, while low cash raises liquidity concerns. In mining, cash reserves are critical to weather commodity price swings. Investors should compare this to debt and operational needs to gauge financial health.',
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'free',
    format: 'currency'
  },
  {
    key: 'financials.market_cap_value',
    db_column: 'f_market_cap_value',
    nested_path: 'financials.market_cap_value',
    label: 'Market Cap',
    description: 'Market capitalization, calculated as the share price multiplied by the number of shares outstanding, reported in millions of dollars ($M). This metric represents the total equity value of a company as perceived by the market. A higher market cap typically indicates scale, stability, and investor confidence, making it attractive for conservative investors. However, smaller market caps may offer higher growth potential, albeit with greater risk. In mining, market cap reflects resource quality, production capacity, and market sentiment. It's a key benchmark for comparing companies within the sector, though it should be paired with metrics like EV or P/B for valuation context.',
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'free',
    format: 'currency'
  },
  {
    key: 'financials.enterprise_value_value',
    db_column: 'f_enterprise_value_value',
    nested_path: 'financials.enterprise_value_value',
    label: 'Enterprise Value',
    description: 'Enterprise value (EV), calculated as market capitalization plus total debt minus cash and cash equivalents, reported in millions of dollars ($M). EV provides a comprehensive measure of a company's total value, accounting for both equity and debt financing. A higher EV may reflect a larger, more established firm, but high debt levels can inflate EV, signaling financial risk. In mining, EV is widely used to assess acquisition potential, as it approximates the cost to buy the company outright. Investors should analyze EV alongside revenue or EBITDA to evaluate whether the market's valuation aligns with operational performance.',
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'free',
    format: 'currency'
  },
  {
    key: 'financials.net_financial_assets',
    db_column: 'f_net_financial_assets',
    nested_path: 'financials.net_financial_assets',
    label: 'Net Fin Assets',
    description: "The difference between a company's total financial assets (e.g., cash, investments) and total liabilities (e.g., debt, payables), reported in millions of dollars ($M). This metric, derived from the balance sheet, reflects the company's net financial position or balance sheet strength. A higher (positive) value indicates greater financial resilience, providing a buffer against downturns or funding for growth. A negative value signals potential distress, especially if liabilities exceed assets. In mining, where capital intensity is high, this metric helps assess a company's ability to sustain operations without excessive borrowing.",
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'free',
    format: 'currency'
  },
  {
    key: 'financials.shares_outstanding',
    db_column: 'f_shares_outstanding',
    nested_path: 'financials.shares_outstanding',
    label: 'Shares Outstanding',
    description: 'Issued shares (millions). Lower is better (↓) to minimize dilution.',
    unit: 'M',
    higherIsBetter: false,
    category: 'financials',
    tier: 'free',
    format: 'number'
  },

  // === Financials - Pro Tier ===
  {
    key: 'financials.debt_value',
    db_column: 'f_debt_value',
    nested_path: 'financials.debt_value',
    label: 'Total Debt',
    description: 'The total debt obligations of a company, including short- and long-term liabilities, reported in millions of dollars ($M). Lower debt is generally preferred, as it reduces financial risk and interest expenses, enhancing stability. However, manageable debt can fuel growth (e.g., funding new mines), so context is critical. In mining, high debt can be risky during commodity downturns. Investors should compare debt to cash reserves, EBITDA, or equity to assess leverage and repayment capacity.',
    unit: '$M',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'currency'
  },
  {
    key: 'financials.revenue_value',
    db_column: 'f_revenue_value',
    nested_path: 'financials.revenue_value',
    label: 'Revenue',
    description: "The company's total annual revenue, reported in millions of dollars ($M), reflecting income from operations (e.g., metal sales in mining). Higher revenue is generally preferred, as it indicates strong sales and market demand. However, revenue alone doesn't guarantee profitability—cost efficiency and margins are critical. In mining, revenue is heavily tied to commodity prices and production volumes, making it sensitive to market cycles. Investors should analyze revenue trends and compare them to costs (e.g., AISC) to assess operational health.",
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'pro',
    format: 'currency'
  },
  {
    key: 'financials.net_income_value',
    db_column: 'f_net_income_value',
    nested_path: 'financials.net_income_value',
    label: 'Net Income',
    description: "The company's net profit after all expenses, taxes, and interest, reported in millions of dollars ($M). This bottom-line figure reflects overall profitability and is a key indicator of financial success. A higher net income is preferred, but it can be distorted by one-time items (e.g., asset sales) or accounting practices. In mining, net income is sensitive to commodity price swings and operational costs. Investors should analyze its consistency and pair it with cash flow metrics to ensure earnings translate to tangible value.",
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'pro',
    format: 'currency'
  },
  {
    key: 'financials.price_to_book',
    db_column: 'f_price_to_book',
    nested_path: 'financials.price_to_book',
    label: 'P/B Ratio',
    description: "The ratio of a company's share price to its book value per share (P/B ratio), where book value is total assets minus liabilities. A lower P/B ratio is often preferred by value investors, as it suggests the stock is trading below its intrinsic asset value, potentially indicating undervaluation. However, a high P/B may be justified for growth companies with strong future prospects. In mining, P/B is useful for comparing companies with significant tangible assets (e.g., reserves). Sector norms and asset quality (e.g., proven vs. inferred resources) heavily influence this metric's interpretation.",
    unit: 'x',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'ratio'
  },
  {
    key: 'financials.price_to_sales',
    db_column: 'f_price_to_sales',
    nested_path: 'financials.price_to_sales',
    label: 'P/S Ratio',
    description: "The ratio of a company's share price to its annual revenue per share (P/S ratio). A lower P/S ratio is typically favored, as it suggests the stock is undervalued relative to its sales, appealing to value investors. High P/S ratios are common in high-growth firms expecting future revenue increases. In mining, P/S helps assess whether the market is overpaying for a company's production capacity. Investors should compare P/S to industry averages and consider revenue quality (e.g., stable vs. volatile commodity prices).",
    unit: 'x',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'ratio'
  },
  {
    key: 'financials.enterprise_to_revenue',
    db_column: 'f_enterprise_to_revenue',
    nested_path: 'financials.enterprise_to_revenue',
    label: 'EV/Revenue',
    description: "The ratio of enterprise value to annual revenue (EV/Revenue). A lower ratio often indicates a company is undervalued relative to its sales, making it attractive for acquisitions or investment. High EV/Revenue ratios may reflect strong growth expectations or operational inefficiencies. In mining, this metric helps evaluate how the market values a company's production relative to its total value (equity + debt). It's particularly useful for comparing firms with different capital structures, though commodity price cycles must be considered.",
    unit: 'x',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'ratio'
  },
  {
    key: 'financials.enterprise_to_ebitda',
    db_column: 'f_enterprise_to_ebitda',
    nested_path: 'financials.enterprise_to_ebitda',
    label: 'EV/EBITDA',
    description: "The ratio of enterprise value to earnings before interest, taxes, depreciation, and amortization (EV/EBITDA). A lower ratio is generally preferred, as it suggests the company is undervalued relative to its operating profitability, a key metric for acquisitions or valuation comparisons. High ratios may indicate growth potential or overvaluation. In mining, EV/EBITDA is widely used to assess operational efficiency, as it normalizes for varying debt levels and tax structures. Investors should benchmark this against industry peers and consider commodity price impacts.",
    unit: 'x',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'ratio'
  },
  {
    key: 'financials.trailing_pe',
    db_column: 'f_trailing_pe',
    nested_path: 'financials.trailing_pe',
    label: 'Trailing P/E',
    description: 'The trailing price-to-earnings ratio, calculated as the share price divided by earnings per share over the past 12 months (P/E). A lower P/E is often favored by value investors, suggesting the stock is undervalued relative to historical earnings. High P/E ratios are common in growth stocks or during low-earnings periods (e.g., heavy investment phases in mining). This metric is less reliable in volatile sectors like mining, where earnings fluctuate with commodity prices. Investors should pair it with forward P/E and industry benchmarks.',
    unit: 'x',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'ratio'
  },
  {
    key: 'financials.forward_pe',
    db_column: 'f_forward_pe',
    nested_path: 'financials.forward_pe',
    label: 'Forward P/E',
    description: 'The forward price-to-earnings ratio, based on the share price divided by projected earnings per share for the next 12 months. A lower forward P/E suggests potential undervaluation based on future earnings, but its reliability depends on the accuracy of earnings forecasts. In mining, forward P/E is useful for assessing growth potential, especially for companies ramping up production. High ratios may reflect optimism about commodity prices or output. Investors should cross-reference with historical P/E and analyst consensus.',
    unit: 'x',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'ratio'
  },
  {
    key: 'financials.peg_ratio',
    db_column: 'f_peg_ratio',
    nested_path: 'financials.peg_ratio',
    label: 'PEG Ratio',
    unit: 'x',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'ratio',
    description: 'The price/earnings-to-growth (PEG) ratio, calculated as the trailing P/E ratio divided by the annual earnings growth rate. This metric adjusts the P/E ratio for expected growth, providing a more nuanced valuation measure. A lower PEG ratio is generally preferred by value investors, as it suggests the stock is undervalued relative to its growth potential. In mining, where earnings can be volatile due to commodity price swings, a PEG below 1 may indicate a bargain, but high growth forecasts can inflate the ratio. Investors should verify growth projections and compare PEG to industry peers, as mining firms with stable production may have more reliable estimates.'
  },
  {
    key: 'financials.cost_of_revenue',
    db_column: 'f_cost_of_revenue',
    nested_path: 'financials.cost_of_revenue',
    label: 'Cost of Revenue',
    unit: '$M',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'currency',
    description: 'The total cost directly attributable to producing goods sold, reported in millions of dollars ($M). In mining, this includes expenses like labor, materials, and energy for extracting and processing minerals. A lower cost of revenue is preferred, as it indicates higher operational efficiency and better margins, especially when commodity prices are volatile. However, very low costs may reflect underinvestment in quality or safety. Investors should compare this to revenue to calculate gross margin and assess cost trends relative to production volumes.'
  },
  {
    key: 'financials.gross_profit',
    db_column: 'f_gross_profit',
    nested_path: 'financials.gross_profit',
    label: 'Gross Profit',
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'pro',
    format: 'currency',
    description: 'Revenue minus cost of revenue, reported in millions of dollars ($M). This metric reflects the profitability of core mining operations before operating expenses, taxes, or interest. A higher gross profit is preferred, as it signals strong revenue generation relative to production costs, a critical factor in the capital-intensive mining sector. High gross profit can support reinvestment or debt repayment, but investors should check gross margin (gross profit/revenue) to assess efficiency and compare to peers, as commodity price spikes can temporarily inflate this figure.'
  },
  {
    key: 'financials.operating_expense',
    db_column: 'f_operating_expense',
    nested_path: 'financials.operating_expense',
    label: 'Operating Expense',
    unit: '$M',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'currency',
    description: 'The costs of running the business beyond direct production, such as administrative, marketing, and exploration expenses, reported in millions of dollars ($M). A lower operating expense is preferred, as it reflects cost discipline and enhances operating margins. In mining, high exploration costs may justify elevated expenses if they lead to resource growth, but bloated overhead can erode profitability. Investors should compare this to revenue and operating income to evaluate efficiency and check for one-time expenses.'
  },
  {
    key: 'financials.operating_income',
    db_column: 'f_operating_income',
    nested_path: 'financials.operating_income',
    label: 'Operating Income',
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'pro',
    format: 'currency',
    description: 'Gross profit minus operating expenses, reported in millions of dollars ($M). This metric measures profitability from core operations before interest and taxes, a key indicator of operational efficiency in mining. A higher operating income is preferred, as it reflects the ability to generate profit after covering production and overhead costs. Negative operating income may signal operational challenges, especially during low commodity price cycles. Investors should analyze trends and compare to EBITDA for a fuller picture of operational health.'
  },
  {
    key: 'financials.liabilities',
    db_column: 'f_liabilities',
    nested_path: 'financials.liabilities',
    label: 'Total Liabilities',
    unit: '$M',
    higherIsBetter: false,
    category: 'financials',
    tier: 'pro',
    format: 'currency',
    description: 'The sum of all financial obligations, including debt, accounts payable, and other liabilities, reported in millions of dollars ($M). A lower value is preferred, as it reduces financial risk and interest burdens, particularly in the cyclical mining industry. However, moderate liabilities may be acceptable if used to fund high-return projects like mine development. Investors should compare liabilities to assets (e.g., net financial assets) and cash flow to assess repayment capacity and financial stability.'
  },

  // === Financials - Premium Tier ===
  {
    key: 'financials.free_cash_flow',
    db_column: 'f_free_cash_flow',
    nested_path: 'financials.free_cash_flow',
    label: 'Free Cash Flow',
    description: 'The cash generated by a company after deducting operating expenses and capital expenditures, reported in millions of dollars ($M). Free cash flow (FCF) is a key indicator of financial health, showing the cash available for dividends, debt repayment, or reinvestment. A higher FCF is strongly preferred, as it demonstrates operational efficiency and profitability, especially in capital-intensive industries like mining. Negative FCF may indicate heavy investment or operational challenges. Investors should track FCF trends over time and compare it to debt levels to evaluate sustainability.',
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'financials.ebitda',
    db_column: 'f_ebitda',
    nested_path: 'financials.ebitda',
    label: 'EBITDA',
    description: "Earnings before interest, taxes, depreciation, and amortization, reported in millions of dollars ($M). EBITDA measures a company's core operating profitability, excluding non-operational factors like financing costs or accounting adjustments. A higher EBITDA is preferred, as it signals strong operational performance, especially in capital-intensive sectors like mining. It's a key metric for comparing firms with different tax or debt structures. Investors should monitor EBITDA margins and trends, as one-time gains or commodity price spikes can inflate this figure.",
    unit: '$M',
    higherIsBetter: true,
    category: 'financials',
    tier: 'premium',
    format: 'currency'
  },

  // === Capital Structure - Pro Tier ===
  {
    key: 'capital_structure.existing_shares',
    db_column: 'cs_existing_shares',
    nested_path: 'capital_structure.existing_shares',
    label: 'Existing Shares',
    description: 'The current number of shares outstanding, reported in millions, representing the total equity ownership. A lower count is preferred to maintain concentrated ownership, benefiting existing shareholders. However, larger firms require more shares to support their scale. In mining, this metric is critical when assessing dilution from financing activities. Investors should compare it to fully diluted shares to understand potential future impacts.',
    unit: 'M',
    higherIsBetter: false,
    category: 'capital-structure',
    tier: 'pro',
    format: 'number'
  },
  {
    key: 'capital_structure.fully_diluted_shares',
    db_column: 'cs_fully_diluted_shares',
    nested_path: 'capital_structure.fully_diluted_shares',
    label: 'Fully Diluted Shares',
    description: 'The total shares outstanding plus potential shares from exercisable options, warrants, or convertible securities, reported in millions. A lower number is preferred, as it indicates less risk of future dilution, preserving shareholder value. In mining, where capital raises are common, this metric highlights potential ownership changes. Investors should analyze the gap between existing and fully diluted shares to gauge dilution risk.',
    unit: 'M',
    higherIsBetter: false,
    category: 'capital-structure',
    tier: 'pro',
    format: 'number'
  },

  // === Capital Structure - Premium Tier ===
  {
    key: 'capital_structure.in_the_money_options',
    db_column: 'cs_in_the_money_options',
    nested_path: 'capital_structure.in_the_money_options',
    label: 'ITM Options',
    description: 'The number of stock options that are currently exercisable at a profit, reported in millions. A lower count is preferred, as it reduces immediate dilution risk when options are exercised. However, in-the-money options reflect strong stock performance, which is positive. In mining, options are often used to incentivize management, but large volumes can dilute shareholders. Investors should assess the potential impact on shares outstanding.',
    unit: 'M',
    higherIsBetter: false,
    category: 'capital-structure',
    tier: 'premium',
    format: 'number'
  },
  {
    key: 'capital_structure.options_revenue',
    db_column: 'cs_options_revenue',
    nested_path: 'capital_structure.options_revenue',
    label: 'Options Revenue',
    description: 'The potential revenue from exercising all in-the-money stock options, reported in millions of dollars ($M). A higher value could indicate future capital inflows, strengthening the balance sheet, but it comes at the cost of dilution. In mining, this metric is relevant for companies relying on stock-based financing. Investors should weigh the capital benefits against the dilutive impact on ownership.',
    unit: '$M',
    higherIsBetter: true,
    category: 'capital-structure',
    tier: 'premium',
    format: 'currency'
  },

  // === Mineral Estimates - Pro Tier ===
  {
    key: 'mineral_estimates.reserves_total_aueq_moz',
    db_column: 'me_reserves_total_aueq_moz',
    nested_path: 'mineral_estimates.reserves_total_aueq_moz',
    label: 'Total Reserves',
    description: 'Proven and probable reserves of gold-equivalent ounces, reported in millions of ounces (Moz). Reserves are mineral deposits economically and legally extractable under current conditions, making this a critical metric for mining longevity. A higher value is preferred, as it ensures a robust asset base for sustained production. Investors should verify reserve quality (e.g., grade, cost) and compare it to production rates to assess mine life.',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz'
  },
  {
    key: 'mineral_estimates.measured_indicated_total_aueq_moz',
    db_column: 'me_measured_indicated_total_aueq_moz',
    nested_path: 'mineral_estimates.measured_indicated_total_aueq_moz',
    label: 'Total M&I',
    description: 'Measured and indicated resources of gold-equivalent ounces (Moz), representing deposits with high geological confidence but not yet classified as reserves. A higher value is preferred, as it signals strong resource potential for future conversion to reserves. In mining, this metric reflects near-term upside. Investors should consider resource grade and conversion feasibility when evaluating.',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz'
  },
  {
    key: 'mineral_estimates.resources_total_aueq_moz',
    db_column: 'me_resources_total_aueq_moz',
    nested_path: 'mineral_estimates.resources_total_aueq_moz',
    label: 'Total Resources',
    description: 'Total measured, indicated, and inferred gold-equivalent resources (Moz), encompassing all resource categories. A higher value is preferred for overall scale, but inferred resources carry significant uncertainty. This metric highlights a company's long-term potential, though only a fraction may become economically viable. Investors should focus on the proportion of measured/indicated resources for reliability.',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz'
  },
  {
    key: 'mineral_estimates.reserves_precious_aueq_moz',
    db_column: 'me_reserves_precious_aueq_moz',
    nested_path: 'mineral_estimates.reserves_precious_aueq_moz',
    label: 'Precious Reserves',
    description: "Proven and probable reserves of precious metals (gold and silver equivalent, Moz). A higher value is preferred, as precious metals typically command higher value and stability than base metals. This metric emphasizes a company's high-value asset base. Investors should evaluate reserve grade and market demand for precious metals.",
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz'
  },
  {
    key: 'mineral_estimates.measured_indicated_precious_aueq_moz',
    db_column: 'me_measured_indicated_precious_aueq_moz',
    nested_path: 'mineral_estimates.measured_indicated_precious_aueq_moz',
    label: 'Precious M&I',
    description: 'Measured and indicated resources of precious metals (Au+Ag eq., Moz). A higher value is preferred for reliable, high-value resource potential. This metric is key for assessing near-term precious metal upside. Investors should check resource quality and conversion likelihood.',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz'
  },
  {
    key: 'mineral_estimates.resources_precious_aueq_moz',
    db_column: 'me_resources_precious_aueq_moz',
    nested_path: 'mineral_estimates.resources_precious_aueq_moz',
    label: 'Precious Resources',
    description: "Total measured, indicated, and inferred precious metal resources (Moz). A higher value is preferred for overall precious metal scale, though inferred resources are speculative. This metric highlights a company's precious metal focus. Investors should prioritize higher-confidence categories.",
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz'
  },
  {
    key: 'mineral_estimates.reserves_non_precious_aueq_moz',
    db_column: 'me_reserves_non_precious_aueq_moz',
    nested_path: 'mineral_estimates.reserves_non_precious_aueq_moz',
    label: 'Non-Precious Reserves',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz',
    description: 'Proven and probable reserves of non-precious metals (e.g., copper, zinc) in gold-equivalent ounces, reported in millions of ounces (Moz). A higher value is preferred for diversified miners, as non-precious metals can stabilize revenue during precious metal price declines. However, non-precious reserves often have lower margins and are sensitive to industrial demand. Investors should evaluate the quality (e.g., grade, cost) and market outlook for these metals, and compare to precious reserves to assess portfolio balance.'
  },
  {
    key: 'mineral_estimates.measured_indicated_non_precious_aueq_moz',
    db_column: 'me_measured_indicated_non_precious_aueq_moz',
    nested_path: 'mineral_estimates.measured_indicated_non_precious_aueq_moz',
    label: 'Non-Precious M&I',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz',
    description: 'Measured and indicated resources of non-precious metals in gold-equivalent ounces (Moz), representing deposits with high geological confidence but not yet reserves. A higher value is preferred, as it indicates potential for future reserve conversion, adding to a company's diversified asset base. Investors should assess conversion feasibility, extraction costs, and market demand for non-precious metals, as these resources may contribute to revenue stability but carry lower value than precious metals.'
  },
  {
    key: 'mineral_estimates.resources_non_precious_aueq_moz',
    db_column: 'me_resources_non_precious_aueq_moz',
    nested_path: 'mineral_estimates.resources_non_precious_aueq_moz',
    label: 'Non-Precious Resources',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz',
    description: 'Total measured, indicated, and inferred resources of non-precious metals in gold-equivalent ounces (Moz). A higher value is preferred for overall scale, though inferred resources are speculative. This metric highlights a company's long-term potential in non-precious metals, which can diversify revenue but are subject to industrial market fluctuations. Investors should prioritize higher-confidence (measured/indicated) resources and evaluate extraction economics.'
  },
  {
    key: 'mineral_estimates.mineable_total_aueq_moz',
    db_column: 'me_mineable_total_aueq_moz',
    nested_path: 'mineral_estimates.mineable_total_aueq_moz',
    label: 'Mineable Total',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz',
    description: 'The total gold-equivalent ounces (Moz) deemed economically mineable under current conditions, typically a subset of reserves and high-confidence resources. A higher value is preferred, as it reflects immediately viable assets for production, critical for near-term cash flow. Unlike reserves, this metric may include select measured/indicated resources with strong economics. Investors should verify cost assumptions (e.g., AISC) and compare to production rates to assess mine life and profitability.'
  },
  {
    key: 'mineral_estimates.mineable_precious_aueq_moz',
    db_column: 'me_mineable_precious_aueq_moz',
    nested_path: 'mineral_estimates.mineable_precious_aueq_moz',
    label: 'Mineable Precious',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz',
    description: 'Mineable ounces of precious metals (gold and silver equivalent, Moz) that are economically viable under current conditions. A higher value is preferred, as precious metals typically offer higher margins and market stability, enhancing profitability. This metric focuses on high-value assets ready for production. Investors should check extraction costs and market demand for gold/silver to evaluate its impact on revenue potential.'
  },
  {
    key: 'mineral_estimates.mineable_non_precious_aueq_moz',
    db_column: 'me_mineable_non_precious_aueq_moz',
    nested_path: 'mineral_estimates.mineable_non_precious_aueq_moz',
    label: 'Mineable Non-Precious',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'pro',
    format: 'moz',
    description: 'Mineable ounces of non-precious metals (e.g., copper, zinc) in gold-equivalent ounces (Moz) that are economically viable. A higher value is preferred for diversified miners, as it supports revenue stability through base metal production. However, non-precious metals may have lower margins and higher market risk. Investors should assess extraction costs and industrial demand to gauge profitability and compare to precious mineable ounces.'
  },
  
  // === Mineral Estimates - Premium Tier ===
  {
    key: 'mineral_estimates.potential_total_aueq_moz',
    db_column: 'me_potential_total_aueq_moz',
    nested_path: 'mineral_estimates.potential_total_aueq_moz',
    label: 'Total Potential',
    description: 'Estimated exploration potential for additional gold-equivalent resources (Moz), based on geological studies but not yet classified as resources. A higher value is preferred for speculative upside, but it's highly uncertain. In mining, this metric appeals to growth-focused investors betting on exploration success. Investors should assess the company's exploration track record and funding capacity.',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'premium',
    format: 'moz'
  },
  {
    key: 'mineral_estimates.potential_non_precious_aueq_moz',
    db_column: 'me_potential_non_precious_aueq_moz',
    nested_path: 'mineral_estimates.potential_non_precious_aueq_moz',
    label: 'Non-Precious Potential',
    unit: 'Moz',
    higherIsBetter: true,
    category: 'mineral-estimates',
    tier: 'premium',
    format: 'moz',
    description: 'Estimated exploration potential for additional non-precious metal resources in gold-equivalent ounces (Moz), based on geological studies but not yet classified. A higher value is preferred for speculative upside, appealing to growth-focused investors betting on exploration success in base metals. However, this metric is highly uncertain, and realization depends on funding and drilling outcomes. Investors should review the company's exploration track record and market conditions for non-precious metals.'
  },

  // === Valuation Metrics - Pro Tier ===
  {
    key: 'valuation_metrics.mkt_cap_per_resource_oz_all',
    db_column: 'vm_mkt_cap_per_resource_oz_all',
    nested_path: 'valuation_metrics.mkt_cap_per_resource_oz_all',
    label: 'MC/Resource oz',
    description: 'Market capitalization per total resource ounce ($/oz). A lower value suggests the market undervalues the company's resource base, appealing to value investors. This metric is useful for screening undervalued miners but requires context on resource quality.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_reserve_oz_all',
    db_column: 'vm_mkt_cap_per_reserve_oz_all',
    nested_path: 'valuation_metrics.mkt_cap_per_reserve_oz_all',
    label: 'MC/Reserve oz',
    description: 'Market cap per reserve ounce ($/oz). A lower value indicates potential undervaluation of proven reserves, a key metric for conservative investors. It's more precise than market cap per resource due to reserves' certainty.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_resource_oz_precious',
    db_column: 'vm_mkt_cap_per_resource_oz_precious',
    nested_path: 'valuation_metrics.mkt_cap_per_resource_oz_precious',
    label: 'MC/Prec Resource oz',
    description: 'Market cap per precious metal resource ounce ($/oz). A lower value suggests the market undervalues the company's precious resource base, appealing to value investors targeting gold and silver.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_reserve_oz_precious',
    db_column: 'vm_mkt_cap_per_reserve_oz_precious',
    nested_path: 'valuation_metrics.mkt_cap_per_reserve_oz_precious',
    label: 'MC/Prec Reserve oz',
    description: 'Market cap per precious metal reserve ounce ($/oz). A lower value indicates potential undervaluation of confirmed precious reserves, a precise metric for precious metal valuation.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_mi_oz_all',
    db_column: 'vm_mkt_cap_per_mi_oz_all',
    nested_path: 'valuation_metrics.mkt_cap_per_mi_oz_all',
    label: 'MC/M&I oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency',
    description: 'Market capitalization per total measured and indicated gold-equivalent ounce ($/oz). A lower value is preferred, suggesting the market undervalues the company's high-confidence resources relative to its equity value. This metric is useful for value investors screening for undervalued miners with strong resource bases. Investors should compare to peers and consider resource quality and conversion potential.'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_mi_oz_precious',
    db_column: 'vm_mkt_cap_per_mi_oz_precious',
    nested_path: 'valuation_metrics.mkt_cap_per_mi_oz_precious',
    label: 'MC/Prec M&I oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency',
    description: 'Market capitalization per measured and indicated precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of high-confidence gold and silver resources, appealing to precious metal-focused investors. This metric isolates high-value assets with strong conversion potential. Investors should benchmark against peers and check resource economics.'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_mineable_oz_all',
    db_column: 'vm_mkt_cap_per_mineable_oz_all',
    nested_path: 'valuation_metrics.mkt_cap_per_mineable_oz_all',
    label: 'MC/Mineable oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency',
    description: 'Market capitalization per total mineable gold-equivalent ounce ($/oz). A lower value is preferred, suggesting undervaluation of economically viable assets ready for production. This metric is ideal for investors seeking companies with near-term cash flow potential. Investors should compare to peers and verify cost assumptions for mineable ounces to ensure profitability.'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_mineable_oz_precious',
    db_column: 'vm_mkt_cap_per_mineable_oz_precious',
    nested_path: 'valuation_metrics.mkt_cap_per_mineable_oz_precious',
    label: 'MC/Prec Mineable oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency',
    description: 'Market capitalization per mineable precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of high-margin, economically viable gold and silver assets. This metric is critical for investors prioritizing near-term precious metal production. Investors should compare to industry averages and assess extraction costs for profitability.'
  },
  {
    key: 'valuation_metrics.mkt_cap_per_production_oz',
    db_column: 'vm_mkt_cap_per_production_oz',
    nested_path: 'valuation_metrics.mkt_cap_per_production_oz',
    label: 'MC/Production oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'pro',
    format: 'currency',
    description: 'Market capitalization divided by current annual gold-equivalent production ($/oz). A lower value is preferred, as it suggests the market undervalues the company's operational output relative to its equity value. This metric is useful for assessing production efficiency and cash flow potential. Investors should pair with cost metrics (e.g., AISC) and compare to peers to evaluate value.'
  },

  // === Valuation Metrics - Premium Tier ===
  {
    key: 'valuation_metrics.ev_per_resource_oz_all',
    db_column: 'vm_ev_per_resource_oz_all',
    nested_path: 'valuation_metrics.ev_per_resource_oz_all',
    label: 'EV/Resource oz',
    description: 'Enterprise value divided by total gold-equivalent resource ounces ($/oz). A lower value is often preferred, as it suggests the market undervalues the company's resources relative to its total value. This metric is widely used in mining to identify potential bargains. Investors should compare it to peers and consider resource quality.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.ev_per_reserve_oz_all',
    db_column: 'vm_ev_per_reserve_oz_all',
    nested_path: 'valuation_metrics.ev_per_reserve_oz_all',
    label: 'EV/Reserve oz',
    description: 'Enterprise value per proven and probable reserve ounce ($/oz). A lower value is preferred, indicating undervaluation of confirmed reserves. This metric is more reliable than EV per resource due to reserves' higher certainty. Investors should benchmark against industry averages.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.ev_per_resource_oz_precious',
    db_column: 'vm_ev_per_resource_oz_precious',
    nested_path: 'valuation_metrics.ev_per_resource_oz_precious',
    label: 'EV/Prec Resource oz',
    description: 'Enterprise value per precious metal resource ounce ($/oz). A lower value suggests undervaluation of high-value precious resources, critical for precious metal-focused investors. This metric isolates the value of gold and silver assets.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.ev_per_reserve_oz_precious',
    db_column: 'vm_ev_per_reserve_oz_precious',
    nested_path: 'valuation_metrics.ev_per_reserve_oz_precious',
    label: 'EV/Prec Reserve oz',
    description: 'Enterprise value per precious metal reserve ounce ($/oz). A lower value indicates undervaluation of confirmed precious reserves, a key indicator for value-focused precious metal investors.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'valuation_metrics.ev_per_mi_oz_all',
    db_column: 'vm_ev_per_mi_oz_all',
    nested_path: 'valuation_metrics.ev_per_mi_oz_all',
    label: 'EV/M&I oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency',
    description: 'Enterprise value divided by total measured and indicated gold-equivalent ounces ($/oz). A lower value is preferred, as it suggests the market undervalues the company's high-confidence resources relative to its total value (equity + debt). This metric is more reliable than EV per total resources, as M&I ounces have greater geological certainty. Investors should compare to peers and consider resource quality (e.g., grade, location) to identify potential undervaluation.'
  },
  {
    key: 'valuation_metrics.ev_per_mi_oz_precious',
    db_column: 'vm_ev_per_mi_oz_precious',
    nested_path: 'valuation_metrics.ev_per_mi_oz_precious',
    label: 'EV/Prec M&I oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency',
    description: 'Enterprise value per measured and indicated precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of high-confidence precious resources, which are critical for gold/silver-focused investors. This metric isolates the value of high-margin assets. Investors should benchmark against industry averages and verify resource economics to assess whether the market fairly values these assets.'
  },
  {
    key: 'valuation_metrics.ev_per_mineable_oz_all',
    db_column: 'vm_ev_per_mineable_oz_all',
    nested_path: 'valuation_metrics.ev_per_mineable_oz_all',
    label: 'EV/Mineable oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency',
    description: 'Enterprise value divided by total mineable gold-equivalent ounces ($/oz), reflecting economically viable assets. A lower value is preferred, as it suggests the market undervalues the company's immediately producible resources. This metric is highly reliable for assessing near-term value, as mineable ounces are typically a subset of reserves and high-confidence resources. Investors should compare to peers and check cost assumptions (e.g., AISC) for profitability context.'
  },
  {
    key: 'valuation_metrics.ev_per_mineable_oz_precious',
    db_column: 'vm_ev_per_mineable_oz_precious',
    nested_path: 'valuation_metrics.ev_per_mineable_oz_precious',
    label: 'EV/Prec Mineable oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency',
    description: 'Enterprise value per mineable precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of economically viable gold and silver assets, which offer high margins and stability. This metric is key for precious metal investors seeking near-term production value. Investors should compare to industry norms and evaluate extraction costs to ensure profitability.'
  },
  {
    key: 'valuation_metrics.ev_per_production_oz',
    db_column: 'vm_ev_per_production_oz',
    nested_path: 'valuation_metrics.ev_per_production_oz',
    label: 'EV/Production oz',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'valuation-metrics',
    tier: 'premium',
    format: 'currency',
    description: 'Enterprise value divided by current annual gold-equivalent production ($/oz). A lower value is preferred, as it suggests the market undervalues the company's operational output relative to its total value. This metric highlights efficiency in converting assets to production, critical for cash flow generation. Investors should compare to peers and pair with cost metrics (e.g., AISC) to assess profitability and sustainability.'
  },

  // === Production - Free Tier ===
  {
    key: 'production.current_production_total_aueq_koz',
    db_column: 'p_current_production_total_aueq_koz',
    nested_path: 'production.current_production_total_aueq_koz',
    label: 'Current Prod.',
    description: 'Current annual production of gold-equivalent ounces, reported in thousand ounces (koz). A higher value is preferred, as it reflects strong operational output and revenue potential. This metric is a core indicator of a mining company's scale and efficiency. Investors should compare it to costs (e.g., AISC) to assess profitability.',
    unit: 'koz',
    higherIsBetter: true,
    category: 'production',
    tier: 'free',
    format: 'koz'
  },

  // === Production - Pro Tier ===
  {
    key: 'production.reserve_life_years',
    db_column: 'p_reserve_life_years',
    nested_path: 'production.reserve_life_years',
    label: 'Reserve Life',
    description: 'The estimated years of production remaining based on current reserves and production rates. A higher value is preferred, as it indicates longer operational longevity and reduced need for immediate exploration. Investors should ensure reserve estimates are reliable and consider production ramp-up plans.',
    unit: 'years',
    higherIsBetter: true,
    category: 'production',
    tier: 'pro',
    format: 'years'
  },
  {
    key: 'production.current_production_precious_aueq_koz',
    db_column: 'p_current_production_precious_aueq_koz',
    nested_path: 'production.current_production_precious_aueq_koz',
    label: 'Precious Prod.',
    description: 'Current annual production of precious metals (gold and silver equivalent, koz). A higher value is preferred, as precious metals typically offer higher margins and stability. This metric highlights a company's focus on high-value output. Investors should compare it to total production for diversification insights.',
    unit: 'koz',
    higherIsBetter: true,
    category: 'production',
    tier: 'pro',
    format: 'koz'
  },
  {
    key: 'production.current_production_non_precious_aueq_koz',
    db_column: 'p_current_production_non_precious_aueq_koz',
    nested_path: 'production.current_production_non_precious_aueq_koz',
    label: 'Non-Precious Prod.',
    description: 'Current annual production of non-precious metals (e.g., copper, zinc) in gold-equivalent ounces (koz). A higher value indicates diversified output, which can stabilize revenue during precious metal downturns. However, non-precious metals often have lower margins. Investors should assess the value of these metals in context.',
    unit: 'koz',
    higherIsBetter: true,
    category: 'production',
    tier: 'pro',
    format: 'koz'
  },

  // === Production - Premium Tier ===
  {
    key: 'production.future_production_total_aueq_koz',
    db_column: 'p_future_production_total_aueq_koz',
    nested_path: 'production.future_production_total_aueq_koz',
    label: 'Future Prod.',
    description: 'Projected annual gold-equivalent production (koz) based on company guidance or analyst estimates. A higher value is preferred, signaling growth potential, but forecasts are uncertain due to operational or market risks. Investors should verify the credibility of projections and check funding for expansion.',
    unit: 'koz',
    higherIsBetter: true,
    category: 'production',
    tier: 'premium',
    format: 'koz'
  },

  // === Costs - Premium Tier ===
  {
    key: 'costs.aisc_future',
    db_column: 'c_aisc_future',
    nested_path: 'costs.aisc_future',
    label: 'Future AISC',
    description: 'Projected all-in sustaining cost per ounce ($/oz), encompassing all costs to sustain production (e.g., mining, overhead, exploration). A lower value is preferred, as it signals higher profitability potential at future commodity prices. This metric is critical for assessing long-term viability. Investors should verify projection assumptions.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'costs.construction_costs',
    db_column: 'c_construction_costs',
    nested_path: 'costs.construction_costs',
    label: 'Construction Costs',
    description: 'Estimated capital costs for constructing new mining projects, reported in millions of dollars ($M). A lower value is preferred, as it indicates capital efficiency and lower funding needs. However, quality and scale of the project matter—cheap construction may compromise output. Investors should compare to projected revenue.',
    unit: '$M',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'costs.tco_future',
    db_column: 'c_tco_future',
    nested_path: 'costs.tco_future',
    label: 'Future TCO',
    description: 'Projected total cash costs per ounce ($/oz), covering direct production costs (e.g., mining, processing). A lower value is preferred, as it reflects operational efficiency and higher margins. This metric excludes sustaining capital, making it narrower than AISC. Investors should track trends and commodity price impacts.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'costs.aisc_last_quarter',
    db_column: 'c_aisc_last_quarter',
    nested_path: 'costs.aisc_last_quarter',
    label: 'Last Qtr AISC',
    description: 'All-in sustaining cost per ounce ($/oz) for the most recent quarter. A lower value is preferred, indicating strong recent cost performance and profitability. This metric is widely used to compare operational efficiency across miners. Investors should check for one-time cost impacts.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'costs.aisc_last_year',
    db_column: 'c_aisc_last_year',
    nested_path: 'costs.aisc_last_year',
    label: 'Last Yr AISC',
    description: 'All-in sustaining cost per ounce ($/oz) for the last reported year. A lower value is preferred, reflecting historical cost efficiency. This metric provides a longer-term view than quarterly AISC, smoothing out short-term fluctuations. Investors should compare it to peers and commodity prices.',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency'
  },
  {
    key: 'costs.aic_last_quarter',
    db_column: 'c_aic_last_quarter',
    nested_path: 'costs.aic_last_quarter',
    label: 'Last Qtr AIC',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency',
    description: 'All-in cost per ounce ($/oz) for the most recent quarter, including sustaining costs, exploration, and non-sustaining capital (e.g., new mine development). A lower value is preferred, as it reflects comprehensive cost efficiency, critical for profitability in mining. AIC is broader than AISC, capturing growth investments, so higher AIC may be acceptable for expanding firms. Investors should compare to peers and commodity prices to assess performance and check for one-time costs.'
  },
  {
    key: 'costs.aic_last_year',
    db_column: 'c_aic_last_year',
    nested_path: 'costs.aic_last_year',
    label: 'Last Yr AIC',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency',
    description: 'All-in cost per ounce ($/oz) for the last reported year, encompassing all costs, including sustaining and non-sustaining capital. A lower value is preferred, indicating long-term cost efficiency across operations and growth initiatives. This metric provides a broader view than AISC, useful for assessing strategic investments. Investors should compare to industry averages, check for cost trends, and pair with commodity prices to evaluate profitability.'
  },
  {
    key: 'costs.tco_current',
    db_column: 'c_tco_current',
    nested_path: 'costs.tco_current',
    label: 'Current TCO',
    unit: '$/oz',
    higherIsBetter: false,
    category: 'costs',
    tier: 'premium',
    format: 'currency',
    description: 'Current total cash cost per ounce ($/oz), covering direct production costs (e.g., mining, processing) but excluding sustaining capital. A lower value is preferred, as it reflects operational efficiency and higher margins in current operations. This metric is narrower than AISC, focusing on cash outflows, making it sensitive to short-term cost control. Investors should compare to peers, track trends, and pair with commodity prices to assess profitability.'
  },
]);

// --- Helper Functions with improved error handling and performance ---

// Memoized category cache to improve performance
const metricsByCategoryCache = new Map<MetricCategory, MetricConfig[]>();

export function getMetricsByCategory(category: MetricCategory): MetricConfig[] {
  if (metricsByCategoryCache.has(category)) {
    return metricsByCategoryCache.get(category)!;
  }

  if (!Array.isArray(metrics)) {
    console.error("[metric-types] 'metrics' is not an array in getMetricsByCategory.");
    return [];
  }

  const categoryMetrics = metrics.filter(metric => metric.category === category);
  metricsByCategoryCache.set(category, categoryMetrics);
  return categoryMetrics;
}

// Create lookup maps for O(1) access
const metricsByKey = new Map<string, MetricConfig>(
  metrics.map(m => [m.key, m])
);
const metricsByDbColumn = new Map<string, MetricConfig>(
  metrics.map(m => [m.db_column, m])
);
const metricsByNestedPath = new Map<string, MetricConfig>(
  metrics.map(m => [m.nested_path, m])
);

export function getMetricByKey(key: string): MetricConfig | undefined {
  if (!key || typeof key !== 'string') {
    console.warn("[metric-types] Invalid key provided to getMetricByKey:", key);
    return undefined;
  }
  return metricsByKey.get(key);
}

export function getMetricByDbColumn(dbColumn: string): MetricConfig | undefined {
  if (!dbColumn || typeof dbColumn !== 'string') {
    console.warn("[metric-types] Invalid dbColumn provided to getMetricByDbColumn:", dbColumn);
    return undefined;
  }
  return metricsByDbColumn.get(dbColumn);
}

export function getMetricByNestedPath(nestedPath: string): MetricConfig | undefined {
  if (!nestedPath || typeof nestedPath !== 'string') {
    console.warn("[metric-types] Invalid nestedPath provided to getMetricByNestedPath:", nestedPath);
    return undefined;
  }
  return metricsByNestedPath.get(nestedPath);
}

// Tier accessibility cache for performance
const accessibleMetricsCache = new Map<ColumnTier, MetricConfig[]>();

export function getAccessibleMetrics(tier: ColumnTier | undefined | null): MetricConfig[] {
  const effectiveTier = tier || 'free';
  
  if (accessibleMetricsCache.has(effectiveTier)) {
    return accessibleMetricsCache.get(effectiveTier)!;
  }

  if (!Array.isArray(metrics)) {
    console.error("[metric-types] 'metrics' is not an array in getAccessibleMetrics.");
    return [];
  }

  const tierLevels: Record<ColumnTier, number> = { 
    free: 0, 
    pro: 1, 
    premium: 2 
  };
  
  const userTierLevel = tierLevels[effectiveTier];

  if (userTierLevel === undefined) {
    console.warn(`[metric-types] Unknown user tier value provided: ${effectiveTier}. Defaulting to show only 'free' metrics.`);
    return metrics.filter(metric => metric.tier === 'free');
  }

  const accessibleMetrics = metrics.filter(metric => {
    const metricTierLevel = tierLevels[metric.tier];
    if (metricTierLevel === undefined) {
      console.warn(`[metric-types] Metric '${metric.key}' has unknown tier: '${metric.tier}'. Assuming inaccessible.`);
      return false;
    }
    return metricTierLevel <= userTierLevel;
  });

  accessibleMetricsCache.set(effectiveTier, accessibleMetrics);
  return accessibleMetrics;
}

// Clear caches when metrics might change (for dev/testing)
export function clearMetricCaches() {
  metricsByCategoryCache.clear();
  accessibleMetricsCache.clear();
}
